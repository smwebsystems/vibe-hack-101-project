const fs = require("node:fs");
const path = require("node:path");

const nextDir = path.join(process.cwd(), process.env.NEXT_DIST_DIR || ".next");

try {
  fs.rmSync(nextDir, { force: true, recursive: true });
} catch (error) {
  console.error(`Failed to remove ${nextDir}`);
  throw error;
}
