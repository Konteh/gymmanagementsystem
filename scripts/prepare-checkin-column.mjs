/**
 * Add Gym.checkInToken as a nullable column before `prisma db push`.
 * Prisma cannot add a required column with a Prisma-level default onto
 * gyms that already exist. Making it optional first avoids --force-reset.
 */
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEMO_CHECK_IN = {
  "33333333-3333-4333-8333-333333333333": "demo-bakau-powerhouse",
  "55555555-5555-4555-8555-555555555555": "demo-brikama-motion",
  "77777777-7777-4777-8777-777777777777": "demo-banjul-harbor",
  "99999999-9999-4999-8999-999999999999": "demo-lamin-boxing",
};

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbFile = process.argv[2] || path.join(root, "prisma", "gymflow.db");

if (!existsSync(dbFile)) {
  process.exit(0);
}

try {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(dbFile);
  const gymTable = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Gym'").get();
  if (!gymTable) {
    db.close();
    process.exit(0);
  }
  const cols = db.prepare("PRAGMA table_info(Gym)").all();
  const has = cols.some((col) => col.name === "checkInToken");
  if (!has) {
    db.exec("ALTER TABLE Gym ADD COLUMN checkInToken TEXT");
    console.log("Added optional Gym.checkInToken (no database reset).");
  }
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS Gym_checkInToken_key ON Gym(checkInToken)");
  const missing = db.prepare("SELECT id FROM Gym WHERE checkInToken IS NULL OR checkInToken = ''").all();
  const update = db.prepare("UPDATE Gym SET checkInToken = ? WHERE id = ?");
  for (const row of missing) {
    update.run(DEMO_CHECK_IN[row.id] ?? randomBytes(16).toString("hex"), row.id);
  }
  if (missing.length) {
    console.log(`Filled check-in tokens for ${missing.length} gym(s).`);
  }
  db.close();
} catch {
  // Node 20 has no node:sqlite. `prisma db push` can still add an optional column.
}
