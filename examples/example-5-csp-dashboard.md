# Example 5: CSP Dashboard — 项目可视化展示

> 使用 CSP 技能包分析项目结构，构建一个自包含的可视化仪表板。

---

## 使用的 Skill

- **Skill**: `csp-code-architect` (架构设计)
- **Skill**: `csp-code-reviewer` (代码质量验证)
- **类型**: 全栈项目开发 — 数据分析 → 架构设计 → 前端实现

## 项目说明

- **输出**: `docs/csp-page/index.html` — 单文件静态 HTML 仪表板
- **大小**: 69KB (包含 173 个技能的完整数据)
- **依赖**: 零外部依赖，直接浏览器打开即可运行
- **主题**: 暗色主题，五层配色系统

## 可视化内容

### 1. 五层架构堆叠图
垂直展示 L0→L4 五层结构，每层显示名称、描述、技能数量，点击可跳转到对应技能组。

| 层级 | 名称 | 数量 | 颜色 |
|------|------|------|------|
| L0 | Router | 1 | #ef4444 红 |
| L1 | Meta | 21 | #3b82f6 蓝 |
| L2 | Workflow | 9 | #22c55e 绿 |
| L3 | Patterns | 105 | #a855f7 紫 |
| L4 | Runtime | 37 | #f97316 橙 |

### 2. 统计卡片
- Total Skills: **173**
- Agents / Reviewers: **16**
- Workflows: **9**
- Runtime Skills: **37**

### 3. 技能来源分布 (Donut Chart)
- csp-native: 154 (89%)
- merged: 8 (5%)
- agent-skills: 10 (6%)
- community: 1

### 4. 类别占比 (Stacked Bar)
- patterns: 99 | meta: 22 | workflow: 19 | agent: 16 | runtime: 16 | router: 1

### 5. 技能浏览器
- 搜索框 — 按名称/描述搜索
- Layer 过滤 — 按 L0-L4 筛选
- 分组展开 — 每层技能可折叠展开
- 每个技能卡片显示名称、描述、层级标签、来源标签

### 6. 数据流架构图
SVG 动画展示: User Input → L0 → L1 → L2 → L3 → L4 → Output

## 提示词

```
Design and build a self-contained static HTML/CSS/JS dashboard
that visualizes the CSP (Code Skills Package) project structure
and metadata.

Must be completely self-contained — single HTML file with
embedded CSS/JS, no external dependencies.
Must work by simply opening the HTML file in a browser.
```

## 构建流程

1. **数据提取**: 扫描全部 SKILL.md 文件，提取 name/description/origin/category
2. **数据规范化**: 统一层级编号、来源分类、类别推断
3. **架构设计**: 使用 code-architect 设计组件分解
4. **HTML 生成**: 单文件内嵌 CSS/JS/Data
5. **数据注入**: Python 脚本将 173 条技能数据注入 HTML
6. **质量修复**: 修正异常类别名、补全 agent 分类
7. **验证**: 结构检查 + 数据完整性验证

## 技术特点

| 特性 | 实现方式 |
|------|---------|
| 图表 | 手写 SVG (donut chart + architecture diagram) |
| 动画 | CSS animations + SVG animate 元素 |
| 搜索 | Vanilla JS 实时过滤 |
| 响应式 | CSS Grid + media queries |
| 配色 | CSS custom properties (五层主题色) |
| 数据 | JSON 内嵌于 JavaScript const |
