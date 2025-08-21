# api.py
from fastapi import FastAPI
from pydantic import BaseModel
from haystack.document_stores import FAISSDocumentStore
from haystack import Pipeline
from haystack.components.embedders import SentenceTransformersTextEmbedder
from haystack.components.retrievers import InMemoryEmbeddingRetriever
import pandas as pd
import orjson

app = FastAPI()
store = FAISSDocumentStore.load(index_path=None)
embed = SentenceTransformersTextEmbedder(model="sentence-transformers/all-MiniLM-L6-v2")
retriever = InMemoryEmbeddingRetriever(document_store=store, top_k=10)
pipe = Pipeline()
pipe.add_component("embed", embed)
pipe.add_component("ret", retriever)
pipe.connect("embed.documents", "ret.query_embedding")

inventory_df = pd.read_csv("/mnt/data/inventory_data.csv")

class Query(BaseModel):
    user_query: str

@app.post("/plan")
async def plan(q: Query):
    r = pipe.run(data={"embed": {"text": q.user_query}})
    docs = [
        {"id": d.meta.get("id"), "index": d.meta.get("index"), "created_at": d.meta.get("created_at"), "text": d.content}
        for d in r["ret"]["documents"]
    ]
    inv_table = inventory_df.to_dict(orient="records")
    # TODO: call LLM with SYSTEM_PROMPT/USER_TEMPLATE, then run optimizer.
    return orjson.dumps({
        "retrieved": docs,
        "inventory": inv_table,
        "plan": {"status": "NOT_IMPLEMENTED", "message": "Connect LLM + optimizer"}
    }).decode()