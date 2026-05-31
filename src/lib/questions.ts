/**
 * The 10 Reality Check questions - VERBATIM from the build prompt.
 *
 * These are FRESH proxies, deliberately NOT copies of the paper workbook prompts
 * (attendees answer the real workbook live at the event - CONTEXT.md §5).
 *
 * Order matters: questions are paired by dimension, two per dimension, in the
 * DIMENSIONS order (Profile, Strategy, German & Skills, Mindset, 90-Day Plan).
 * The array index === the `answers[]` index stored on the Submission.
 *
 * Options are authored best→worst (points 3→0). `points` is authoritative for
 * scoring; display order follows the array.
 */
import type { Dimension } from "./submission";

export type Option = { label: string; points: 0 | 1 | 2 | 3 };

export type Question = {
  id: string; // Q1..Q10
  dimension: Dimension;
  prompt: string;
  options: Option[];
};

export const QUESTIONS: Question[] = [
  // ── Profile ────────────────────────────────────────────────────────────
  {
    id: "Q1",
    dimension: "Profile",
    prompt: "Your professional profile, in one line, is closest to:",
    options: [
      { label: "A specific problem I solve for companies", points: 3 },
      { label: "My job title and years of experience", points: 2 },
      { label: "A long list of everything I've done", points: 1 },
      { label: "I haven't really defined it", points: 0 },
    ],
  },
  {
    id: "Q2",
    dimension: "Profile",
    prompt: "If a recruiter scanned your CV for 8 seconds, what would catch them?",
    options: [
      { label: "A clear result, backed by a number, matching the role", points: 3 },
      { label: "A relevant title and solid experience", points: 2 },
      { label: "A wall of responsibilities and tools", points: 1 },
      { label: "Honestly, nothing stands out", points: 0 },
    ],
  },

  // ── Strategy ───────────────────────────────────────────────────────────
  {
    id: "Q3",
    dimension: "Strategy",
    prompt: "Right now, your German job search looks most like:",
    options: [
      { label: "A targeted system - chosen companies, direct outreach, a routine", points: 3 },
      { label: "Steady applying, mostly through job portals", points: 2 },
      { label: "Bursts of effort when motivation strikes", points: 1 },
      { label: "I haven't really started", points: 0 },
    ],
  },
  {
    id: "Q4",
    dimension: "Strategy",
    prompt: "When you want to reach a German company, your default move is:",
    options: [
      { label: "Find and message the right person directly", points: 3 },
      { label: "Apply, and also try to find a contact", points: 2 },
      { label: "Apply through the portal and wait", points: 1 },
      { label: "I don't really reach companies directly", points: 0 },
    ],
  },

  // ── German & Skills ──────────────────────────────────────────────────────
  {
    id: "Q5",
    dimension: "German & Skills",
    prompt: "On German language plus market-ready technical skills, you are:",
    options: [
      { label: "B2+ and I can prove my skills with documented results", points: 3 },
      { label: "Building German (A2-B1), skills are solid", points: 2 },
      { label: "Skills strong, German barely started", points: 1 },
      { label: "Early on both", points: 0 },
    ],
  },
  {
    id: "Q6",
    dimension: "German & Skills",
    prompt: "How recently have you used German in a real, unscripted conversation?",
    options: [
      { label: "This week - I actively practise speaking", points: 3 },
      { label: "Within the last month", points: 2 },
      { label: "Rarely - I study more than I speak", points: 1 },
      { label: "I haven't really spoken it", points: 0 },
    ],
  },

  // ── Mindset ──────────────────────────────────────────────────────────────
  {
    id: "Q7",
    dimension: "Mindset",
    prompt: "When months pass with no results, what honestly happens in your head?",
    options: [
      { label: "I look for what to change and adjust the approach", points: 3 },
      { label: "I push harder doing the same things", points: 2 },
      { label: "I start doubting it's possible for someone like me", points: 1 },
      { label: "I pause and drift for a while", points: 0 },
    ],
  },
  {
    id: "Q8",
    dimension: "Mindset",
    prompt: "When another Indian engineer lands a job in Germany, your honest reaction is:",
    options: [
      { label: "I study what they did and apply it", points: 3 },
      { label: "I'm motivated, but unsure how they did it", points: 2 },
      { label: "I feel behind and a little discouraged", points: 1 },
      { label: "I tell myself they got lucky", points: 0 },
    ],
  },

  // ── 90-Day Plan ──────────────────────────────────────────────────────────
  {
    id: "Q9",
    dimension: "90-Day Plan",
    prompt: "Your plan for the next 90 days is:",
    options: [
      { label: "Written and specific, with weekly actions", points: 3 },
      { label: "A clear goal, but no real plan", points: 2 },
      { label: "A rough intention", points: 1 },
      { label: "Honestly, just hope", points: 0 },
    ],
  },
  {
    id: "Q10",
    dimension: "90-Day Plan",
    prompt: "In the last 7 days, how many concrete actions did you take toward Germany?",
    options: [
      { label: "Several - it's part of a routine", points: 3 },
      { label: "One or two", points: 2 },
      { label: "I meant to, but didn't", points: 1 },
      { label: "None", points: 0 },
    ],
  },
];

export const TOTAL_QUESTIONS = QUESTIONS.length; // 10
