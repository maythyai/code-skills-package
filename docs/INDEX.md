# Documentation Index

> 最后更新: 2026-11-09

CSP 项目文档导航中枢。

## 分类

| 目录 | 内容 | 入口 |
|------|------|------|
| [architecture/](architecture/INDEX.md) | 架构设计、系统地图、衔接标准 | [ARCHITECTURE_zh.md](architecture/ARCHITECTURE_zh.md) |
| [guides/](guides/INDEX.md) | 安装、使用、更新、贡献、技能编写指南 | [USER-GUIDE.md](guides/USER-GUIDE.md) |
| [reference/](reference/INDEX.md) | 技能索引、技能规范、版本管理规则 | [SKILL-INDEX.md](reference/SKILL-INDEX.md) |
| [reports/](reports/INDEX.md) | 项目审查、功能矩阵、案例分析 | [FEATURES.md](reports/FEATURES.md) |
| [analysis/](analysis/INDEX.md) | 能力地图、对齐检查清单 | [skill-layer-capability-map.md](analysis/skill-layer-capability-map.md) |
| [archive/](archive/INDEX.md) | 历史版本文档快照 | — |

## 快速链接

- [安装指南](guides/INSTALL_zh.md)
- [架构设计](architecture/ARCHITECTURE_zh.md)
- [使用指南](guides/USER-GUIDE.md)
- [如何贡献](guides/SKILL-AUTHORING_zh.md)
- [技能规范](reference/SKILL-SPEC.md)
- [版本管理](reference/VERSIONING.md)

## 文档组织说明

本项目文档遵循三层模型：
1. **根目录** — README.md（门面）、CHANGELOG.md、LICENSE
2. **`docs/`** — 对外人类文档（本目录）
3. **`.csp/`** — 对内 Agent 产物库（人类不直接阅读）

详见 [README.md](README.md) 的三层关系说明。

## 文档更新纪律

- 代码变更涉及 API/架构/功能 → 同步更新对应文档（同 PR）
- 发布前 → CHANGELOG + VERSION-REGISTRY 必更新
- 季度 → 运行文档健康检查（见 `csp-documentation-governance`）