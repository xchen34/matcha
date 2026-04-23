const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build", ".vite"]);
const TARGET_EXTENSIONS = new Set([".js", ".jsx", ".cjs", ".mjs"]);
const REL_PATH = (filePath) => path.relative(ROOT, filePath);
const FRONTEND_PATH_PREFIX = `frontend${path.sep}src${path.sep}`;
const BACKEND_SAFE_SCAN_PREFIXES = [
  `routes${path.sep}`,
  `utils${path.sep}`,
  `middleware${path.sep}`,
  `realtime${path.sep}`,
];

function isFrontendSource(filePath) {
  return REL_PATH(filePath).startsWith(FRONTEND_PATH_PREFIX);
}

function isBackendSource(filePath) {
  const rel = REL_PATH(filePath);
  return BACKEND_SAFE_SCAN_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

function hasUnsafeTemplateInterpolationInQuery(content, filePath) {
  const rel = REL_PATH(filePath);
  const queryTemplateRegex = /(?:pool|client)\.query\s*\(\s*`([\s\S]*?)`\s*(?:,|\))/g;
  let match = queryTemplateRegex.exec(content);

  while (match) {
    const templateContent = match[1] || "";
    if (templateContent.includes("${")) {
      if (rel === path.join("routes", "likes.js")) {
        const stripped = templateContent.replace(/\$\{orderBySql\}/g, "");
        if (stripped.includes("${")) {
          return true;
        }
      } else {
        return true;
      }
    }
    match = queryTemplateRegex.exec(content);
  }

  return false;
}

const checks = [
  {
    id: "xss-dangerously-set-inner-html",
    description: "Avoid dangerouslySetInnerHTML in React components",
    test: (content) => content.includes("dangerouslySetInnerHTML"),
    include: (filePath) => isFrontendSource(filePath),
  },
  {
    id: "xss-inner-html-assignment",
    description: "Avoid direct innerHTML assignments",
    test: (content) => /\binnerHTML\s*=/.test(content),
    include: (filePath) => isFrontendSource(filePath),
  },
  {
    id: "xss-eval",
    description: "Avoid eval() usage",
    test: (content) => /\beval\s*\(/.test(content),
    include: (filePath) => isFrontendSource(filePath) || isBackendSource(filePath),
  },
  {
    id: "sql-query-concatenation",
    description: "Avoid SQL string concatenation in query() calls",
    test: (content) => /(pool|client)\.query\([^\n]*(\+|\.concat\()/.test(content),
    include: (filePath) => isBackendSource(filePath),
  },
  {
    id: "sql-template-interpolation",
    description: "Avoid SQL template interpolation in query strings",
    test: (content, filePath) => hasUnsafeTemplateInterpolationInQuery(content, filePath),
    include: (filePath) => isBackendSource(filePath),
  },
];

function walk(dirPath, output) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, output);
      continue;
    }

    const ext = path.extname(entry.name);
    if (!TARGET_EXTENSIONS.has(ext)) continue;
    output.push(fullPath);
  }
}

function getLineNumber(content, needleRegex) {
  const match = content.match(needleRegex);
  if (!match || typeof match.index !== "number") return null;
  const before = content.slice(0, match.index);
  return before.split(/\r?\n/).length;
}

function main() {
  const files = [];
  walk(ROOT, files);

  const findings = [];
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");

    for (const check of checks) {
      if (!check.include(filePath)) continue;
      if (!check.test(content, filePath)) continue;

      let line = null;
      if (check.id === "xss-dangerously-set-inner-html") {
        line = getLineNumber(content, /dangerouslySetInnerHTML/);
      } else if (check.id === "xss-inner-html-assignment") {
        line = getLineNumber(content, /\binnerHTML\s*=/);
      } else if (check.id === "xss-eval") {
        line = getLineNumber(content, /\beval\s*\(/);
      } else if (check.id === "sql-query-concatenation") {
        line = getLineNumber(content, /(pool|client)\.query\([^\n]*(\+|\.concat\()/);
      } else if (check.id === "sql-template-interpolation") {
        line = getLineNumber(content, /\$\{/);
      }

      findings.push({
        id: check.id,
        description: check.description,
        filePath: path.relative(ROOT, filePath),
        line,
      });
    }
  }

  if (findings.length > 0) {
    console.error("\nSecurity precheck failed. Findings:\n");
    for (const finding of findings) {
      const suffix = finding.line ? `:${finding.line}` : "";
      console.error(`- [${finding.id}] ${finding.filePath}${suffix}`);
      console.error(`  ${finding.description}`);
    }
    console.error("\nFix findings or explicitly harden and whitelist them in scripts/securityPrecheck.js.\n");
    process.exit(1);
  }

  console.log("Security precheck passed.");
}

main();
