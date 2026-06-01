"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatISTDateTime } from "@/lib/datetime";

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
  const [seats, setSeats] = useState<Seats>({
    guided: { total: 8, claimed: 0, buyers: [] },
    solo: { total: 25, claimed: 0, buyers: [] },
  });
  const [hotOnly, setHotOnly] = useState(false);
  const [sortIntent, setSortIntent] = useState(false);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
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

  async function act(body: object) {
    setBusy(true);
    try {
      await fetch("/api/room/records", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": keyRef.current },
        body: JSON.stringify(body),
      });
      await load();
    } finally {
      setBusy(false);
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
            onClick={() => act({ action: "resetAll" })}
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
            onSetTotal={(t) => act({ action: "setSeatsTotal", value: t })}
          />
          <ProgramSummary
            label="Solo Mode"
            program={seats.solo}
            busy={busy}
            onSetTotal={(t) => act({ action: "setSoloTotal", value: t })}
          />
        </div>
      </div>

      {/* Global override */}
      <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-medium">Allow everyone to retake</p>
          <p className="text-sm text-muted">
            Turn on for the arrival and end-of-day pulses, then off.
          </p>
        </div>
        <button
          onClick={() => act({ action: "setGlobalAllow", value: !allowAll })}
          disabled={busy}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            allowAll ? "bg-green" : "bg-[var(--surface-2)]"
          }`}
          aria-pressed={allowAll}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
              allowAll ? "left-6" : "left-1"
            }`}
          />
        </button>
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
                  <div className="font-medium">{r.name || "-"}</div>
                  <div className="text-xs text-muted">{r.email}</div>
                  {r.phone && <div className="text-xs text-muted">{r.phone}</div>}
                  {r.mirror && (
                    <div className="mt-1 text-[0.7rem] italic text-gold-deep">{r.mirror}</div>
                  )}
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
                    onEnroll={(p) => act({ action: "enroll", id: r.id, program: p })}
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
                  </div>
                </Td>
                <Td>
                  <span className="text-xs text-muted">{formatISTDateTime(r.createdAt)}</span>
                </Td>
                <Td>
                  {r.retakeAllowed ? (
                    <button
                      onClick={() => act({ action: "lock", id: r.id })}
                      disabled={busy}
                      className="chip !border-green text-green"
                    >
                      allowed · lock
                    </button>
                  ) : (
                    <button
                      onClick={() => act({ action: "allowRetake", id: r.id })}
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
                      onClick={() => act({ action: "lockRoadmap", id: r.id })}
                      disabled={busy}
                      className="chip !border-green text-green"
                    >
                      regen on · lock
                    </button>
                  ) : (
                    <button
                      onClick={() => act({ action: "allowRoadmap", id: r.id })}
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
                        void act({ action: "delete", id: r.id });
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
