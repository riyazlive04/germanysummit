/**
 * Deterministic requirement matching for the CV "recruiter view".
 *
 * The model extracts the JD's key requirements (it's good at that); the MATCH
 * decision is made here in code so the met/missing checklist is consistent and
 * trustworthy every run, not a thing the model can hallucinate.
 */

// Words too generic to anchor a match on their own.
const STOP = new Set([
  "and", "or", "the", "with", "for", "of", "in", "on", "to", "a", "an",
  "experience", "knowledge", "skills", "strong", "good", "years", "year",
  "plus", "etc", "using", "based", "work", "working", "ability", "team",
]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’']/g, "")
    .replace(/[^a-z0-9+#./\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Significant tokens of a requirement (drop stopwords + very short bits). */
function tokens(req: string): string[] {
  return normalize(req)
    .split(/[\s/(),]+/)
    .map((t) => t.replace(/^[-.]+|[-.]+$/g, ""))
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

/**
 * A requirement is "met" if its full phrase appears in the résumé, or all of its
 * significant tokens appear (so "Spring Boot" matches even if written across the
 * CV, but "REST API design" needs rest+api+design present).
 */
export function matchRequirements(
  requirements: string[],
  resumeText: string,
): { requirement: string; met: boolean }[] {
  const hay = normalize(resumeText);
  return requirements.map((requirement) => {
    const phrase = normalize(requirement);
    if (phrase && hay.includes(phrase)) return { requirement, met: true };

    const toks = tokens(requirement);
    if (toks.length === 0) return { requirement, met: false };
    const met = toks.every((t) => hay.includes(t));
    return { requirement, met };
  });
}
