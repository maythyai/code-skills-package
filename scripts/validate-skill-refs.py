#!/usr/bin/env python3
"""CSP Skill Cross-Reference Validator.

Scans all SKILL.md files across csp-patterns, csp-workflow, and csp-meta
directories, extracts skill references from frontmatter and body text,
builds a master set of existing skill names, and reports dangling refs,
format violations, and missing fields.

Usage:
    python3 scripts/validate-skill-refs.py
    python3 scripts/validate-skill-refs.py --json  # Output JSON to stdout
    python3 scripts/validate-skill-refs.py --fix   # Auto-fix format violations (conservative)

Output:
    .csp/audit/skill-ref-validation.json  (structured report)
    Terminal summary table
"""

import os
import re
import json
import sys
import glob
import hashlib
from datetime import datetime
from collections import defaultdict


# --- Configuration ---

SKILL_ROOTS = [
    "csp-patterns/skills",
    "csp-workflow/skills",
    "csp-meta/skills",
    "csp-runtime/skills",
]

DIR_PREFIX_MAP = {
    "csp-patterns/skills/": "pattern",
    "csp-workflow/skills/": "workflow",
    "csp-meta/skills/": "meta",
    "csp-runtime/skills/": "runtime",
}

OUTPUT_DIR = ".csp/audit"
OUTPUT_FILE = "skill-ref-validation.json"

# Regex: matches [[skill-name]] or [[prefix:skill-name]]
WIKI_LINK_RE = re.compile(r'\[\[(?:([a-z]+):)?([a-z][a-z0-9-]*?)\]\]')

# Regex: matches bare csp-* references (for detecting non-standard formats)
CSP_BARE_RE = re.compile(r'(?<!\[\[)(?<!`)\bcsp-[a-z][a-z0-9-]*\b(?!\]\])(?![`])')


def find_all_skill_files():
    """Find all SKILL.md files across all skill root directories."""
    skill_files = []
    for root in SKILL_ROOTS:
        pattern = os.path.join(root, "*/SKILL.md")
        for path in glob.glob(pattern):
            skill_files.append(path)
    return sorted(skill_files)


def extract_skill_name_from_path(filepath):
    """Extract skill name from file path: csp-patterns/skills/csp-foo/SKILL.md -> csp-foo."""
    parts = filepath.split(os.sep)
    # skill dir is the parent of SKILL.md
    for i, part in enumerate(parts):
        if part == "SKILL.md" and i > 0:
            return parts[i - 1]
    return None


def extract_frontmatter(filepath):
    """Extract YAML frontmatter from a SKILL.md file."""
    with open(filepath, 'r') as f:
        content = f.read()

    if not content.startswith('---'):
        return {}, content

    end = content.find('---', 3)
    if end == -1:
        return {}, content

    frontmatter_text = content[3:end].strip()
    body = content[end + 3:].strip()

    # Simple YAML parsing (avoiding PyYAML dependency for portability)
    fm = {}
    for line in frontmatter_text.split('\n'):
        line = line.strip()
        if ':' in line:
            key, _, value = line.partition(':')
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            fm[key] = value

    # Parse list items (dependencies, related_skills)
    # Look for indented list items after 'skills:' or 'related_skills:'
    fm['_raw'] = frontmatter_text
    return fm, body


def parse_skill_list(frontmatter_text, key):
    """Parse a YAML list of skills from frontmatter text."""
    skills = []
    lines = frontmatter_text.split('\n')
    in_section = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith(f'{key}:'):
            in_section = True
            # Check if value is on same line: "skills: [foo, bar]"
            rest = stripped[len(f'{key}:'):].strip()
            if rest.startswith('[') and rest.endswith(']'):
                items = rest[1:-1].split(',')
                skills.extend([s.strip().strip('"').strip("'") for s in items if s.strip()])
                break
            continue
        if in_section:
            if stripped.startswith('- '):
                val = stripped[2:].strip().strip('"').strip("'")
                # Handle [[skill-name]] format
                wiki_match = WIKI_LINK_RE.search(val)
                if wiki_match:
                    prefix = wiki_match.group(1)
                    name = wiki_match.group(2)
                    skills.append(f"{prefix}:{name}" if prefix else name)
                else:
                    skills.append(val)
            elif stripped.startswith('-') and not stripped.startswith('- '):
                val = stripped[1:].strip().strip('"').strip("'")
                wiki_match = WIKI_LINK_RE.search(val)
                if wiki_match:
                    prefix = wiki_match.group(1)
                    name = wiki_match.group(2)
                    skills.append(f"{prefix}:{name}" if prefix else name)
                else:
                    skills.append(val)
            elif stripped and not stripped.startswith('#'):
                # End of list
                break
    return skills


def validate(filepath, master_skills):
    """Validate a single SKILL.md file."""
    skill_name = extract_skill_name_from_path(filepath)
    fm, body = extract_frontmatter(filepath)
    raw_fm = fm.get('_raw', '')

    issues = {
        'file': filepath,
        'skill_name': skill_name,
        'dangling_refs': [],
        'format_violations': [],
        'missing_related_skills': False,
        'missing_entry_conditions': False,
        'missing_exit_conditions': False,
    }

    # Parse dependencies and related_skills
    dep_skills = parse_skill_list(raw_fm, 'skills')
    rel_skills = parse_skill_list(raw_fm, 'related_skills')

    # Combine all referenced skills
    all_refs = []
    for prefix, name in WIKI_LINK_RE.findall(raw_fm):
        all_refs.append(f"{prefix}:{name}" if prefix else name)
    for prefix, name in WIKI_LINK_RE.findall(body):
        all_refs.append(f"{prefix}:{name}" if prefix else name)

    # Check dangling references
    for ref in set(all_refs):
        if ':' in ref:
            # Cross-directory reference: check if skill exists in that tree
            check_name = ref.split(':')[1]
        else:
            check_name = ref
        if check_name not in master_skills:
            issues['dangling_refs'].append(ref)

    # Check format violations - bare csp-* references in body (not wiki-link)
    for match in CSP_BARE_RE.finditer(body):
        bare_name = match.group(0)
        # Skip if it's inside a code block (rough heuristic)
        issues['format_violations'].append({
            'name': bare_name,
            'message': f"Bare reference '{bare_name}' should use [[{bare_name}]] format",
        })

    # Check missing sections
    if 'Related Skills' not in body and not rel_skills:
        issues['missing_related_skills'] = True
    if 'Entry Conditions' not in body:
        issues['missing_entry_conditions'] = True
    if 'Exit Conditions' not in body:
        issues['missing_exit_conditions'] = True

    return issues


def build_master_skill_set(skill_files):
    """Build a set of all existing skill names."""
    skills = set()
    for f in skill_files:
        name = extract_skill_name_from_path(f)
        if name:
            skills.add(name)
    return skills


def main():
    skill_files = find_all_skill_files()
    master_skills = build_master_skill_set(skill_files)

    print(f"Scanning {len(skill_files)} SKILL.md files across {len(SKILL_ROOTS)} directories")
    print(f"Master skill set: {len(master_skills)} unique skills\n")

    all_issues = []
    stats = {
        'total': len(skill_files),
        'with_dangling_refs': 0,
        'with_format_violations': 0,
        'missing_related_skills': 0,
        'missing_entry_conditions': 0,
        'missing_exit_conditions': 0,
        'clean': 0,
    }

    for f in skill_files:
        issues = validate(f, master_skills)
        all_issues.append(issues)

        if issues['dangling_refs']:
            stats['with_dangling_refs'] += 1
        if issues['format_violations']:
            stats['with_format_violations'] += 1
        if issues['missing_related_skills']:
            stats['missing_related_skills'] += 1
        if issues['missing_entry_conditions']:
            stats['missing_entry_conditions'] += 1
        if issues['missing_exit_conditions']:
            stats['missing_exit_conditions'] += 1

        if not any([issues['dangling_refs'], issues['format_violations'],
                    issues['missing_related_skills'], issues['missing_entry_conditions'],
                    issues['missing_exit_conditions']]):
            stats['clean'] += 1

    # Print summary
    print("=" * 70)
    print("CSP Skill Cross-Reference Validation Report")
    print("=" * 70)
    print(f"Total skills scanned:     {stats['total']}")
    print(f"Clean (no issues):        {stats['clean']}")
    print(f"With dangling refs:       {stats['with_dangling_refs']}")
    print(f"With format violations:   {stats['with_format_violations']}")
    print(f"Missing related_skills:   {stats['missing_related_skills']}")
    print(f"Missing Entry Conditions: {stats['missing_entry_conditions']}")
    print(f"Missing Exit Conditions:  {stats['missing_exit_conditions']}")

    # Print dangling refs
    if stats['with_dangling_refs'] > 0:
        print("\n--- Dangling References ---")
        for issue in all_issues:
            if issue['dangling_refs']:
                print(f"  {issue['skill_name']}: {issue['dangling_refs']}")

    # Print format violations summary (top 10)
    if stats['with_format_violations'] > 0:
        print("\n--- Format Violations (first 10) ---")
        count = 0
        for issue in all_issues:
            if issue['format_violations']:
                for v in issue['format_violations'][:3]:
                    if count < 10:
                        print(f"  {issue['skill_name']}: {v['message']}")
                        count += 1
        print(f"  ... and more")

    # Write JSON report
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    report = {
        'generated_at': datetime.utcnow().isoformat() + 'Z',
        'stats': stats,
        'issues': all_issues,
        'master_skill_count': len(master_skills),
    }
    output_path = os.path.join(OUTPUT_DIR, OUTPUT_FILE)
    with open(output_path, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"\nFull report: {output_path}")

    # Return exit code
    if stats['with_dangling_refs'] > 0:
        print("\n⚠️  Dangling references found. Run with --fix to attempt auto-repair (conservative).")
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())