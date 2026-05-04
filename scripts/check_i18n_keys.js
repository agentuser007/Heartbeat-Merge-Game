#!/usr/bin/env node
/**
 * check_i18n_keys.js — Validates that all i18n keys used in code
 * are present in every locale file.
 *
 * Usage: node scripts/check_i18n_keys.js
 *
 * Exit codes:
 *   0 — All keys found in all locales
 *   1 — One or more keys missing
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const I18N_DIR = path.join(PROJECT_ROOT, 'assets', 'i18n');

// ── Helpers ──────────────────────────────────────────────────────────

/** Recursively collect all leaf-key dot-paths from a nested object. */
function collectKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

/** Recursively walk a directory, returning all file paths matching a predicate. */
function walkDir(dir, predicate) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full, predicate));
    } else if (predicate(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// ── Step 1: Extract i18n key references from source code ─────────────

function extractKeysFromSources() {
  const keys = new Set();

  const jsFiles = walkDir(path.join(PROJECT_ROOT, 'js'), n => n.endsWith('.js'));
  const htmlFiles = walkDir(PROJECT_ROOT, n => n.endsWith('.html'));

  const allFiles = [...jsFiles, ...htmlFiles];

  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const rel = path.relative(PROJECT_ROOT, file);

    // Match I18n.t('key') or I18n.t("key")
    const tRegex = /I18n\.t\s*\(\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = tRegex.exec(content)) !== null) {
      keys.add(m[1]);
    }

    // Match data-i18n="key"
    const attrRegex = /data-i18n\s*=\s*"([^"]+)"/g;
    while ((m = attrRegex.exec(content)) !== null) {
      keys.add(m[1]);
    }
  }

  return keys;
}

// ── Step 2: Load locale files ────────────────────────────────────────

function loadLocales() {
  const locales = {};
  for (const file of fs.readdirSync(I18N_DIR)) {
    if (!file.endsWith('.json')) continue;
    const locale = file.replace('.json', '');
    const filePath = path.join(I18N_DIR, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      locales[locale] = new Set(collectKeys(data));
    } catch (e) {
      console.error(`❌ Failed to parse ${file}: ${e.message}`);
      process.exit(1);
    }
  }
  return locales;
}

// ── Step 3: Report missing keys ──────────────────────────────────────

function main() {
  const sourceKeys = extractKeysFromSources();
  const locales = loadLocales();
  const localeNames = Object.keys(locales);

  console.log(`\n🔍 Found ${sourceKeys.size} i18n key references in source code`);
  console.log(`📚 Checking against locales: ${localeNames.join(', ')}\n`);

  let totalMissing = 0;

  for (const [locale, localeKeys] of Object.entries(locales)) {
    const missing = [];
    for (const key of sourceKeys) {
      if (!localeKeys.has(key)) {
        missing.push(key);
      }
    }

    if (missing.length === 0) {
      console.log(`  ✅ ${locale}: All keys present`);
    } else {
      console.log(`  ❌ ${locale}: ${missing.length} missing key(s):`);
      for (const k of missing) {
        console.log(`     - ${k}`);
      }
      totalMissing += missing.length;
    }
  }

  // Also check for keys in one locale but not the other
  if (localeNames.length >= 2) {
    console.log('\n🔄 Cross-locale consistency check:');
    const [a, b] = localeNames;
    const keysA = locales[a];
    const keysB = locales[b];

    const onlyA = [...keysA].filter(k => !keysB.has(k));
    const onlyB = [...keysB].filter(k => !keysA.has(k));

    if (onlyA.length === 0 && onlyB.length === 0) {
      console.log('  ✅ Both locales have identical key sets');
    } else {
      if (onlyA.length > 0) {
        console.log(`  ⚠️  Only in ${a} (${onlyA.length}):`);
        for (const k of onlyA) console.log(`     - ${k}`);
      }
      if (onlyB.length > 0) {
        console.log(`  ⚠️  Only in ${b} (${onlyB.length}):`);
        for (const k of onlyB) console.log(`     - ${k}`);
      }
    }
  }

  console.log('');
  if (totalMissing > 0) {
    console.log(`❌ ${totalMissing} key(s) missing across all locales`);
    process.exit(1);
  } else {
    console.log('✅ All i18n keys are present in all locale files');
    process.exit(0);
  }
}

main();
