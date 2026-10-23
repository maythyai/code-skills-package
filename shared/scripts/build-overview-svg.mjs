// Regenerates assets/dashboard-overview.svg from csp-router/registry.json.
// Wired into `npm run build:all`; the total embedded as data-total is
// enforced by scripts/count-skills.mjs, so the README graphic can never
// drift from the registry the way a manual screenshot would.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const registry = JSON.parse(readFileSync(join(ROOT, 'csp-router', 'registry.json'), 'utf8'));

const LAYERS = [
  { layer: 0, name: 'Router', color: '#c0553f' },
  { layer: 1, name: 'Meta', color: '#3b5bdb' },
  { layer: 2, name: 'Workflow', color: '#2f9e44' },
  { layer: 3, name: 'Patterns', color: '#7048e8' },
  { layer: 4, name: 'Runtime', color: '#e8590c' },
];

const counts = LAYERS.map((l) => ({
  ...l,
  count: registry.skills.filter((s) => s.layer === l.layer).length,
}));
const total = registry.skills.length;
const max = Math.max(...counts.map((c) => c.count));

const W = 720;
const PAD = 28;
const TITLE_Y = 58;
const TOTAL_Y = 108;
const ROWS_Y = 146;
const ROW_H = 38;
const H = ROWS_Y + counts.length * ROW_H + 24;
const LABEL_W = 118;
const COUNT_W = 64;
const BAR_W = W - 2 * PAD - LABEL_W - COUNT_W - 12;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const rows = counts
  .map((l, i) => {
    const y = ROWS_Y + i * ROW_H;
    const w = Math.round((BAR_W * l.count) / max);
    return [
      `<text x="${PAD}" y="${y + 23}" fill="#aab3c5" font-size="14" font-weight="600">${esc(l.name)}</text>`,
      `<rect x="${PAD + LABEL_W}" y="${y + 12}" width="${BAR_W}" height="12" rx="6" fill="#232941"/>`,
      `<rect x="${PAD + LABEL_W}" y="${y + 12}" width="${w}" height="12" rx="6" fill="${l.color}"/>`,
      `<text x="${W - PAD}" y="${y + 23}" fill="#ffffff" font-size="15" font-weight="700" text-anchor="end">${l.count}</text>`,
    ].join('\n  ');
  })
  .join('\n  ');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" data-total="${total}" font-family="system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <rect width="${W}" height="${H}" rx="14" fill="#14182b"/>
  <text x="${PAD}" y="${TITLE_Y}" fill="#8b93a7" font-size="13" letter-spacing="3">CSP · CODE SKILLS PACKAGE</text>
  <text x="${PAD}" y="${TOTAL_Y}" fill="#ffffff" font-size="38" font-weight="700">${total}</text>
  <text x="${PAD + 108}" y="${TOTAL_Y}" fill="#8b93a7" font-size="15">skills · 5 layers · auto-generated from registry</text>
  ${rows}
</svg>
`;

writeFileSync(join(ROOT, 'assets', 'dashboard-overview.svg'), svg + '\n');
console.log(`assets/dashboard-overview.svg — ${total} skills (${counts.map((c) => `${c.name} ${c.count}`).join(' / ')})`);
