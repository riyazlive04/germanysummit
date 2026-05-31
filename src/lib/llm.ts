/**
 * Env-configurable LLM provider adapter (CONTEXT.md §9 / build prompt).
 *
 * Server-only. `LLM_PROVIDER` selects the backend (default "anthropic"); the
 * Anthropic model is `ANTHROPIC_MODEL` or a sensible default. Keep all model
 * calls behind this seam so swapping providers/models is a one-file change.
 */
import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";

export type CompleteOptions = {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /**
   * Cache the (large, reused) system prompt. On a 300-attendee event burst the
   * same system prompt is sent over and over; Anthropic prompt caching serves it
   * at a steep discount and lower latency for ~5 min after each use. Default on.
   */
  cacheSystem?: boolean;
};

/** Returns the model's text output. Throws on misconfiguration / provider error. */
export async function complete(opts: CompleteOptions): Promise<string> {
  const provider = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();
  switch (provider) {
    case "anthropic":
      return anthropicComplete(opts);
    default:
      throw new Error(
        `Unsupported LLM_PROVIDER "${provider}". Configure an adapter in src/lib/llm.ts.`,
      );
  }
}

async function anthropicComplete({
  system,
  user,
  maxTokens = 1600,
  temperature = 0.3,
  cacheSystem = true,
}: CompleteOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;

  // Pass the system prompt as a cacheable content block when caching is on.
  // cache_control is GA on the API; the installed SDK's static types don't carry
  // it yet, so we attach it via a cast (sent verbatim to the API).
  const cachedBlock = {
    type: "text",
    text: system,
    cache_control: { type: "ephemeral" },
  } as unknown as Anthropic.TextBlockParam;
  const systemParam: string | Anthropic.TextBlockParam[] = cacheSystem
    ? [cachedBlock]
    : system;

  const res = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemParam,
    messages: [{ role: "user", content: user }],
  });

  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/**
 * Pull the first JSON object out of a model response, tolerating ```json fences
 * or surrounding prose. Returns null if nothing parses.
 */
export function extractJson<T = unknown>(text: string): T | null {
  if (!text) return null;

  // Strip code fences if present.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  // Try the whole candidate first, then the first {...} span.
  const attempts: string[] = [candidate.trim()];
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start !== -1 && end > start) attempts.push(candidate.slice(start, end + 1));

  for (const a of attempts) {
    try {
      return JSON.parse(a) as T;
    } catch {
      /* try next */
    }
  }
  return null;
}
