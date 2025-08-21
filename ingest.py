# ingest.py
from datetime import datetime
import pandas as pd
from haystack import Document
from haystack.document_stores import FAISSDocumentStore
from haystack.components.preprocessors import DocumentSplitter
from haystack.components.embedders import SentenceTransformersTextEmbedder
from haystack.components.writers import DocumentWriter

# 1) Init stores & components
store = FAISSDocumentStore(embedding_dim=384, faiss_index_factory_str="Flat")
splitter = DocumentSplitter(split_by="word", split_length=180, split_overlap=40)
embedder = SentenceTransformersTextEmbedder(model="sentence-transformers/all-MiniLM-L6-v2")
writer = DocumentWriter(document_store=store)

# 2) Load CSVs you already created
clusters = pd.read_csv("/mnt/data/drone_data.csv")
inv = pd.read_csv("/mnt/data/inventory_data.csv")
now = datetime.utcnow().isoformat() + "Z"

# 3) Build documents
protocol_docs = [
    Document(
        content="Follow triage: stabilize airway, stop bleeding, prioritize elderly/children; floods: beware electric lines.",
        meta={"index": "protocol", "id": "SOP-TRIAGE-3.2", "version": "3.2", "created_at": now}
    )
]

report_docs = [
    Document(
        content="20 people need water near Sinhagad Rd; approach by boat; road to depot blocked.",
        meta={"index": "report", "id": "RP1022", "lat": 18.47, "lon": 73.82, "created_at": now, "tags": ["water", "road_blocked"]}
    )
]

situation_docs = []
for _, r in clusters.iterrows():
    txt = (
        f"Cluster {r['Cluster_ID']}: {int(r['No_of_People'])} people at "
        f"({float(r['Latitude']):.5f}, {float(r['Longitude']):.5f}); "
        f"distance {float(r['Distance_from_Inventory_km']):.2f} km from depot."
    )
    situation_docs.append(Document(
        content=txt,
        meta={
            "index": "situation",
            "id": f"SIT-{r['Cluster_ID']}",
            "cluster_id": r['Cluster_ID'],
            "lat": float(r['Latitude']),
            "lon": float(r['Longitude']),
            "created_at": now
        }
    ))

# Represent inventory as short docs for retrieval (plus keep the table for the planner)
inv_docs = []
for _, r in inv.iterrows():
    inv_docs.append(Document(
        content=f"Inventory: {r['Resource']} = {int(r['Quantity'])} units at depot (18.5204, 73.8567).",
        meta={"index": "inventory", "id": f"INV-{r['Resource']}", "created_at": now}
    ))

all_docs = protocol_docs + report_docs + situation_docs + inv_docs

# 4) Split → Embed → Write
chunks = splitter.run(all_docs)["documents"]
emb = embedder.run(chunks)
emb_docs = emb["documents"]
writer.run(emb_docs)

print(f"Indexed {len(emb_docs)} chunks")