// Generates branded QR PNGs for the three event-day links.
// Run: node scripts/gen-qr.mjs
import QRCode from "qrcode";
import { mkdir } from "node:fs/promises";

const OUT = "docs/assets/qr";
await mkdir(OUT, { recursive: true });

const BASE = "https://germanysummit.sirahagents.com";
const targets = [
  ["reality-check", `${BASE}/reality-check`],
  ["arrival", `${BASE}/arrival`],
  ["end-of-day", `${BASE}/end-of-day`],
];

for (const [name, url] of targets) {
  await QRCode.toFile(`${OUT}/${name}.png`, url, {
    width: 640,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0a0f0dff", light: "#ffffffff" },
  });
  console.log("wrote", `${OUT}/${name}.png`, "->", url);
}
