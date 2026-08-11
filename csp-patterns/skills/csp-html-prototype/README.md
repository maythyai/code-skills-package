# HTML Prototype Generator

快速生成可交互的 HTML 原型图 Skill。

## 快速开始

在 Qoder 对话中输入 `/html-prototype`，或直接描述原型需求触发。

### 最简用法
```
/html-prototype
移动端登录页：账号密码输入框 + 登录按钮
```

### 完整参数
```
/html-prototype mobile high #1677FF

页面描述...
```

参数说明：
- 第1个参数：设备类型 `mobile`(默认) / `desktop` / `tablet`
- 第2个参数：保真度 `high`(默认) / `low`
- 第3个参数：主题色 如 `#1677FF`(默认) / `#ff6b6b`

## 使用示例

### 示例 1：高保真移动端
```
/html-prototype mobile high

骑士救助申请页：
1. 用户信息卡片：头像 + 姓名 + 账号
2. 申请流程进度条：骑士申报 → 平台审核 → 资金发放
3. 项目列表：疾病救助、助学计划并列卡片，各有"立即申请"按钮
```

### 示例 2：低保真线框图
```
/html-prototype mobile low

后台管理 Dashboard：
1. 顶部统计卡片：总申请数、审核中、已通过、已拒绝
2. 数据表格：申请记录列表，含申请人、项目、状态、时间
3. 侧边筛选：按项目类型和状态筛选
```

### 示例 3：桌面端页面
```
/html-prototype desktop high

组织入驻页面：
1. 左侧步骤导航：基本信息 → 资质上传 → 审核确认
2. 右侧表单区：根据当前步骤展示对应表单
3. 底部操作栏：上一步 / 下一步 / 提交
```

## 迭代修改

生成后可以直接用自然语言迭代：
- "把疾病救助和助学计划改成上下排列"
- "顶部加一个返回按钮"
- "主题色改成红色"
- "生成低保真版本"
- "加一个空数据状态"

Skill 会在现有文件基础上修改，不会重新生成。

## 输出位置

生成的 HTML 文件保存在：
```
.qoder/skills/html-prototype/outputs/prototype-{name}.html
```

可直接在浏览器中打开预览。

## 目录结构

```
html-prototype/
├── SKILL.md                         # Skill 主配置（核心）
├── README.md                        # 本文件（用户手册）
├── references/
│   ├── html-boilerplate.md          # HTML 基础模板（高保真/低保真/各设备）
│   └── components.md                # UI 组件参考库（导航/卡片/表单/状态等）
└── outputs/
    ├── .gitignore                   # 忽略生成的 HTML 文件
    └── prototype-*.html             # 生成的原型文件（不纳入 git）
```

## 持续优化指南

### 添加新组件
编辑 `references/components.md`，按分类追加 HTML 代码片段。

### 调整默认样式
编辑 `references/html-boilerplate.md` 中的 CSS 变量。

### 修改生成规则
编辑 `SKILL.md` 中的执行流程和质量校验规则。

### 支持新设备/风格
在 `references/html-boilerplate.md` 中添加新的模板变体。
