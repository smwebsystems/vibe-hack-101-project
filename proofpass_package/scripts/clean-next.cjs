const fs = require("node:fs");
const path = require("node:path");

const distDir = process.env.NEXT_DIST_DIR || ".next";
const nextDirs = Array.from(
  new Set([
    ".next-dev",
    ".next-build",
    distDir,
    ...(distDir === ".next" ? [".next"] : []),
  ]),
).map((dir) => path.join(process.cwd(), dir));

for (const nextDir of nextDirs) {
  try {
    fs.rmSync(nextDir, { force: true, recursive: true });
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      continue;
    }
    console.error(`Failed to remove ${nextDir}`);
    throw error;
  }
}
