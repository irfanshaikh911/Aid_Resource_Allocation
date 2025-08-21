# retrieve.py
from datetime import datetime, timedelta
from haystack import Pipeline
from haystack.components.retrievers import InMemoryEmbeddingRetriever
from haystack.components.embedders import SentenceTransformersTextEmbedder
from haystack.document_stores import FAISSDocumentStore

store = FAISSDocumentStore.load(index_path=None)  # or reuse the same instance
embed = SentenceTransformersTextEmbedder(model="sentence-transformers/all-MiniLM-L6-v2")
retriever = InMemoryEmbeddingRetriever(document_store=store, top_k=12)

pipe = Pipeline()
pipe.add_component("embed", embed)
pipe.add_component("ret", retriever)
pipe.connect("embed.documents", "ret.query_embedding")

# Helper filter
def meta_filter_recent_geo(hours=6, center=None, radius_km=None):
    cutoff = (datetime.utcnow() - timedelta(hours=hours)).isoformat() + "Z"
    f = {"operator": "AND", "conditions": [{"field": "created_at", "operator": ">=", "value": cutoff}]}
    # Geo filtering via client-side post-filtering: retrieve more, then prune by haversine
    return f

# Run
query = "urgent medical help for children near blocked roads; routes by boat"
res = pipe.run(data={"embed": {"text": query}, "ret": {"filters": meta_filter_recent_geo(hours=24)}})
for d in res["ret"]["documents"]:
    print(d.meta.get("index"), d.content[:120], d.meta.get("created_at"))