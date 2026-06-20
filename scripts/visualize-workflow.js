#!/usr/bin/env node
/**
 * visualize-workflow.js — Generate Mermaid DAG from workflow JSON
 * Usage: node scripts/visualize-workflow.js <template-name>
 * Example: node scripts/visualize-workflow.js feature-development
 */

const fs = require('fs');
const path = require('path');

const templateName = process.argv[2];
if (!templateName) {
  console.error('Usage: node scripts/visualize-workflow.js <template-name>');
  const templatesDir = path.join(__dirname, '..', 'csp-workflow', 'templates');
  if (fs.existsSync(templatesDir)) {
    const available = fs.readdirSync(templatesDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
    console.error('Available:', available.join(', ') || '(none)');
  } else {
    console.error('Templates directory not found:', templatesDir);
  }
  process.exit(1);
}

const templatePath = path.join(__dirname, '..', 'csp-workflow', 'templates', `${templateName}.json`);
if (!fs.existsSync(templatePath)) {
  console.error(`Template not found: ${templateName}`);
  const templatesDir = path.join(__dirname, '..', 'csp-workflow', 'templates');
  if (fs.existsSync(templatesDir)) {
    const available = fs.readdirSync(templatesDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
    console.error('Available:', available.join(', ') || '(none)');
  }
  process.exit(1);
}

const workflow = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

// Generate Mermaid DAG
const lines = ['graph LR'];
const stageIds = {};

workflow.stages.forEach((stage, i) => {
  const id = `S${i}`;
  stageIds[stage.name] = id;
  const skills = stage.skills.join(', ');
  const timeout = stage.timeout || (workflow.defaults && workflow.defaults.timeout) || 600;
  lines.push(`    ${id}["${stage.name}\\n${skills}\\n⏱ ${timeout}s"]`);
});

// Add edges based on conditions
workflow.stages.forEach((stage, i) => {
  if (i === 0) return;
  const prevStage = workflow.stages[i - 1];
  const prevId = stageIds[prevStage.name];
  const currId = stageIds[stage.name];

  if (stage.condition && stage.condition.includes(prevStage.name)) {
    const onFail = stage.on_failure || (workflow.defaults && workflow.defaults.on_failure) || 'stop';
    if (onFail === 'skip') {
      lines.push(`    ${prevId} -->|"success"| ${currId}`);
      lines.push(`    ${prevId} -.->|"skip"| NEXT`);
    } else {
      lines.push(`    ${prevId} -->|"${prevStage.name}.success"| ${currId}`);
    }
  } else {
    lines.push(`    ${prevId} --> ${currId}`);
  }
});

// Add style
lines.push('');
lines.push('    style S0 fill:#4CAF50,color:#fff');
workflow.stages.forEach((stage, i) => {
  if (i === 0) return;
  const onFail = stage.on_failure || (workflow.defaults && workflow.defaults.on_failure) || 'stop';
  const color = onFail === 'stop' ? '#FF9800' : onFail === 'skip' ? '#2196F3' : '#4CAF50';
  lines.push(`    style S${i} fill:${color},color:#fff`);
});

console.log(`# ${workflow.name} — ${workflow.description}`);
console.log(`# Stages: ${workflow.stages.length}`);
console.log('');
console.log('```mermaid');
console.log(lines.join('\n'));
console.log('```');
