// runner.mjs — csp-linked-test-runner 的可执行编排骨架
//
// 把一次功能动作串成完整链路：seed → UI 动作(抓 trace_id) → DB pre/post 断言 → UI 反映 →
// 单一联动裁决(命名 broken_at)。零 npm 依赖。
//
// 设计：编排器=组合各层 skill 的代码。它从兄弟 skill 的 references 导入解析器与 DB 工具
// (路径假设 CSP 仓库布局；若单独拷贝请改为相对你项目的位置)。
//
// 用法:
//   node references/runner.mjs --contract x.linked.yaml [--target URL] [--db-url $TEST_DB_URL]
//                              [--max-retry 3] [--fast-path] [--dry-run]
//
// --dry-run：用内存 mock 跑完整编排，无需 playwright-cli / 真实 DB，可直接验证编排正确性。
// 退出码：0=pass / 1=fail(已标 broken_at) / 2=blocked(写明缺什么)

import { loadContract, validateContract, report } from '../../../../csp-patterns/skills/csp-cross-layer-testing/references/contract-validator.mjs';
import { diffRows, alignByTraceId, assertDelta, guardNoProd } from '../../../../csp-patterns/skills/csp-db-state-assertion/references/db-diff-tool.mjs';

// ---- arg parsing ----
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) =>
  a.startsWith('--') ? [a.slice(2), arr[i + 1]?.startsWith('--') ? true : arr[i + 1]] : null).filter(Boolean));
const dryRun = 'dry-run' in args;
const contractPath = args.contract;
const targetUrl = args.target;
const dbUrl = args['db-url'] || process.env.TEST_DB_URL;

if (!contractPath) {
  console.error('Usage: runner.mjs --contract <file.linked.yaml|json> [--target URL] [--db-url $TEST_DB_URL] [--dry-run]');
  process.exit(2);
}

// ---- 1. validate contract (in-process) ----
const c = loadContract(contractPath);
const validResult = validateContract(c);
if (validResult.errors.length) {
  report(c, validResult);
  console.error('❌ contract invalid — fix it before running');
  process.exit(2);
}

// ---- 2. (contract already loaded in step 1) ----

if (!dryRun) guardNoProd(dbUrl); // refuse production DB

// ---- adapters (replace these shims with real calls when wiring your stack) ----
// Real: drive playwright-cli (snapshot ref -> click) and capture network trace_id.
async function driveUiAction(/* contract, targetUrl */) {
  throw new Error('driveUiAction: implement — shell out to playwright-cli, return { traceId, dom, screenshot, network[] }');
}
// Real: query test DB via DB_QUERY_CMD or a JS driver; returns rows.
async function queryRows(/* sql */) {
  throw new Error('queryRows: implement — set DB_QUERY_CMD or import from db-diff-tool.mjs');
}

// ---- dry-run mock (makes the orchestration observable without any tooling) ----
const MOCK = {
  preOrders: [{ id: 'o1', status: 'shipped', trace_id: 'x' }],
  preProducts: [{ id: 'p1', stock: 10 }],
  postOrders: [{ id: 'o1', status: 'shipped', trace_id: 'x' }, { id: 'o9', status: 'pending', trace_id: 'mock-trace' }],
  postProducts: [{ id: 'p1', stock: 9 }],
  traceId: 'mock-trace',
};

// ---- 3. orchestrate the round-trip ----
async function runRoundTrip(contract) {
  const steps = { ui_action: null, api: null, db: null, ui_effect: null };
  const brokenAt = [];

  // (a) UI action -> capture trace_id + evidence
  let traceId, netEvidence;
  if (dryRun) { traceId = MOCK.traceId; netEvidence = [{ method: 'POST', path: '/api/orders', status: 200, trace_id: traceId }]; }
  else { const e = await driveUiAction(contract, targetUrl); traceId = e.traceId; netEvidence = e.network; }
  steps.ui_action = { ok: true, traceId };

  // (b) API expectation
  const apiExp = contract.layers.api.expect;
  const apiHit = netEvidence.some(n =>
    n.method === apiExp.method && new RegExp(apiExp.path.replace(/^\^/, '')).test(n.path) && n.status === apiExp.status);
  steps.api = { ok: apiHit, evidence: netEvidence };
  if (!apiHit) brokenAt.push('api');

  // (c) DB pre/post + invariant + alignment
  let preOrders, postOrders, preProducts, postProducts;
  if (dryRun) {
    preOrders = MOCK.preOrders; postOrders = MOCK.postOrders;
    preProducts = MOCK.preProducts; postProducts = MOCK.postProducts;
  } else {
    const preQ = contract.layers.db.pre || [];
    const postQ = contract.layers.db.post || [];
    // caller fills queryRows per contract queries — omitted for brevity in skeleton
    preOrders = await queryRows(preQ[0]?.query); postOrders = await queryRows(postQ[0]?.query);
    const inv = contract.layers.db.invariants?.[0];
    preProducts = await queryRows(inv?.query); postProducts = await queryRows(inv?.query);
  }
  const keyCol = 'id';
  const od = diffRows(preOrders, postOrders, keyCol);
  const align = alignByTraceId(od.added, traceId);
  const invDelta = assertDelta(Number(preProducts[0].stock), Number(postProducts[0].stock), contract.layers.db.invariants[0].delta, 'stock');
  const dbOk = align.strength.startsWith('strong') && invDelta.ok;
  steps.db = { ok: dbOk, alignment: align, invariant: invDelta, diff: od };
  if (!dbOk) brokenAt.push('db');

  // (d) UI reflects DB change (shim: in dry-run assume reflecting; real impl asserts via playwright snapshot)
  steps.ui_effect = { ok: dryRun ? true : null, note: dryRun ? 'mock-reflecting' : 'implement via playwright snapshot assertion' };
  if (dbOk === false) steps.ui_effect = { ok: null, note: 'skipped — DB layer broken' };

  // ---- verdict ----
  const pass = brokenAt.length === 0;
  return { pass, brokenAt, steps, contract };
}

const result = await runRoundTrip(c);

console.log('\n# 联动裁决');
console.log(`test_id: ${c.test_id}  mode: ${dryRun ? 'dry-run(mock)' : 'live'}  isolation: ${c.isolation}`);
console.log(`verdict: ${result.pass ? 'pass' : 'fail'}`);
if (!result.pass) console.log(`broken_at: ${result.brokenAt.join(', ')}`);
console.log('\n## 链路');
for (const [layer, r] of Object.entries(result.steps)) {
  const mark = r.ok === true ? '✅' : r.ok === false ? '❌' : '⏸';
  console.log(`${mark} ${layer}: ${JSON.stringify(r).slice(0, 160)}`);
}
process.exit(result.pass ? 0 : 1);
