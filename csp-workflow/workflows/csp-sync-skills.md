# sync-skills — Cross-Runtime CSP Skill Sync

**Command:** `/csp-sync-skills`

Sync managed `csp-*` skill directories from one canonical runtime's skills root to one or more destination runtime skills roots. Keeps multi-runtime installs aligned after a `csp-update` on one runtime.

---

## Arguments

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--from <runtime>` | Yes | *(none)* | Source runtime — the canonical runtime to copy from |
| `--to <runtime\|all>` | Yes | *(none)* | Destination runtime or `all` supported runtimes |
| `--dry-run` | No | *on by default* | Preview changes without writing anything |
| `--apply` | No | *off* | Execute the diff (overrides dry-run) |

If neither `--dry-run` nor `--apply` is specified, dry-run is the default.

**Supported runtime names:** `claude`, `codex`, `grok`, `copilot`, `cursor`, `windsurf`, `opencode`, `gemini`, `kilo`, `augment`, `trae`, `qwen`, `codebuddy`, `cline`, `antigravity` (grok uses the `~/.agents` layout)

---

## Step 1: Parse Arguments

```bash
FROM_RUNTIME=""
TO_RUNTIMES=()
IS_APPLY=false

# Parse --from
if [[ "$@" == *"--from"* ]]; then
  FROM_RUNTIME=$(echo "$@" | grep -oP '(?<=--from )\S+')
fi

# Parse --to
if [[ "$@" == *"--to all"* ]]; then
  TO_RUNTIMES=(claude codex grok copilot cursor windsurf opencode gemini kilo augment trae qwen codebuddy cline antigravity)
elif [[ "$@" == *"--to"* ]]; then
  TO_RUNTIMES=( $(echo "$@" | grep -oP '(?<=--to )\S+') )
fi

# Parse --apply
if [[ "$@" == *"--apply"* ]]; then
  IS_APPLY=true
fi
```

**Validation:**
- If `--from` is missing or unrecognized: print error and exit
- If `--to` is missing or unrecognized: print error and exit
- If `--from` == `--to` (single destination): print `[no-op: source and destination are the same runtime]` and exit

---

## Step 2: Resolve Skills Roots

Resolve each runtime's skills root with an inline `skills_root_for()` function
that mirrors `lib/platforms.sh`'s `platform_dir` table (the single source of
truth for install paths). This avoids depending on a separate installer binary:

```bash
skills_root_for() {
  # $1 = runtime slug, $2 = scope ("global"|"local"); defaults to global
  local runtime="$1" scope="${2:-global}"
  local dir
  case "$runtime" in
    claude|copilot)      dir=".claude/skills" ;;
    cursor)              dir=".cursor/skills" ;;
    windsurf)            dir=".windsurf/skills" ;;
    gemini)              dir=".gemini/skills" ;;
    codex)               dir=".codex/skills" ;;
    opencode)            dir=".opencode/skills" ;;
    kilo)                dir=".kiro/steering" ;;
    trae)                dir=".trae/skills" ;;
    qwen)                dir=".qwen/skills" ;;
    cline)               dir=".cline/rules" ;;
    antigravity)         dir=".antigravity/skills" ;;
    grok)                dir=".agents" ;;          # grok uses ~/.agents layout
    augment)             dir=".augment/skills" ;;
    codebuddy)           dir=".codebuddy/skills" ;;
    *) echo ""; return 1 ;;
  esac
  if [ "$scope" = "local" ]; then
    echo "./$dir"
  else
    echo "$HOME/$dir"
  fi
}

SRC_SKILLS_ROOT=$(skills_root_for "$FROM_RUNTIME")
[ -z "$SRC_SKILLS_ROOT" ] && { echo "error: unknown source runtime: $FROM_RUNTIME"; exit 1; }

for DEST_RUNTIME in "${TO_RUNTIMES[@]}"; do
  DEST_SKILLS_ROOTS["$DEST_RUNTIME"]=$(skills_root_for "$DEST_RUNTIME")
done
```

**Guard:** If the source skills root does not exist, print:
```
error: source skills root not found: <path>
       Is CSP installed globally for the '<runtime>' runtime?
       Run: ./install.sh --platform <runtime> --global
```
Then exit.

**Guard:** If `--to` contains the same runtime as `--from`, skip that destination silently.

---

## Step 3: Compute Diff Per Destination

For each destination runtime:

```bash
# List csp-* subdirectories in source
SRC_SKILLS=$(ls -1 "$SRC_SKILLS_ROOT" 2>/dev/null | grep '^csp-')

# List csp-* subdirectories in destination (may not exist yet)
DST_SKILLS=$(ls -1 "$DEST_ROOT" 2>/dev/null | grep '^csp-')

# Diff:
# CREATE  — in SRC but not in DST
# UPDATE  — in both; content differs (compare recursively via checksums)
# REMOVE  — in DST but not in SRC (stale CSP skill no longer in source)
# SKIP    — in both; content identical (already up to date)
```

**Non-CSP preservation:** Only `csp-*` entries are ever created, updated, or removed. Entries in the destination that do not start with `csp-` are never touched.

---

## Step 4: Print Diff Report

Always print the report, regardless of `--apply` or `--dry-run`:

```
sync source: <runtime> (<src_skills_root>)
sync targets: <dest1>, <dest2>

== <dest1> (<dest1_skills_root>) ==
CREATE: csp-help
UPDATE: csp-update
REMOVE: csp-old-command
SKIP:   csp-plan-phase (up to date)
(N changes)

== <dest2> (<dest2_skills_root>) ==
CREATE: csp-help
(N changes)

dry-run only. use --apply to execute.    ← omit this line if --apply
```

If a destination root does not exist and `--apply` is true, print `CREATE DIR: <path>` before its entries.

If all destinations are already up to date:
```
All destinations are up to date. No changes needed.
```

---

## Step 5: Execute (only when --apply)

If `--dry-run` (or no flag): skip this step entirely and exit after printing the report.

For each destination with changes:

```bash
mkdir -p "$DEST_ROOT"

for SKILL in $CREATE_LIST $UPDATE_LIST; do
  rm -rf "$DEST_ROOT/$SKILL"
  cp -r "$SRC_SKILLS_ROOT/$SKILL" "$DEST_ROOT/$SKILL"
done

for SKILL in $REMOVE_LIST; do
  rm -rf "$DEST_ROOT/$SKILL"
done
```

**Idempotency:** Running `--apply` a second time with no intervening changes must report zero changes (all entries are SKIP).

**Atomicity:** Each skill directory is replaced as a unit (remove then copy). Partial updates of individual files within a skill are not performed — the whole directory is replaced.

After executing all destinations:

```
Sync complete: <N> skills synced to <M> runtime(s).
```

---

## Safety Rules

1. **Only `csp-*` directories** are created, updated, or removed. Any directory not starting with `csp-` in a destination root is untouched.
2. **Dry-run is the default.** `--apply` must be passed explicitly to write anything.
3. **Source root must exist.** Never create the source root; it must have been created by a prior `csp-update` or installer run.
4. **No cross-runtime content transformation.** Sync copies files verbatim. It does not apply runtime-specific content transformations (those happen at install time). If a runtime requires transformed content (e.g. Augment's format differs), the developer should run the installer for that runtime instead of using sync.

---

## Limitations

- Sync copies files verbatim and does not apply runtime-specific content transformations. Use the CSP installer directly for runtimes that require format conversion.
- Cross-project skills (`.agents/skills/`) are out of scope — this command only touches global runtime skills roots.
- Bidirectional sync is not supported. Choose one canonical source with `--from`.
