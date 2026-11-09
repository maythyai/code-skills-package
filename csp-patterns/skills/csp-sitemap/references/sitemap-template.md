# Sitemap — [项目名]

- **生成时间**：[ISO8601]
- **平台**：Web / Mobile / Multi
- **数据源**：[Brief + Stories / …]
- **页面总数**：N
- **最大深度**：M

## 主导航

- 🏠 [label] — [route]（[icon_hint]）
- 📋 [label] — [route]（[icon_hint]）
- ⚙️ [label] — [route]（[icon_hint]）

## 站点树

```
/
├── /new (新建周回顾) [auth]
│   ├── /new/welcome
│   ├── /new/questions
│   ├── /new/preview
│   └── /new/done
├── /board (看板) [auth]
│   ├── /board (this week)
│   ├── /board/history
│   └── /board/[id] (detail)
├── /settings [auth]
│   └── /settings/team
└── /auth [public]
```

## 页面清单

| ID | Route | Label | Purpose | Access | 关联 Story |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

## 关键 Flow

### [Flow 名称 1]
`/` → `/new/welcome` → `/new/questions` → `/new/preview` → `/new/done`

### [Flow 名称 2]
`/` → `/board` → `/board/[id]`

### [Flow 名称 3]
`/auth` → `/settings/team`
