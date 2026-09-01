import os
import sys
import time

# Add backend dir to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal
from app.core.orchestrator import Orchestrator

def main():
    print("Starting RecoverOS Batch Process...")
    db = SessionLocal()
    orch = Orchestrator(db)
    
    start = time.time()
    orch.run_batch()
    duration = time.time() - start
    
    print(f"Batch completed in {duration:.2f} seconds.")
    db.close()

if __name__ == "__main__":
    main()
