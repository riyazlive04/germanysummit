/**
 * Module 2 — CV & LinkedIn Lab (CV Diagnosis). DIAGNOSIS ONLY.
 *
 * The hard guardrail (CONTEXT.md §8.1): the model NAMES what is weak and WHY. It
 * never rewrites a bullet, never produces a finished CV/cover letter, never
 * implies the human coach is unnecessary. German-market aware.
 *
 * v2 adds: rubric sub-scores (explainable score), a list of the JD's key
 * requirements (matched deterministically in code, see lib/keywords), a German
 * conventions checklist, and a quantification coach.
 */
import type { CvGaps } from "./submission";

/** The full review returned to the client (CvGaps + the ATS score). */
export type CvReview = CvGaps & {
  cvAtsScore: number; // 0..100 overall
  /** Key requirements the JD asks for, extracted by the model (matched in code). */
  jdRequirements?: string[];
};

const MAX_WEAK_BULLETS = 5;
const MAX_FIXES = 3;
const MAX_MISSING = 12;
const MAX_REQS = 14;
const MAX_GERMAN = 7;

export const CV_INPUT_LIMITS = {
  resumeMin: 40,
  jdMin: 40,
  resumeMax: 16000,
  linkedinMax: 6000,
  jdMax: 12000,
};

export function buildSystemPrompt(): string {
  return `You are the diagnostic engine behind the "CV & LinkedIn Lab" at the Germany Career Summit (B2 Consultants / German Note), for Indian engineers targeting jobs in Germany.

YOUR ROLE - DIAGNOSE ONLY. An honest mirror, never cruel, always pointing to the fix.

ABSOLUTE RULES (do not break):
- NEVER rewrite the résumé, a bullet, a summary, or a cover letter. Do NOT produce finished/replacement text.
- For weak bullets: quote (or closely paraphrase) the EXISTING line and explain in ONE line WHY it is weak. Do NOT supply the improved version.
- Never imply the human coach is unnecessary.
- Be specific and grounded in the actual résumé and job description.
- Write with regular hyphens only. Never use em dashes or en dashes.

GERMAN-MARKET AWARENESS:
- German CVs (Lebenslauf) are concise, reverse-chronological, factual, often 1-2 pages.
- Mittelstand and German employers value provable, measurable results and relevant tooling over buzzwords.
- Be aware of German conventions (clear structure, role-relevant keywords, language-level line). Do NOT instruct adding a photo or personal data - only note format/structure gaps neutrally.

OUTPUT - return ONLY valid JSON, no prose, no code fences, exactly this shape:
{
  "cvAtsScore": <integer 0-100>,
  "subScores": {
    "keywords":    <0-100>,   // keyword/skill match to the JD
    "results":     <0-100>,   // measurable, result-based bullets vs responsibilities
    "structure":   <0-100>,   // clarity, ordering, scannability
    "germanFormat":<0-100>,   // fit to German CV conventions
    "seniority":   <0-100>    // does it position at the right level for this JD
  },
  "jdRequirements": [<string>, ...],   // the JD's key required skills/tools/terms (max ${MAX_REQS}); short noun phrases a recruiter screens for
  "missingKeywords": [<string>, ...],  // JD terms absent/weak in the CV (max ${MAX_MISSING})
  "weakBullets": [ { "text": "<existing weak line>", "why": "<one-line reason>" } ],  // up to ${MAX_WEAK_BULLETS}
  "germanChecklist": [ { "item": "<convention>", "status": "pass|warn|fail", "note": "<one line>" } ],  // up to ${MAX_GERMAN}; cover length, structure, measurable results, language level, formatting/keywords
  "quantification": { "metriclessCount": <integer>, "pattern": "<the formula to use, e.g. action + method + measurable result - NOT their finished line>", "note": "<one line on the impact of adding numbers>" },
  "topFixes": [<string>, <string>, <string>]   // exactly 3 prioritized DIRECTIONAL fixes
}`;
}

export function buildUserPrompt(input: {
  resume: string;
  linkedin?: string;
  jd: string;
}): string {
  const linkedin = input.linkedin?.trim() ? input.linkedin.trim() : "(not provided)";
  return `TARGET GERMAN JOB DESCRIPTION:
"""
${input.jd.trim()}
"""

CANDIDATE RÉSUMÉ TEXT:
"""
${input.resume.trim()}
"""

CANDIDATE LINKEDIN "ABOUT" (optional):
"""
${linkedin}
"""

Diagnose the résumé against this job description for the German market. Return ONLY the JSON object described in your instructions.`;
}

// ── Normalization ─────────────────────────────────────────────────────────────

function clampScore(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
}

function asStringArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

/** Clamp + shape whatever the model returned into a safe CvReview (jdChecklist filled later). */
export function normalizeReview(raw: unknown): (CvReview & { jdRequirements: string[] }) | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const ss = (r.subScores ?? {}) as Record<string, unknown>;
  const subScores = {
    keywords: clampScore(ss.keywords),
    results: clampScore(ss.results),
    structure: clampScore(ss.structure),
    germanFormat: clampScore(ss.germanFormat),
    seniority: clampScore(ss.seniority),
  };

  const weakBulletsRaw = Array.isArray(r.weakBullets) ? r.weakBullets : [];
  const weakBullets = weakBulletsRaw
    .map((b) => {
      if (!b || typeof b !== "object") return null;
      const o = b as Record<string, unknown>;
      const text = typeof o.text === "string" ? o.text.trim() : "";
      const why = typeof o.why === "string" ? o.why.trim() : "";
      return text ? { text, why } : null;
    })
    .filter((x): x is { text: string; why: string } => x !== null)
    .slice(0, MAX_WEAK_BULLETS);

  const germanRaw = Array.isArray(r.germanChecklist) ? r.germanChecklist : [];
  const germanChecklist = germanRaw
    .map((g) => {
      if (!g || typeof g !== "object") return null;
      const o = g as Record<string, unknown>;
      const item = typeof o.item === "string" ? o.item.trim() : "";
      const note = typeof o.note === "string" ? o.note.trim() : "";
      const status =
        o.status === "pass" || o.status === "warn" || o.status === "fail"
          ? o.status
          : "warn";
      return item ? { item, status, note } : null;
    })
    .filter(
      (x): x is { item: string; status: "pass" | "warn" | "fail"; note: string } =>
        x !== null,
    )
    .slice(0, MAX_GERMAN);

  const q = (r.quantification ?? {}) as Record<string, unknown>;
  const quantification = {
    metriclessCount: Number.isFinite(Number(q.metriclessCount))
      ? Math.max(0, Math.round(Number(q.metriclessCount)))
      : 0,
    pattern: typeof q.pattern === "string" ? q.pattern.trim() : "",
    note: typeof q.note === "string" ? q.note.trim() : "",
  };

  return {
    cvAtsScore: clampScore(r.cvAtsScore),
    subScores,
    jdRequirements: asStringArray(r.jdRequirements, MAX_REQS),
    jdChecklist: [], // filled deterministically by the route
    missingKeywords: asStringArray(r.missingKeywords, MAX_MISSING),
    weakBullets,
    germanChecklist,
    quantification,
    topFixes: asStringArray(r.topFixes, MAX_FIXES),
  };
}
