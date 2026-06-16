# Context Compression Protocol

> CSP 上下文压缩机制，减少阶段交接时的 token 消耗。

## 概述

在阶段交接时（如 design → build），Agent 通常需要重新阅读大量上下文文档。Context Compression 通过生成结构化的 handoff 包，减少 25-30% 的输入 token。

## 两种模式

| 模式 | 行为 | 适用场景 |
|------|------|---------|
| `off` | 不压缩，完整传递上下文 | Spec 较小、需要完整上下文 |
| `beta` | 压缩，仅传递 Design Doc + hash 引用 | Spec 较大、关注 token 效率 |

## 配置

在 `.csp/workflow-state.yaml` 中设置：

```yaml
config:
  context_compression: off  # 或 beta
```

## 使用方法

### 生成 handoff 包

```bash
# 压缩模式（根据 config.context_compression）
./shared/scripts/csp-handoff.sh design build --write

# 强制完整模式
./shared/scripts/csp-handoff.sh design build --full
```

### 产物

```
.csp/handoff/design-to-build-context.json  # 机器索引（change, phase, paths, hash）
.csp/handoff/design-to-build-context.md    # 人类可读摘要
```

### JSON 结构

```json
{
  "change": "feature-name",
  "from_phase": "design",
  "to_phase": "build",
  "timestamp": "2026-06-16T10:30:00Z",
  "compression": "beta",
  "files": {
    "design_doc": "docs/specs/feature-design.md",
    "plan": "docs/plans/feature-plan.md",
    "spec": "docs/specs/feature-spec.md"
  },
  "source_paths": [
    {"path": "docs/specs/feature-design.md", "sha256": "abc123..."},
    {"path": "docs/specs/feature-spec.md", "sha256": "def456...", "mode": "hash-ref"}
  ]
}
```

## 工作原理

### Off 模式

```
Design 阶段                          Build 阶段
┌──────────────┐                    ┌──────────────┐
│ 读取 Spec    │                    │ 读取 handoff │
│ 产出 Design  │  handoff.sh        │ 实现代码     │
│              │ ───────────────►   │              │
└──────────────┘   完整摘录         └──────────────┘
```

### Beta 模式

```
Design 阶段                          Build 阶段
┌──────────────┐                    ┌──────────────┐
│ 读取 Spec    │                    │ 读取 handoff │
│ 产出 Design  │  handoff.sh        │ 实现代码     │
│ 记录覆盖率   │ ───────────────►   │              │
└──────────────┘   hash 引用        └──────────────┘
```

Beta 模式下：
- Design Doc 完整传递
- Spec 内容仅保留 SHA256 hash 引用
- Build 阶段可通过 hash 追溯到原始 Spec
- 减少 25-30% 输入 token

## 与 Comet 的差异

| 特性 | Comet | CSP |
|------|-------|-----|
| 配置位置 | `.comet/config.yaml` | `.csp/workflow-state.yaml` |
| 产物路径 | `openspec/changes/<name>/.comet/handoff/` | `.csp/handoff/` |
| 脚本 | `comet-handoff.sh` | `csp-handoff.sh` |
| 依赖 | OpenSpec delta spec | CSP 原生 spec |

## 最佳实践

1. **小 Spec (< 20 需求)**: 使用 `off` 模式，完整上下文更高效
2. **大 Spec (> 40 需求)**: 使用 `beta` 模式，减少 token 消耗
3. **调试场景**: 使用 `--full` 强制完整模式，确保不丢失上下文
