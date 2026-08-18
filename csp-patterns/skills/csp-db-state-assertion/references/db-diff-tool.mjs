// db-diff-tool.mjs
// Example DB state-assertion toolkit for cross-layer round-trip tests.
// Zero npm dependencies. Demonstrates the algorithm in csp-db-state-assertion/SKILL.md:
//   pre/post row-level snapshot -> diff -> trace_id alignment -> invariant delta -> verdict.
//
// Runnable two ways:
//   1. Self-test (no DB needed):  node references/db-diff-tool.mjs
//      Runs the full pipeline against an in-memory mock DB so the algorithm is observable.
//   2. Against a real test DB:    set DB_QUERY_CMD='psql "$TEST_DB_URL" -t -A -F "\t" -c'
//                                 then call queryRows(sql) below (see ADAPTER section).
//
// Safety: refuses anything that looks like a production database (see guardNoProd()).

// ---------------------------------------------------------------------------
// 1. Row-level diff (by a key column) — catches "1 row added + 1 row removed" that a
//    count-only check would miss.
// ---------------------------------------------------------------------------
export function diffRows(preRows, postRows, keyCol) {
  const pre = new Map(preRows.map((r) => [r[keyCol], r]));
  const post = new Map(postRows.map((r) => [r[keyCol], r]));
  const added = [], removed = [], changed = [];
  for (const [k, row] of post) {
    if (!pre.has(k)) added.push(row);
    else if (JSON.stringify(pre.get(k)) !== JSON.stringify(row)) changed.push({ pre: pre.get(k), post: row });
  }
  for (const [k, row] of pre) if (!post.has(k)) removed.push(row);
  return { added, removed, changed };
}

// ---------------------------------------------------------------------------
// 2. Trace-id alignment — prove the changed rows were caused by THIS action.
//    Strong: rows carry a trace_id column matching the request's trace id.
//    Weak:   fall back to a time window (causal strength = weak).
// ---------------------------------------------------------------------------
export function alignByTraceId(changedRows, traceId) {
  if (!traceId) return { aligned: changedRows, strength: 'weak(time-window)', reason: 'no trace_id provided' };
  const withTrace = changedRows.filter((r) => r.trace_id != null);
  if (withTrace.length === 0)
    return { aligned: changedRows, strength: 'weak(time-window)', reason: 'rows have no trace_id column' };
  const aligned = withTrace.filter((r) => r.trace_id === traceId);
  return {
    aligned,
    strength: aligned.length ? 'strong(trace_id)' : 'none',
    reason: aligned.length ? `matched ${aligned.length} row(s)` : `0 rows match trace_id=${traceId}`,
  };
}

// ---------------------------------------------------------------------------
// 3. Invariant delta assertion — "this should have changed by exactly N; this should not change"
// ---------------------------------------------------------------------------
export function assertDelta(preVal, postVal, expectedDelta, name) {
  const actual = Number(postVal) - Number(preVal);
  const ok = actual === expectedDelta;
  return { name, preVal, postVal, expectedDelta, actual, ok };
}

// ---------------------------------------------------------------------------
// 4. No-side-effect check — tables not under test must have empty diff
// ---------------------------------------------------------------------------
export function assertNoSideEffects(preSnapshot, postSnapshot, watchedTables) {
  const violations = [];
  for (const [table, preRows] of Object.entries(preSnapshot)) {
    if (watchedTables.includes(table)) continue; // expected to change
    const d = diffRows(preRows, postSnapshot[table] || [], Object.keys(preRows[0] || { id: 1 })[0]);
    if (d.added.length || d.removed.length || d.changed.length)
      violations.push({ table, ...d });
  }
  return violations;
}

// ---------------------------------------------------------------------------
// ADAPTER: plug a real DB here. Default shells out via DB_QUERY_CMD (e.g. psql/mysql -NBT).
// Returns rows as objects. To use a JS driver instead, replace this function.
// ---------------------------------------------------------------------------
export function guardNoProd(dsn) {
  const d = (dsn || '').toLowerCase();
  if (/\b(prod|production|primary|main)\b/.test(d) && !/(test|staging|stage|qa|sandbox)/.test(d))
    throw new Error(`Refusing to run against a production-looking DSN: ${dsn}. Use TEST_DB_URL.`);
}
export async function queryRows(sql, { dsn = process.env.TEST_DB_URL, cmd = process.env.DB_QUERY_CMD } = {}) {
  guardNoProd(dsn);
  if (!cmd) throw new Error('Set DB_QUERY_CMD (e.g. psql "$TEST_DB_URL" -t -A -F "\\t" -c) to query a real DB');
  const { execSync } = await import('node:child_process');
  const out = execSync(`${cmd} "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf8' });
  const lines = out.trim().split('\n').filter(Boolean);
  if (!lines.length) return [];
  const cols = lines[0].split('\t'); // first call should emit header; if -t omits header, caller passes cols
  return lines.slice(1).map((l) => Object.fromEntries(cols.map((c, i) => [c, l.split('\t')[i]])));
}

// ---------------------------------------------------------------------------
// SELF-TEST: in-memory mock to make the algorithm observable without a DB.
// Scenario: a "place order" action should add 1 order row (with trace_id) and
// decrement product stock by 1; account balance must not change (no side effect).
// ---------------------------------------------------------------------------
function selfTest() {
  const traceId = 'abc123';
  // pre state
  const preOrders = [{ id: 'o1', status: 'shipped', trace_id: 'x' }];
  const preProducts = [{ id: 'p1', stock: 10 }];
  const preAccounts = [{ id: 'a1', balance: 500 }];

  // post state (the action wrote a new order, decremented stock, left balance alone)
  const postOrders = [
    { id: 'o1', status: 'shipped', trace_id: 'x' },
    { id: 'o9', status: 'pending', trace_id: 'abc123' }, // <-- the write we expect
  ];
  const postProducts = [{ id: 'p1', stock: 9 }]; // -1 ✅
  const postAccounts = [{ id: 'a1', balance: 500 }]; // unchanged ✅

  console.log('=== orders diff ===');
  const od = diffRows(preOrders, postOrders, 'id');
  console.log(JSON.stringify(od, null, 2));
  const align = alignByTraceId(od.added, traceId);
  console.log(`alignment: ${align.strength} (${align.reason})`);

  console.log('\n=== stock invariant ===');
  const inv = assertDelta(preProducts[0].stock, postProducts[0].stock, -1, 'stock delta');
  console.log(JSON.stringify(inv));

  console.log('\n=== no side effects (accounts) ===');
  const side = assertNoSideEffects(
    { accounts: preAccounts },
    { accounts: postAccounts },
    ['orders', 'products']
  );
  console.log(side.length ? `❌ side effects: ${JSON.stringify(side)}` : '✅ no side effects');

  // --- assemble verdict ---
  const verdict =
    align.strength.startsWith('strong') && inv.ok && !side.length ? 'pass' : 'fail';
  console.log(`\n=== verdict: ${verdict} ===`);
  if (verdict === 'fail') {
    const broken = !align.strength.startsWith('strong') ? 'api<->db alignment'
      : !inv.ok ? `db invariant(${inv.name})` : 'db side-effects';
    console.log(`broken_at: ${broken}`);
  }
}

if (process.argv[1]?.endsWith('db-diff-tool.mjs') && import.meta.url.endsWith('db-diff-tool.mjs')) selfTest();
