#!/usr/bin/env node
// build.js — Bundle & minify JS/CSS for deployment
// Usage: node build.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

// Script order must match index.html
const JS_FILES = [
  'js/i18n.js',
  'js/config.js',
  'js/core/EventBus.js',
  'js/core/StateMachine.js',
  'js/logic/CurrencyLogic.js',
  'js/logic/EnergyLogic.js',
  'js/logic/BossLogic.js',
  'js/logic/BoardLogic.js',
  'js/logic/GachaLogic.js',
  'js/ui/EnergyUI.js',
  'js/ui/CurrencyUI.js',
  'js/ui/ConfirmDialog.js',
  'js/effects.js',
  'js/energy.js',
  'js/audio.js',
  'js/currency.js',
  'js/dialogue.js',
  'js/board.js',
  'js/boss.js',
  'js/daily-orders.js',
  'js/heroine.js',
  'js/collection.js',
  'js/achievements.js',
  'js/inventory.js',
  'js/gacha.js',
  'js/fragment.js',
  'js/vn-reader.js',
  'js/cg-album.js',
  'js/loop.js',
  'js/ad.js',
  'js/save.js',
  'js/main.js',
];

// Inline scripts from index.html (touch/gesture handlers)
const INLINE_SCRIPTS = [
  'js/touch-guard.js',
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Files/patterns to skip when copying to dist
const SKIP_FILES = new Set([
  '.DS_Store',
  'gacha_pool_design.md',
  'story_design.md',
]);

function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_FILES.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Step 1: Clean dist
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true });
}
ensureDir(DIST);

// Step 2: Concatenate JS files in order
console.log('[build] Concatenating JS files...');
let combinedJS = '';
for (const file of JS_FILES) {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`[build] WARNING: ${file} not found, skipping`);
    continue;
  }
  combinedJS += `// === ${file} ===\n`;
  combinedJS += fs.readFileSync(filePath, 'utf-8');
  combinedJS += '\n\n';
}

// Add inline scripts (touch guard, visibility change)
const touchGuard = `
(function () {
  var l = 0;
  document.addEventListener("touchend", function (e) { var n = Date.now(); if (n - l <= 300) e.preventDefault(); l = n; }, { passive: false });
  document.addEventListener("touchmove", function (e) { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener("gesturestart", function (e) { e.preventDefault(); });
  document.addEventListener("gesturechange", function (e) { e.preventDefault(); });
  document.addEventListener("gestureend", function (e) { e.preventDefault(); });
  document.addEventListener("dblclick", function (e) { e.preventDefault(); });
  document.addEventListener("keydown", function (e) { if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "-" || e.key === "=")) e.preventDefault(); });
})();
document.addEventListener("visibilitychange", function () { document.body.classList.toggle("app-paused", document.hidden); });
`;
combinedJS += `// === inline scripts ===\n`;
combinedJS += touchGuard;

// Write combined JS
const combinedPath = path.join(DIST, '_combined.js');
fs.writeFileSync(combinedPath, combinedJS, 'utf-8');

// Step 3: Minify JS with esbuild
console.log('[build] Minifying JS with esbuild...');
execSync(`npx esbuild "${combinedPath}" --outfile="${path.join(DIST, 'bundle.min.js')}" --minify --target=es2017`, {
  cwd: ROOT,
  stdio: 'inherit',
});
// Remove temp combined file
fs.unlinkSync(combinedPath);

// Step 4: Minify CSS
console.log('[build] Minifying CSS with esbuild...');
execSync(`npx esbuild "${path.join(ROOT, 'css/style.css')}" --outfile="${path.join(DIST, 'style.min.css')}" --minify`, {
  cwd: ROOT,
  stdio: 'inherit',
});

// Step 5: Copy assets
console.log('[build] Copying assets...');
copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));

// Step 6: Generate index.html for dist
console.log('[build] Generating dist/index.html...');
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');

// Remove all <script src="js/..."> tags
html = html.replace(/<script\s+src="js\/[^"]*"><\/script>\n?/g, '');
// Remove inline scripts at the bottom
html = html.replace(/<script>\s*\(function\s*\(\)\s*\{[\s\S]*?}\)\(\);\s*<\/script>\n?/g, '');
html = html.replace(/<script>\s*document\.addEventListener\("visibilitychange"[\s\S]*?<\/script>\n?/g, '');

// Add single bundled script before </body>
html = html.replace('</body>', '  <script src="bundle.min.js"></script>\n</body>');

// Replace CSS link
html = html.replace('<link rel="stylesheet" href="css/style.css" />', '<link rel="stylesheet" href="style.min.css" />');

fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf-8');

// Step 7: Report sizes
console.log('\n[build] === Size Report ===');
const bundleJs = fs.statSync(path.join(DIST, 'bundle.min.js')).size;
const styleCss = fs.statSync(path.join(DIST, 'style.min.css')).size;
console.log(`  bundle.min.js: ${(bundleJs / 1024).toFixed(1)} KB`);
console.log(`  style.min.css: ${(styleCss / 1024).toFixed(1)} KB`);

// Calculate total dist size
let totalSize = 0;
function calcDirSize(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      calcDirSize(fullPath);
    } else {
      totalSize += fs.statSync(fullPath).size;
    }
  }
}
calcDirSize(DIST);
console.log(`  Total dist: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log('\n[build] Done! Upload the "dist" folder for deployment.');
