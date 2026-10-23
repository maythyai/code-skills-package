#!/usr/bin/env node
// scripts/audit-skill-coverage.mjs
// Coverage auditor: diff an external skill collection against the CSP registry.
//
// Answers one question — "which capabilities exist out there that CSP does not
// cover?" — so a coverage review is one command instead of a manual read of a
// few hundred SKILL.md files.
//
// Matching is three-layered, because the two collections are rarely in the same
// language and almost never use the same words:
//   1. word tokens    — exact vocabulary overlap
//   2. bigrams        — phrase overlap, catches "load test" vs "test load"
//   3. concept bridge — a bilingual domain-term map, so 定价 and "pricing" collide
// Plus a name-similarity term for renames the description layer misses.
//
// The headline output is concept-level, not skill-level: CONCEPT GAP lists the
// capability domains the external collection occupies that CSP does not occupy
// at all, and THIN COVERAGE lists the domains where the external set is several
// times denser. Both are counts over the whole corpus, so they escape the
// multiple-comparisons trap the per-skill bands fall into — but THIN COVERAGE
// counts mentions, not dedication, and so overstates gaps (see Notes at the
// bottom of the report). CONCEPT GAP is the trustworthy one: a zero on the CSP
// side is a zero however you count it.
// The per-skill bands below them are a ranked reading list — a nearest
// neighbour over ~670 candidates is almost always something, so treat the match
// as a lead and check the `concepts:` line yourself.
//
// Zero runtime dependencies (Node >= 18, ESM).
//
// Usage:
//   node scripts/audit-skill-coverage.mjs
//   node scripts/audit-skill-coverage.mjs --source /path/to/skills
//   node scripts/audit-skill-coverage.mjs --plugins /path/to/plugins --json
//   npm run audit:coverage
//
// Config precedence: CLI flag > env var > default.
//   --source   / CSP_AUDIT_SOURCE    default: ~/.qoder/skills
//   --plugins  / CSP_AUDIT_PLUGINS   default: ~/.qoder/plugins (recursive)
//   --covered  / CSP_AUDIT_COVERED   default: 0.45  (>= this = COVERED)
//   --partial  / CSP_AUDIT_PARTIAL   default: 0.22  (>= this = PARTIAL, below = GAP)
//
// Exit code is always 0 unless the registry or the external collection is
// missing — gaps are information for a human, not a build failure.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// --- CLI / env -------------------------------------------------------------

function flag(name, envKey, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  if (process.env[envKey]) return process.env[envKey];
  return fallback;
}

const expandHome = (p) => (p.startsWith('~') ? join(homedir(), p.slice(1)) : p);

const SOURCE = expandHome(flag('source', 'CSP_AUDIT_SOURCE', join(homedir(), '.qoder', 'skills')));
const PLUGINS = expandHome(flag('plugins', 'CSP_AUDIT_PLUGINS', join(homedir(), '.qoder', 'plugins')));
const COVERED_T = Number(flag('covered', 'CSP_AUDIT_COVERED', '0.45'));
const PARTIAL_T = Number(flag('partial', 'CSP_AUDIT_PARTIAL', '0.22'));
const AS_JSON = process.argv.includes('--json');
const QUIET = process.argv.includes('--quiet');

// --- Concept bridge --------------------------------------------------------
// Each group is one capability concept; every term in it maps to the group id.
// Latin terms are matched at a word boundary, CJK terms as substrings (no
// segmenter needed, so 定价策略 contains 定价) — see the BRIDGE build below.
//
// A group must list the vocabulary practitioners actually write, not just the
// concept's label. `i18n` alone misses csp-locale-management, whose description
// says locale / RTL / pluralization and never "i18n" — that single omission
// reported i18n as CSP=1 against 4 external skills, i.e. a fabricated gap.
// When THIN COVERAGE names a concept that plainly has a dedicated CSP skill,
// suspect the term list before believing the ratio.

const CONCEPT_GROUPS = [
  ['pricing', '定价', '价格', '收费', '套餐', '涨价', '商业化', 'pricing', 'price', 'monetiz', 'tier', 'subscription', 'billing'],
  ['brainstorm', '脑暴', '头脑风暴', '创意', '发散', 'brainstorm', 'ideation', 'ideate'],
  ['competitive', '竞品', '竞争', '对标', 'competitive', 'competitor'],
  ['requirement', '需求文档', '需求', 'prd', 'brd', 'requirement', 'spec'],
  ['review', '评审', '审查', '走查', '审阅', 'review', 'audit', 'critique'],
  ['prioritization', '优先级', '取舍', '排期', 'priorit', 'ranking', 'backlog'],
  ['roadmap', '路线图', 'roadmap', 'planning'],
  ['metrics', '指标', '复盘', 'metrics', 'analytics', 'kpi', 'dashboard'],
  ['story', '用户故事', '拆解', 'story', 'stories', 'decompos', 'breakdown'],
  ['meeting', '会议', '纪要', '行动项', 'meeting', 'minutes', 'agenda'],
  ['todo', '待办', '工单', '任务管理', 'todo', 'task', 'ticket', 'issue'],
  ['testing', '测试', '用例', '断测', '覆盖率', 'test', 'testing', 'testcase', 'coverage', 'tdd'],
  ['loadtest', '压测', '负载测试', '性能测试', 'load test', 'stress test', 'benchmark', 'soak'],
  ['performance', '性能', '加速', 'performance', 'optimiz', 'latency', 'profiling'],
  ['debug', '调试', '排错', '定位问题', 'debug', 'troubleshoot', 'diagnos', 'root cause'],
  ['deploy', '部署', '发布', '上线', '运维', 'deploy', 'release', 'devops', 'ship', 'launch'],
  ['architecture', '架构', '技术方案', 'architecture', 'system design', 'solution design'],
  ['refactor', '重构', '技术债', 'refactor', 'technical debt', 'simplif'],
  ['docs', '文档', '注释', 'documentation', 'docstring', 'readme', 'changelog'],
  ['security', '安全', '漏洞', 'security', 'vulnerab', 'threat', 'exploit'],
  ['frontend', '前端', '界面', '页面', '组件', 'frontend', 'ui', 'interface', 'component', 'css', 'html'],
  ['backend', '后端', '服务端', '接口', 'backend', 'api', 'server', 'endpoint', 'rest'],
  ['mobile', '移动', '客户端', '小程序', '跨端', 'mobile', 'ios', 'android', 'flutter', 'react native'],
  ['database', '数据库', 'database', 'sql', 'query', 'schema', 'postgres', 'orm'],
  ['hardware', '硬件', '电路', 'pcb', '器件', '嵌入式', '固件', 'hardware', 'embedded', 'firmware', 'mcu', 'rtos', 'sensor'],
  ['protocol', '协议', 'mqtt', 'modbus', '串口', '蓝牙', 'protocol', 'serial', 'bluetooth', 'can bus'],
  ['img2code', '图片转', '截图转', '设计稿还原', '还原度', 'image to code', 'img2html', 'design to code', 'd2c', 'screenshot to'],
  ['diagram', '图表', '架构图', '时序图', '流程图', '可视化', 'diagram', 'chart', 'visualiz', 'mermaid', 'graphviz'],
  ['literature', '文献', '论文', '综述', 'literature', 'paper', 'academic', 'arxiv', 'citation', 'research review'],
  ['research', '调研', '研究', '市场分析', '行业', 'research', 'market', 'industry', 'discovery'],
  ['writing', '写作', '文章', '文案', '博客', 'writing', 'article', 'blog', 'copywriting', 'newsletter'],
  ['humanize', '去ai', '人性化', '改写', 'humanize', 'rewrite', 'tone', 'ai slop', 'ai-generated'],
  ['i18n', '国际化', '多语言', '翻译', '本地化', '语言包', 'i18n', 'l10n', 'localization', 'translation', 'locale', 'pluraliz', 'gettext', 'intl', 'rtl'],
  ['a11y', '无障碍', '可访问性', 'accessibility', 'a11y', 'wcag', 'screen reader'],
  ['responsive', '响应式', '自适应', 'responsive', 'adaptive', 'breakpoint', 'container quer', 'media quer', 'fluid', 'mobile-first'],
  ['designsystem', '设计系统', '设计规范', '令牌', 'design system', 'design token', 'tokens', 'style guide'],
  ['prototype', '原型', '线框', '模型图', '高保真', '低保真', 'prototype', 'wireframe', 'mockup', 'hi-fi'],
  ['brand', '品牌', '视觉风格', 'brand', 'visual identity', 'logo'],
  ['slides', '演示', '幻灯片', 'ppt', 'presentation', 'slides', 'deck', 'pptx'],
  ['payment', '支付', '收款', 'payment', 'checkout', 'stripe', 'gateway'],
  ['messaging', '邮件', '消息', '通知', 'email', 'message', 'notification', 'slack', 'webhook'],
  ['calendar', '日历', '日程', 'calendar', 'schedule', 'scheduling'],
  ['knowledge', '知识库', '笔记', 'knowledge', 'wiki', 'notes', 'memory'],
  ['project', '项目管理', '进度', 'project', 'management', 'tracking', 'milestone'],
  ['team', '团队', '招聘', '协作', 'team', 'collaboration', 'hiring', 'onboarding'],
  ['git', '分支', '提交', '版本控制', 'git', 'branch', 'commit', 'merge', 'rebase', 'worktree'],
  ['recovery', '急救', '修复仓库', 'recovery', 'rescue', 'repair', 'restore', 'broken'],
  ['code', '代码', '编程', '开发', 'code', 'coding', 'development', 'programming', 'implement'],
  ['types', '契约', 'types', 'typescript', 'contract', 'schema'],
  ['deps', '依赖', '包管理', '升级', 'dependency', 'package', 'upgrade'],
  ['container', '容器', 'docker', 'kubernetes', 'k8s', 'container', 'helm'],
  ['cicd', '流水线', 'ci/cd', 'ci', 'cd', 'pipeline', 'github actions', 'automation'],
  ['observability', '监控', '告警', '日志', '可观测', 'monitoring', 'alerting', 'logging', 'observability', 'tracing'],
  ['async', '缓存', '队列', '异步', 'cache', 'queue', 'async', 'concurrency'],
  ['search', '搜索', '检索', 'search', 'retrieval', 'indexing', 'grep'],
  ['ai', '大模型', '提示词', 'ai', 'llm', 'prompt', 'gpt', 'claude'],
  ['rag', '向量', '嵌入', 'rag', 'vector', 'embedding'],
  ['agent', '智能体', '编排', 'agent', 'orchestration', 'multi-agent', 'subagent'],
  ['workflow', '工作流', '流程', 'workflow', 'process', 'pipeline', 'lifecycle'],
  ['scaffold', '模板', '脚手架', 'template', 'scaffold', 'boilerplate', 'generator'],
  ['verification', '校验', '门禁', 'verification', 'validation', 'gate', 'quality gate'],
  ['estimation', '估算', '工时', 'estimation', 'effort', 'sizing', 'story point'],
  ['risk', '风险', '合规', 'risk', 'compliance', 'legal', 'gdpr'],
  ['patent', '专利', 'patent', 'intellectual property'],
  ['userfeedback', '用户反馈', '用户声音', '画像', 'feedback', 'persona', 'voc', 'nps', 'survey'],
  ['growth', '增长', '转化', '留存', 'growth', 'conversion', 'retention', 'funnel', 'acquisition'],
  ['seo', 'seo', '营销', 'marketing', 'campaign', 'ads'],
  ['dataviz', '数据分析', '报表', 'data analysis', 'reporting', 'etl', 'data pipeline'],
  ['mcp', 'mcp', 'model context protocol', 'tool server'],
];

const BRIDGE = new Map();
const HAS_LATIN = /[a-z0-9]/;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

for (const [id, ...terms] of CONCEPT_GROUPS) {
  for (const t of terms) {
    const key = t.toLowerCase();
    // English terms anchor on a word boundary. A bare substring test puts `ai`
    // inside "domain", `rag` inside "coverage", `ui` inside "build" and `orm`
    // inside "performance", which inflates every concept set with noise and
    // flattens the score distribution. Leading `\b` only, so stems like
    // `optimiz` and `monetiz` still match their inflections. Chinese has no
    // word delimiters, so substring is the only option there — those terms are
    // curated to be domain-specific enough to survive it.
    const pattern = HAS_LATIN.test(key) ? new RegExp(`\\b${escapeRe(key)}`) : null;
    if (!BRIDGE.has(key)) BRIDGE.set(key, { pattern, ids: [] });
    BRIDGE.get(key).ids.push(id);
  }
}

function bridgeConcepts(text) {
  const lower = text.toLowerCase();
  const found = new Set();
  for (const [term, { pattern, ids }] of BRIDGE) {
    if (pattern ? pattern.test(lower) : lower.includes(term)) {
      for (const id of ids) found.add(id);
    }
  }
  return found;
}

// --- Text helpers ----------------------------------------------------------

const STOPWORDS = new Set(
  `a an and are as at be by for from has have if in is it its of on or that the this to use used
   uses using when which will with your you not no can should would could this skill skills
   includes including covers covering helps help provides provide also both any all more most
   other such than then them they their there these those what how why who whom whose do does
   did been was were am i we our us my me each only into out up down over under after before
   need needs want wants wants make makes made get gets via per any every`.split(/\s+/)
);

function wordTokens(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t))
  );
}

function phraseBigrams(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  const set = new Set();
  for (let i = 0; i < words.length - 1; i++) set.add(`${words[i]} ${words[i + 1]}`);
  return set;
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// Cosine-style overlap: the intersection scaled by the geometric mean of both
// set sizes. Jaccard punishes long descriptions and plain min-overlap rewards
// sparse ones (a two-concept skill "matching" on one concept scores 1.0).
// A single shared concept is also discounted — one term in common across a
// 674-skill corpus is noise, not evidence.
function conceptSimilarity(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  if (inter === 0) return 0;
  return (inter / Math.sqrt(a.size * b.size)) * (inter >= 2 ? 1 : 0.5);
}

// What fraction of `a`'s concepts also appear in `b`. Asymmetric on purpose —
// see the call site in similarity(). A single shared concept is discounted for
// the same reason as in conceptSimilarity: over a corpus this size it is
// coincidence, not coverage.
function conceptContainment(a, b) {
  if (!a.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  if (inter === 0) return 0;
  return (inter / a.size) * (inter >= 2 ? 1 : 0.5);
}

function nameScore(a, b) {
  const norm = (n) =>
    n
      .toLowerCase()
      .replace(/^csp-/, '')
      // `prd生成` is two tokens, not one — CJK glued to latin otherwise hides
      // the latin half from the comparison.
      .replace(/([\u4e00-\u9fff])([a-z0-9])/g, '$1 $2')
      .replace(/([a-z0-9])([\u4e00-\u9fff])/g, '$1 $2')
      .split(/[-_\s·：:]+/)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  const na = norm(a);
  const nb = norm(b);
  if (!na.length || !nb.length) return 0;
  if (na.join('-') === nb.join('-')) return 1;
  const inter = na.filter((t) => nb.includes(t)).length;
  return inter / Math.max(na.length, nb.length);
}

function fingerprint(name, description) {
  const text = `${name.replace(/^csp-/, '').replace(/[-_]/g, ' ')} ${description}`;
  return {
    words: wordTokens(text),
    bigrams: phraseBigrams(description),
    concepts: bridgeConcepts(text),
  };
}

// An exact or near-exact name match is definitive — `de-ai-ify` vs
// `csp-de-ai-ify` needs no description evidence. Anything below that falls
// through to the similarity score, which is a hint, not a verdict.
const NAME_MATCH = 0.75;

// Two substantial descriptions that share not one substantive latin token are
// not written in the same language. Jaccard over their word sets is then ~0 by
// construction, not by dissimilarity — leaving it at 55% of the weight pins
// every cross-language pair near the floor regardless of how well the concepts
// line up (产品指标复盘 vs csp-product-metrics-review scored 0.219 before this).
// When the lexical channel is dead, the concept bridge is the only live one, so
// it takes the lexical weight.
function lexicalIsDead(a, b) {
  if (a.words.size < 4 || b.words.size < 4) return false;
  for (const w of a.words) {
    if (w.length >= 4 && /^[a-z0-9]+$/.test(w) && b.words.has(w)) return false;
  }
  return true;
}

function similarity(a, b) {
  const name = nameScore(a.name, b.name);
  if (name >= NAME_MATCH) return Math.max(0.9, 0.5 + 0.5 * name);
  if (lexicalIsDead(a, b)) {
    // Concepts are the sole surviving evidence here. Containment, not Jaccard,
    // is the right shape: the external skill is the query and the CSP skill is
    // the candidate answer, so the question is "does this CSP skill cover what
    // the external one is about?" A terse Chinese description carrying one
    // precise concept (竞品分析 → {competitive}) is a strong match against a
    // rich English one, and Jaccard would score it 1/N for that richness.
    // The Jaccard term stays in at lower weight so broader matches still rank
    // above single-concept ones.
    return (
      0.20 * name +
      0.55 * conceptContainment(a.concepts, b.concepts) +
      0.25 * jaccard(a.concepts, b.concepts)
    );
  }
  return (
    0.40 * jaccard(a.words, b.words) +
    0.15 * jaccard(a.bigrams, b.bigrams) +
    0.15 * name +
    0.30 * conceptSimilarity(a.concepts, b.concepts)
  );
}

// --- Frontmatter parsing ---------------------------------------------------

function normalizeDescription(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripMatchingQuotes(s) {
  const t = s.trim();
  if (t.length >= 2 && ((t[0] === '"' && t.at(-1) === '"') || (t[0] === "'" && t.at(-1) === "'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseFrontmatter(text) {
  const m = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const lines = m[1].split(/\r?\n/);

  let name = null;
  let description = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (name === null) {
      const nm = line.match(/^name:\s*(.*)$/);
      if (nm) {
        name = stripMatchingQuotes(nm[1]);
        continue;
      }
    }
    const dm = line.match(/^description:\s*(.*)$/);
    if (!dm) continue;
    const inline = dm[1].trim();
    // `description: >`, `>-`, `|`, `|-` — the value is the following indented block
    if (/^[>|][-+]?$/.test(inline)) {
      const parts = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (!/^\s+/.test(lines[j]) && lines[j].trim() !== '') break;
        parts.push(lines[j].trim());
      }
      description = parts.join(' ').replace(/\s+/g, ' ').trim();
    } else if (inline === '') {
      // Folded continuation on following more-indented lines
      const parts = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (!/^\s+/.test(lines[j])) break;
        parts.push(lines[j].trim());
      }
      description = parts.join(' ').replace(/\s+/g, ' ').trim();
    } else {
      description = stripMatchingQuotes(inline);
    }
    break;
  }

  if (!name) return null;
  return { name, description };
}

// --- Collect ---------------------------------------------------------------

const registryPath = join(ROOT, 'csp-router', 'registry.json');
if (!existsSync(registryPath)) {
  console.error('❌ csp-router/registry.json not found. Run `npm run build:registry` first.');
  process.exit(1);
}
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));

const cspIndex = registry.skills.map((s) => {
  const description = normalizeDescription(s.description);
  return { name: s.name, layer: s.layer, description, fp: fingerprint(s.name, description) };
});

// How many CSP skills touch each concept — the denominator for the concept
// report at the bottom, which is what actually decides whether a domain is
// missing, thin, or well covered.
const cspByConcept = new Map();
for (const c of cspIndex) for (const k of c.fp.concepts) cspByConcept.set(k, (cspByConcept.get(k) || 0) + 1);

const SKIP_DIRS = new Set(['node_modules', 'test', 'tests', '__fixtures__', '__tests__', 'fixtures']);

function walkSkillFiles(dir, depth) {
  const out = [];
  if (!existsSync(dir)) return out;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    // Dot-dirs matter here: a marketplace plugin ships the same skill once per
    // harness (`.claude/skills/`, `.cursor/skills/`, `.qoder/skills/`, ...).
    if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    const skill = join(p, 'SKILL.md');
    if (existsSync(skill)) out.push({ path: skill, root: dir });
    else if (depth > 0) out.push(...walkSkillFiles(p, depth - 1));
  }
  return out;
}

const external = [];
// Same name and same description = the same skill reached by two paths (the
// harness copies above, or a `plugin/skills/` tree next to a vendored one).
// Name alone is not enough — `product-design` exists both standalone and as a
// plugin namespace, and those are genuinely different skills.
const seen = new Set();
let duplicates = 0;

for (const { path, root } of [...walkSkillFiles(SOURCE, 1), ...walkSkillFiles(PLUGINS, 6)]) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    continue;
  }
  const fm = parseFrontmatter(text);
  if (!fm) continue;
  const description = normalizeDescription(fm.description);
  const key = `${fm.name}\u0000${description}`;
  if (seen.has(key)) {
    duplicates++;
    continue;
  }
  seen.add(key);
  external.push({
    name: fm.name,
    description,
    path: relative(resolve(root, '..'), path),
    source: root === SOURCE ? 'skills' : 'plugins',
  });
}

if (external.length === 0) {
  console.error(`❌ No external SKILL.md files found under:\n   ${SOURCE}\n   ${PLUGINS}`);
  console.error('   Pass --source <dir> / --plugins <dir>, or set CSP_AUDIT_SOURCE / CSP_AUDIT_PLUGINS.');
  process.exit(1);
}

// --- Score -----------------------------------------------------------------

const rows = external.map((ext) => {
  const fp = fingerprint(ext.name, ext.description);
  const scored = cspIndex
    .map((c) => ({ score: similarity({ ...fp, name: ext.name }, { ...c.fp, name: c.name }), skill: c }))
    .sort((x, y) => y.score - x.score);
  const best = scored[0];
  const band = best.score >= COVERED_T ? 'COVERED' : best.score >= PARTIAL_T ? 'PARTIAL' : 'GAP';
  return {
    ...ext,
    concepts: [...fp.concepts],
    score: Number(best.score.toFixed(3)),
    band,
    match: best.skill.name,
    layer: best.skill.layer,
    // The runner-ups matter: a top match barely ahead of #2 and #3 is a weak
    // signal, while a clear winner is a real one.
    near: scored.slice(0, 3).map((s) => ({ name: s.skill.name, layer: s.skill.layer, score: Number(s.score.toFixed(3)) })),
  };
});

const order = { GAP: 0, PARTIAL: 1, COVERED: 2 };
rows.sort((a, b) => order[a.band] - order[b.band] || b.score - a.score || a.name.localeCompare(b.name));

const counts = {
  GAP: rows.filter((r) => r.band === 'GAP').length,
  PARTIAL: rows.filter((r) => r.band === 'PARTIAL').length,
  COVERED: rows.filter((r) => r.band === 'COVERED').length,
};

// --- Concept-level coverage ------------------------------------------------
// Which capability domains does the external collection occupy that CSP does
// not occupy at all? Counts aggregate the per-skill noise away.

const extByConcept = new Map();
for (const r of rows) for (const c of r.concepts) extByConcept.set(c, (extByConcept.get(c) || 0) + 1);

const conceptGaps = [...extByConcept.entries()]
  .map(([concept, extCount]) => ({ concept, extCount, cspCount: cspByConcept.get(concept) || 0 }))
  .filter((c) => c.cspCount === 0)
  .sort((a, b) => b.extCount - a.extCount || a.concept.localeCompare(b.concept));

const conceptThin = [...extByConcept.entries()]
  .map(([concept, extCount]) => ({ concept, extCount, cspCount: cspByConcept.get(concept) || 0 }))
  .filter((c) => c.cspCount > 0 && c.extCount >= 2 && c.extCount >= c.cspCount * 3)
  .sort((a, b) => b.extCount / b.cspCount - a.extCount / a.cspCount);

// --- Report ----------------------------------------------------------------

if (AS_JSON) {
  process.stdout.write(
    `${JSON.stringify(
      {
        thresholds: { covered: COVERED_T, partial: PARTIAL_T },
        counts,
        duplicates,
        conceptGaps,
        conceptThin,
        rows,
      },
      null,
      2
    )}\n`
  );
} else {
  if (!QUIET) {
    console.log('🔍 Skill coverage audit');
    console.log(`   external source:  ${SOURCE}${existsSync(SOURCE) ? '' : '  (missing)'}`);
    console.log(`   external plugins: ${PLUGINS}${existsSync(PLUGINS) ? '' : '  (missing)'}`);
    console.log(`   CSP registry:     ${cspIndex.length} skills (v${registry.version})`);
    console.log(`   thresholds:       covered ≥ ${COVERED_T}, partial ≥ ${PARTIAL_T}\n`);
  }

  console.log(`── External skills scanned: ${rows.length} ──`);
  if (duplicates) console.log(`   (${duplicates} duplicate copies collapsed — same name and description via a second path)`);
  console.log(`   COVERED  ${counts.COVERED}`);
  console.log(`   PARTIAL  ${counts.PARTIAL}`);
  console.log(`   GAP      ${counts.GAP}\n`);

  // Headline: capability domains, not individual skills. A per-skill nearest
  // neighbour over 674 candidates is almost always something; a concept with
  // zero CSP hits is unambiguous.
  console.log(`── CONCEPT GAP (${conceptGaps.length}) — domains the external set occupies, CSP does not ──`);
  if (!conceptGaps.length) console.log('   (none — every external concept has at least one CSP skill)');
  for (const c of conceptGaps) console.log(`   ${c.concept.padEnd(16)} external ${String(c.extCount).padStart(3)} · CSP 0`);
  console.log('');

  console.log(`── THIN COVERAGE (${conceptThin.length}) — CSP has ≥1 skill, external set has ≥3× more ──`);
  if (!conceptThin.length) console.log('   (none)');
  for (const c of conceptThin) {
    console.log(
      `   ${c.concept.padEnd(16)} external ${String(c.extCount).padStart(3)} · CSP ${String(c.cspCount).padStart(3)}  (${(c.extCount / c.cspCount).toFixed(1)}×)`
    );
  }
  console.log('');

  const printBand = (band, label) => {
    const set = rows.filter((r) => r.band === band);
    if (!set.length) return;
    console.log(`── ${label} (${set.length}) ──`);
    for (const r of set) {
      const margin = r.near[1] ? r.score - r.near[1].score : r.score;
      const weak = margin < 0.03 ? '  [weak margin]' : '';
      console.log(`   ${r.score.toFixed(3)}${weak}  ${r.name}`);
      console.log(`          closest: ${r.near.map((n) => `${n.name} (L${n.layer}, ${n.score.toFixed(3)})`).join(' · ')}`);
      if (r.concepts.length) console.log(`          concepts: ${r.concepts.join(', ')}`);
      if (r.description) console.log(`          ${r.description.slice(0, 150)}`);
    }
    console.log('');
  };

  printBand('GAP', 'GAP — no meaningful CSP equivalent; candidate for a new skill');
  printBand('PARTIAL', 'PARTIAL — CSP has related coverage; candidate for extending an existing skill');
  if (!QUIET) printBand('COVERED', 'COVERED — CSP already has this');

  console.log('── Notes ──');
  console.log('   Read CONCEPT GAP and THIN COVERAGE first — they count over the whole corpus,');
  console.log('   unlike the per-skill bands below, which are a ranked reading list rather than');
  console.log('   a classification.');
  console.log('   THIN COVERAGE counts skills that *mention* a concept, not skills dedicated to');
  console.log('   it. External descriptions run longer, so the ratio systematically overstates');
  console.log('   the gap: `responsive 9·2` was 8 passing mentions plus one dedicated skill that');
  console.log('   is already COVERED. Before acting on a thin row, check whether the external');
  console.log('   side is really N dedicated skills or one plus N name-drops.');
  console.log('   The score is similarity to the single closest CSP skill. `closest:` is a');
  console.log('   nearest neighbour over ~670 candidates, so it is often plausible-but-wrong;');
  console.log('   `[weak margin]` means #1 barely beat #2. Read `concepts:` to judge for yourself.');
  console.log('   An exact name match is promoted straight to COVERED, whatever the text says.');
  console.log('   Company- or tool-specific skills (internal wikis, one vendor SDK) are');
  console.log('   legitimately out of scope for a general-purpose MIT package — expect them in GAP.');
  console.log('   Re-run with --json to feed the list into another tool, or retune with --covered / --partial.');
}
