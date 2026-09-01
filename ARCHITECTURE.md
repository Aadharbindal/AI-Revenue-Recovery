# RecoverOS Architecture

## Core Principles
1. **The LLM Never Computes**: All arithmetic, business logic, amount calculations, and risk counting are executed purely via deterministic Python code and SQLite.
2. **Deterministic Routing**: Razorpay's failure taxonomy (`error_source`, `error_step`, `error_reason`) deterministically maps to a recovery class.
3. **Pessimistic Execution**: If an LLM response is malformed, has literal digits, or fails compliance checks, the system defaults to a safe, deterministic template rather than halting the batch or sending unverified text.

## Modules

### 1. Detector (`core/detector.py`)
Analyzes the stream of events for systemic anomalies. For example, calculating a rolling window Z-score on `issuer_down` rates to trigger a global retry pause on a degraded issuer.

### 2. Classifier (`core/classifier.py`)
A pure decision table mapping payment context to one of 7 recovery classes: `AUTO_RETRY`, `RETRY_TIMED`, `SWITCH_METHOD`, `NUDGE_CUSTOMER`, `RECEIVABLE_CHASE`, `MANUAL_REVIEW`, `DEAD`.

### 3. Policy Engine (`core/policy.py`)
A sequence of 11 sequential gates evaluating if an action is permitted.
- Examples: `CONSENT`, `QUIET_HOURS`, `AMOUNT_BAND` (chase cost < 15% of at-risk value), `ISSUER_HEALTH`.

### 4. LLM Validator (`llm/validator.py`)
Verifies the output of the LLM for compliance, token placement (`{{amount}}`, `{{payment_link}}`), absence of literal numbers, and language constraints.

### 5. Audit Ledger (`core/ledger.py`)
An append-only data structure recording every step for a given case. Each record contains a SHA-256 hash chaining to the previous record's hash to guarantee immutability and verifiable trails.

### 6. Orchestrator (`core/orchestrator.py`)
The main loop that processes a case by passing it through the Detector -> Classifier -> Policy Engine -> Ladder -> Executor pipeline.

### 7. Experiment Analytics (`analytics/experiment.py`)
Handles A/B test reporting, calculating incremental lift (Treatment vs Control) with 95% Confidence Intervals.
