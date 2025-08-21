# planner_prompt.py
from typing import List, Dict, Any
import json
from datetime import datetime
from pydantic import BaseModel, ValidationError, Field

# ---- Strict JSON schema (Pydantic) ----
class ItemQty(BaseModel):
    item: str
    qty: int

class Constraint(BaseModel):
    type: str
    max_minutes: int | None = None
    team: str | None = None
    max_load: int | None = None

class Allocation(BaseModel):
    cluster_id: str
    priority: float = Field(ge=0, le=1)
    items: List[ItemQty]
    assigned_team: str | None = None
    route: List[Dict[str, float]] | None = None  # list of {lat, lon}
    eta_minutes: int | None = None

class Attribution(BaseModel):
    source: str
    timestamp: str | None = None
    version: str | None = None

class Plan(BaseModel):
    objective: str
    assumptions: List[str]
    constraints: List[Constraint]
    allocations: List[Allocation]
    unmet_demand: List[ItemQty]
    source_attributions: List[Attribution]
    summary: str

# ---- Prompts ----
PLAN_SCHEMA_SNIPPET = {
  "objective": "string",
  "assumptions": ["string"],
  "constraints": [{"type": "time", "max_minutes": 120}],
  "allocations": [{
    "cluster_id": "C017",
    "priority": 0.92,
    "items": [{"item": "Water Bottles", "qty": 120}],
    "assigned_team": "BoatTeam-2",
    "route": [{"lat": 18.523, "lon": 73.84}],
    "eta_minutes": 35
  }],
  "unmet_demand": [{"item": "Blankets", "qty": 40}],
  "source_attributions": [{"source": "report:RP1022", "timestamp": "2025-08-18T12:30:00Z"}],
  "summary": "string"
}

SYSTEM_PROMPT = f"""
You are the Flood Relief Planner. You MUST:
1) Use ONLY the provided context documents and inventory snapshot.
2) Return VALID JSON that conforms to the schema below. Do not add extra keys. Do not write any prose outside JSON.
3) Prioritize clusters by vulnerability (children/elderly/injured) and urgency. Respect reachability and stock limits.
4) If any critical info is missing, set fields conservatively and list an assumption.

JSON schema (shape example):
{json.dumps(PLAN_SCHEMA_SNIPPET, ensure_ascii=False)}
"""

USER_TEMPLATE = """
Query: {user_query}

Time window: {time_window}

Inventory snapshot (CSV rows):
{inventory_csv}

Top-K retrieved context (include meta.id/index/created_at):
{context_blocks}
"""

# ---- Helper to build the final prompt inputs ----
def render_planner_prompt(inventory_df, retrieved_docs: List[Dict[str, Any]], user_query: str,
                          time_window: str = "last 6 hours") -> Dict[str, str]:
    inv_csv = inventory_df.to_csv(index=False)
    ctx_lines = []
    for d in retrieved_docs:
        meta = d.get("meta", {}) or {k: d.get(k) for k in ("id","index","created_at")}
        ctx_lines.append(
            f"[id={meta.get('id')}] [index={meta.get('index')}] [created_at={meta.get('created_at')}]\n{d.get('text') or d.get('content')}"
        )
    context_blocks = "\n\n".join(ctx_lines[:10])
    prompt = USER_TEMPLATE.format(
        user_query=user_query,
        time_window=time_window,
        inventory_csv=inv_csv,
        context_blocks=context_blocks
    )
    return {"system": SYSTEM_PROMPT, "user": prompt}

# ---- JSON validation for the LLM output ----
def validate_plan_json(raw_text: str) -> Plan:
    """Extract JSON from raw_text (if the model wrapped it) and validate against Plan schema."""
    start = raw_text.find("{")
    end = raw_text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in LLM output")
    obj = json.loads(raw_text[start:end+1])
    try:
        return Plan.model_validate(obj)
    except ValidationError as e:
        raise ValueError(f"Plan JSON failed validation: {e}")

# ---- Example usage (pseudo LLM call) ----
if __name__ == "__main__":
    import pandas as pd
    # Example inventory
    inventory_df = pd.DataFrame([
        {"Resource": "Water Bottles", "Quantity": 120},
        {"Resource": "Food Packets", "Quantity": 150},
        {"Resource": "Medical Kits", "Quantity": 5},
    ])

    # Example retrieved documents (pretend these are retrieved via FAISS/RAG)
    docs = [
        {"meta": {"id": "RP1022", "index": "report", "created_at": datetime.utcnow().isoformat()+"Z"},
         "text": "20 people including children near Sinhagad village stranded on rooftops, urgent need for water and medical aid."},
        {"meta": {"id": "RP1023", "index": "report", "created_at": datetime.utcnow().isoformat()+"Z"},
         "text": "Elderly group stuck near Warje bridge, access possible only via boat, need food packets urgently."}
    ]

    user_query = "Create a 6-hour flood relief allocation plan for the most vulnerable clusters."

    # Build prompt
    prompt = render_planner_prompt(inventory_df, docs, user_query)
    print("=== SYSTEM PROMPT ===")
    print(prompt["system"])
    print("\n=== USER PROMPT ===")
    print(prompt["user"])

    # Simulated model output (this is what the LLM *should* return)
    raw_model_output = json.dumps({
        "objective": "Deliver urgent relief to vulnerable groups in flooded clusters.",
        "assumptions": ["Boat can reach Warje bridge within 30 minutes."],
        "constraints": [{"type": "time", "max_minutes": 360}],
        "allocations": [
            {
                "cluster_id": "C001",
                "priority": 0.95,
                "items": [{"item": "Water Bottles", "qty": 50}, {"item": "Medical Kits", "qty": 2}],
                "assigned_team": "BoatTeam-1",
                "route": [{"lat": 18.456, "lon": 73.789}],
                "eta_minutes": 40
            },
            {
                "cluster_id": "C002",
                "priority": 0.85,
                "items": [{"item": "Food Packets", "qty": 80}],
                "assigned_team": "BoatTeam-2",
                "route": [{"lat": 18.487, "lon": 73.812}],
                "eta_minutes": 50
            }
        ],
        "unmet_demand": [{"item": "Medical Kits", "qty": 3}],
        "source_attributions": [{"source": "report:RP1022", "timestamp": datetime.utcnow().isoformat()+"Z"}],
        "summary": "Water and medical kits sent to Sinhagad. Food packets dispatched to Warje. Limited medical kits remain."
    }, indent=2)

    print("\n=== RAW MODEL OUTPUT ===")
    print(raw_model_output)

    # Validate model output
    validated_plan = validate_plan_json(raw_model_output)
    print("\n=== VALIDATED PLAN ===")
    print(validated_plan.model_dump(indent=2))
