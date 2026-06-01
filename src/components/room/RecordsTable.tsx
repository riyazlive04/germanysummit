"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatISTDateTime } from "@/lib/datetime";

/**
 * Admin records table (behind ADMIN_KEY). Browse individual submissions and
 * control retake gating: allow/lock a specific person, flip the global "allow
 * everyone", or reset all locks. Times shown in IST.
 */

const STORAGE_KEY = "room_admin_key";

type Record = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  session: string;
  totalScore: number | null;
  tier: string | null;
  archetype: string | null;
  retakeAllowed: boolean;
  roadmapRegenAllowed: boolean;
  hasReality: boolean;
  hasCv: boolean;
  hasLinkedin: boolean;
  hasRoadmap: boolean;
  createdAt: string;
};

export default function RecordsTable({ initialKey }: { initialKey?: string }) {
  const [key, setKey] = useState(initialKey ?? "");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [allowAll, setAllowAll] = useState(false);
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

  return (
    <div className="py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Submission records</h1>
          <span className="eyebrow !text-muted">{records.length} people</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/room" className="btn btn-ghost px-4 py-2 text-sm">
            Room view
          </Link>
          <button
            onClick={() => act({ action: "resetAll" })}
            disabled={busy}
            className="btn btn-ghost px-4 py-2 text-sm"
          >
            Reset all locks
          </button>
        </div>
      </div>

      {/* Global override */}
      <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-medium">Allow everyone to retake</p>
          <p className="text-sm text-muted">
            Global override. When on, anyone can retake the Reality Check
            regardless of per-person locks.
          </p>
        </div>
        <button
          onClick={() => act({ action: "setGlobalAllow", value: !allowAll })}
          disabled={busy}
          className={`relative h-7 w-12 rounded-full transition-colors ${
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

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-muted">
              <Th>Person</Th>
              <Th>Session</Th>
              <Th>Score</Th>
              <Th>Archetype</Th>
              <Th>Modules</Th>
              <Th>Created (IST)</Th>
              <Th>Retake</Th>
              <Th>Roadmap</Th>
              <Th> </Th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-[var(--line)] last:border-0">
                <Td>
                  <div className="font-medium">{r.name || "-"}</div>
                  <div className="text-xs text-muted">{r.email}</div>
                  {r.phone && <div className="text-xs text-muted">{r.phone}</div>}
                </Td>
                <Td>
                  <span className="eyebrow !text-[0.68rem] !text-muted">
                    {r.session.replace("_", " ")}
                  </span>
                </Td>
                <Td>
                  <span className="nums font-display text-lg">
                    {r.totalScore ?? "-"}
                  </span>
                  {r.tier && <div className="text-xs text-muted">{r.tier}</div>}
                </Td>
                <Td>{r.archetype || "-"}</Td>
                <Td>
                  <div className="flex gap-1">
                    <Badge on={r.hasReality}>RC</Badge>
                    <Badge on={r.hasCv}>CV</Badge>
                    <Badge on={r.hasLinkedin}>LI</Badge>
                    <Badge on={r.hasRoadmap}>RM</Badge>
                  </div>
                </Td>
                <Td>
                  <span className="text-xs text-muted">
                    {formatISTDateTime(r.createdAt)}
                  </span>
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
            {records.length === 0 && (
              <tr>
                <td colSpan={9} className="p-10 text-center text-muted">
                  No submissions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
