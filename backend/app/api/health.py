"""Liveness and configuration transparency."""

import os

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core import clock
from app.db import get_db
from app.models import Action, Case, Event

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health(db: Session = Depends(get_db)):
    """
    Also reports which optional integrations are configured.

    The demo runs with no keys at all, so a viewer should be able to tell at a
    glance whether the payment links and message bodies they are looking at
    came from live services or from the deterministic fallbacks — rather than
    having to take the README's word for it.
    """
    return {
        "status": "ok",
        "simulation": {
            "batch_start": clock.iso(clock.BATCH_START),
            "batch_end": clock.iso(clock.BATCH_END),
            "ticks": clock.TICK_COUNT,
            "tick_hours": clock.TICK_HOURS,
        },
        "data": {
            "cases": db.query(Case).count(),
            "actions": db.query(Action).count(),
            "events": db.query(Event).count(),
        },
        "integrations": {
            "razorpay_test_mode": bool(
                os.environ.get("RZP_KEY_ID") and os.environ.get("RZP_KEY_SECRET")
            ),
            "llm": bool(os.environ.get("GROQ_API_KEY") or os.environ.get("GEMINI_API_KEY")),
            "voice_tts": bool(os.environ.get("SARVAM_API_KEY")),
        },
    }
