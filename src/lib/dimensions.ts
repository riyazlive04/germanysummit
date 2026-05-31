/**
 * Display metadata for the 5 dimensions (CONTEXT.md §5) - used by the radar
 * labels and the four worksheet result blocks. Copy is the honest "mirror" tone:
 * direct about the gap, always pointing to the fix. Archetype copy (false belief
 * + reframe) lands in Phase 3.
 */
import type { Dimension } from "./submission";

export type DimMeta = {
  /** Short label for the radar vertex. */
  short: string;
  /** One line on what this dimension measures. */
  whatItMeasures: string;
  /** Read shown when this dimension is strong (score high). */
  strong: string;
  /** Read shown when this dimension is weak (score low) - points to the fix. */
  weak: string;
};

export const DIM_META: Record<Dimension, DimMeta> = {
  Profile: {
    short: "Profile",
    whatItMeasures: "Positioning, the 10-second recruiter read, measurable results.",
    strong: "You lead with a problem you solve, backed by numbers - recruiters get it fast.",
    weak: "A recruiter can't tell in 8 seconds what you'd fix for them. Positioning is the lever.",
  },
  Strategy: {
    short: "Strategy",
    whatItMeasures: "A targeted system: company list, direct outreach, Xing/network, routine.",
    strong: "You run a targeted system - chosen companies, direct contact, a repeatable routine.",
    weak: "You're applying into the black hole. A targeted list and direct outreach beat volume.",
  },
  "German & Skills": {
    short: "German & Skills",
    whatItMeasures: "Language level, real speaking practice, provable technical skills.",
    strong: "Your German is moving and your skills are documented - doors open faster.",
    weak: "Waiting for the 'perfect' certificate burns hiring cycles. Speaking + proof open doors now.",
  },
  Mindset: {
    short: "Mindset",
    whatItMeasures: "Response to rejection and silence - agency vs. blame, comparison.",
    strong: "You treat silence as data and adjust the approach instead of stalling.",
    weak: "Months of silence are quietly eroding your belief. Results come from adjusting, not luck.",
  },
  "90-Day Plan": {
    short: "90-Day Plan",
    whatItMeasures: "A written weekly plan vs. hope; concrete action in the last 7 days.",
    strong: "You run on a written weekly plan with concrete recent action - not hope.",
    weak: "Intentions aren't a plan. A written weekly plan is the gap between another lost year and an offer.",
  },
};
