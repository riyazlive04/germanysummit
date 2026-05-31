import type { Config } from "tailwindcss";

/**
 * Brand tokens are defined once as CSS variables in globals.css (:root, from
 * CONTEXT.md §10). Tailwind reads them through var() so the operator can swap
 * exact brand hex in one place without touching component code.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
        },
        anchor: {
          DEFAULT: "var(--anchor)",
          hi: "var(--anchor-hi)",
        },
        "on-anchor": "var(--on-anchor)",
        gold: {
          DEFAULT: "var(--gold)",
          soft: "var(--gold-soft)",
          deep: "var(--gold-deep)",
        },
        green: "var(--green)",
        red: "var(--red)",
        text: "var(--text)",
        muted: "var(--muted)",
      },
      borderRadius: {
        xl: "var(--radius)",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-hanken)", "system-ui", "sans-serif"],
        mono: ["var(--font-space-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        gold: "0 0 0 1px var(--gold-soft), 0 18px 50px -20px rgba(230,168,23,0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
