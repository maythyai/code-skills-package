# 跨 skill 调用 fallback 四步流程（MR 套件共用）

MR 子 skill（depth-research / deliverable / signal-scan）在执行中需要调用 csp-strategy、csp-paper-reader、csp-research-report-writing 等其他 skill 时，按以下四步走。

核心原则：agent 主导所有技术动作，用户只做一次二选一决策（装/不装）。

## 步骤 1：存在性检查

用 Glob 检查 `<csp-skills-dir>/<target-skill>/SKILL.md` 是否存在。

- 存在 → 进入步骤 2（完整模式）
- 不存在 → 进入步骤 3（自动安装提议）

## 步骤 2：完整模式调用

按目标 skill 的 SKILL.md 描述的流程调用对应 references 文件，**显式告知用户当前进入"完整模式"，并说明调用了哪个 skill 的哪份方法论文件**。

## 步骤 3：自动定位安装来源 + 一次性征得用户同意

agent 自主完成以下动作，不得将技术动作抛给用户：

1. **查内置已知 skill 来源清单**（下表）
2. 清单未命中 → 用 WebSearch 检索 `"<target-skill>" skill github`、`"<target-skill>" claude skill github` 等关键词组合，定位官方/高 star 仓库
3. 找到来源后，向用户一次性报告并征得同意，格式：
   > 检测到本任务可调用 `<target-skill>` skill 增强分析质量。它能提供的能力：<一句话说明>。安装来源已定位：`<git URL>`。安装后占用空间约 <估计>。**是否同意安装？（是 / 否）**
4. 用户同意 → agent 自己执行 `git clone <URL> <csp-skills-dir>/<target-skill>` → 验证 SKILL.md 可读 → 验证通过后回到步骤 2（完整模式）
5. 用户拒绝 / agent 定位不到可信来源 / 安装执行失败（网络、权限、仓库不存在等）→ 进入步骤 4（降级模式）。失败原因必须向用户明说。

**禁止以下动作抛给用户**：

- 让用户提供 git clone URL
- 让用户手工跑 git 命令
- 让用户选择安装路径
- 让用户配环境变量

## 步骤 4：降级模式

- **显式告知用户当前进入"降级模式"并说明降级损失了哪些能力**（如"缺 csp-strategy 时无法调用 due-diligence variant 模板，将用 depth-research L4 内置的 20 维模板"）
- fallback 到本 skill 自带的内联方法论，按本 skill 的原本流程继续执行

## 硬约束

- 禁止默默跳过 skill 调用而不告知用户
- 禁止悄悄降级而不说明损失
- 禁止让用户做本应 agent 做的技术动作（提供 URL / 跑命令 / 选路径 / 配环变）
- 禁止用模糊措辞掩盖状态（如"已尝试相关分析"这种含糊表达）

## 内置已知 skill 来源清单

| skill | 安装来源 | 一句话能力 |
|---|---|---|
| csp-strategy | 待填（agent 首轮 WebSearch 定位官方 git URL 后写回本表） | 42 个咨询框架（MECE / Issue Tree / Hypothesis Tree / Pyramid / SCQA 等） |
| csp-paper-reader | 待填（agent 首轮 WebSearch 定位并验证） | 10+ 思维模型（批判性思维 / 六顶帽 / 系统思维 / 逆向思维 / SCQA 等） |
| csp-research-report-writing | 待填（agent 首轮 WebSearch 定位并验证） | 高管可读的一页摘要（headline + key findings + actions） |

本表是实践记录表：首轮 WebSearch 定位同意后，agent 应该主动将验证过的来源写入本表，后续调用不再重复搜索。表中来源一旦发现伪误或失效（git URL 404），应重新 WebSearch 并更新本表。
