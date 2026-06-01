/**
 * Stage-reveal captions for the /room/live "Room Truth" mode. For each Reality
 * Check question, the big number is the share of the room that chose a weaker
 * option (points <= 1), and the caption is the Gap -> Pain line Ameen can read
 * off the screen. Keep these short, honest, and present-tense.
 */
export const STAGE_CAPTIONS: Record<string, string> = {
  Q1: "can't state the problem they solve in one line",
  Q2: "have nothing that stops a recruiter in 8 seconds",
  Q3: "are applying without a targeted system",
  Q4: "don't reach German companies directly",
  Q5: "are waiting on a certificate instead of moving",
  Q6: "rarely or never speak German out loud",
  Q7: "keep doing the same thing when months pass",
  Q8: "run on other people's success, not their own system",
  Q9: "have no written weekly plan",
  Q10: "took no real action in the last 7 days",
};

/** Points at or below this count as the "pain" options for the big number. */
export const PAIN_MAX_POINTS = 1;
