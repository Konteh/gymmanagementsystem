/**
 * Local SQLite setup that does not wipe gyms just to add the door QR token.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const binDir = path.join(root, "node_modules", ".bin");
const prismaBin = path.join(binDir, process.platform === "win32" ? "prisma.cmd" : "prisma");
const tsxBin = path.join(binDir, process.platform === "win32" ? "tsx.cmd" : "tsx");

function run(command, args, { inherit = true } = {}) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
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

const generate = run(prismaBin, ["generate"]);
if (generate.status) fail(generate);

let push = run(prismaBin, ["db", "push", "--skip-generate"], { inherit: false });
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
  push = run(prismaBin, ["db", "push", "--skip-generate", "--accept-data-loss"]);
  if (push.status) fail(push);
}

const seed = run(tsxBin, ["prisma/seed.ts"]);
if (seed.status) fail(seed);
