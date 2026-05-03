const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist");

const rootFiles = [
  ".nojekyll",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "sw.js",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "startup-750x1334.png",
  "startup-828x1792.png",
  "startup-1125x2436.png",
  "startup-1170x2532.png",
  "startup-1179x2556.png",
  "startup-1290x2796.png"
];

function copyFile(relativePath) {
  const source = path.join(root, relativePath);
  if (!fs.existsSync(source)) return;
  const target = path.join(outDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDirectory(relativePath) {
  const source = path.join(root, relativePath);
  if (!fs.existsSync(source)) return;
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const child = path.join(relativePath, entry.name);
    if (entry.isDirectory()) copyDirectory(child);
    else copyFile(child);
  }
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

rootFiles.forEach(copyFile);
copyDirectory("assets");

console.log(`Built static site into ${path.relative(root, outDir)}`);
