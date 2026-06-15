# Example 4: Code Simplification (csp-code-simplification)

> 使用 CSP 技能包中的 `csp-code-simplification` skill 分析并简化复杂 TypeScript 文件。

---

## 使用的 Skill

- **Skill**: `csp-code-simplification` (位于 `csp-patterns/skills/csp-code-simplification/SKILL.md`)
- **类型**: 代码简化 — 提高可读性、移除死代码、清理 AI 生成的冗余

## 简化目标

- **文件**: `开源项目参考/compound-engineering-plugin/src/utils/legacy-cleanup.ts`
- **行数**: 796 行
- **描述**: 清理旧版技能/agent/prompt 遗留文件的工具模块

## 提示词

```
You are demonstrating the csp-code-simplification skill.

Target file: /Users/cs/projects/code-skills-package/开源项目参考/compound-engineering-plugin/src/utils/legacy-cleanup.ts

Step 1: Read the entire file.
Step 2: Analyze using the csp-code-simplification methodology:
  - Deep nesting, long functions, nested ternaries, duplicated conditionals
  - Generic variable names, dead code, AI slop patterns
Step 3: Check callers of exported functions to find unused exports.
Step 4: Document specific simplification opportunities with file:line references.
Step 5: Show BEFORE and AFTER code for each opportunity.

This is READ-ONLY. Do NOT modify any files.
```

## 分析结果

### 发现的简化机会

| # | 位置 | 问题 | 严重度 |
|---|------|------|--------|
| 1 | line 380-398 | 8 个 case 的 switch 应改为 Record 查找表 | Medium |
| 2 | line 440 | 非空数组 pop() 后的冗余 null 检查 | Low |
| 3 | line 655-666 | 8 条件 && 链应改为 guard clauses | Medium |
| 4 | line 539-553 | 单 case switch + 嵌套三元应扁平化 | Medium |
| 5 | line 745-754 | `cleanupStalePrompts` 导出但从未被导入 | Medium |
| 6 | line 22 | `STALE_SKILL_DIRS` 导出但从未被导入 | Low |
| 7 | line 482-537 | 50 行 IIFE 应拆分为 3 个辅助函数 | Medium |
| 8 | line 574-576 | `if (x) return true; return false` 重言式 | Low |
| 9 | line 478-479 | 不必要的中间数组分配 | Low |
| 10 | 全文 | 通用变量名 `targetPath` 缺乏描述性 | Low |

### 具体的 BEFORE/AFTER 示例

#### 1. Switch → Record 查找表 (line 380-398)

**BEFORE**:
```typescript
switch (legacyName) {
  case "git-commit": return "ce-commit"
  case "git-commit-push-pr": return "ce-commit-push-pr"
  case "git-worktree": return "ce-worktree"
  case "git-clean-gone-branches": return "ce-clean-gone-branches"
  case "report-bug-ce": return "ce-report-bug"
  case "document-review":
  case "ce-document-review": return "ce-doc-review"
  case "ce-review": return "ce-code-review"
  default: return legacyName.startsWith("ce-") ? legacyName : `ce-${legacyName}`
}
```

**AFTER**:
```typescript
const RENAME_MAP: Record<string, string> = {
  "git-commit": "ce-commit",
  "git-commit-push-pr": "ce-commit-push-pr",
  "git-worktree": "ce-worktree",
  "git-clean-gone-branches": "ce-clean-gone-branches",
  "report-bug-ce": "ce-report-bug",
  "document-review": "ce-doc-review",
  "ce-document-review": "ce-doc-review",
  "ce-review": "ce-code-review",
}
return RENAME_MAP[legacyName] ?? (legacyName.startsWith("ce-") ? legacyName : `ce-${legacyName}`)
```

**收益**: 减少 19 行样板代码，新增映射只需一行 key-value。

#### 2. && 链 → Guard Clauses (line 655-666)

**BEFORE**:
```typescript
return parsed.name === fileName
  && descriptionsMatch(description, expectedDescription)
  && descriptionsMatch(welcomeMessage, `Switching to the ${fileName} agent. ${expectedDescription}`)
  && parsed.prompt === `file://./prompts/${fileName}.md`
  && parsed.includeMcpJson === true
  && tools.length === 1
  && tools[0] === "*"
  && resources.includes("file://.kiro/steering/**/*.md")
  && resources.includes("skill://.kiro/skills/**/SKILL.md")
```

**AFTER**:
```typescript
if (parsed.name !== fileName) return false
if (!descriptionsMatch(description, expectedDescription)) return false
if (!descriptionsMatch(welcomeMessage, `Switching to the ${fileName} agent. ${expectedDescription}`)) return false
if (parsed.prompt !== `file://./prompts/${fileName}.md`) return false
if (parsed.includeMcpJson !== true) return false
if (tools.length !== 1 || tools[0] !== "*") return false
if (!resources.includes("file://.kiro/steering/**/*.md")) return false
if (!resources.includes("skill://.kiro/skills/**/SKILL.md")) return false
return true
```

**收益**: 每个检查独立成行，调试时可在任意 return 处打断点。

#### 3. 单 case switch → 数据驱动 (line 539-553)

**BEFORE**:
```typescript
function promptSkillNamesForLegacy(fileName: string): string[] {
  switch (fileName) {
    case "ce-review.md":
      return ["ce-review", "ce-code-review", "ce:review"]
    default: {
      const skillName = path.basename(fileName, ".md")
      const legacyWorkflowName = skillName.startsWith("ce-")
        ? skillName.replace(/^ce-/, "ce:")
        : skillName
      return legacyWorkflowName === skillName ? [skillName] : [skillName, legacyWorkflowName]
    }
  }
}
```

**AFTER**:
```typescript
const PROMPT_SKILL_OVERRIDES: Record<string, string[]> = {
  "ce-review.md": ["ce-review", "ce-code-review", "ce:review"],
}

function promptSkillNamesForLegacy(fileName: string): string[] {
  if (PROMPT_SKILL_OVERRIDES[fileName]) return PROMPT_SKILL_OVERRIDES[fileName]
  const skillName = path.basename(fileName, ".md")
  if (skillName.startsWith("ce-")) {
    return [skillName, skillName.replace(/^ce-/, "ce:")]
  }
  return [skillName]
}
```

**收益**: 嵌套三元被消除，新增覆盖只需一行数据。

#### 4. 50 行 IIFE → 提取辅助函数 (line 482-537)

**BEFORE**: 一个 50 行的异步 IIFE 内联做了三件事 (skill/agent/prompt fingerprint 构建)。

**AFTER**:
```typescript
async function buildSkillFingerprints(skillIndex: Map<string, string>): Promise<Map<string, string>> {
  const skills = new Map<string, string>()
  for (const legacyName of STALE_SKILL_DIRS) {
    const currentPath = skillIndex.get(currentSkillNameForLegacy(legacyName))
    if (currentPath) {
      const description = await readDescription(currentPath)
      if (description) skills.set(legacyName, description)
      continue
    }
    const legacyOnly = LEGACY_ONLY_SKILL_DESCRIPTIONS[legacyName]
    if (legacyOnly) skills.set(legacyName, legacyOnly)
  }
  return skills
}
```

然后主函数缩减为 ~15 行，通过 3 个命名辅助函数做 `Promise.all` 并行调用。

### 死代码分析

```bash
grep -r "legacy-cleanup" src/
```

- `cleanupStaleSkillDirs` — 被外部导入 (✅ 保留)
- `cleanupStaleAgents` — 被外部导入 (✅ 保留)
- `classifyCodexLegacyPromptOwnership` — 被外部导入 (✅ 保留)
- `STALE_SKILL_DIRS` — 仅 AGENTS.md 引用，无代码导入 (⚠️ 移除 export)
- `cleanupStalePrompts` — 仅 codex.ts 注释引用，无代码导入 (⚠️ 移除 export 或整个函数)

## 学到的东西

1. **csp-code-simplification 的五原则有效**: 嵌套深度、函数长度、三元、布尔参数、重复条件 — 每个原则都发现了实际问题
2. **Switch → Record 模式**: 最常见的简化模式，适用于所有枚举映射场景
3. **Guard clauses vs && 链**: 长条件链的可读性问题在 TypeScript 中尤其突出，因为每个条件可能跨多行
4. **死导出检测**: `grep -r` 确认未使用的 export 是最有价值的简化 — 减少公共 API 表面
