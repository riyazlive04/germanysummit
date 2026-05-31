/**
 * Fire-and-forget delivery to the n8n webhook (which fans out to Google Sheets +
 * WhatsApp via Evolution API - built separately by the operator).
 *
 * INTEGRATION CONTRACT (build prompt): non-blocking, with retry and graceful
 * failure so the user ALWAYS sees their result. This helper never throws - it
 * returns a status the caller can log but should not surface to the user.
 */

export type N8nResult =
  | { ok: true; attempt: number }
  | { ok: false; skipped: true } // no webhook configured
  | { ok: false; error: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fireN8n(
  payload: unknown,
  opts: { retries?: number; timeoutMs?: number } = {},
): Promise<N8nResult> {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return { ok: false, skipped: true };

  const retries = opts.retries ?? 2;
  const timeoutMs = opts.timeoutMs ?? 2500;
  let lastError = "unknown error";

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);

      if (res.ok) return { ok: true, attempt };
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    // Exponential-ish backoff before the next try (skip after the last).
    if (attempt < retries) await sleep(200 * (attempt + 1));
  }

  return { ok: false, error: lastError };
}
