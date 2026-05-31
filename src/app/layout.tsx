import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

// Display - Fraunces (serif, the "mirror" headlines)
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Body - Hanken Grotesk
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Data / labels - Space Mono
const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  display: "swap",
  weight: ["400", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Germany Readiness Suite - Germany Career Summit 2026",
  description:
    "Your instant 5-dimension Germany Readiness Score, CV gap diagnosis, and AI 90-Day Roadmap. The mirror before the method.",
  openGraph: {
    title: "Germany Readiness Suite - Germany Career Summit 2026",
    description:
      "Your instant 5-dimension Germany Readiness Score, CV gap diagnosis, and AI 90-Day Roadmap.",
    siteName: "Germany Readiness Suite",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Germany Readiness Suite - Germany Career Summit 2026",
    description:
      "Your instant 5-dimension Germany Readiness Score, CV gap diagnosis, and AI 90-Day Roadmap.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0f0d",
  width: "device-width",
  initialScale: 1,
};

// Runs before first paint to set the theme from a saved preference, avoiding a
// flash of the wrong theme. Dark is the default brand identity when nothing is
// stored. Kept tiny and inlined so it executes synchronously in <head>.
const themeInit = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark')t='dark';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${hanken.variable} ${spaceMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
