.PHONY: demo init-db run-batch verify

demo: init-db run-batch

init-db:
	set PYTHONPATH=$(cd) && python backend/scripts/seed.py

run-batch:
	set PYTHONPATH=$(cd) && python backend/scripts/run_batch.py

verify:
	set PYTHONPATH=$(cd) && python -c "import sys; sys.path.append('backend'); from app.db import SessionLocal; from app.core.ledger import verify_chain; print(verify_chain(SessionLocal()))"
