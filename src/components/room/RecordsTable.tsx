"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatISTDateTime } from "@/lib/datetime";
import Modal from "@/components/Modal";
import { QUESTIONS } from "@/lib/questions";

/**
 * Admin records table (behind ADMIN_KEY). Browse submissions, control retake and
 * roadmap gating, run the live seat-scarcity counter, and work the auto-ranked
 * high-intent list: each person carries an intent score, a one-line "your own
 * words" mirror for the closer, and a ready personalized follow-up to copy/send.
 */

const STORAGE_KEY = "room_admin_key";

const YEARS_SHORT: Record<string, string> = {
  lt1: "<1y",
  "1to2": "1-2y",
  "2to3": "2-3y",
  gt3: "3+y",
};

type Intent = "Hot" | "Warm" | "Cool";

type Rec = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  session: string;
  totalScore: number | null;
  tier: string | null;
  archetype: string | null;
  enrolledProgram: EnrolledProgram;
  weakestDim: string | null;
  consistency: number | null;
  yearsPlanning: string | null;
  answers: number[] | null;
  intentScore: number;
  intentLabel: Intent;
  mirror: string;
  followup: string;
  retakeAllowed: boolean;
  roadmapRegenAllowed: boolean;
  hasReality: boolean;
  hasCv: boolean;
  hasLinkedin: boolean;
  hasRoadmap: boolean;
  hasPlaybook: boolean;
  createdAt: string;
};

type Buyer = { name: string; at: string };
type Program = { total: number; claimed: number; buyers: Buyer[] };
type Seats = { guided: Program; solo: Program };
type EnrolledProgram = "guided" | "solo" | null;

const INTENT_STYLE: Record<Intent, string> = {
  Hot: "!border-red text-red",
  Warm: "!border-gold text-gold",
  Cool: "text-muted",
};

export default function RecordsTable({ initialKey }: { initialKey?: string }) {
  const [key, setKey] = useState(initialKey ?? "");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [records, setRecords] = useState<Rec[]>([]);
  const [allowAll, setAllowAll] = useState(false);
  const [eventDay, setEventDay] = useState(false);
  const [seats, setSeats] = useState<Seats>({
    guided: { total: 8, claimed: 0, buyers: [] },
    solo: { total: 25, claimed: 0, buyers: [] },
  });
  const [hotOnly, setHotOnly] = useState(false);
  const [sortIntent, setSortIntent] = useState(false);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [detail, setDetail] = useState<Rec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    if (!initialKey) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setKey(saved);
      } catch {
        /* ignore */
      }
    }
  }, [initialKey]);

  const load = useCallback(async () => {
    const k = keyRef.current;
    if (!k) return;
    try {
      const res = await fetch("/api/room/records", {
        headers: { "x-admin-key": k },
        cache: "no-store",
      });
      if (res.status === 401) {
        setAuthed(false);
        setError("Wrong key.");
        return;
      }
      const data = await res.json();
      if (data.ok) {
        setAuthed(true);
        setError(null);
        setRecords(data.records);
        setAllowAll(data.allowAllRetakes);
        setEventDay(!!data.eventDayMode);
        if (data.seats) setSeats(data.seats);
        try {
          localStorage.setItem(STORAGE_KEY, k);
        } catch {
          /* ignore */
        }
      }
    } catch {
      setError("Network error.");
    }
  }, []);

  useEffect(() => {
    if (authed === false || !key) return;
    void load();
  }, [authed, key, load]);

  // Optimistic: apply the local change immediately so the click feels instant,
  // POST in the background, then reconcile with a (non-blocking) reload. The DB
  // is remote, so awaiting the write + a full refetch made every click lag.
  async function act(body: object, optimistic?: () => void) {
    optimistic?.();
    setBusy(true);
    try {
      await fetch("/api/room/records", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": keyRef.current },
        body: JSON.stringify(body),
      });
    } finally {
      setBusy(false);
      void load(); // reconcile in the background; the UI already updated
    }
  }

  async function copyFollowup(r: Rec) {
    try {
      await navigator.clipboard.writeText(r.followup);
      setCopied(r.id);
      window.setTimeout(() => setCopied((c) => (c === r.id ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  }

  function exportCsv(rows: Rec[]) {
    const head = [
      "Name",
      "Email",
      "Phone",
      "Intent",
      "IntentScore",
      "Score",
      "Weakest",
      "Consistency",
      "Years",
      "Session",
      "Mirror",
      "Followup",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = rows.map((r) =>
      [
        r.name,
        r.email,
        r.phone,
        r.intentLabel,
        r.intentScore,
        r.totalScore,
        r.weakestDim,
        r.consistency,
        r.yearsPlanning ? YEARS_SHORT[r.yearsPlanning] : "",
        r.session,
        r.mirror,
        r.followup,
      ]
        .map(esc)
        .join(","),
    );
    const csv = [head.join(","), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `high-intent-${rows.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Full workbook of ALL submissions (every field + the per-question answer
  // mapping), as an Excel-native .xls. Uses an HTML table workbook so no library
  // is needed and it opens straight into Excel.
  function exportExcel(rows: Rec[]) {
    const head = [
      "Name",
      "Email",
      "Phone",
      "Session",
      "Intent",
      "Intent score",
      "Readiness score",
      "Tier",
      "Archetype",
      "Weakest dim",
      "Consistency (0-10)",
      "Years planning",
      "Enrolled",
      "Modules",
      "Created (IST)",
      ...QUESTIONS.map((q) => `${q.id}: ${q.prompt}`),
    ];
    const body = rows
      .map((r) => {
        const cells = [
          r.name,
          r.email,
          r.phone,
          r.session.replace("_", " "),
          r.intentLabel,
          r.intentScore,
          r.totalScore,
          r.tier,
          r.archetype,
          r.weakestDim,
          r.consistency,
          r.yearsPlanning ? YEARS_SHORT[r.yearsPlanning] : "",
          r.enrolledProgram ?? "",
          [
            r.hasReality && "RC",
            r.hasCv && "CV",
            r.hasLinkedin && "LI",
            r.hasRoadmap && "RM",
            r.hasPlaybook && "PB",
          ]
            .filter(Boolean)
            .join(" "),
          formatISTDateTime(r.createdAt),
          ...QUESTIONS.map((q, i) => {
            const pts = r.answers?.[i];
            if (pts == null) return "";
            const opt = q.options.find((o) => o.points === pts);
            return opt ? `${opt.label} (${pts})` : String(pts);
          }),
        ];
        return `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`;
      })
      .join("");
    const html =
      `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">` +
      `<head><meta charset="utf-8"></head><body><table border="1"><thead><tr>` +
      head.map((h) => `<th>${escapeHtml(h)}</th>`).join("") +
      `</tr></thead><tbody>${body}</tbody></table></body></html>`;
    const blob = new Blob(["﻿", html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submissions-${rows.length}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Key gate ───────────────────────────────────────────────────────────────
  if (authed !== true) {
    return (
      <div className="mx-auto max-w-sm py-24">
        <span className="eyebrow">Records · protected</span>
        <h1 className="mt-3 font-display text-3xl">Enter the admin key</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setAuthed(null);
            void load();
          }}
          noValidate
          className="mt-6 grid gap-3"
        >
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="ADMIN_KEY"
            className="input w-full"
            autoFocus
          />
          {error && <p className="text-sm text-red">{error}</p>}
          <button type="submit" className="btn-gold px-6 py-3 text-sm">
            Open records →
          </button>
        </form>
      </div>
    );
  }

  let view = [...records];
  const q = query.trim().toLowerCase();
  if (q)
    view = view.filter(
      (r) =>
        (r.name || "").toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.phone || "").includes(q),
    );
  if (hotOnly) view = view.filter((r) => r.intentLabel !== "Cool");
  if (sortIntent) view.sort((a, b) => b.intentScore - a.intentScore);

  return (
    <div className="py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Submission records</h1>
          <span className="eyebrow !text-muted">{records.length} people</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/room" className="btn btn-ghost px-4 py-2 text-sm">
            Room view
          </Link>
          <button
            onClick={() => exportCsv(view)}
            disabled={busy || view.length === 0}
            className="btn btn-ghost px-4 py-2 text-sm disabled:opacity-40"
          >
            Export CSV
          </button>
          <button
            onClick={() => exportExcel(records)}
            disabled={busy || records.length === 0}
            className="btn btn-ghost px-4 py-2 text-sm disabled:opacity-40"
            title="All submissions, every field + question-by-question answers, as Excel"
          >
            Export Excel (all)
          </button>
          <button
            onClick={() =>
              act({ action: "resetAll" }, () => {
                setAllowAll(false);
                setEventDay(false);
                setRecords((rs) =>
                  rs.map((x) => ({ ...x, retakeAllowed: false, roadmapRegenAllowed: false })),
                );
              })
            }
            disabled={busy}
            className="btn btn-ghost px-4 py-2 text-sm"
          >
            Reset all locks
          </button>
        </div>
      </div>

      {/* Live enrollments (buying window) */}
      <div className="card mb-4 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium">Live enrollments</p>
          <p className="text-sm text-muted">
            On-spot UPI. Mark each buyer in their row (G / S). Counts and names show
            on the room screen.
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ProgramSummary
            label="Guided Mode"
            accent
            program={seats.guided}
            busy={busy}
            onSetTotal={(t) =>
              act({ action: "setSeatsTotal", value: t }, () =>
                setSeats((s) => ({ ...s, guided: { ...s.guided, total: t } })),
              )
            }
          />
          <ProgramSummary
            label="Solo Mode"
            program={seats.solo}
            busy={busy}
            onSetTotal={(t) =>
              act({ action: "setSoloTotal", value: t }, () =>
                setSeats((s) => ({ ...s, solo: { ...s.solo, total: t } })),
              )
            }
          />
        </div>
      </div>

      {/* Retake overrides */}
      <div className="card mb-5 grid gap-4 p-5">
        <ToggleRow
          title="Allow everyone to retake"
          desc="Turn on for the arrival and end-of-day pulses, then off."
          on={allowAll}
          busy={busy}
          onToggle={() =>
            act({ action: "setGlobalAllow", value: !allowAll }, () => setAllowAll(!allowAll))
          }
        />
        <div className="h-px bg-[var(--line)]" />
        <ToggleRow
          title="Allow event day reality check"
          desc="Let people who already took it retake on the day - the quiz shows their previous answer under each question."
          on={eventDay}
          busy={busy}
          onToggle={() =>
            act({ action: "setEventDay", value: !eventDay }, () => setEventDay(!eventDay))
          }
        />
      </div>

      {/* Search + intent filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, phone…"
          className="input w-56 !py-1.5 text-sm"
        />
        <button
          onClick={() => setHotOnly((v) => !v)}
          className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
            hotOnly ? "border-gold text-gold" : "border-[var(--line)] text-muted hover:text-text"
          }`}
        >
          High intent only
        </button>
        <button
          onClick={() => setSortIntent((v) => !v)}
          className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
            sortIntent ? "border-gold text-gold" : "border-[var(--line)] text-muted hover:text-text"
          }`}
        >
          Sort by intent
        </button>
        <span className="ml-1 text-xs text-muted">{view.length} shown</span>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[1160px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-muted">
              <Th>Person</Th>
              <Th>Intent</Th>
              <Th>Enroll</Th>
              <Th>Session</Th>
              <Th>Score</Th>
              <Th>Modules</Th>
              <Th>Created (IST)</Th>
              <Th>Retake</Th>
              <Th>Roadmap</Th>
              <Th>Follow-up</Th>
              <Th> </Th>
            </tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <tr key={r.id} className="border-b border-[var(--line)] last:border-0">
                <Td>
                  <button
                    onClick={() => setDetail(r)}
                    disabled={!r.hasReality}
                    className="text-left transition-opacity hover:opacity-70 disabled:cursor-default disabled:hover:opacity-100"
                    title={r.hasReality ? "View question-by-question answers" : "No Reality Check answers yet"}
                  >
                    <div className="font-medium underline decoration-dotted decoration-[var(--line)] underline-offset-4">
                      {r.name || "-"}
                    </div>
                    <div className="text-xs text-muted">{r.email}</div>
                    {r.phone && <div className="text-xs text-muted">{r.phone}</div>}
                    {r.mirror && (
                      <div className="mt-1 text-[0.7rem] italic text-gold-deep">{r.mirror}</div>
                    )}
                  </button>
                </Td>
                <Td>
                  <span className={`chip ${INTENT_STYLE[r.intentLabel]}`}>
                    {r.intentLabel}
                  </span>
                  <div className="mt-0.5 text-center font-mono text-[0.65rem] text-muted">
                    {r.intentScore}
                  </div>
                </Td>
                <Td>
                  <EnrollCell
                    program={r.enrolledProgram}
                    busy={busy}
                    onEnroll={(p) =>
                      act({ action: "enroll", id: r.id, program: p }, () =>
                        setRecords((rs) =>
                          rs.map((x) => (x.id === r.id ? { ...x, enrolledProgram: p } : x)),
                        ),
                      )
                    }
                  />
                </Td>
                <Td>
                  <span className="eyebrow !text-[0.68rem] !text-muted">
                    {r.session.replace("_", " ")}
                  </span>
                </Td>
                <Td>
                  <span className="nums font-display text-lg">{r.totalScore ?? "-"}</span>
                  {r.weakestDim && (
                    <div className="text-xs text-muted">weak: {r.weakestDim}</div>
                  )}
                </Td>
                <Td>
                  <div className="flex gap-1">
                    <Badge on={r.hasReality}>RC</Badge>
                    <Badge on={r.hasCv}>CV</Badge>
                    <Badge on={r.hasLinkedin}>LI</Badge>
                    <Badge on={r.hasRoadmap}>RM</Badge>
                    <Badge on={r.hasPlaybook}>PB</Badge>
                  </div>
                </Td>
                <Td>
                  <span className="text-xs text-muted">{formatISTDateTime(r.createdAt)}</span>
                </Td>
                <Td>
                  {r.retakeAllowed ? (
                    <button
                      onClick={() =>
                        act({ action: "lock", id: r.id }, () =>
                          setRecords((rs) =>
                            rs.map((x) => (x.id === r.id ? { ...x, retakeAllowed: false } : x)),
                          ),
                        )
                      }
                      disabled={busy}
                      className="chip !border-green text-green"
                    >
                      allowed · lock
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        act({ action: "allowRetake", id: r.id }, () =>
                          setRecords((rs) =>
                            rs.map((x) => (x.id === r.id ? { ...x, retakeAllowed: true } : x)),
                          ),
                        )
                      }
                      disabled={busy}
                      className="chip hover:!border-gold"
                    >
                      locked · allow
                    </button>
                  )}
                </Td>
                <Td>
                  {!r.hasRoadmap ? (
                    <span className="text-xs text-muted">-</span>
                  ) : r.roadmapRegenAllowed ? (
                    <button
                      onClick={() =>
                        act({ action: "lockRoadmap", id: r.id }, () =>
                          setRecords((rs) =>
                            rs.map((x) =>
                              x.id === r.id ? { ...x, roadmapRegenAllowed: false } : x,
                            ),
                          ),
                        )
                      }
                      disabled={busy}
                      className="chip !border-green text-green"
                    >
                      regen on · lock
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        act({ action: "allowRoadmap", id: r.id }, () =>
                          setRecords((rs) =>
                            rs.map((x) =>
                              x.id === r.id ? { ...x, roadmapRegenAllowed: true } : x,
                            ),
                          ),
                        )
                      }
                      disabled={busy}
                      className="chip hover:!border-gold"
                    >
                      locked · allow regen
                    </button>
                  )}
                </Td>
                <Td>
                  {r.followup ? (
                    <button
                      onClick={() => copyFollowup(r)}
                      className="chip hover:!border-gold"
                      title="Copy the personalized follow-up message"
                    >
                      {copied === r.id ? "copied ✓" : "copy"}
                    </button>
                  ) : (
                    <span className="text-xs text-muted">-</span>
                  )}
                </Td>
                <Td>
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${r.email}? This cannot be undone.`))
                        void act({ action: "delete", id: r.id }, () =>
                          setRecords((rs) => rs.filter((x) => x.id !== r.id)),
                        );
                    }}
                    disabled={busy}
                    className="text-xs text-muted transition-colors hover:text-red"
                  >
                    Delete
                  </button>
                </Td>
              </tr>
            ))}
            {view.length === 0 && (
              <tr>
                <td colSpan={11} className="p-10 text-center text-muted">
                  No submissions in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnswersModal record={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

/** Question-by-question view of one person's Reality Check answers. */
function AnswersModal({ record, onClose }: { record: Rec | null; onClose: () => void }) {
  const answers = record?.answers;
  return (
    <Modal
      open={!!record}
      onClose={onClose}
      title={record?.name?.trim() || record?.email || "Answers"}
    >
      {record && (
        <div className="grid gap-1">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">
              Reality Check answers
              {typeof record.totalScore === "number" && (
                <>
                  {" · "}
                  <span className="nums">{record.totalScore}</span>/100
                </>
              )}
            </p>
            {record.answers && record.answers.length > 0 && (
              <button
                onClick={() => downloadRecordPdf(record)}
                className="chip hover:!border-gold"
                title="Download this record as a PDF"
              >
                Download PDF
              </button>
            )}
          </div>
          {!answers || answers.length === 0 ? (
            <p className="text-sm text-muted">No answers recorded for this person.</p>
          ) : (
            <ol className="grid gap-5">
              {QUESTIONS.map((q, i) => {
                const picked = answers[i];
                return (
                  <li key={q.id} className="grid gap-2">
                    <div className="flex gap-2">
                      <span className="font-mono text-xs text-muted">{q.id}</span>
                      <span className="text-sm font-medium">{q.prompt}</span>
                    </div>
                    <div className="grid gap-1.5">
                      {q.options.map((opt) => {
                        const isPicked = picked === opt.points;
                        return (
                          <div
                            key={opt.label}
                            className={`rounded-lg border px-3 py-2 text-sm ${
                              isPicked
                                ? "border-gold bg-[var(--anchor)] font-semibold text-gold"
                                : "border-[var(--line)] text-muted"
                            }`}
                          >
                            <span className="mr-2 font-mono text-[0.65rem]">{opt.points}</span>
                            {opt.label}
                            {isPicked && <span className="ml-2 text-gold">✓</span>}
                          </div>
                        );
                      })}
                      {picked == null && (
                        <p className="text-xs italic text-muted">Not answered.</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </Modal>
  );
}

/** A labelled on/off toggle row for an admin setting. */
function ToggleRow({
  title,
  desc,
  on,
  busy,
  onToggle,
}: {
  title: string;
  desc: string;
  on: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-medium">{title}</p>
        <p className="max-w-xl text-sm text-muted">{desc}</p>
      </div>
      <button
        onClick={onToggle}
        disabled={busy}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          on ? "bg-green" : "bg-[var(--surface-2)]"
        }`}
        aria-pressed={on}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
            on ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

/** Per-program count, editable target, and the live buyer names. */
function ProgramSummary({
  label,
  program,
  accent,
  busy,
  onSetTotal,
}: {
  label: string;
  program: Program;
  accent?: boolean;
  busy: boolean;
  onSetTotal: (total: number) => void;
}) {
  const remaining = Math.max(0, program.total - program.claimed);
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-gold" : "border-[var(--line)]"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-lg">{label}</span>
        <span className="nums font-display text-3xl text-gold">
          {program.claimed}
          <span className="text-base text-muted"> / {program.total}</span>
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-muted">{remaining} left</span>
        <label className="flex items-center gap-1 text-xs text-muted">
          target
          <input
            type="number"
            min={0}
            defaultValue={program.total}
            key={program.total}
            disabled={busy}
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (v !== program.total) onSetTotal(v);
            }}
            className="input w-14 !px-2 !py-1 text-center text-sm"
          />
        </label>
      </div>
      {program.buyers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {program.buyers.map((b, i) => (
            <span key={i} className="chip !py-1 !text-xs">
              {b.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Per-row enroll toggles: G = Guided, S = Solo. Tap the active one to clear. */
function EnrollCell({
  program,
  busy,
  onEnroll,
}: {
  program: EnrolledProgram;
  busy: boolean;
  onEnroll: (p: EnrolledProgram) => void;
}) {
  return (
    <div className="flex gap-1">
      <button
        onClick={() => onEnroll(program === "guided" ? null : "guided")}
        disabled={busy}
        title="Guided Mode"
        className={`chip !px-2.5 ${program === "guided" ? "!border-gold bg-gold text-gold-ink" : "text-muted hover:!border-gold"}`}
      >
        G
      </button>
      <button
        onClick={() => onEnroll(program === "solo" ? null : "solo")}
        disabled={busy}
        title="Solo Mode"
        className={`chip !px-2.5 ${program === "solo" ? "!border-green bg-green text-white" : "text-muted hover:!border-green"}`}
      >
        S
      </button>
    </div>
  );
}

function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Open a clean, printable view of one person's full Reality Check (header facts +
 * every question with their selected option marked) and trigger the browser's
 * print dialog, where it can be saved as a PDF. No PDF library needed.
 */
function downloadRecordPdf(r: Rec) {
  const win = window.open("", "_blank", "width=820,height=1000");
  if (!win) {
    alert("Allow pop-ups for this site to download the PDF.");
    return;
  }
  const facts: [string, unknown][] = [
    ["Email", r.email],
    ["Phone", r.phone || "-"],
    ["Session", r.session.replace("_", " ")],
    ["Readiness score", r.totalScore != null ? `${r.totalScore} / 100` : "-"],
    ["Tier", r.tier || "-"],
    ["Archetype", r.archetype || "-"],
    ["Weakest dimension", r.weakestDim || "-"],
    ["Consistency", r.consistency != null ? `${r.consistency} / 10` : "-"],
    ["Years planning", r.yearsPlanning ? YEARS_SHORT[r.yearsPlanning] : "-"],
    ["Intent", `${r.intentLabel} (${r.intentScore})`],
    ["Submitted (IST)", formatISTDateTime(r.createdAt)],
  ];
  const factsHtml = facts
    .map(([k, v]) => `<div class="fact"><span>${escapeHtml(k)}</span><b>${escapeHtml(v)}</b></div>`)
    .join("");
  const questionsHtml = QUESTIONS.map((q, i) => {
    const picked = r.answers?.[i];
    const opts = q.options
      .map((o) => {
        const sel = picked === o.points;
        return `<li class="${sel ? "sel" : ""}">${escapeHtml(o.label)} <span class="pts">(${o.points})</span>${sel ? " ✓" : ""}</li>`;
      })
      .join("");
    const unanswered = picked == null ? `<p class="na">Not answered.</p>` : "";
    return `<div class="q"><p class="prompt"><b>${q.id}.</b> ${escapeHtml(q.prompt)}</p><ul>${opts}</ul>${unanswered}</div>`;
  }).join("");
  const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
    r.name || r.email,
  )} — Reality Check</title><style>
    *{box-sizing:border-box}
    body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;margin:40px;line-height:1.45}
    h1{font-size:22px;margin:0 0 2px}
    .sub{color:#666;font-size:13px;margin:0 0 18px}
    .facts{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;border:1px solid #ddd;border-radius:8px;padding:14px 16px;margin-bottom:24px}
    .fact{display:flex;justify-content:space-between;gap:12px;font-size:13px;border-bottom:1px dotted #eee;padding:2px 0}
    .fact span{color:#777}
    .q{margin-bottom:16px;page-break-inside:avoid}
    .prompt{font-size:14px;margin:0 0 6px}
    ul{list-style:none;padding:0;margin:0}
    li{font-size:13px;padding:6px 10px;border:1px solid #e5e5e5;border-radius:6px;margin-bottom:4px;color:#777}
    li.sel{border-color:#c79a3a;background:#fbf4e3;color:#1a1a1a;font-weight:600}
    .pts{color:#999;font-weight:400;font-size:11px}
    .na{font-size:12px;color:#999;font-style:italic;margin:2px 0 0}
    @media print{body{margin:18mm}}
  </style></head><body>
    <h1>${escapeHtml(r.name || "—")}</h1>
    <p class="sub">Germany Career Summit — Reality Check record</p>
    <div class="facts">${factsHtml}</div>
    <h2 style="font-size:15px;margin:0 0 12px">Question-by-question answers</h2>
    ${questionsHtml}
    <script>window.onload=function(){window.focus();window.print();}<\/script>
  </body></html>`;
  win.document.open();
  win.document.write(doc);
  win.document.close();
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 font-medium">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
}
function Badge({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-mono text-[0.6rem] ${
        on ? "bg-[var(--anchor)] text-gold" : "bg-[var(--surface-2)] text-muted opacity-50"
      }`}
    >
      {children}
    </span>
  );
}
