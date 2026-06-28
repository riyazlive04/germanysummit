"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatISTDateTime } from "@/lib/datetime";

/**
 * /room/feedback - the admin read-out of the post-event /feedback survey.
 *
 * Enter the admin key once (shared with the other room views via localStorage),
 * then see the headline numbers: NPS, average rating, the "plan stuck" and
 * Guided Mode decision breakdowns, and every open-text answer. Reads the raw
 * rows from /api/room/feedback; a response can be deleted (spam / test).
 */

const STORAGE_KEY = "room_admin_key";

type Feedback = {
  id: string;
  nps: number;
  rating: number;
  valuable: string | null;
  improve: string | null;
  planStuck: string;
  guided: string;
  name: string | null;
  phone: string | null;
  session: string;
  createdAt: string;
};

const PLAN_LABELS: Record<string, string> = {
  lt3m: "Less than 3 months",
  "3to12m": "3 to 12 months",
  "1to2y": "1 to 2 years",
  gt2y: "More than 2 years",
};
const PLAN_ORDER = ["lt3m", "3to12m", "1to2y", "gt2y"];

const GUIDED_LABELS: Record<string, string> = {
  enrolled: "Enrolled",
  interested: "Interested, still thinking",
  need_time: "Need more time",
  not_for_me: "Not for me right now",
};
const GUIDED_ORDER = ["enrolled", "interested", "need_time", "not_for_me"];
// Decision strength → colour (warm = hotter lead).
const GUIDED_COLOR: Record<string, string> = {
  enrolled: "var(--green)",
  interested: "var(--gold)",
  need_time: "var(--gold-deep)",
  not_for_me: "var(--red)",
};

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export default function FeedbackView({ initialKey }: { initialKey?: string }) {
  const [key, setKey] = useState(initialKey ?? "");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Feedback[]>([]);
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
      const res = await fetch("/api/room/feedback", {
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
        setRows(data.feedback);
        try {
          localStorage.setItem(STORAGE_KEY, k);
        } catch {
          /* ignore */
        }
      } else {
        setError(data.error || "Failed to load.");
      }
    } catch {
      setError("Network error.");
    }
  }, []);

  useEffect(() => {
    if (authed === false || !key) return;
    void load();
  }, [authed, key, load]);

  async function remove(id: string) {
    if (!window.confirm("Delete this response?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/room/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": keyRef.current },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (res.ok) setRows((rs) => rs.filter((r) => r.id !== id));
    } finally {
      setBusy(false);
    }
  }

  // ── Key gate ───────────────────────────────────────────────────────────────
  if (authed !== true) {
    return (
      <div className="mx-auto max-w-sm py-24">
        <span className="eyebrow">Feedback · protected</span>
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
            Open feedback →
          </button>
        </form>
      </div>
    );
  }

  const total = rows.length;
  const npsValues = rows.map((r) => r.nps);
  const promoters = npsValues.filter((n) => n >= 9).length;
  const passives = npsValues.filter((n) => n >= 7 && n <= 8).length;
  const detractors = npsValues.filter((n) => n <= 6).length;
  const nps = total ? Math.round(((promoters - detractors) / total) * 100) : 0;
  const avgRating = avg(rows.map((r) => r.rating));
  const enrolled = rows.filter((r) => r.guided === "enrolled").length;

  const planCounts = PLAN_ORDER.map((k) => ({
    key: k,
    label: PLAN_LABELS[k],
    count: rows.filter((r) => r.planStuck === k).length,
  }));
  const guidedCounts = GUIDED_ORDER.map((k) => ({
    key: k,
    label: GUIDED_LABELS[k],
    count: rows.filter((r) => r.guided === k).length,
  }));

  const valuableNotes = rows.filter((r) => r.valuable);
  const improveNotes = rows.filter((r) => r.improve);

  const summary: Summary = {
    total,
    nps,
    promoters,
    passives,
    detractors,
    avgRating,
    avgNps: avg(npsValues),
    enrolled,
    planCounts,
    guidedCounts,
  };

  return (
    <div className="py-8">
      {/* Top bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Feedback</h1>
          <span className="eyebrow !text-muted">{total} responses</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href="/room/insights"
            className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-muted transition-colors hover:text-gold"
          >
            Insights →
          </Link>
          <Link
            href="/room/records"
            className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-muted transition-colors hover:text-gold"
          >
            Records →
          </Link>
          <Link
            href="/room/feedback"
            className="rounded-lg border border-gold px-3 py-1.5 text-xs text-gold"
          >
            Feedback →
          </Link>
          <Link
            href="/room/compare"
            className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-muted transition-colors hover:text-gold"
          >
            Compare →
          </Link>
        </div>
      </div>

      {total === 0 ? (
        <div className="card grid place-items-center p-20 text-center">
          <p className="text-muted">No feedback yet.</p>
        </div>
      ) : (
        <>
          {/* Headline stats */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="NPS"
              value={nps > 0 ? `+${nps}` : `${nps}`}
              hint={`${promoters} promoters · ${detractors} detractors`}
              accent
            />
            <Stat label="Avg rating" value={`${avgRating ?? "-"}`} hint="out of 10" />
            <Stat label="Avg NPS score" value={`${avg(npsValues) ?? "-"}`} hint="0-10 likelihood" />
            <Stat label="Enrolled" value={`${enrolled}`} hint="said yes to Guided" />
          </div>

          {/* Downloads */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="label-mono mr-1">Download</span>
            <button
              onClick={() => exportSummaryExcel(summary)}
              className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold hover:text-gold"
            >
              Summary · Excel
            </button>
            <button
              onClick={() => downloadSummaryPdf(summary)}
              className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold hover:text-gold"
            >
              Summary · PDF
            </button>
            <span className="mx-1 h-4 w-px bg-[var(--line)]" />
            <button
              onClick={() => exportDetailsExcel(rows)}
              className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold hover:text-gold"
            >
              Details · Excel
            </button>
            <button
              onClick={() => downloadDetailsPdf(rows)}
              className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold hover:text-gold"
            >
              Details · PDF
            </button>
          </div>

          {/* NPS split */}
          <div className="card mb-4 p-5">
            <span className="eyebrow !text-muted">Recommendation split</span>
            <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
              <Seg n={promoters} total={total} color="var(--green)" />
              <Seg n={passives} total={total} color="var(--gold)" />
              <Seg n={detractors} total={total} color="var(--red)" />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
              <Legend color="var(--green)" label={`Promoters (9-10) · ${promoters}`} />
              <Legend color="var(--gold)" label={`Passives (7-8) · ${passives}`} />
              <Legend color="var(--red)" label={`Detractors (0-6) · ${detractors}`} />
            </div>
          </div>

          {/* Two breakdowns */}
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Breakdown title="How long the plan had been stuck" rows={planCounts} total={total} />
            <Breakdown
              title="Guided Mode decision"
              rows={guidedCounts}
              total={total}
              colorFor={(k) => GUIDED_COLOR[k]}
            />
          </div>

          {/* Open text */}
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Notes title="Most valuable" rows={valuableNotes} pick={(r) => r.valuable} />
            <Notes title="What could be better" rows={improveNotes} pick={(r) => r.improve} />
          </div>

          {/* Full response list */}
          <div className="card p-5">
            <span className="eyebrow !text-muted">All responses</span>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-left text-xs text-muted">
                    <th className="py-2 pr-3 font-normal">When</th>
                    <th className="py-2 pr-3 font-normal">Name</th>
                    <th className="py-2 pr-3 font-normal">WhatsApp</th>
                    <th className="py-2 pr-3 text-center font-normal">NPS</th>
                    <th className="py-2 pr-3 text-center font-normal">Rating</th>
                    <th className="py-2 pr-3 font-normal">Guided</th>
                    <th className="py-2 pl-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-[var(--line)] align-top">
                      <td className="whitespace-nowrap py-2.5 pr-3 text-xs text-muted">
                        {formatISTDateTime(r.createdAt)}
                      </td>
                      <td className="py-2.5 pr-3">{r.name || <span className="text-muted">—</span>}</td>
                      <td className="whitespace-nowrap py-2.5 pr-3 nums">
                        {r.phone || <span className="text-muted">—</span>}
                      </td>
                      <td className="nums py-2.5 pr-3 text-center">{r.nps}</td>
                      <td className="nums py-2.5 pr-3 text-center">{r.rating}</td>
                      <td className="py-2.5 pr-3 text-xs">{GUIDED_LABELS[r.guided] ?? r.guided}</td>
                      <td className="py-2.5 pl-3 text-right">
                        <button
                          onClick={() => remove(r.id)}
                          disabled={busy}
                          className="text-xs text-muted transition-colors hover:text-red disabled:opacity-40"
                          title="Delete response"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className="card p-4">
      <span className="eyebrow !text-muted">{label}</span>
      <div className={`nums mt-1 font-display text-3xl ${accent ? "text-gold" : ""}`}>{value}</div>
      <p className="mt-1 text-[11px] leading-snug text-muted">{hint}</p>
    </div>
  );
}

function Seg({ n, total, color }: { n: number; total: number; color: string }) {
  if (n === 0) return null;
  return <div style={{ width: `${(n / total) * 100}%`, backgroundColor: color }} />;
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function Breakdown({
  title,
  rows,
  total,
  colorFor,
}: {
  title: string;
  rows: { key: string; label: string; count: number }[];
  total: number;
  colorFor?: (key: string) => string;
}) {
  return (
    <div className="card p-5">
      <span className="eyebrow !text-muted">{title}</span>
      <div className="mt-3 grid gap-2.5">
        {rows.map((r) => {
          const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
          return (
            <div key={r.key} className="grid gap-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-muted">{r.label}</span>
                <span className="nums shrink-0 text-muted">
                  {r.count} · {pct}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: colorFor?.(r.key) ?? "var(--gold)" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Notes({
  title,
  rows,
  pick,
}: {
  title: string;
  rows: Feedback[];
  pick: (r: Feedback) => string | null;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow !text-muted">{title}</span>
        <span className="label-mono">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No notes yet.</p>
      ) : (
        <ul className="mt-3 grid max-h-80 gap-2.5 overflow-y-auto pr-1">
          {rows.map((r) => (
            <li key={r.id} className="border-l-2 border-[var(--line)] pl-3 text-sm">
              <p className="leading-snug">{pick(r)}</p>
              {r.name && <p className="mt-0.5 text-xs text-muted">— {r.name}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Downloads ────────────────────────────────────────────────────────────────

type Summary = {
  total: number;
  nps: number;
  promoters: number;
  passives: number;
  detractors: number;
  avgRating: number | null;
  avgNps: number | null;
  enrolled: number;
  planCounts: { key: string; label: string; count: number }[];
  guidedCounts: { key: string; label: string; count: number }[];
};

function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadBlob(content: BlobPart, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Excel-native .xls from HTML tables (opens straight into Excel, no library). */
function xlsWorkbook(tablesHtml: string): string {
  return (
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">` +
    `<head><meta charset="utf-8"></head><body>${tablesHtml}</body></html>`
  );
}

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

/** Per-response detail workbook. */
function exportDetailsExcel(rows: Feedback[]) {
  const head = [
    "When (IST)",
    "Name",
    "WhatsApp",
    "NPS (0-10)",
    "Rating (1-10)",
    "Plan stuck",
    "Guided decision",
    "Most valuable",
    "What could be better",
  ];
  const body = rows
    .map((r) => {
      const cells = [
        formatISTDateTime(r.createdAt),
        r.name,
        r.phone,
        r.nps,
        r.rating,
        PLAN_LABELS[r.planStuck] ?? r.planStuck,
        GUIDED_LABELS[r.guided] ?? r.guided,
        r.valuable ?? "",
        r.improve ?? "",
      ];
      return `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`;
    })
    .join("");
  const table =
    `<table border="1"><thead><tr>${head.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>` +
    `<tbody>${body}</tbody></table>`;
  downloadBlob(
    "﻿" + xlsWorkbook(table),
    "application/vnd.ms-excel;charset=utf-8;",
    `feedback-details-${rows.length}.xls`,
  );
}

/** Aggregate summary workbook. */
function exportSummaryExcel(s: Summary) {
  const metrics: [string, string | number][] = [
    ["Total responses", s.total],
    ["NPS (promoters - detractors)", s.nps > 0 ? `+${s.nps}` : s.nps],
    ["Promoters (9-10)", s.promoters],
    ["Passives (7-8)", s.passives],
    ["Detractors (0-6)", s.detractors],
    ["Average rating (1-10)", s.avgRating ?? "-"],
    ["Average likelihood (0-10)", s.avgNps ?? "-"],
    ["Enrolled in Guided", s.enrolled],
  ];
  const mRows = metrics
    .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`)
    .join("");
  const breakRows = (items: { label: string; count: number }[]) =>
    items
      .map(
        (i) =>
          `<tr><td>${escapeHtml(i.label)}</td><td>${i.count}</td><td>${pct(i.count, s.total)}%</td></tr>`,
      )
      .join("");
  const tables =
    `<h2>Feedback summary</h2>` +
    `<table border="1"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>${mRows}</tbody></table>` +
    `<br/><h3>How long the plan had been stuck</h3>` +
    `<table border="1"><thead><tr><th>Option</th><th>Count</th><th>Share</th></tr></thead><tbody>${breakRows(s.planCounts)}</tbody></table>` +
    `<br/><h3>Guided Mode decision</h3>` +
    `<table border="1"><thead><tr><th>Option</th><th>Count</th><th>Share</th></tr></thead><tbody>${breakRows(s.guidedCounts)}</tbody></table>`;
  downloadBlob(
    "﻿" + xlsWorkbook(tables),
    "application/vnd.ms-excel;charset=utf-8;",
    `feedback-summary.xls`,
  );
}

const PDF = {
  DARK: [26, 26, 26] as readonly number[],
  MUTED: [110, 110, 110] as readonly number[],
  GOLD: [193, 142, 43] as readonly number[],
  GREEN: [42, 145, 95] as readonly number[],
  RED: [200, 60, 45] as readonly number[],
  TRACK: [235, 232, 224] as readonly number[],
  SURF: [250, 247, 240] as readonly number[],
  ANCHOR: [15, 61, 46] as readonly number[],
};

/** Branded summary report PDF. */
async function downloadSummaryPdf(s: Summary) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 15;
  const W = 180;
  const tc = (c: readonly number[]) => doc.setTextColor(c[0], c[1], c[2]);
  const fc = (c: readonly number[]) => doc.setFillColor(c[0], c[1], c[2]);

  // Header band
  fc(PDF.ANCHOR);
  doc.rect(0, 0, 210, 26, "F");
  tc([245, 242, 234]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Germany Career Summit 2026", M, 13);
  tc(PDF.GOLD);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Feedback summary", M, 20);

  let y = 36;

  // Headline stat cards
  const cardW = (W - 8) / 3;
  const stat = (i: number, label: string, value: string, sub: string, color = PDF.DARK) => {
    const x = M + i * (cardW + 4);
    fc(PDF.SURF);
    doc.roundedRect(x, y, cardW, 24, 2, 2, "F");
    tc(PDF.MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(label.toUpperCase(), x + 5, y + 7);
    tc(color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(value, x + 5, y + 17);
    tc(PDF.MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(sub, x + 5, y + 22);
  };
  stat(0, "NPS", s.nps > 0 ? `+${s.nps}` : `${s.nps}`, `${s.promoters} prom / ${s.detractors} detr`, PDF.GOLD);
  stat(1, "Avg rating", `${s.avgRating ?? "-"} / 10`, `${s.total} responses`);
  stat(2, "Enrolled", `${s.enrolled}`, "said yes to Guided");
  y += 34;

  const heading = (t: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    tc(PDF.DARK);
    doc.text(t, M, y);
    y += 1.5;
    doc.setDrawColor(PDF.GOLD[0], PDF.GOLD[1], PDF.GOLD[2]);
    doc.setLineWidth(0.5);
    doc.line(M, y, M + 22, y);
    y += 6;
  };
  const bar = (label: string, count: number, color: readonly number[]) => {
    const p = pct(count, s.total);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    tc(PDF.DARK);
    doc.text(label, M, y);
    tc(PDF.MUTED);
    doc.text(`${count}  (${p}%)`, M + W, y, { align: "right" });
    y += 2;
    fc(PDF.TRACK);
    doc.roundedRect(M, y, W, 2.6, 1.3, 1.3, "F");
    fc(color);
    if (p > 0) doc.roundedRect(M, y, (W * p) / 100, 2.6, 1.3, 1.3, "F");
    y += 7;
  };

  heading("Recommendation split");
  bar(`Promoters (9-10)`, s.promoters, PDF.GREEN);
  bar(`Passives (7-8)`, s.passives, PDF.GOLD);
  bar(`Detractors (0-6)`, s.detractors, PDF.RED);
  y += 3;

  heading("How long the plan had been stuck");
  s.planCounts.forEach((p) => bar(p.label, p.count, PDF.GOLD));
  y += 3;

  heading("Guided Mode decision");
  const gColor: Record<string, readonly number[]> = {
    enrolled: PDF.GREEN,
    interested: PDF.GOLD,
    need_time: [201, 138, 17],
    not_for_me: PDF.RED,
  };
  s.guidedCounts.forEach((g) => bar(g.label, g.count, gColor[g.key] ?? PDF.GOLD));

  tc(PDF.MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Developed by Sirah Digital · sirahdigital.in", M, 288);

  doc.save(`feedback-summary.pdf`);
}

const clip = (v: unknown, n: number) => {
  const s = String(v ?? "");
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
};

/** Per-response detail PDF: a compact table + a comments appendix. */
async function downloadDetailsPdf(rows: Feedback[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 15;
  const PAGE_H = 297;
  const tc = (c: readonly number[]) => doc.setTextColor(c[0], c[1], c[2]);

  // Columns: x positions / widths (mm)
  const cols: { key: string; x: number; w: number; align?: "center" }[] = [
    { key: "Name", x: 15, w: 40 },
    { key: "WhatsApp", x: 55, w: 26 },
    { key: "NPS", x: 81, w: 13, align: "center" },
    { key: "Rating", x: 94, w: 15, align: "center" },
    { key: "Guided", x: 109, w: 46 },
    { key: "When (IST)", x: 155, w: 40 },
  ];

  let y = 0;
  const drawHeader = () => {
    doc.setFillColor(PDF.ANCHOR[0], PDF.ANCHOR[1], PDF.ANCHOR[2]);
    doc.rect(0, 0, 210, 20, "F");
    tc([245, 242, 234]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Feedback — individual responses", M, 9);
    tc(PDF.GOLD);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${rows.length} responses · Germany Career Summit 2026`, M, 15);
    y = 27;
    // column headers
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    tc(PDF.MUTED);
    cols.forEach((c) =>
      doc.text(c.key.toUpperCase(), c.align === "center" ? c.x + c.w / 2 : c.x, y, {
        align: c.align === "center" ? "center" : "left",
      }),
    );
    y += 2;
    doc.setDrawColor(220, 217, 209);
    doc.line(M, y, 195, y);
    y += 4.5;
  };

  drawHeader();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  rows.forEach((r) => {
    if (y > PAGE_H - 18) {
      doc.addPage();
      drawHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    }
    const vals: Record<string, string> = {
      Name: clip(r.name, 26),
      WhatsApp: clip(r.phone, 16),
      NPS: String(r.nps),
      Rating: String(r.rating),
      Guided: clip(GUIDED_LABELS[r.guided] ?? r.guided, 28),
      "When (IST)": clip(formatISTDateTime(r.createdAt), 26),
    };
    tc(PDF.DARK);
    cols.forEach((c) =>
      doc.text(vals[c.key], c.align === "center" ? c.x + c.w / 2 : c.x, y, {
        align: c.align === "center" ? "center" : "left",
      }),
    );
    y += 5.2;
    doc.setDrawColor(238, 236, 230);
    doc.line(M, y - 1.6, 195, y - 1.6);
  });

  // Comments appendix
  const withNotes = rows.filter((r) => r.valuable || r.improve);
  if (withNotes.length) {
    doc.addPage();
    y = 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    tc(PDF.DARK);
    doc.text("Comments", M, y);
    y += 8;
    withNotes.forEach((r) => {
      const block: string[] = [];
      if (r.valuable) block.push(`+ Valuable: ${r.valuable}`);
      if (r.improve) block.push(`- Better: ${r.improve}`);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      tc(PDF.DARK);
      const lines: string[] = [];
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      for (const b of block) for (const ln of doc.splitTextToSize(b, 180)) lines.push(ln);
      if (y + 6 + lines.length * 4.4 > PAGE_H - M) {
        doc.addPage();
        y = 16;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      tc(PDF.GOLD);
      doc.text(`${r.name || "—"} · NPS ${r.nps} · ${r.rating}/10`, M, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      tc(PDF.DARK);
      for (const ln of lines) {
        doc.text(ln, M, y);
        y += 4.4;
      }
      y += 3;
    });
  }

  doc.save(`feedback-details-${rows.length}.pdf`);
}
