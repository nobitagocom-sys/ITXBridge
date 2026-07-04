#!/usr/bin/env node

// Postinstall: warm-up SQLite deps into ~/.itxbridge/runtime so the first
// `itxbridge` start doesn't need network. Failure here is non-fatal —
// cli.js will retry at runtime if anything is missing.
const { ensureSqliteRuntime } = require("./sqliteRuntime");
const { ensureTrayRuntime } = require("./trayRuntime");

try {
  ensureSqliteRuntime({ silent: false });
  console.log("[itxbridge] runtime SQLite deps ready");
} catch (e) {
  console.warn(`[itxbridge] runtime warm-up skipped: ${e.message}`);
}

try {
  ensureTrayRuntime({ silent: false });
} catch (e) {
  console.warn(`[itxbridge] tray runtime skipped: ${e.message}`);
}

process.exit(0);
