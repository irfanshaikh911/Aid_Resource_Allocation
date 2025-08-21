from sentence_transformers import SentenceTransformer
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
import faiss
import numpy as np
import pickle
import json
import os
import logging
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from huggingface_hub import login

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Hugging Face authentication
# Note: Store token as environment variable for security
# HF_TOKEN = "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"
# login(token=HF_TOKEN)
import requests

# Replace with the specific model's API URL and your Hugging Face token
API_URL = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct"
HEADERS = {"Authorization": "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"} # Replace YOUR_HUGGING_FACE_TOKEN


@dataclass
class InventoryItem:
    """Data class for inventory items"""
    id: int
    item: str
    quantity: int
    category: Optional[str] = None
    priority: Optional[int] = 1

class DisasterReliefRAG:
    """Enhanced Disaster Relief Recommendation System using RAG"""
    
    def __init__(self, model_name: str = 'meta-llama/Llama-3.2-1B', 
                 embedder_model: str = "all-MiniLM-L6-v2",
                 index_path: str = "inventory.index",
                 inventory_path: str = "inventory.pkl"):
        
        self.model_name = model_name
        self.embedder_model = embedder_model
        self.index_path = index_path
        self.inventory_path = inventory_path
        
        # Initialize inventory with enhanced metadata
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
        
        # Initialize models
        self._initialize_embedder()
        self._initialize_llm()
        self._build_index()
    
    def _initialize_embedder(self):
        """Initialize the sentence transformer model"""
        try:
            self.embedder = SentenceTransformer(self.embedder_model)
            self.embedding_dim = 384  # for all-MiniLM-L6-v2
            logger.info(f"Embedder initialized: {self.embedder_model}")
        except Exception as e:
            logger.error(f"Failed to initialize embedder: {e}")
            raise
    
    def _initialize_llm(self):
        """Initialize the language model with proper configurations"""
        try:
            # Set padding token to avoid warnings
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                torch_dtype="auto",  # Automatically choose optimal dtype
                low_cpu_mem_usage=True
            )
            
            self.llm = pipeline(
                "text-generation",
                model=self.model,
                tokenizer=self.tokenizer,
                device=-1,  # CPU; change to 0 for GPU
                max_new_tokens=200,
                temperature=0.7,
                do_sample=True,
                top_p=0.95,
                pad_token_id=self.tokenizer.pad_token_id
            )
            logger.info(f"LLM initialized: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to initialize LLM: {e}")
            raise
    
    def _build_index(self):
        """Build FAISS index with improved embedding handling"""
        try:
            # Create FAISS index
            self.index = faiss.IndexFlatL2(self.embedding_dim)
            
            # Generate embeddings with enhanced descriptions
            self.id_map = []
            embeddings = []
            
            for item in self.inventory:
                # Create enriched description for better semantic search
                description = f"{item['item']} {item.get('category', '')} emergency disaster relief supply"
                emb = self.embedder.encode(description, convert_to_numpy=True)
                embeddings.append(emb)
                self.id_map.append(item["id"])
            
            # Convert to numpy array and add to index
            embeddings_array = np.vstack(embeddings).astype("float32")
            self.index.add(embeddings_array)
            
            # Save index and inventory
            self._save_index()
            logger.info(f"Index built with {len(self.inventory)} items")
            
        except Exception as e:
            logger.error(f"Failed to build index: {e}")
            raise
    
    def _save_index(self):
        """Save FAISS index and inventory to disk"""
        try:
            faiss.write_index(self.index, self.index_path)
            with open(self.inventory_path, "wb") as f:
                pickle.dump((self.inventory, self.id_map), f)
            logger.info("Index and inventory saved successfully")
        except Exception as e:
            logger.error(f"Failed to save index: {e}")
            raise
    
    def _load_index(self):
        """Load FAISS index and inventory from disk"""
        try:
            self.index = faiss.read_index(self.index_path)
            with open(self.inventory_path, "rb") as f:
                self.inventory, self.id_map = pickle.load(f)
            logger.info("Index and inventory loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load index: {e}")
            raise
    
    def recommend_aid(self, query: str, top_k: int = 5) -> Tuple[Dict, List]:
        """
        Generate aid recommendations based on the query
        
        Args:
            query: Description of the disaster situation
            top_k: Number of top items to retrieve
        
        Returns:
            Tuple of (structured recommendations, retrieved items)
        """
        try:
            # Enhance query for better retrieval
            enhanced_query = f"disaster relief emergency: {query}"
            
            # Encode query and search
            query_embedding = self.embedder.encode(enhanced_query, convert_to_numpy=True)
            query_embedding = query_embedding.astype("float32").reshape(1, -1)
            
            distances, indices = self.index.search(query_embedding, min(top_k, len(self.inventory)))
            
            # Retrieve relevant items
            retrieved_items = []
            context_lines = []
            
            for idx, distance in zip(indices[0], distances[0]):
                if idx < len(self.id_map):  # Ensure valid index
                    inv_id = self.id_map[idx]
                    item = next((i for i in self.inventory if i["id"] == inv_id), None)
                    if item:
                        retrieved_items.append(item)
                        context_lines.append(
                            f"- {item['item']} (Available: {item['quantity']}, "
                            f"Category: {item.get('category', 'general')})"
                        )
            
            # Generate LLM prompt with better structure
            prompt = self._create_prompt(query, context_lines)
            
            # Get LLM response
            response = self.llm(prompt)[0]["generated_text"]
            
            # Extract structured output
            structured_output = self._parse_llm_response(response, prompt)
            
            # Validate recommendations against inventory
            validated_output = self._validate_recommendations(structured_output)
            
            return validated_output, retrieved_items
            
        except Exception as e:
            logger.error(f"Failed to generate recommendations: {e}")
            return {}, []
    
    def _create_prompt(self, query: str, context_lines: List[str]) -> str:
        """Create an optimized prompt for the LLM"""
        context = "\n".join(context_lines) if context_lines else "No items available"
        
        prompt = f"""You are an expert disaster relief coordinator. Analyze the situation and recommend supplies.

SITUATION: {query}

AVAILABLE INVENTORY:
{context}

INSTRUCTIONS:
1. Recommend only items from the available inventory
2. Consider priority: Medical > Water > Food > Shelter > Equipment
3. Do not exceed available quantities
4. Return ONLY a JSON object with item names as keys and quantities as values

RESPONSE FORMAT (JSON only):
{{
  "Item Name": quantity,
  "Another Item": quantity
}}

RECOMMENDATION:"""
        
        return prompt
    
    def _parse_llm_response(self, response: str, prompt: str) -> Dict:
        """Parse LLM response to extract JSON"""
        try:
            # Remove the prompt from response if present
            if prompt in response:
                response = response.replace(prompt, "").strip()
            
            # Find JSON in response
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            
            if json_start != -1 and json_end > json_start:
                json_str = response[json_start:json_end]
                # Clean up common issues
                json_str = json_str.replace("'", '"')  # Replace single quotes
                return json.loads(json_str)
            else:
                logger.warning("No valid JSON found in LLM response")
                return {}
                
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing failed: {e}")
            return {}
        except Exception as e:
            logger.error(f"Unexpected error parsing response: {e}")
            return {}
    
    def _validate_recommendations(self, recommendations: Dict) -> Dict:
        """Validate recommendations against current inventory"""
        validated = {}
        
        for item_name, requested_qty in recommendations.items():
            # Find matching inventory item
            inventory_item = next(
                (i for i in self.inventory if i["item"].lower() == item_name.lower()),
                None
            )
            
            if inventory_item:
                # Ensure we don't exceed available quantity
                available = inventory_item["quantity"]
                if isinstance(requested_qty, (int, float)) and requested_qty > 0:
                    validated[inventory_item["item"]] = min(int(requested_qty), available)
                    
        return validated
    
    def accept_recommendation(self, updates: Dict) -> bool:
        """
        Update inventory based on accepted recommendations
        
        Args:
            updates: Dictionary of item names and quantities to allocate
        
        Returns:
            Boolean indicating success
        """
        try:
            allocation_log = []
            
            for item in self.inventory:
                if item["item"] in updates:
                    requested_qty = updates[item["item"]]
                    
                    if isinstance(requested_qty, int) and requested_qty > 0:
                        if item["quantity"] >= requested_qty:
                            item["quantity"] -= requested_qty
                            allocation_log.append(
                                f"✅ Allocated {requested_qty} {item['item']}(s). "
                                f"Remaining: {item['quantity']}"
                            )
                        else:
                            allocation_log.append(
                                f"⚠️ Insufficient stock for {item['item']}. "
                                f"Requested: {requested_qty}, Available: {item['quantity']}"
                            )
            
            # Save updated inventory
            self._save_index()
            
            # Log all allocations
            for log in allocation_log:
                logger.info(log)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to update inventory: {e}")
            return False
    
    def get_inventory_status(self) -> Dict:
        """Get current inventory status summary"""
        status = {
            "total_items": len(self.inventory),
            "categories": {},
            "low_stock_items": [],
            "total_quantity": 0
        }
        
        for item in self.inventory:
            category = item.get("category", "general")
            if category not in status["categories"]:
                status["categories"][category] = {"items": 0, "total_quantity": 0}
            
            status["categories"][category]["items"] += 1
            status["categories"][category]["total_quantity"] += item["quantity"]
            status["total_quantity"] += item["quantity"]
            
            # Flag low stock items (less than 10 units)
            if item["quantity"] < 10:
                status["low_stock_items"].append({
                    "item": item["item"],
                    "quantity": item["quantity"]
                })
        
        return status


# Example usage and testing
def main():
    """Main function to demonstrate the system"""
    
    # Initialize the system
    logger.info("Initializing Disaster Relief RAG System...")
    rag_system = DisasterReliefRAG()
    
    # Test scenarios
    test_scenarios = [
        "There are 12 people suffering from injuries and severe dehydration in a remote area.",
        "Flash flood victims need immediate shelter and food for 25 people including 8 children.",
        "Emergency medical situation with 5 people requiring first aid and antibiotics.",
    ]
    
    for i, scenario in enumerate(test_scenarios, 1):
        logger.info(f"\n{'='*60}")
        logger.info(f"Scenario {i}: {scenario}")
        logger.info('='*60)
        
        # Get recommendations
        recommendations, retrieved_items = rag_system.recommend_aid(scenario)
        
        # Display results
        print(f"\n📋 Retrieved Items:")
        for item in retrieved_items[:3]:  # Show top 3 retrieved items
            print(f"  - {item['item']} (Available: {item['quantity']})")
        
        print(f"\n🎯 AI Recommendations:")
        if recommendations:
            for item, qty in recommendations.items():
                print(f"  - {item}: {qty} units")
            
            # Simulate accepting recommendations
            print("\n📦 Processing allocation...")
            rag_system.accept_recommendation(recommendations)
        else:
            print("  No valid recommendations generated.")
        
        # Show inventory status
        status = rag_system.get_inventory_status()
        print(f"\n📊 Inventory Status:")
        print(f"  Total items in system: {status['total_items']}")
        print(f"  Total quantity remaining: {status['total_quantity']}")
        if status['low_stock_items']:
            print(f"  ⚠️ Low stock alerts: {len(status['low_stock_items'])} items")


if __name__ == "__main__":
    main()