import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core import ledger                       # noqa: E402
from app.core.detector import detector            # noqa: E402
from app.db import Base, SessionLocal, engine     # noqa: E402


@pytest.fixture(autouse=True)
def clean_detector():
    """
    The issuer-health detector is a module-level singleton, so a test that
    loads an outage into it leaks that outage into every test that runs
    afterwards — G08 starts blocking silent retries in tests that never
    mentioned an issuer. Clearing it between tests keeps the suite
    order-independent.
    """
    detector.reset()
    yield
    detector.reset()


@pytest.fixture
def db():
    """
    A fresh database per test.

    The ledger caches the chain head in-process for speed, so it has to be
    reset alongside the tables — otherwise a test inherits the previous test's
    head and every hash it writes is chained to a row that no longer exists.
    """
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    ledger.reset_head_cache()

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        ledger.reset_head_cache()
