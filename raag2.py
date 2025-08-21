from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import pickle
import json
import os
import logging
import requests
import re
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

# Logging setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Hugging Face API config
API_URL = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct"
HEADERS = {"Authorization": "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"}

@dataclass
class InventoryItem:
    id: int
    item: str
    quantity: int
    category: Optional[str] = None
    priority: Optional[int] = 1

class DisasterReliefRAG:
    def __init__(self, embedder_model: str = "all-MiniLM-L6-v2", index_path: str = "inventory.index", inventory_path: str = "inventory.pkl"):
        self.embedder_model = embedder_model
        self.index_path = index_path
        self.inventory_path = inventory_path

        # Initial inventory
        self.inventory = [
            {"id": 1, "item": "Medical Kit", "quantity": 20, "category": "medical", "priority": 1},
            {"id": 2, "item": "Emergency Food Pack", "quantity": 50, "category": "food", "priority": 2},
            {"id": 3, "item": "Water Bottles", "quantity": 100, "category": "water", "priority": 1},
            {"id": 4, "item": "Rescue Tubes", "quantity": 15, "category": "rescue", "priority": 2},
            {"id": 5, "item": "Blankets", "quantity": 30, "category": "shelter", "priority": 2},
            {"id": 6, "item": "First Aid Bandages", "quantity": 200, "category": "medical", "priority": 1},
            {"id": 7, "item": "Flashlights", "quantity": 25, "category": "equipment", "priority": 3},
            {"id": 8, "item": "Batteries", "quantity": 100, "category": "equipment", "priority": 3},
            {"id": 9, "item": "Tents", "quantity": 10, "category": "shelter", "priority": 2},
            {"id": 10, "item": "Antibiotics", "quantity": 50, "category": "medical", "priority": 1},
        ]

        self._initialize_embedder()
        self._build_index()

    def _initialize_embedder(self):
        self.embedder = SentenceTransformer(self.embedder_model)
        self.embedding_dim = 384

    def _build_index(self):
        self.index = faiss.IndexFlatL2(self.embedding_dim)
        self.id_map, embeddings = [], []

        for item in self.inventory:
            desc = f"{item['item']} {item.get('category', '')} emergency relief supply"
            emb = self.embedder.encode(desc, convert_to_numpy=True)
            embeddings.append(emb)
            self.id_map.append(item["id"])

        embeddings_array = np.vstack(embeddings).astype("float32")
        self.index.add(embeddings_array)
        self._save_index()

    def _save_index(self):
        faiss.write_index(self.index, self.index_path)
        with open(self.inventory_path, "wb") as f:
            pickle.dump((self.inventory, self.id_map), f)

    def _extract_people_count(self, query: str) -> int:
        """Extract number of people from the query"""
        numbers = re.findall(r'\b(\d+)\s*(?:people|person|individuals|victims|casualties)', query.lower())
        if numbers:
            return int(numbers[0])
        
        # Look for standalone numbers that might indicate people count
        numbers = re.findall(r'\b(\d+)\b', query)
        if numbers:
            return int(numbers[0])
        
        return 10  # Default assumption

    def _calculate_requirements(self, query: str, retrieved_items: List) -> Dict[str, int]:
        """Calculate estimated requirements based on query and retrieved items"""
        people_count = self._extract_people_count(query)
        requirements = {}
        
        # Define per-person requirements based on emergency standards
        per_person_needs = {
            'medical': {
                'Medical Kit': 0.2,  # 1 kit per 5 people
                'First Aid Bandages': 3,  # 3 bandages per person
                'Antibiotics': 1,  # 1 dose per person
            },
            'water': {
                'Water Bottles': 3,  # 3 bottles per person minimum
            },
            'food': {
                'Emergency Food Pack': 1,  # 1 pack per person
            },
            'shelter': {
                'Blankets': 1,  # 1 blanket per person
                'Tents': 0.25,  # 1 tent per 4 people
            },
            'equipment': {
                'Flashlights': 0.25,  # 1 flashlight per 4 people
                'Batteries': 2,  # 2 batteries per person
            },
            'rescue': {
                'Rescue Tubes': 0.1,  # 1 tube per 10 people
            }
        }
        
        # Calculate requirements for retrieved items
        for item in retrieved_items:
            item_name = item['item']
            category = item.get('category', 'equipment')
            
            if category in per_person_needs and item_name in per_person_needs[category]:
                base_requirement = per_person_needs[category][item_name] * people_count
                # Adjust based on query context
                if 'injuries' in query.lower() and category == 'medical':
                    base_requirement *= 1.5  # Increase medical supplies for injuries
                elif 'dehydration' in query.lower() and category == 'water':
                    base_requirement *= 1.5  # Increase water for dehydration
                elif 'flood' in query.lower() and category in ['shelter', 'water']:
                    base_requirement *= 1.3  # Increase shelter and water for floods
                
                requirements[item_name] = max(1, int(base_requirement))
        
        return requirements

    def recommend_aid(self, query: str, top_k: int = 5) -> Tuple[Dict, List, Dict]:
        enhanced_query = f"disaster relief emergency: {query}"
        q_emb = self.embedder.encode(enhanced_query, convert_to_numpy=True).astype("float32").reshape(1, -1)
        distances, indices = self.index.search(q_emb, min(top_k, len(self.inventory)))

        retrieved_items = []
        for idx in indices[0]:
            inv_id = self.id_map[idx]
            item = next((i for i in self.inventory if i["id"] == inv_id), None)
            if item:
                retrieved_items.append(item)

        # Calculate estimated requirements
        estimated_requirements = self._calculate_requirements(query, retrieved_items)
        
        # Build context with both availability and requirements
        context_lines = []
        for item in retrieved_items:
            item_name = item['item']
            available = item['quantity']
            required = estimated_requirements.get(item_name, 0)
            context_lines.append(f"- {item_name} (Available: {available}, Estimated Need: {required})")

        # Build LLM prompt
        prompt = self._create_prompt(query, context_lines, estimated_requirements)
        response = requests.post(API_URL, headers=HEADERS, json={"inputs": prompt})
        raw = response.json()

        if isinstance(raw, list) and "generated_text" in raw[0]:
            raw_text = raw[0]["generated_text"]
        else:
            raw_text = str(raw)

        structured = self._parse_llm_response(raw_text, prompt)
        validated = self._validate_recommendations(structured)
        return validated, retrieved_items, estimated_requirements

    def _create_prompt(self, query: str, context_lines: List[str], estimated_requirements: Dict) -> str:
        context = "\n".join(context_lines) or "No items available"
        
        # Create a cleaner format for the LLM
        requirements_text = ""
        if estimated_requirements:
            requirements_text = "ESTIMATED NEEDS:\n"
            for item, qty in estimated_requirements.items():
                requirements_text += f"- {item}: {qty}\n"
        
        return f"""You are an expert disaster relief coordinator.

SITUATION: {query}

AVAILABLE INVENTORY:
{context}

{requirements_text}

INSTRUCTIONS:
1. Recommend ONLY from available inventory items listed above.
2. Use exact item names from the inventory.
3. Consider estimated needs but don't exceed available stock.
4. Priorities: Medical > Water > Food > Shelter > Equipment.
5. Return ONLY a valid JSON object with item names as keys and quantities as values.

Example format: {{"Medical Kit": 5, "Water Bottles": 30}}

RECOMMENDATION:"""

    def _parse_llm_response(self, response: str, prompt: str) -> Dict:
        try:
            # Remove the prompt from response
            if prompt in response:
                response = response.replace(prompt, "").strip()
            
            # Find JSON-like content
            start = response.find("{")
            end = response.rfind("}") + 1
            
            if start != -1 and end > start:
                json_str = response[start:end]
                # Clean up the JSON string
                json_str = json_str.replace("'", '"')
                # Remove any trailing text after the JSON
                json_str = re.sub(r'\}.*', '}', json_str, flags=re.DOTALL)
                return json.loads(json_str)
        except Exception as e:
            logger.warning(f"Failed to parse LLM response: {e}")
            # Fallback: try to extract key-value pairs manually
            try:
                items = re.findall(r'"([^"]+)":\s*(\d+)', response)
                return {item: int(qty) for item, qty in items}
            except:
                pass
        
        return {}

    def _validate_recommendations(self, recs: Dict) -> Dict:
        validated = {}
        for name, qty in recs.items():
            # Find item with exact or fuzzy match
            item = self._find_inventory_item(name)
            if item:
                # Ensure quantity is reasonable
                requested_qty = min(int(qty), item["quantity"])
                if requested_qty > 0:
                    validated[item["item"]] = requested_qty
        return validated

    def _find_inventory_item(self, name: str):
        """Find inventory item with fuzzy matching"""
        name_lower = name.lower().strip()
        
        # First try exact match
        for item in self.inventory:
            if item["item"].lower() == name_lower:
                return item
        
        # Then try partial match
        for item in self.inventory:
            if name_lower in item["item"].lower() or item["item"].lower() in name_lower:
                return item
        
        return None

    def allocate_aid(self, recommendations: Dict) -> List[str]:
        logs = []
        successfully_allocated = {}
        
        for item_name, requested_qty in recommendations.items():
            # Find the exact inventory item
            inventory_item = None
            for item in self.inventory:
                if item["item"] == item_name:
                    inventory_item = item
                    break
            
            if inventory_item:
                available_qty = inventory_item["quantity"]
                if available_qty >= requested_qty:
                    # Successful allocation
                    inventory_item["quantity"] -= requested_qty
                    successfully_allocated[item_name] = requested_qty
                    logs.append(f"✅ Allocated {requested_qty} {item_name} (Remaining: {inventory_item['quantity']})")
                else:
                    # Partial allocation
                    if available_qty > 0:
                        inventory_item["quantity"] = 0
                        successfully_allocated[item_name] = available_qty
                        logs.append(f"⚠️ Partially allocated {available_qty} {item_name} (Requested: {requested_qty}, Insufficient stock)")
                    else:
                        logs.append(f"❌ Cannot allocate {item_name} (Out of stock)")
            else:
                logs.append(f"❌ Item not found: {item_name}")
        
        # Save updated inventory
        self._save_index()
        
        if successfully_allocated:
            logs.append(f"\n📊 Total items successfully allocated: {sum(successfully_allocated.values())}")
        
        return logs

    def display_inventory(self):
        print("\n📊 Current Inventory Status:")
        total_items = 0
        by_category = {}
        
        for item in self.inventory:
            print(f"- {item['item']}: {item['quantity']} units (Category: {item.get('category', 'N/A')}, Priority: {item.get('priority', 'N/A')})")
            total_items += item['quantity']
            
            category = item.get('category', 'Other')
            if category not in by_category:
                by_category[category] = 0
            by_category[category] += item['quantity']
        
        print(f"\n📈 Summary: {total_items} total items across {len(by_category)} categories")
        for cat, count in by_category.items():
            print(f"  - {cat.title()}: {count} items")

# Demo
if __name__ == "__main__":
    rag = DisasterReliefRAG()
    print("🌟 Disaster Relief RAG System Initialized")
    
    print("\n📦 Initial Inventory:")
    rag.display_inventory()

    scenarios = [
        "There are 45 people suffering from injuries and dehydration.",
        "Flood victims need shelter and food for 25 people.",
        "Earthquake survivors need medical aid for 30 injured people.",
    ]

    for i, scenario in enumerate(scenarios, 1):
        print(f"\n{'='*60}")
        print(f"🚨 SCENARIO {i}: {scenario}")
        print('='*60)
        
        recs, retrieved, estimated_reqs = rag.recommend_aid(scenario)

        print(f"\n📋 Retrieved Items (Top {len(retrieved)}):")
        for item in retrieved:
            item_name = item['item']
            available = item['quantity']
            estimated = estimated_reqs.get(item_name, 0)
            print(f"- {item_name}:")
            print(f"    Available: {available} units")
            print(f"    Estimated Need: {estimated} units")
            print(f"    Status: {'✅ Sufficient' if available >= estimated else '⚠️ Insufficient'}")

        print(f"\n🎯 AI Recommended Allocation:")
        if recs:
            total_recommended = sum(recs.values())
            print(f"Total items to allocate: {total_recommended}")
            for item_name, qty in recs.items():
                print(f"- {item_name}: {qty} units")
            
            print(f"\n📦 Processing Allocation...")
            logs = rag.allocate_aid(recs)
            for log in logs:
                print(log)
        else:
            print("❌ No valid recommendations generated.")

        rag.display_inventory()
        
        # Add separator between scenarios
        if i < len(scenarios):
            print(f"\n{'🔄 Moving to next scenario...'}")
            print("="*60)