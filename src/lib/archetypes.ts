/**
 * The 5 archetypes - keyed by weakest dimension (CONTEXT.md §6), grounded in
 * B2's own ad/page language. Each names a false belief (the enemy) and its
 * reframe (the fix). The archetype is assigned from the LOWEST dimension; ties
 * resolve to the lower-numbered dimension (handled upstream by getWeakestDim).
 *
 * Tone (CONTEXT.md §8.4): honest mirror, never cruel - the belief is named, then
 * immediately turned toward the fix (the summit / the sprint).
 */
import type { Dimension } from "./submission";

export type Archetype = {
  /** The named identity, e.g. "The Spray-and-Pray Applier". */
  name: string;
  /** The false belief that keeps this person stuck - the enemy. */
  falseBelief: string;
  /** The reframe - the truth that points to the fix. */
  reframe: string;
};

export const ARCHETYPES: Record<Dimension, Archetype> = {
  Profile: {
    name: "The Invisible Profile",
    falseBelief: "My experience speaks for itself.",
    reframe:
      "German employers hire the problem you solve - and it has to be visible in 10 seconds.",
  },
  Strategy: {
    name: "The Spray-and-Pray Applier",
    falseBelief: "More applications = more chances.",
    reframe:
      "A targeted system beats volume. Blind applications go into a black hole.",
  },
  "German & Skills": {
    name: "The Cert Waiter",
    falseBelief: "I need B1/B2 before I start.",
    reframe:
      "Speaking plus provable skills open doors. Waiting for the certificate burns hiring cycles.",
  },
  Mindset: {
    name: "The Stalled Believer",
    falseBelief: "Maybe Germany isn't for someone like me.",
    reframe:
      "Results come from adjusting the approach - not luck or talent.",
  },
  "90-Day Plan": {
    name: "The Planless Hoper",
    falseBelief: "I'll figure it out as I go - I just need more info.",
    reframe:
      "A written weekly plan is the gap between another lost year and an offer.",
  },
};

export function getArchetype(weakestDim: Dimension): Archetype {
  return ARCHETYPES[weakestDim];
}
