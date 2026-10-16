/**
 * Local SQLite setup that does not wipe gyms just to add the door QR token.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");

function run(cli, args, { inherit = true } = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: inherit ? "inherit" : "pipe",
  });
}

function fail(result, fallback = 1) {
  process.exit(result.status ?? result.signal ? 1 : fallback);
}

const prepare = spawnSync(process.execPath, [path.join(root, "scripts/prepare-checkin-column.mjs")], {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit",
  env: { ...process.env, NODE_NO_WARNINGS: "1" },
});
if (prepare.status) fail(prepare);

const generate = run(prismaCli, ["generate"]);
if (generate.status) fail(generate);

let push = run(prismaCli, ["db", "push", "--skip-generate"], { inherit: false });
if (push.stdout) process.stdout.write(push.stdout);
if (push.stderr) process.stderr.write(push.stderr);

if (push.status) {
  const text = `${push.stdout ?? ""}\n${push.stderr ?? ""}`;
  const canKeepData =
    text.includes("accept-data-loss") ||
    text.includes("checkInToken") ||
    text.includes("prisma-level default");
  if (!canKeepData) fail(push);
  console.log("Adding the door QR column without resetting the database...");
  push = run(prismaCli, ["db", "push", "--skip-generate", "--accept-data-loss"]);
  if (push.status) fail(push);
}

const seed = run(tsxCli, ["prisma/seed.ts"]);
if (seed.status) fail(seed);
