"use client";

import { useCallback, useEffect, useState } from "react";

import { tamperLedger, verifyLedger, type AuditStatus } from "@/lib/api";
import { Card, Failed, Loading, Note, Page, Pill, Stat } from "@/components/ui";

/**
 * Demonstrating the audit trail rather than asserting it.
 *
 * Verify (valid) → rewrite one historical amount → verify again (invalid, and
 * it names the row). An audit trail nobody has seen fail is just a log table.
 */
export default function Audit() {
  const [status, setStatus] = useState<AuditStatus | null>(null);
  const [tampered, setTampered] = useState<{
    event_id: number;
    before: unknown;
    after: unknown;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    verifyLedger().then(setStatus).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(refresh, [refresh]);

  async function tamper() {
    setBusy(true);
    try {
      setTampered(await tamperLedger());
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <Failed error={error} />;
  if (!status) return <Loading what="ledger" />;

  return (
    <Page
      title="Audit Ledger"
      subtitle="Every decision the system made, hash-chained. Each row's hash covers the previous row's hash plus its own content."
      actions={
        <button
          onClick={tamper}
          disabled={busy}
          className="px-4 py-2 rounded bg-rose-700 hover:bg-rose-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-sm font-medium transition"
        >
          {busy ? "Rewriting…" : "Tamper with a record"}
        </button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Stat label="Events recorded" value={status.records.toLocaleString("en-IN")} />
        <Stat
          label="Chain integrity"
          value={status.valid ? "VALID" : "BROKEN"}
          tone={status.valid ? "good" : "bad"}
        />
        <Stat
          label="Rows that fail verification"
          value={String(status.broken_count)}
          tone={status.broken_count ? "bad" : "default"}
        />
      </div>

      {status.valid ? (
        <Card>
          <p className="text-sm text-zinc-300 leading-relaxed">
            All {status.records.toLocaleString("en-IN")} events verify against a
            fresh recomputation from genesis. Nothing has been edited since it
            was written.
          </p>
          <Note>
            Press <span className="text-rose-400">Tamper with a record</span> to
            rewrite one recorded amount, the way somebody covering their tracks
            would. Nothing else is touched — the row keeps its stored hash,
            which is exactly why the next verification catches it.
          </Note>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Pill className="text-rose-400 border-rose-500/30 bg-rose-500/10">
              tampering detected
            </Pill>
            <span className="text-sm text-zinc-300">
              Event #{status.first_break} does not match its recorded hash.
            </span>
          </div>

          {tampered && (
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5">
                  What was recorded
                </div>
                <pre className="text-xs font-mono bg-zinc-950 border border-zinc-800 rounded p-3 overflow-x-auto text-zinc-400">
                  {JSON.stringify(tampered.before, null, 2)}
                </pre>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5">
                  What it was changed to
                </div>
                <pre className="text-xs font-mono bg-zinc-950 border border-rose-900/50 rounded p-3 overflow-x-auto text-rose-300">
                  {JSON.stringify(tampered.after, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <p className="text-sm font-mono text-zinc-500">
            broken_at: [{status.broken_at.join(", ")}]
          </p>

          <Note>
            Verification walks forward from each row&apos;s stored hash, so an
            edited row is named on its own rather than dragging every later row
            into the report. Naming one row says exactly which decision was
            rewritten. Re-run the batch from{" "}
            <span className="text-sky-400">Live Batch</span> to rebuild a clean
            chain.
          </Note>
        </Card>
      )}
    </Page>
  );
}
