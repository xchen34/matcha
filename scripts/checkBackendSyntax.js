const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const TARGET_DIRS = [
  "app.js",
  "server.js",
  "db.js",
  "routes",
  "realtime",
  "utils",
  "middleware",
  "scripts",
];

const IGNORED_DIRS = new Set(["node_modules", ".git", "sql"]);

function collectJsFiles(inputPath, output) {
  const fullPath = path.resolve(ROOT, inputPath);
  if (!fs.existsSync(fullPath)) return;

  const stat = fs.statSync(fullPath);
  if (stat.isFile()) {
    if (fullPath.endsWith(".js") || fullPath.endsWith(".cjs") || fullPath.endsWith(".mjs")) {
      output.push(fullPath);
    }
    return;
  }

  const entries = fs.readdirSync(fullPath, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const nextPath = path.join(fullPath, entry.name);
    if (entry.isDirectory()) {
      collectJsFiles(path.relative(ROOT, nextPath), output);
    } else if (entry.name.endsWith(".js") || entry.name.endsWith(".cjs") || entry.name.endsWith(".mjs")) {
      output.push(nextPath);
    }
  }
}

function main() {
  const files = [];
  for (const target of TARGET_DIRS) {
    collectJsFiles(target, files);
  }

  const uniqueFiles = [...new Set(files)].sort();
  const failures = [];

  for (const filePath of uniqueFiles) {
    const result = spawnSync(process.execPath, ["--check", filePath], {
      stdio: "pipe",
      encoding: "utf8",
    });

    if (result.status !== 0) {
      failures.push({
        filePath: path.relative(ROOT, filePath),
        stderr: (result.stderr || "").trim(),
      });
    }
  }

  if (failures.length > 0) {
    console.error("\nBackend syntax check failed:\n");
    for (const failure of failures) {
      console.error(`- ${failure.filePath}`);
      if (failure.stderr) {
        console.error(failure.stderr);
      }
    }
    process.exit(1);
  }

  console.log(`Backend syntax check passed (${uniqueFiles.length} files).`);
}

main();
