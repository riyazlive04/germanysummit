/**
 * Module 2b — LinkedIn Optimizer. DIAGNOSIS ONLY.
 *
 * Analyzes a profile the attendee PASTES (or uploads as their own "Save to PDF"
 * export) - we never scrape LinkedIn. Recommendations are in the spirit of
 * LinkedIn-growth coaching (strong headline value-prop, a hook-led About,
 * recruiter keywords, profile completeness, activity) but stay diagnostic: name
 * what's weak and why, never write the finished profile (CONTEXT.md §8).
 */
import type { LinkedinGaps } from "./submission";

export type LinkedinReview = LinkedinGaps & {
  visibilityScore: number; // 0..100
};

const MAX_KEYWORDS = 12;
const MAX_FLAGS = 6;
const MAX_FIXES = 3;

export const LINKEDIN_INPUT_LIMITS = {
  // either headline or profile text must carry enough to analyze
  minTotal: 60,
  headlineMax: 400,
  profileMax: 16000,
};

export function buildSystemPrompt(): string {
  return `You are the diagnostic engine behind the "LinkedIn Optimizer" at the Germany Career Summit (B2 Consultants / German Note), for Indian engineers targeting jobs in Germany.

YOUR ROLE - DIAGNOSE ONLY. An honest mirror, never cruel, always pointing to the fix. Think like a sharp LinkedIn-growth coach optimizing a profile for INBOUND recruiter interest.

ABSOLUTE RULES (do not break):
- NEVER write the finished headline, About, or any replacement copy. Do NOT supply rewritten text.
- For each weak section, name the section and explain in ONE line WHAT is weak and WHY (e.g. "Headline: just a job title - no value proposition or keywords a recruiter searches"). The rewrite is the attendee's and the coach's work.
- Never imply the human coach is unnecessary.
- Be specific and grounded in the actual profile text provided.
- Write with regular hyphens only. Never use em dashes or en dashes.

WHAT GOOD LOOKS LIKE (judge against this, do not output it as copy):
- Headline: a keyword-rich value proposition (who you help + how + proof), not just "Software Engineer at X".
- About: a hook in the first 2 lines (the part shown before "see more"), a short story/positioning, proof with numbers, and a clear call to action. First person, scannable.
- Keywords: the role/skills/tools a German recruiter would search for should appear in headline + About + skills.
- Completeness & signals: featured section, a banner that positions them, relevant skills, recommendations, and recent activity/posting cadence.
- German-market angle: German language level, openness to relocation, target roles/cities surfaced where relevant.

SCORING - visibilityScore 0-100 = how discoverable + compelling this profile is to a German recruiter doing a search and a 10-second skim.

OUTPUT - return ONLY valid JSON, no prose, no code fences, exactly:
{
  "visibilityScore": <integer 0-100>,
  "subScores": {
    "headline":     <0-100>,   // value-prop + keywords vs just a job title
    "hook":         <0-100>,   // first 2 lines of About grab attention
    "keywords":     <0-100>,   // recruiter-search terms present across the profile
    "completeness": <0-100>,   // featured, banner, skills, recommendations
    "activity":     <0-100>    // posting / engagement signals
  },
  "headlineRead": "<one-line diagnosis of the headline (or note it's missing)>",
  "missingKeywords": [<string>, ...],                 // recruiter-search terms absent/weak (max ${MAX_KEYWORDS})
  "sectionFlags": [                                     // up to ${MAX_FLAGS}; flag, do NOT rewrite
    { "section": "<Headline|About|Keywords|Featured|Skills|Banner|Activity|...>", "issue": "<one-line what's weak and why>" }
  ],
  "topFixes": [<string>, <string>, <string>]           // exactly 3 prioritized, DIRECTIONAL fixes
}`;
}

export function buildUserPrompt(input: {
  headline?: string;
  profile: string;
  targetRole?: string;
}): string {
  const headline = input.headline?.trim() || "(not provided separately)";
  return `TARGET ROLE: ${input.targetRole?.trim() || "not specified (infer from the profile)"}

LINKEDIN HEADLINE:
"""
${headline}
"""

LINKEDIN PROFILE TEXT (About, experience, skills - pasted or from the member's own PDF export):
"""
${input.profile.trim()}
"""

Diagnose this LinkedIn profile for inbound discoverability by German recruiters. Return ONLY the JSON object described in your instructions.`;
}

function asStringArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

/** Clamp + shape whatever the model returned into a safe LinkedinReview. */
export function normalizeReview(raw: unknown): LinkedinReview | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const clampScore = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
  };
  const visibilityScore = clampScore(r.visibilityScore);

  const ss = (r.subScores ?? {}) as Record<string, unknown>;
  const subScores = {
    headline: clampScore(ss.headline),
    hook: clampScore(ss.hook),
    keywords: clampScore(ss.keywords),
    completeness: clampScore(ss.completeness),
    activity: clampScore(ss.activity),
  };

  const flagsRaw = Array.isArray(r.sectionFlags) ? r.sectionFlags : [];
  const sectionFlags = flagsRaw
    .map((f) => {
      if (!f || typeof f !== "object") return null;
      const o = f as Record<string, unknown>;
      const section = typeof o.section === "string" ? o.section.trim() : "";
      const issue = typeof o.issue === "string" ? o.issue.trim() : "";
      if (!section || !issue) return null;
      return { section, issue };
    })
    .filter((x): x is { section: string; issue: string } => x !== null)
    .slice(0, MAX_FLAGS);

  return {
    visibilityScore,
    subScores,
    headlineRead: typeof r.headlineRead === "string" ? r.headlineRead.trim() : "",
    missingKeywords: asStringArray(r.missingKeywords, MAX_KEYWORDS),
    sectionFlags,
    topFixes: asStringArray(r.topFixes, MAX_FIXES),
  };
}
