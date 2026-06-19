// shared/scripts/confidence-router.mjs
// Confidence scoring router: keyword + context + history → ranked skills
// Runs as a hook after state-detector and keyword-detector

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CSP_ROOT = resolve(import.meta.dirname, '..', '..', 'csp-router');

function parseSimpleYAML(yamlStr) {
  // Simple YAML parser for our specific structure
  const result = {};
  let currentSection = null;
  let currentKey = null;
  let currentSubKey = null;

  const lines = yamlStr.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Detect indentation level
    const indent = line.match(/^(\s*)/)[1].length;

    // Top-level keys (no indent)
    if (indent === 0 && trimmed.endsWith(':') && !trimmed.includes(' ')) {
      currentSection = trimmed.slice(0, -1);
      result[currentSection] = {};
      currentKey = null;
      continue;
    }

    // Second-level keys (2-space indent)
    if (indent === 2 && trimmed.endsWith(':') && !trimmed.startsWith('-')) {
      const keyMatch = trimmed.match(/^"?([^"]+)"?:\s*$/);
      if (keyMatch && !result[currentSection][keyMatch[1]]) {
        currentKey = keyMatch[1];
        result[currentSection][currentKey] = {};
        currentSubKey = null;
        continue;
      }
    }

    // Third-level properties (4-space indent)
    if (indent >= 4 && currentKey !== null) {
      // Array value
      if (trimmed.startsWith('patterns:') || trimmed.startsWith('skills:')) {
        const arrMatch = trimmed.match(/^\w+:\s*\[(.+)\]/);
        if (arrMatch) {
          const propName = trimmed.split(':')[0];
          result[currentSection][currentKey][propName] = arrMatch[1]
            .split(',')
            .map(s => s.trim().replace(/"/g, ''));
        }
        continue;
      }

      // Simple value
      const kvMatch = trimmed.match(/^"?([^"]+)"?:\s*"?(.+?)"?\s*$/);
      if (kvMatch) {
        const [, prop, val] = kvMatch;
        result[currentSection][currentKey][prop] = val.replace(/"/g, '');
      }
    }
  }

  return result;
}

function loadYaml(file) {
  try {
    const content = readFileSync(join(CSP_ROOT, file), 'utf8');
    return parseSimpleYAML(content);
  } catch {
    return null;
  }
}

function loadState() {
  try {
    return JSON.parse(readFileSync(join(PROJECT_ROOT, '.csp', 'state.json'), 'utf8'));
  } catch {
    return { git_status: 'unknown', tech_stack: [], phase: 'building' };
  }
}

function keywordScore(input, triggers) {
  const lower = input.toLowerCase();
  const scores = {};

  for (const [keyword, { skills, weight }] of Object.entries(triggers.trigger_index || {})) {
    if (lower.includes(keyword.toLowerCase())) {
      for (const skill of skills) {
        scores[skill] = (scores[skill] || 0) + weight / 50; // Normalize to 0-1
      }
    }
  }
  return scores;
}

function intentScore(input, intents) {
  const lower = input.toLowerCase();
  const scores = {};

  for (const [, { patterns, skills, weight }] of Object.entries(intents.intent_patterns || {})) {
    const matched = patterns.some(p => lower.includes(p.toLowerCase()));
    if (matched) {
      for (const skill of skills) {
        scores[skill] = (scores[skill] || 0) + weight / 50;
      }
    }
  }
  return scores;
}

function contextScore(metadata, state) {
  const scores = {};
  if (!metadata?.skills) return scores;

  const currentPhase = state.phase;

  for (const [skill, meta] of Object.entries(metadata.skills)) {
    // Phase match bonus
    if (meta.phase === currentPhase) {
      scores[skill] = (scores[skill] || 0) + 0.2;
    }

    // Tech stack match bonus
    if (meta.domain === 'language' && state.tech_stack?.length > 0) {
      const topLang = state.tech_stack[0]?.lang;
      if (skill.toLowerCase().includes(topLang)) {
        scores[skill] = (scores[skill] || 0) + 0.15;
      }
    }
  }
  return scores;
}

function mergeScores(...scoreMaps) {
  const merged = {};
  for (const map of scoreMaps) {
    for (const [skill, score] of Object.entries(map)) {
      merged[skill] = (merged[skill] || 0) + score;
    }
  }
  return merged;
}

function main() {
  const input = process.env.CLAUDE_USER_PROMPT || process.argv.slice(2).join(' ') || '';
  if (!input) return;

  const triggers = loadYaml('triggers.yaml');
  const metadata = loadYaml('skill-metadata.yaml');
  const state = loadState();

  if (!triggers) return;

  // Calculate component scores
  const kwScores = keywordScore(input, triggers);
  const intentScores = intentScore(input, triggers);
  const ctxScores = contextScore(metadata, state);

  // Merge with weights
  const final = mergeScores(
    Object.fromEntries(Object.entries(kwScores).map(([k, v]) => [k, v * 0.4])),
    Object.fromEntries(Object.entries(intentScores).map(([k, v]) => [k, v * 0.3])),
    Object.fromEntries(Object.entries(ctxScores).map(([k, v]) => [k, v * 0.3]))
  );

  // Sort by confidence desc
  const ranked = Object.entries(final)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (ranked.length === 0) return;

  // Output routing hint
  const lines = ranked.map(([skill, score], i) => {
    const confidence = Math.min(Math.round(score * 100), 99);
    const meta = metadata?.skills?.[skill] || {};
    const phaseTag = meta.phase ? ` [${meta.phase}]` : '';
    return `  ${i + 1}. ${skill}${phaseTag} — ${confidence}%`;
  });

  console.log('[router] Confidence-ranked skills:');
  console.log(lines.join('\n'));

  // Decision guidance
  const topScore = ranked[0]?.[1] || 0;
  if (topScore > 0.8) {
    console.log(`[router] Decision: Direct route → ${ranked[0][0]}`);
  } else if (topScore > 0.5) {
    console.log(`[router] Decision: Top 3 candidates — user should confirm`);
  } else {
    console.log(`[router] Decision: Low confidence — consider /csp-interview-me`);
  }
}

main();
