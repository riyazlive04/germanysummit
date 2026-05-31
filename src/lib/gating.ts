/**
 * Retake gating for the Reality Check.
 *
 * A person is identified by email OR normalized phone. Once they have a
 * COMPLETED Reality Check (totalScore set), they are locked from retaking unless:
 *   - the admin granted them a one-shot retake (Submission.retakeAllowed), or
 *   - the global override is on (AppConfig.allowAllRetakes).
 *
 * A granted per-user retake is consumed on the next successful submission (the
 * caller resets retakeAllowed via consumeIds). Server-only.
 */
import { prisma } from "./db";
import { getAppConfig } from "./config";

export type LockState = {
  taken: boolean; // a completed Reality Check already exists for this identity
  allowed: boolean; // may they (re)take right now?
  conflictIds: string[]; // ids of the matching completed rows (to consume on save)
};

export async function evaluateLock(
  email: string,
  phoneNorm: string | null,
): Promise<LockState> {
  const conflicts = await prisma.submission.findMany({
    where: {
      totalScore: { not: null },
      OR: [{ email }, ...(phoneNorm ? [{ phoneNorm }] : [])],
    },
    select: { id: true, retakeAllowed: true },
  });

  if (conflicts.length === 0) {
    return { taken: false, allowed: true, conflictIds: [] };
  }

  const config = await getAppConfig();
  const allowed =
    config.allowAllRetakes || conflicts.some((c) => c.retakeAllowed);

  return { taken: true, allowed, conflictIds: conflicts.map((c) => c.id) };
}

/** Reset per-user retake grants after they've been used. */
export async function consumeRetakes(ids: string[]) {
  if (ids.length === 0) return;
  await prisma.submission.updateMany({
    where: { id: { in: ids } },
    data: { retakeAllowed: false },
  });
}
