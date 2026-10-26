import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
if (!html.includes("Assist Ledger Study Mini")) {
  console.error("index.html missing expected title");
  process.exit(1);
}
console.log("study-mini verify: ok");
