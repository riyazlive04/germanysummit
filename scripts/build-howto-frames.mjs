// Generates branded how-to frame HTML pages (one per step) for the end-user GIF.
// Each frame is a fixed 1100x720 canvas: brand chrome + the app screenshot + a
// caption bar. Edge screenshots each at that size, then ffmpeg stitches the GIF.
// Run: node scripts/build-howto-frames.mjs
import { mkdir, writeFile } from "node:fs/promises";

const OUT = "docs/howto/frames";
await mkdir(OUT, { recursive: true });

const FRAMES = [
  { img: "home.png", url: "germanysummit.sirahagents.com", step: "Start here", title: "Open the suite on your phone", pos: "top" },
  { img: "reality-check.png", url: "/reality-check", step: "Step 1", title: "Take the Reality Check, get your 0 to 100 score", pos: "top" },
  { img: "cv-lab.png", url: "/cv-lab", step: "Step 2", title: "Upload your CV, see what a German recruiter misses", pos: "top" },
  { img: "roadmap.png", url: "/roadmap", step: "Step 3", title: "Get your 90-day plan and download it", pos: "top" },
  { img: "my-results.png", url: "/my-results", step: "Anytime", title: "Come back to everything with your email", pos: "top" },
];

const page = (f) => `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box}
  html,body{width:1100px;height:720px;overflow:hidden;
    font-family:"Segoe UI",Helvetica,Arial,sans-serif;background:#0a0f0d}
  .wrap{width:1100px;height:720px;display:flex;flex-direction:column;
    background:linear-gradient(160deg,#0f3d2e,#0a0f0d 70%);padding:26px 30px 0}
  .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
  .brand{display:flex;align-items:center;gap:11px;color:#fff}
  .brand .logo{width:34px;height:34px;border:2px solid #d99c0a;border-radius:8px;
    display:grid;place-items:center;color:#d99c0a;font-weight:800;font-family:Georgia,serif;font-size:15px}
  .brand .t{font-family:Georgia,serif;font-size:17px;font-weight:700;line-height:1.05}
  .brand .s{font-family:"Consolas",monospace;font-size:8.5px;letter-spacing:.16em;
    text-transform:uppercase;color:#d99c0a}
  .step{font-family:"Consolas",monospace;font-size:12px;letter-spacing:.14em;text-transform:uppercase;
    color:#0a0f0d;background:#d99c0a;font-weight:800;padding:7px 16px;border-radius:30px}
  .title{font-family:Georgia,serif;color:#fff;font-size:30px;line-height:1.15;
    max-width:760px;margin-bottom:16px}
  .title b{color:#e9b84a}
  .frame{flex:1;border-radius:14px 14px 0 0;overflow:hidden;border:1px solid rgba(255,255,255,.12);
    border-bottom:none;background:#0a0f0d;position:relative;box-shadow:0 -8px 40px rgba(0,0,0,.4)}
  .chrome{height:34px;background:#11201a;display:flex;align-items:center;gap:7px;padding:0 14px;
    border-bottom:1px solid rgba(255,255,255,.08)}
  .dot{width:10px;height:10px;border-radius:50%}
  .url{margin-left:12px;font-family:"Consolas",monospace;font-size:11px;color:#9fb0a6;
    background:#0a0f0d;border-radius:7px;padding:4px 14px}
  .shot{position:absolute;top:34px;left:0;right:0;bottom:0;overflow:hidden}
  .shot img{width:100%;display:block;object-fit:cover;object-position:${f.pos}}
</style></head><body>
  <div class="wrap">
    <div class="top">
      <div class="brand">
        <div class="logo">B</div>
        <div><div class="t">Germany Readiness Suite</div><div class="s">B2 Consultants / German Note</div></div>
      </div>
      <div class="step">${f.step}</div>
    </div>
    <div class="title">${f.title.replace(/(score|CV|90-day plan|email)/i, "<b>$1</b>")}</div>
    <div class="frame">
      <div class="chrome">
        <span class="dot" style="background:#e35d4f"></span>
        <span class="dot" style="background:#e9b84a"></span>
        <span class="dot" style="background:#3da35d"></span>
        <span class="url">${f.url}</span>
      </div>
      <div class="shot"><img src="../../assets/shots/${f.img}" alt=""></div>
    </div>
  </div>
</body></html>`;

let i = 1;
for (const f of FRAMES) {
  const name = `frame_${String(i).padStart(2, "0")}.html`;
  await writeFile(`${OUT}/${name}`, page(f), "utf8");
  console.log("wrote", name);
  i++;
}
