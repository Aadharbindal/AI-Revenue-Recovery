"""
Running a batch, live.

`/api/batch/stream` is a Server-Sent Events endpoint: the orchestrator emits an
event per tick and the browser watches cases move through classification, the
gates, and delivery in real time. Watching a guardrail refuse an action as it
happens is considerably more convincing than reading that it did.
"""

import json
import queue
import threading
import time

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core import ledger
from app.core.orchestrator import Orchestrator
from app.db import SessionLocal, get_db
from app.models import Action, Case, Event

router = APIRouter(prefix="/api", tags=["batch"])


def _reset(db: Session):
    """
    Rewind to the seeded state so a batch can be re-run during a demo.

    Only derived rows are cleared — the dataset itself is untouched, so the
    re-run is the same experiment, not a different one.
    """
    db.query(Event).delete()
    db.query(Action).filter(Action.tick >= 0).delete()
    for case in db.query(Case):
        case.state = "OPEN"
        case.recovery_class = None
        case.rule_id = None
        case.touches_used = 0
        case.last_touch_at = None
        case.resolution = None
        case.resolved_at = None
        case.resolved_tick = None
        case.recovered_paise = 0
        case.intervention_cost_paise = 0
        case.promise_date = None
        case.exception_reason = None

    from app.models import Order
    for order in db.query(Order).filter(Order.status == "paid"):
        # Orders the *agent* recovered go back to unpaid; the ones planted as
        # already-settled traps stay paid, or the trap would vanish on re-run.
        if order.external_settlement_tick is None:
            order.status = "abandoned"

    db.commit()
    ledger.reset_head_cache()


@router.post("/batch/run")
def run_batch(db: Session = Depends(get_db), reset: bool = True):
    """Run a full batch synchronously and return the summary."""
    if reset:
        _reset(db)
    started = time.time()
    summary = Orchestrator(db).run()
    summary["duration_seconds"] = round(time.time() - started, 2)
    return summary


@router.get("/batch/stream")
def stream_batch(reset: bool = True):
    """
    Run a batch on a worker thread and stream its progress as SSE.

    The orchestrator gets its own session: SQLAlchemy sessions are not
    thread-safe, and sharing the request's session would corrupt state in a way
    that only shows up under load.
    """
    events: "queue.Queue[dict]" = queue.Queue()

    def worker():
        db = SessionLocal()
        try:
            if reset:
                _reset(db)
            summary = Orchestrator(db, emit=events.put).run()
            events.put({"type": "done", "summary": summary})
        except Exception as exc:  # a dead stream is worse than an error message
            events.put({"type": "error", "message": f"{type(exc).__name__}: {exc}"})
        finally:
            db.close()
            events.put({"type": "__eof__"})

    threading.Thread(target=worker, daemon=True).start()

    def generate():
        while True:
            event = events.get()
            if event.get("type") == "__eof__":
                return
            yield f"data: {json.dumps(event, default=str)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # Nginx and most PaaS proxies buffer by default, which turns a live
            # stream into one delivery at the end.
            "X-Accel-Buffering": "no",
        },
    )
