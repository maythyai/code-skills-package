# CSP Full 独立开发者模式

## 设计理念

独立开发者模式（Solo Mode）为 solo founder / 独立开发者优化，核心原则：

1. **减少 overhead** — 跳过不必要的文档和审批
2. **最大化自动化** — 尽可能由 AI 完成所有工作
3. **快速迭代** — 缩短从想法到交付的时间
4. **实用主义** — 关注交付价值而非流程完美

## 精简阶段

相比企业模式，Solo 模式对各阶段进行精简：

| 阶段 | 企业模式 | Solo 模式 | 精简内容 |
|------|---------|----------|---------|
| P0 需求澄清 | PM 访谈 + 利益相关者对齐 | 自助澄清 或 brainstorming | 跳过利益相关者环节 |
| P1 产品定义 | 完整 PRD + 多角色审批 | 精简 PRD（用户故事 + 验收标准） | 跳过审批门控 |
| P2 技术设计 | 架构设计 + 威胁建模 + 评审 | 轻量设计 + ADR | 威胁建模仅在涉及敏感数据时 |
| P3 规划 | 任务分解 + 依赖分析 + 优先级 | 任务列表 + 简单依赖 | 跳过详细依赖分析 |
| P4 执行 | 多 subagent + 独立 PR | 直接实现 | 跳过 PR 流程 |
| P5 QA | 完整测试套件 + 合规检查 | 核心功能测试 | 跳过合规检查 |
| P6 审查 | 4+ 角色审查 + PRD 对齐 | 代码审查 + 安全扫描 | 跳过架构审查和利益相关者演示 |
| P7 发布 | 发布审批 + 完整文档 | 直接部署 + 简要文档 | 跳过发布审批 |
| P8 运维 | 仪表板 + 告警 + Runbook | 基础健康检查 | 简化监控 |

## 快速通道

Solo 模式下支持的快速通道：

### Fast Track: Bug Fix
```
输入: "fix [bug description]"
流程: 诊断 → 修复 → 测试 → 提交
跳过: P0, P1, P2, P3, P7, P8
```

### Fast Track: Small Feature
```
输入: "add [feature] to [existing project]"
流程: 轻量设计 → 实现 → 测试 → 提交
跳过: P0, P1(完整), P2(完整)
```

### Fast Track: Refactor
```
输入: "refactor [component]"
流程: 影响分析 → 重构 → 测试 → 提交
跳过: P0, P1, P7, P8
```

## Solo 开发者心理模型

独立开发者有以下特点，工作流需要适配：

1. **时间稀缺** — 每天可用时间有限，需要最大化 AI 产出
2. **上下文切换成本高** — 希望一次交付完整功能
3. **技术栈熟悉度不一** — 可能需要 AI 帮助不熟悉的技术栈
4. **测试容易偷懒** — 需要 AI 主动推动测试
5. **文档容易忽略** — 需要 AI 自动生成必要文档
6. **部署焦虑** — 上线是最大的心理压力，需要 AI 辅助

## Solo 模式下的 AI 行为

### 主动推动
- 用户没写测试 → AI 主动添加
- 用户没写文档 → AI 自动生成
- 用户没考虑安全 → AI 主动扫描

### 减少决策疲劳
- 技术选型提供默认推荐而非多个选项
- 文件命名和目录结构遵循约定而非询问
- PRD 自动生成初稿而非从头开始

### 解释但不过度
- 解释 WHY（帮助用户学习）
- 但不过度解释 WHAT（用户能看懂代码）
- 给出选项但不强迫选择

## 推荐技术栈（默认）

当用户没有指定技术栈时，推荐：

| 应用类型 | 推荐技术栈 | 理由 |
|---------|-----------|------|
| Web 前端 | Next.js + TypeScript + Tailwind | 全栈能力，生态好 |
| Web 后端 | FastAPI (Python) / Express (TypeScript) | 快速开发 |
| 移动端 | Flutter | 跨平台，单一代码库 |
| CLI 工具 | Go / Rust | 单二进制，性能好 |
| 全栈 MVP | Next.js + SQLite + Vercel | 最快上线 |
| SaaS | Next.js + PostgreSQL + Stripe | 标准 SaaS 栈 |

## 成本优化

Solo 模式下，模型选择策略：

| 阶段 | 模型 | 理由 |
|------|------|------|
| P0 | Haiku | 简单对话即可 |
| P1 | Sonnet | PRD 需要质量但不需要 Opus |
| P2 | Sonnet | 架构设计对 solo 项目不太复杂 |
| P3 | Haiku | 任务分解是机械性工作 |
| P4 | 按任务复杂度 | 简单任务用 Haiku 省成本 |
| P5 | Sonnet | 需要理解错误 |
| P6 | Sonnet | 审查需要质量 |
| P7 | Haiku | 部署是机械性工作 |
| P8 | Sonnet | 需要推理 |

## Solo 模式配置文件

`.csp/full-config.yaml`:

```yaml
csp-full:
  mode: solo
  fast-track: auto-detect  # 自动检测是否可用快速通道
  skip-gates: true         # 跳过所有审批门控
  auto-test: true          # 自动编写测试
  auto-docs: true          # 自动生成文档
  auto-security-scan: true # 自动安全扫描
  recommend-defaults: true # 推荐默认技术选型
  cost-optimize: true      # 成本优化模式
  default-stack: auto-detect # 根据应用类型选择默认技术栈
```
