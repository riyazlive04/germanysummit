// One-off: wipe all TEST data before the event.
//
// Deletes every Submission row (Reality Check + CV/LinkedIn + Roadmap + playbook
// + enrollment all live in this one table). Optionally resets AppConfig toggles
// back to defaults. Uses DIRECT_URL (session pooler) so a single script run does
// not fight the transaction pooler.
//
//   node --env-file=.env scripts/clear-test-data.mjs          # dry run (counts only)
//   node --env-file=.env scripts/clear-test-data.mjs --yes    # actually delete
//   node --env-file=.env scripts/clear-test-data.mjs --yes --reset-config
//
import { PrismaClient } from "@prisma/client";

const args = new Set(process.argv.slice(2));
const CONFIRM = args.has("--yes");
const RESET_CONFIG = args.has("--reset-config");

const p = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

const before = await p.submission.count();
console.log(`Submission rows currently in DB: ${before}`);

if (!CONFIRM) {
  console.log("\nDRY RUN — nothing deleted. Re-run with --yes to delete all rows.");
  if (RESET_CONFIG) console.log("(--reset-config would also reset AppConfig toggles to defaults.)");
  await p.$disconnect();
  process.exit(0);
}

const del = await p.submission.deleteMany({});
console.log(`Deleted ${del.count} Submission row(s).`);

if (RESET_CONFIG) {
  await p.appConfig.upsert({
    where: { id: "singleton" },
    update: { allowAllRetakes: false, eventDayMode: false, seatsTotal: 8, soloTotal: 25 },
    create: { id: "singleton", allowAllRetakes: false, eventDayMode: false, seatsTotal: 8, soloTotal: 25 },
  });
  console.log("AppConfig reset to defaults (retakes off, eventDayMode off, seats 8, solo 25).");
}

const after = await p.submission.count();
console.log(`Submission rows remaining: ${after}`);
await p.$disconnect();
