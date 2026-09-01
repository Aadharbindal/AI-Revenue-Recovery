"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchCase, type ActionRow, type CaseDetail, type EventRow } from "@/lib/api";
import {
  CHANNEL_LABELS,
  CLASS_COLORS,
  STATE_COLORS,
  istTime,
  rupees,
} from "@/lib/format";
import { Card, Failed, Loading, Note, Page, Pill } from "@/components/ui";

/**
 * One case, from the failed payment to the outcome.
 *
 * This is the page that answers "why did the system do that?" — which rule
 * fired, what all eleven gates thought, what the model drafted, what the
 * validator checked, what went out, and what happened. Nobody has to trust a
 * summary.
 */
export default function CaseTimeline() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<CaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchCase(id).then(setData).catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) return <Failed error={error} />;
  if (!data) return <Loading what="case" />;

  const { case: c, customer, payments, actions, events } = data;

  return (
    <Page
      title={c.case_id}
      subtitle={`${c.entity_type} ${c.entity_id} · ${rupees(c.amount_at_risk_paise)} at risk`}
      actions={
        <div className="flex gap-2">
          <Pill className={STATE_COLORS[c.state]}>{c.state}</Pill>
          <Pill className={CLASS_COLORS[c.recovery_class ?? "DEAD"]}>
            {c.recovery_class}
          </Pill>
          <Pill
            className={
              c.arm === "control"
                ? "text-zinc-400 border-zinc-600/40 bg-zinc-700/20"
                : "text-sky-400 border-sky-500/30 bg-sky-500/10"
            }
          >
            {c.arm}
          </Pill>
        </div>
      }
    >
      {c.arm === "control" && (
        <div className="mb-6 px-4 py-3 rounded border border-zinc-700 bg-zinc-900/50 text-sm text-zinc-400">
          This case is in the control arm. It was classified and measured, but
          never contacted and never billed. That is what makes the reported lift
          a measurement rather than a comparison of the system against itself.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {payments.length > 0 && (
            <Card
              title="Why it failed"
              hint="Razorpay's own error taxonomy — the fields the routing decision is built on"
            >
              <div className="space-y-3">
                {payments.map((p) => (
                  <div
                    key={p.payment_id}
                    className="border border-zinc-800 rounded p-3 bg-zinc-900/40"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-zinc-400">
                        attempt {p.attempt_no} · {p.method} · {p.issuer}
                      </span>
                      <span className="font-mono text-xs text-zinc-500">
                        {istTime(p.created_at)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Pill className="text-rose-400 border-rose-500/30 bg-rose-500/10">
                        {p.error_reason}
                      </Pill>
                      <Pill>source: {p.error_source}</Pill>
                      <Pill>step: {p.error_step}</Pill>
                    </div>
                    <p className="text-sm text-zinc-400">{p.error_description}</p>
                  </div>
                ))}
              </div>
              <Note>
                <span className="text-zinc-400">error_source</span> says whose
                fault it was and{" "}
                <span className="text-zinc-400">error_step</span> says where it
                broke. Together they decide recoverability — bank or gateway
                means retry, customer means nudge, internal risk means do not
                touch it.
              </Note>
            </Card>
          )}

          <Card title="What happened, in order">
            {actions.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No action was ever attempted on this case.
                {c.exception_reason && (
                  <span className="block mt-2 text-zinc-400">
                    {c.exception_reason}
                  </span>
                )}
              </p>
            ) : (
              <div className="space-y-4">
                {actions.map((a) => (
                  <ActionBlock key={a.action_id} action={a} />
                ))}
              </div>
            )}
          </Card>

          <Card
            title="Raw ledger"
            hint="Every row hash-chained to the one before it"
          >
            <div className="space-y-1 font-mono text-xs max-h-96 overflow-y-auto">
              {events.map((e) => (
                <LedgerRow key={e.event_id} event={e} />
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Outcome">
            <dl className="space-y-3 text-sm">
              <Field label="State" value={c.state} />
              <Field label="Resolution" value={c.resolution ?? "—"} />
              <Field label="Touches used" value={`${c.touches_used} of 3`} />
              <Field label="Spend" value={rupees(c.intervention_cost_paise)} />
              <Field label="Recovered" value={rupees(c.recovered_paise)} />
              {c.promise_date && (
                <Field label="Promised by" value={istTime(c.promise_date)} />
              )}
              {c.rule_id && <Field label="Classifier rule" value={c.rule_id} />}
            </dl>
            {c.exception_reason && (
              <Note>{c.exception_reason}</Note>
            )}
          </Card>

          {customer && (
            <Card title="Customer">
              <dl className="space-y-3 text-sm">
                <Field label="Name" value={String(customer.name)} />
                <Field label="Segment" value={String(customer.segment)} />
                <Field label="Language" value={String(customer.language_pref)} />
              </dl>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(["whatsapp", "sms", "email", "voice"] as const).map((ch) => (
                  <Pill
                    key={ch}
                    className={
                      customer[`consent_${ch}`]
                        ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                        : "text-zinc-600 border-zinc-700 bg-zinc-800/40"
                    }
                  >
                    {ch}
                  </Pill>
                ))}
              </div>
              {Boolean(customer.opted_out_at) && (
                <Note>
                  This customer opted out on {String(customer.opted_out_at)}.
                  G01 suppresses every channel for them.
                </Note>
              )}
              {Boolean(customer.dnd_registered) && (
                <Note>Registered on the national DND list — voice is blocked.</Note>
              )}
            </Card>
          )}
        </div>
      </div>
    </Page>
  );
}

/**
 * Distinguishes "the model was never asked" from "the model was asked and its
 * answer was refused". Both end in a fallback template, but only one of them
 * is the guardrail doing its job, and conflating them would overstate what the
 * validator caught.
 */
const NEVER_ASKED = ["NO_API_KEY", "LITELLM_NOT_INSTALLED"];

function wasNeverAsked(reason: string): boolean {
  return NEVER_ASKED.includes(reason) || reason.startsWith("PROVIDER_ERROR");
}

function ActionBlock({ action }: { action: ActionRow }) {
  const blocked = action.status === "BLOCKED";
  const trail = action.gate_decisions_json ?? [];
  const refusals = trail.filter((g) => !g.allowed);

  return (
    <div
      className={`border rounded p-4 ${
        blocked
          ? "border-amber-900/50 bg-amber-950/10"
          : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Pill
            className={
              blocked
                ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                : "text-sky-400 border-sky-500/30 bg-sky-500/10"
            }
          >
            {action.status}
          </Pill>
          <span className="text-sm text-zinc-300">
            Tier {action.tier} · {CHANNEL_LABELS[action.channel] ?? action.channel}
          </span>
          {!blocked && action.cost_paise > 0 && (
            <span className="text-xs font-mono text-zinc-500">
              {rupees(action.cost_paise)}
            </span>
          )}
        </div>
        <span className="text-xs font-mono text-zinc-600">
          {action.sent_at ? istTime(action.sent_at) : `tick ${action.tick}`}
        </span>
      </div>

      {/* The full eleven-gate trail, not just the first refusal. */}
      <div className="grid grid-cols-11 gap-1 mb-3">
        {trail.map((g) => (
          <div
            key={g.gate_id}
            title={`${g.gate_id} ${g.name}: ${g.reason_code} — ${g.detail}`}
            className={`h-6 rounded-sm flex items-center justify-center text-[9px] font-mono cursor-help ${
              g.allowed
                ? "bg-emerald-950/60 text-emerald-600 border border-emerald-900/40"
                : "bg-rose-950/60 text-rose-400 border border-rose-800/60"
            }`}
          >
            {g.gate_id.replace("G", "")}
          </div>
        ))}
      </div>

      {refusals.map((g) => (
        <p key={g.gate_id} className="text-sm text-amber-300/90 mb-1">
          <span className="font-mono text-xs text-amber-500">
            {g.gate_id} {g.name}
          </span>{" "}
          — {g.detail}
        </p>
      ))}

      {action.message_body && (
        <div className="mt-3 p-3 rounded bg-zinc-950 border border-zinc-800">
          <p className="text-sm text-zinc-300 leading-relaxed">
            {action.message_body}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Pill
              className={
                action.llm_used
                  ? "text-violet-400 border-violet-500/30 bg-violet-500/10"
                  : "text-zinc-400 border-zinc-700 bg-zinc-800/40"
              }
            >
              {action.llm_used ? "LLM template" : "deterministic fallback"}
            </Pill>
            {action.llm_rejected_reason && (
              <Pill
                className={
                  wasNeverAsked(action.llm_rejected_reason)
                    ? "text-zinc-500 border-zinc-700 bg-zinc-800/40"
                    : "text-rose-400 border-rose-500/30 bg-rose-500/10"
                }
              >
                {wasNeverAsked(action.llm_rejected_reason)
                  ? `no model call: ${action.llm_rejected_reason}`
                  : `validator: ${action.llm_rejected_reason}`}
              </Pill>
            )}
            {action.payment_link_url && (
              <Pill
                className={
                  action.payment_link_is_real
                    ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                    : "text-zinc-500 border-zinc-700 bg-zinc-800/40"
                }
              >
                {action.payment_link_is_real
                  ? "live Razorpay test link"
                  : "simulated link"}
              </Pill>
            )}
          </div>
          {action.llm_rejected_reason && (
            <Note>
              {wasNeverAsked(action.llm_rejected_reason)
                ? "No LLM provider is configured in this deployment, so no model was asked and this deterministic template was used. Worth being precise about: nothing was rejected here, because nothing was drafted."
                : "The model's draft failed validation and this deterministic template was used instead. The batch did not stop, and no number the model wrote reached anybody."}
            </Note>
          )}
        </div>
      )}
    </div>
  );
}

function LedgerRow({ event }: { event: EventRow }) {
  return (
    <div className="flex gap-3 py-1 border-b border-zinc-900 last:border-0">
      <span className="text-zinc-700 w-10 shrink-0">#{event.event_id}</span>
      <span className="text-zinc-600 w-24 shrink-0">{event.actor}</span>
      <span className="text-zinc-400 w-32 shrink-0">{event.action}</span>
      <span className="text-zinc-500 w-40 shrink-0 truncate">
        {event.reason_code}
      </span>
      <span
        className="text-zinc-700 truncate"
        title={`sha256 ${event.this_hash}`}
      >
        {event.this_hash.slice(0, 16)}…
      </span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-mono text-zinc-200 text-right">{value}</dd>
    </div>
  );
}
