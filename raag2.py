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
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
# logger = logging.getLogger(__name__)

# Hugging Face API config
API_URL = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct"


@dataclass
class InventoryItem:
    id: int
    item: str
    quantity: int
    category: Optional[str] = None
    priority: Optional[int] = 1

class DisasterReliefRAG:
    def __init__(self, embedder_model: str = "sentence-transformers/all-MiniLM-L6-v2", index_path: str = "inventory.index", inventory_path: str = "inventory.pkl"):
        self.embedder_model = embedder_model
        self.index_path = index_path
        self.inventory_path = inventory_path

        # Initial inventory with higher quantities for testing
        self.inventory = [
            {"id": 1, "item": "Medical Kit", "quantity": 50, "category": "medical", "priority": 1},
            {"id": 2, "item": "Emergency Food Pack", "quantity": 100, "category": "food", "priority": 2},
            {"id": 3, "item": "Water Bottles", "quantity": 300, "category": "water", "priority": 1},
            {"id": 4, "item": "Rescue Tubes", "quantity": 30, "category": "rescue", "priority": 2},
            {"id": 5, "item": "Blankets", "quantity": 80, "category": "shelter", "priority": 2},
            {"id": 6, "item": "First Aid Bandages", "quantity": 500, "category": "medical", "priority": 1},
            {"id": 7, "item": "Flashlights", "quantity": 50, "category": "equipment", "priority": 3},
            {"id": 8, "item": "Batteries", "quantity": 200, "category": "equipment", "priority": 3},
            {"id": 9, "item": "Tents", "quantity": 25, "category": "shelter", "priority": 2},
            {"id": 10, "item": "Antibiotics", "quantity": 150, "category": "medical", "priority": 1},
        ]

        # Track initial inventory for comparison
        self.initial_inventory = {item["item"]: item["quantity"] for item in self.inventory}
        
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
        numbers = re.findall(r'\b(\d+)\s*(?:people|person|individuals|victims|casualties|injured|survivors)', query.lower())
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
                if 'injuries' in query.lower() or 'injured' in query.lower():
                    if category == 'medical':
                        base_requirement *= 1.5  # Increase medical supplies for injuries
                
                if 'dehydration' in query.lower() and category == 'water':
                    base_requirement *= 1.5  # Increase water for dehydration
                
                if 'flood' in query.lower():
                    if category in ['shelter', 'water']:
                        base_requirement *= 1.3  # Increase shelter and water for floods
                
                if 'earthquake' in query.lower():
                    if category == 'medical':
                        base_requirement *= 1.5  # More medical supplies for earthquake injuries
                
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
        
        # If LLM doesn't provide recommendations, use estimated requirements
        if not structured:
            structured = self._create_fallback_recommendations(estimated_requirements)
        
        validated = self._validate_recommendations(structured)
        return validated, retrieved_items, estimated_requirements

    def _create_fallback_recommendations(self, estimated_requirements: Dict) -> Dict:
        """Create recommendations based on estimated requirements if LLM fails"""
        recommendations = {}
        for item_name, required_qty in estimated_requirements.items():
            # Find the item in inventory
            for item in self.inventory:
                if item["item"] == item_name:
                    # Recommend minimum of required and available
                    recommendations[item_name] = min(required_qty, item["quantity"])
                    break
        return recommendations

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
4. Allocate the minimum of estimated need and available stock.
5. Priorities: Medical > Water > Food > Shelter > Equipment.
6. Return ONLY a valid JSON object with item names as keys and quantities as values.

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
                # Ensure quantity is reasonable and available
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
                initial_qty = self.initial_inventory.get(item_name, 0)
                
                if available_qty >= requested_qty:
                    # Successful allocation
                    inventory_item["quantity"] -= requested_qty
                    successfully_allocated[item_name] = requested_qty
                    logs.append(f"✅ Allocated {requested_qty} {item_name}")
                    logs.append(f"   Stock: {available_qty} → {inventory_item['quantity']} (Used: {initial_qty - inventory_item['quantity']} total)")
                else:
                    # Partial allocation
                    if available_qty > 0:
                        inventory_item["quantity"] = 0
                        successfully_allocated[item_name] = available_qty
                        logs.append(f"⚠️ Partially allocated {available_qty} {item_name} (Requested: {requested_qty})")
                        logs.append(f"   Stock: {available_qty} → 0 (Exhausted)")
                    else:
                        logs.append(f"❌ Cannot allocate {item_name} (Out of stock)")
            else:
                logs.append(f"❌ Item not found: {item_name}")
        
        # Save updated inventory
        self._save_index()
        
        if successfully_allocated:
            logs.append(f"\n📊 Allocation Summary:")
            logs.append(f"   Items allocated: {len(successfully_allocated)}")
            logs.append(f"   Total units: {sum(successfully_allocated.values())}")
        
        return logs

    def display_inventory(self, show_usage: bool = False):
        print("\n📊 Current Inventory Status:")
        print("-" * 60)
        
        total_items = 0
        total_used = 0
        by_category = {}
        
        for item in self.inventory:
            current_qty = item['quantity']
            initial_qty = self.initial_inventory.get(item['item'], 0)
            used_qty = initial_qty - current_qty
            total_used += used_qty
            
            status = "✅" if current_qty > 10 else ("⚠️" if current_qty > 0 else "❌")
            
            if show_usage and used_qty > 0:
                print(f"{status} {item['item']}: {current_qty}/{initial_qty} units (Used: {used_qty})")
            else:
                print(f"{status} {item['item']}: {current_qty} units (Category: {item.get('category', 'N/A')})")
            
            total_items += current_qty
            
            category = item.get('category', 'Other')
            if category not in by_category:
                by_category[category] = 0
            by_category[category] += current_qty
        
        print("-" * 60)
        print(f"📈 Summary:")
        print(f"   Total remaining: {total_items} units")
        if show_usage:
            print(f"   Total allocated: {total_used} units")
        print(f"   Categories: {len(by_category)}")
        
        for cat, count in sorted(by_category.items()):
            percentage = (count / total_items * 100) if total_items > 0 else 0
            print(f"   - {cat.title()}: {count} items ({percentage:.1f}%)")

# Demo
if __name__ == "__main__":
    rag = DisasterReliefRAG()
    print("🌟 Disaster Relief RAG System Initialized")
    print("=" * 60)
    
    print("\n📦 INITIAL INVENTORY:")
    rag.display_inventory(show_usage=False)

    scenarios = [
        "There are 45 people suffering from injuries and dehydration.",
        "Flood victims need shelter and food for 25 people.",
        "Earthquake survivors need medical aid for 30 injured people.",
    ]

    for i, scenario in enumerate(scenarios, 1):
        print(f"\n{'='*60}")
        print(f"🚨 SCENARIO {i}: {scenario}")
        print('='*60)
        
        # Get recommendations
        recs, retrieved, estimated_reqs = rag.recommend_aid(scenario)

        print(f"\n📋 Analysis Results:")
        print(f"People count detected: {rag._extract_people_count(scenario)}")
        
        print(f"\n📋 Retrieved Items (Top {len(retrieved)}):")
        for item in retrieved:
            item_name = item['item']
            available = item['quantity']
            estimated = estimated_reqs.get(item_name, 0)
            status_emoji = '✅' if available >= estimated else '⚠️'
            print(f"{status_emoji} {item_name}:")
            print(f"    Available: {available} units")
            print(f"    Estimated Need: {estimated} units")
            print(f"    Status: {'Sufficient' if available >= estimated else f'Short by {estimated - available} units'}")

        print(f"\n🎯 AI Recommended Allocation:")
        if recs:
            total_recommended = sum(recs.values())
            print(f"Total items to allocate: {total_recommended} units")
            for item_name, qty in recs.items():
                # Find current availability
                current_stock = next((item['quantity'] for item in rag.inventory if item['item'] == item_name), 0)
                print(f"  • {item_name}: {qty} units (from {current_stock} available)")
            
            print(f"\n📦 Processing Allocation...")
            print("-" * 40)
            logs = rag.allocate_aid(recs)
            for log in logs:
                print(log)
        else:
            print("❌ No valid recommendations generated.")

        print(f"\n📊 UPDATED INVENTORY (After Scenario {i}):")
        rag.display_inventory(show_usage=True)
        
        # Add separator between scenarios
        if i < len(scenarios):
            print(f"\n{'🔄 Moving to next scenario...'}")
            input("Press Enter to continue...")  # Optional: pause between scenarios
            print("="*60)