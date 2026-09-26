import fs from "node:fs";

const html = fs.readFileSync("dist/index.html", "utf8");
if (!html.includes("<script")) {
  process.exit(1);
}
if (/src="[^"]+\.js"/.test(html)) {
  process.exit(1);
}
if (fs.existsSync("dist/assets")) {
  const names = fs.readdirSync("dist/assets");
  if (names.some((name) => name.endsWith(".js") || name.endsWith(".css"))) {
    process.exit(1);
  }
}
