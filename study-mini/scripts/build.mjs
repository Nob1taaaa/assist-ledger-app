import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

mkdirSync("dist", { recursive: true });
const html = readFileSync("index.html", "utf8");
const stamped = html.replace("<!--BUILD_TIME-->", new Date().toISOString());
writeFileSync("dist/index.html", stamped);
copyFileSync("package.json", "dist/package.json");
console.log("Built dist/index.html");
