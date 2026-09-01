from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
import time
import os
import sys

# Add backend dir to path for imports if running directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import get_db, engine, Base
from app.models import Case, Action, Event, Customer
from app.core.orchestrator import Orchestrator
from app.core.ledger import verify_chain

app = FastAPI(title="RecoverOS API")

# Setup CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In prod, restrict to vercel URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/demo/run_batch")
def run_batch(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Run synchronously for the demo so the user can see it complete fast, 
    # or background it and use SSE. Since requirement is < 90s, we can just run it.
    
    start_time = time.time()
    orch = Orchestrator(db)
    orch.run_batch()
    duration = time.time() - start_time
    
    return {"status": "completed", "duration_seconds": round(duration, 2)}

@app.get("/api/audit/verify")
def verify_audit_ledger(db: Session = Depends(get_db)):
    return verify_chain(db)

@app.post("/api/demo/tamper")
def tamper_ledger(db: Session = Depends(get_db)):
    # Deliberately modify an event to break the hash chain
    event = db.query(Event).filter(Event.action == "OUTCOME").first()
    if not event:
        event = db.query(Event).first()
        
    if not event:
        raise HTTPException(status_code=400, detail="No events to tamper with")
        
    # Tamper!
    if isinstance(event.payload_json, dict):
        event.payload_json["amount"] = 9999999
        # Need to force SQLAlchemy to detect JSON change if it doesn't automatically
        event.payload_json = dict(event.payload_json) 
    
    db.commit()
    return {"status": "tampered", "event_id": event.event_id}

@app.get("/api/demo/stats")
def get_stats(db: Session = Depends(get_db)):
    # Rough stats for dashboard
    total_cases = db.query(Case).count()
    total_risk = db.query(func.sum(Case.amount_at_risk_paise)).scalar() or 0
    total_recovered = db.query(func.sum(Case.recovered_paise)).scalar() or 0
    total_cost = db.query(func.sum(Case.intervention_cost_paise)).scalar() or 0
    
    # Lift calculations (Treatment vs Control)
    treatment_cases = db.query(Case).filter(Case.arm == "treatment").all()
    control_cases = db.query(Case).filter(Case.arm == "control").all()
    
    t_recovered = sum(1 for c in treatment_cases if c.state == "RECOVERED")
    c_recovered = sum(1 for c in control_cases if c.state == "RECOVERED")
    
    t_rate = (t_recovered / len(treatment_cases)) if treatment_cases else 0
    c_rate = (c_recovered / len(control_cases)) if control_cases else 0
    
    net_lift = t_rate - c_rate
    incremental_money = net_lift * len(treatment_cases) * (total_risk / total_cases if total_cases else 0)
    
    return {
        "at_risk_rupees": total_risk / 100,
        "recovered_rupees": total_recovered / 100,
        "intervention_cost_rupees": total_cost / 100,
        "treatment_recovery_rate": round(t_rate * 100, 2),
        "control_recovery_rate": round(c_rate * 100, 2),
        "net_lift_pp": round(net_lift * 100, 2),
        "incremental_rupees": incremental_money / 100,
        "roi": (incremental_money / total_cost) if total_cost > 0 else 0
    }

@app.get("/api/cases/{case_id}")
def get_case_detail(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    events = db.query(Event).filter(Event.entity_id == case_id).order_by(Event.ts).all()
    actions = db.query(Action).filter(Action.case_id == case_id).all()
    
    return {
        "case": {c.name: getattr(case, c.name) for c in case.__table__.columns},
        "events": [{c.name: getattr(e, c.name) for c in e.__table__.columns} for e in events],
        "actions": [{c.name: getattr(a, c.name) for c in a.__table__.columns} for a in actions]
    }
