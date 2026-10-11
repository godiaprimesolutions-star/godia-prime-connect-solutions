import fs from "node:fs";
import path from "node:path";

const requiredFiles = [
  "index.html",
  "index.js",
  "schema.sql",
  "wrangler.toml",
  "src/index.js",
  "public/manifest.webmanifest",
  "public/godia-prime-icon.svg"
];

let missing = 0;

for (const file of requiredFiles) {
  if (fs.existsSync(path.resolve(file))) {
    console.log(`OK: ${file}`);
  } else {
    console.log(`MISSING: ${file}`);
    missing++;
  }
}

if (missing > 0) {
  console.error(`Check finished: ${missing} required file(s) missing.`);
  process.exitCode = 1;
} else {
  console.log("All required files are present.");
}
