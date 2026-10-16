/**
 * Add Gym.checkInToken as a nullable column before `prisma db push`.
 * Prisma cannot add a required column with a Prisma-level default onto
 * gyms that already exist. Making it optional first avoids --force-reset.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  db.close();
} catch {
  // Node 20 has no node:sqlite. `prisma db push` can still add an optional column.
}
