# Reapply Local Patches Workflow

Invoked by `/csp-update --reapply` (`commands/csp-update.md`).

After a CSP update, this workflow restores user-backed-up custom files from
`csp-user-files-backup/` back to their original locations inside the runtime's
CSP-managed skill directories.

> **install.sh-native scope:** This repo's installer (`install.sh`) overwrites
> the `csp-*` layer dirs in place via `cp -R`; it does **not** wipe custom
> (non-`csp-*`) files, and it has no file manifest. Therefore:
> - Custom files (non-`csp-*`) are usually **preserved in place** by the update;
>   this workflow restores them only if they were lost (e.g. a prior `--uninstall`
>   removed them, or the user manually cleared the dir).
> - Modifications the user made **to `csp-*` managed files** are NOT tracked
>   (no pristine-hash baseline) and will be overwritten by updates. To keep
>   customizations durable, put them in non-`csp-*` files (custom skills,
>   CLAUDE.md sections outside the sentinel markers, custom hooks).

<process>

## Step 1: Resolve the backup directory

`csp-update` writes backups to `$RUNTIME_DIR/csp-user-files-backup/`, where
`RUNTIME_DIR` is the runtime config directory detected during the update
(e.g. `~/.claude`, `~/.cursor`, `~/.config/opencode`).

```bash
expand_home() {
  case "$1" in
    "~/"*) printf '%s/%s\n' "$HOME" "${1#~/}" ;;
    *) printf '%s\n' "$1" ;;
  esac
}

# Reuse the same env-override + default detection as csp-update.
BACKUP_DIR=""
for candidate in \
  "${CLAUDE_CONFIG_DIR:+$(expand_home "$CLAUDE_CONFIG_DIR")/csp-user-files-backup}" \
  "${ANTIGRAVITY_CONFIG_DIR:+$(expand_home "$ANTIGRAVITY_CONFIG_DIR")/csp-user-files-backup}" \
  "${GEMINI_CONFIG_DIR:+$(expand_home "$GEMINI_CONFIG_DIR")/csp-user-files-backup}" \
  "${KILO_CONFIG_DIR:+$(expand_home "$KILO_CONFIG_DIR")/csp-user-files-backup}" \
  "${OPENCODE_CONFIG_DIR:+$(expand_home "$OPENCODE_CONFIG_DIR")/csp-user-files-backup}" \
  "${CODEX_HOME:+$(expand_home "$CODEX_HOME")/csp-user-files-backup}" \
  "$HOME/.claude/csp-user-files-backup" \
  "$HOME/.cursor/csp-user-files-backup"; do
  if [ -n "$candidate" ] && [ -d "$candidate" ]; then
    BACKUP_DIR="$candidate"
    break
  fi
done
```

If `BACKUP_DIR` is empty (no backup found):
```
## Reapply — Nothing to Restore

No `csp-user-files-backup/` directory found in any detected runtime config dir.
Either no custom files were backed up during the last update, or the backup
was already removed. Nothing to reapply.
```
Exit.

## Step 2: Enumerate backed-up files

List every file under the backup dir. Each file's path **relative to the
backup dir** is also its path relative to the runtime config dir (the backup
preserved the directory structure):

```bash
mapfile -t BACKED_UP_FILES < <(cd "$BACKUP_DIR" && find . -type f | sed 's|^\./||')
```

If the list is empty:
```
## Reapply — Backup Empty
`csp-user-files-backup/` exists but contains no files. Nothing to reapply.
```
Exit.

## Step 3: Restore each file (two-way copy-back)

For each backed-up file, restore it to its original location. The runtime
config dir is the **parent** of the backup dir (`BACKUP_DIR` =
`<RUNTIME_DIR>/csp-user-files-backup`), so the destination is
`<RUNTIME_DIR>/<relative-path>`:

```bash
RUNTIME_DIR="$(dirname "$BACKUP_DIR")"
RESTORED=0
SKIPPED=0
CONFLICTS=0

for rel in "${BACKED_UP_FILES[@]}"; do
  src="$BACKUP_DIR/$rel"
  dst="$RUNTIME_DIR/$rel"

  # Destination already exists and differs from backup → conflict (user may
  # have re-created the file post-update). Prompt rather than clobber.
  if [ -f "$dst" ] && ! cmp -s "$src" "$dst"; then
    echo "CONFLICT: $rel (target differs from backup)"
    CONFLICTS=$((CONFLICTS + 1))
    # In text mode, list conflicts for the user to resolve manually.
    continue
  fi

  mkdir -p "$(dirname "$dst")"
  cp -p "$src" "$dst"
  echo "restored: $rel"
  RESTORED=$((RESTORED + 1))
done
```

## Step 4: Report

```
## Reapply Complete

- Restored:   N file(s)
- Skipped:    M (already in place, identical)
- Conflicts:  K (target differs from backup — resolve manually)

Backup retained at: <BACKUP_DIR>
Review the conflicts above and merge by hand if any.
```

**Conflict handling:** A conflict means the file now on disk (after the update)
differs from the user's backed-up version. Do not silently overwrite. Surface
both paths so the user can merge manually:

```
  backup: <BACKUP_DIR>/<rel>
  current: <RUNTIME_DIR>/<rel>
```
</process>

<success_criteria>
- [ ] Backup directory resolved or "nothing to restore" reported
- [ ] Each backed-up file either restored, skipped (identical), or flagged as conflict
- [ ] No on-disk file silently clobbered when it differs from the backup
- [ ] Conflicts listed with both paths for manual resolution
</success_criteria>

<limitations>
- This workflow restores **non-`csp-*` custom files** only — the set captured
  by `csp-sdk query detect-custom-files`.
- It does **not** recover user modifications to `csp-*` managed files
  (overwritten by the update; no pristine baseline exists without a manifest).
  Keep durable customizations outside `csp-*` paths or in CLAUDE.md sections
  outside the `<!-- csp-begin -->` / `<!-- csp-end -->` sentinel markers.
</limitations>
