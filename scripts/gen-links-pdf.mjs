// Generate a print-ready PDF of the event links: QR codes for the attendee
// links + a clean list of the admin links.
//
//   node scripts/gen-links-pdf.mjs
//
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { writeFileSync } from "node:fs";

const BASE = "https://germanysummit.sirahagents.com";

const ATTENDEE = [
  { label: "Reality Check — Pre-event", url: `${BASE}/reality-check` },
  { label: "Reality Check — End of Day", url: `${BASE}/reality-check?session=end_of_day` },
  { label: "Feedback Form", url: `${BASE}/feedback` },
  { label: "My Results", url: `${BASE}/my-results` },
  { label: "Free Book (The Secret Playbook)", url: `${BASE}/book` },
  { label: "Pre-order the Book", url: `${BASE}/pre-order` },
  { label: "Next Steps - Book a Call", url: `${BASE}/next-steps` },
];

const ADMIN = [
  { label: "Room Dashboard", url: `${BASE}/room` },
  { label: "Question Insights", url: `${BASE}/room/insights` },
  { label: "Records", url: `${BASE}/room/records` },
  { label: "Feedback Dashboard", url: `${BASE}/room/feedback` },
  { label: "Pre / Post Comparison", url: `${BASE}/room/compare` },
];

// Brand colours
const GREEN = [15, 61, 46];
const GOLD = [176, 131, 14];
const INK = [20, 32, 26];
const MUTE = [110, 120, 112];

const doc = new jsPDF({ unit: "mm", format: "a4" });
const W = 210;

function header(title, subtitle) {
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 30, "F");
  doc.setTextColor(245, 242, 234);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, 15, 15);
  doc.setTextColor(...GOLD);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, 15, 23);
}

// ── Page 1: attendee QR codes ────────────────────────────────────────────────
header("Germany Career Summit 2026", "Attendee links — scan to open");

const qrs = await Promise.all(
  ATTENDEE.map((l) => QRCode.toDataURL(l.url, { margin: 1, width: 440 })),
);

const cols = [15, 110];
const cellW = 85;
const qrSize = 36;
const startY = 38;
const rowPitch = 60; // QR + label + url per row, fits 4 rows on A4

ATTENDEE.forEach((l, i) => {
  const x = cols[i % 2];
  const y = startY + Math.floor(i / 2) * rowPitch;
  const cx = x + cellW / 2;
  // QR centered in the cell
  doc.addImage(qrs[i], "PNG", cx - qrSize / 2, y, qrSize, qrSize);
  // Label
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(doc.splitTextToSize(l.label, cellW), cx, y + qrSize + 7, { align: "center" });
  // URL (strip scheme for readability)
  doc.setTextColor(...MUTE);
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  const shown = l.url.replace("https://", "");
  doc.text(doc.splitTextToSize(shown, cellW), cx, y + qrSize + 14, { align: "center" });
});

doc.setTextColor(...MUTE);
doc.setFont("helvetica", "italic");
doc.setFontSize(8);
doc.text("Print and place QR codes at the relevant stations. End-of-day link is for the closing pulse only.", 15, 288);

// ── Page 2: admin links ──────────────────────────────────────────────────────
doc.addPage();
header("Germany Career Summit 2026", "Admin links — keep off the projector");

let y = 46;
doc.setTextColor(...INK);
doc.setFont("helvetica", "normal");
doc.setFontSize(10);
doc.text("These pages are protected by the admin key. Tip: append  ?key=YOUR_ADMIN_KEY  to open in one tap.", 15, y);
y += 14;

ADMIN.forEach((l) => {
  doc.setDrawColor(225, 222, 214);
  doc.line(15, y - 5, W - 15, y - 5);
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(l.label, 15, y + 2);
  doc.setTextColor(...MUTE);
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.text(l.url.replace("https://", ""), 15, y + 9);
  y += 20;
});

doc.setTextColor(...GOLD);
doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.text("/room/compare → Audience tab is the big-screen Morning-vs-Now reveal.", 15, y + 4);

doc.setTextColor(...MUTE);
doc.setFont("helvetica", "normal");
doc.setFontSize(8);
doc.text("Developed by Sirah Digital · sirahdigital.in", 15, 288);

const out = "Germany-Summit-Links.pdf";
writeFileSync(out, Buffer.from(doc.output("arraybuffer")));
console.log(`Wrote ${out}`);
