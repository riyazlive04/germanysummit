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
  session?: string,
): Promise<LockState> {
  const conflicts = await prisma.submission.findMany({
    where: {
      totalScore: { not: null },
      OR: [{ email }, ...(phoneNorm ? [{ phoneNorm }] : [])],
    },
    select: { id: true, retakeAllowed: true, session: true },
  });

  if (conflicts.length === 0) {
    return { taken: false, allowed: true, conflictIds: [] };
  }

  const config = await getAppConfig();
  const grantedRetake = conflicts.some((c) => c.retakeAllowed);

  let allowed: boolean;
  if (session === "end_of_day") {
    // The end-of-day pulse is self-unlocking but STRICTLY once per person: the
    // first end_of_day take is always allowed (no morning toggle needed), but a
    // repeat is blocked unless an admin granted that specific person a retake.
    // Global toggles do NOT loosen this - the room's before/after stays honest.
    const alreadyEndOfDay = conflicts.some((c) => c.session === "end_of_day");
    allowed = !alreadyEndOfDay || grantedRetake;
  } else {
    allowed = config.allowAllRetakes || config.eventDayMode || grantedRetake;
  }

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
