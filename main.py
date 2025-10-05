from flask import Flask, request, jsonify
from flask_cors import CORS
from haystack.document_stores import InMemoryDocumentStore
from haystack.nodes import BM25Retriever
from haystack import Document
import pandas as pd
import numpy as np

app = Flask(__name__)
CORS(app)

# Initialize Haystack
document_store = InMemoryDocumentStore()

# Load and process drone data
def load_drone_data():
    df = pd.read_csv('drone_data.csv')
    docs = []
    for _, row in df.iterrows():
        content = f"""Cluster ID: {row['Cluster_ID']}
        People: {row['No_of_People']}
        Location: {row['Latitude']}, {row['Longitude']}
        Distance: {row['Distance_from_Inventory_km']} km"""
        
        doc = Document(
            content=content,
            meta={
                'cluster_id': row['Cluster_ID'],
                'people': row['No_of_People'],
                'latitude': row['Latitude'],
                'longitude': row['Longitude'],
                'distance': row['Distance_from_Inventory_km']
            }
        )
        docs.append(doc)
    
    document_store.write_documents(docs)
    return df

# Initialize retriever
retriever = BM25Retriever(document_store=document_store)

# Load data on startup
drone_df = load_drone_data()

@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    try:
        # Get query parameters
        min_people = int(request.args.get('min_people', 0))
        max_distance = float(request.args.get('max_distance', 100))
        
        # Filter clusters based on criteria
        filtered_df = drone_df[
            (drone_df['No_of_People'] >= min_people) & 
            (drone_df['Distance_from_Inventory_km'] <= max_distance)
        ]
        
        # Sort by priority (more people, closer distance)
        filtered_df['priority_score'] = (
            filtered_df['No_of_People'] / filtered_df['No_of_People'].max() -
            filtered_df['Distance_from_Inventory_km'] / filtered_df['Distance_from_Inventory_km'].max()
        )
        
        filtered_df = filtered_df.sort_values('priority_score', ascending=False)
        
        # Get top 5 recommendations
        recommendations = filtered_df.head(5).to_dict('records')
        
        # Calculate resource allocations
        for rec in recommendations:
            people = rec['No_of_People']
            rec['recommended_resources'] = {
                'Medical Kits': int(people * 0.2),
                'Food Packets': int(people * 1),
                'Water Bottles': int(people * 3),
                'Blankets': int(people * 1),
                'Emergency Kits': int(people * 0.5)
            }
        
        return jsonify({
            'success': True,
            'recommendations': recommendations
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)