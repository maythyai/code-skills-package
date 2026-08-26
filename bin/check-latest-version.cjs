#!/usr/bin/env node
/**
 * check-latest-version — Query npm registry for the latest published version
 * of the CSP (code-skills-package) package.
 *
 * Zero external dependencies. Node.js >= 18. CommonJS (so the update
 * workflow can require it via plain `node <path>` without ESM config).
 *
 * Usage:
 *   node bin/check-latest-version.cjs            # human-readable
 *   node bin/check-latest-version.cjs --json     # machine-readable
 *
 * Output (--json): { ok: bool, version: string, reason: string, detail?: string }
 *   ok=true, version=X.Y.Z       — latest version fetched
 *   ok=false, reason="..."        — could not determine latest
 *
 * Reasons:
 *   network_error      — fetch failed / timed out
 *   not_found          — package not in registry
 *   invalid_response   — registry replied but body unparseable
 *   no_latest_tag      — no "latest" dist-tag on the package
 *
 * Exit codes: 0 on success (ok true), 1 on failure (ok false).
 *
 * Design: the package name is a constant here (NOT chosen by the caller) so
 * the LLM-driven update workflow cannot accidentally query the wrong package.
 * (#2992: LLM-prescribed package names produced wrong-package queries.)
 */
'use strict';

const PACKAGE_NAME = 'code-skills-package';
const REGISTRY_URL = `https://registry.npmjs.org/${encodeURIComponent(PACKAGE_NAME)}/latest`;
const TIMEOUT_MS = 8000;

const asJson = process.argv.includes('--json') || process.argv.includes('-j');

function emit(payload) {
  if (asJson) {
    process.stdout.write(JSON.stringify(payload) + '\n');
  } else {
    if (payload.ok) {
      process.stdout.write(`${payload.version}\n`);
    } else {
      process.stderr.write(`Could not check latest version: ${payload.reason}${payload.detail ? ' (' + payload.detail + ')' : ''}\n`);
    }
  }
  process.exit(payload.ok ? 0 : 1);
}

function fetchLatest() {
  // Use built-in fetch (Node >= 18) with an AbortController timeout.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  return fetch(REGISTRY_URL, {
    signal: controller.signal,
    headers: { 'accept': 'application/json' },
  }).then(async (res) => {
    clearTimeout(timer);
    if (res.status === 404) {
      return emit({ ok: false, version: '', reason: 'not_found' });
    }
    if (!res.ok) {
      return emit({ ok: false, version: '', reason: 'network_error', detail: `HTTP ${res.status}` });
    }
    let body;
    try {
      body = await res.json();
    } catch (e) {
      return emit({ ok: false, version: '', reason: 'invalid_response', detail: String(e && e.message || e) });
    }
    const version = body && typeof body.version === 'string' ? body.version : '';
    if (!version) {
      return emit({ ok: false, version: '', reason: 'no_latest_tag' });
    }
    return emit({ ok: true, version });
  }).catch((e) => {
    clearTimeout(timer);
    const name = e && e.name ? e.name : 'Error';
    if (name === 'AbortError' || /timeout|abort/i.test(String(e))) {
      return emit({ ok: false, version: '', reason: 'network_error', detail: 'timeout' });
    }
    return emit({ ok: false, version: '', reason: 'network_error', detail: String(e && e.message || e) });
  });
}

fetchLatest();
