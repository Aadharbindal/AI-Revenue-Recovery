const API_BASE = "http://localhost:8000/api";

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/demo/stats`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function runBatch() {
  const res = await fetch(`${API_BASE}/demo/run_batch`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to run batch");
  return res.json();
}

export async function fetchCase(id: string) {
  const res = await fetch(`${API_BASE}/cases/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch case");
  return res.json();
}

export async function verifyLedger() {
  const res = await fetch(`${API_BASE}/audit/verify`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to verify ledger");
  return res.json();
}

export async function tamperLedger() {
  const res = await fetch(`${API_BASE}/demo/tamper`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to tamper ledger");
  return res.json();
}
