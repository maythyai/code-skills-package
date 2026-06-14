# Skill Optimization Decision Matrix

## Classification Guide

When analyzing a user feedback signal, classify it using this matrix:

### Signal → Gap Type Mapping

| User Signal Pattern | Gap Type | Example |
|---------------------|----------|---------|
| "这个 skill 没有处理 X" | missing_rule | 用户说 "skill 没有处理权限验证" |
| "应该用 X 方式做" | missing_context | 用户说 "应该先检查 git 状态" |
| "不要这样做" | missing_rule | 用户说 "不要自动 commit" |
| "这样对了/keep doing" | user_preference | 用户说 "这样组织很好" |
| "skill 漏掉了 X" | missing_trigger | 用户说 "review 应该检查安全" |
| "这个 skill 太啰嗦" | token_bloat | 用户说 "加载太慢" |
| "X 和 Y 功能重复" | overlap | 用户说 "两个 skill 做一样的事" |
| "项目里应该用 X 规范" | project_context | 用户说 "我们项目用这种命名" |

### Risk Assessment

| Risk Level | Change Type | Approval Required |
|------------|-------------|-------------------|
| **Low** | Trigger refinement (description only) | Auto-apply |
| **Low** | Token compression (no behavior change) | Auto-apply |
| **Medium** | Rule addition (additive) | Present for approval |
| **Medium** | Context injection (project-specific) | Present for approval |
| **High** | Rule modification (changes behavior) | Present for approval |
| **High** | Skill split/merge (structural) | Present for approval |

## Optimization Patterns

### Pattern 1: Closing a Rationalization Loophole

**Detected:** Agent followed the letter of a rule but violated its spirit.

**Fix template:**
```markdown
## No Exceptions

Even if [loophole the agent exploited]:
- Don't [specific action]
- Don't [specific action]
- [Rule name] means [clear definition]
```

### Pattern 2: Adding Missing Trigger Coverage

**Detected:** User phrased a request in a way no skill matched.

**Fix template:**
```yaml
# In skill frontmatter description:
description: Use when [existing triggers] or [new trigger phrasing user used]
```

### Pattern 3: Capturing User Preference

**Detected:** User approved a specific approach that should become the default.

**Fix template:**
```markdown
## Preferred Approach

When [condition], prefer [approved approach] because [user's reason].
This has been validated by the user and should be the default behavior.
```

### Pattern 4: Project-Specific Convention

**Detected:** Project uses a pattern that generic skills don't account for.

**Decision:**
- If convention is universal (any project could benefit) → add to skill
- If convention is project-specific → add to project CLAUDE.md, NOT skill

### Pattern 5: Merging Overlapping Skills

**Detected:** Two skills cover the same territory with >60% trigger overlap.

**Fix:**
1. Identify the more comprehensive skill
2. Merge unique rules from the smaller skill
3. Update the merged skill's description to cover both trigger sets
4. Delete the smaller skill (or mark as deprecated with cross-reference)

### Pattern 6: Splitting Bloated Skills

**Detected:** Skill >2000 words, covers multiple distinct topics.

**Fix:**
1. Identify natural boundaries in the content
2. Extract into 2-3 focused skills
3. Each new skill gets its own SKILL.md with focused description
4. Original skill becomes a cross-reference hub

## Validation Protocol

Before applying any optimization:

1. **Reproduce the failure**: Can you trigger the same problem without the fix?
2. **Apply the fix**: Make the targeted change
3. **Re-test the scenario**: Does the fix prevent the failure?
4. **Regression check**: Does the change break any other expected behavior?

For discipline-enforcing skills, test with a pressure scenario:
- Add time pressure: "urgent, quick fix"
- Add sunk cost: "I've already tried 3 things"
- Add authority pressure: "the lead developer said to do it this way"

If the agent still violates the rule under pressure, the fix is insufficient.
