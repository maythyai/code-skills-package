# Spec 生成示例：完整 Feature Spec

以下是一个中等复杂度 Feature 的完整 Spec 示例，展示 8 个维度的输出标准。

---

# SPEC-F-B-1: 文档编辑器

## 概述
| 属性 | 值 |
|------|-----|
| Feature ID | F-B-1 |
| 域 | 文档管理 |
| 优先级 | P0 |
| 复杂度 | L |
| 依赖 | F-A-1 (用户认证), F-A-3 (权限控制) |

## 1. UI/UX Specification

### 页面清单
| 页面 | 路由 | 布局 | 权限 |
|------|------|------|------|
| 文档编辑 | /docs/:id/edit | EditorLayout | editor+ |
| 文档预览 | /docs/:id | DocLayout | viewer+ |

### 组件树
```
EditorPage
├── EditorToolbar
│   ├── FormatButtons (bold/italic/heading/list)
│   ├── InsertMenu (image/table/code/embed)
│   ├── CollaboratorAvatars (在线协作者)
│   └── SaveStatus (saved/saving/unsaved)
├── EditorCanvas
│   ├── BlockRenderer (paragraph/heading/list/code/image)
│   ├── SlashCommandMenu (/ 触发的插入菜单)
│   └── SelectionToolbar (选中文字时的浮动工具栏)
├── SidePanel (可折叠)
│   ├── OutlineTab (文档大纲)
│   ├── CommentsTab (评论列表)
│   └── HistoryTab (版本历史)
└── ShareDialog (分享设置弹窗)
```

### 交互规格
| 交互 | 触发 | 行为 | 反馈 |
|------|------|------|------|
| 自动保存 | 停止输入 2s | PATCH 文档内容 | 状态栏显示"已保存" |
| 协作编辑 | 他人修改 | WebSocket 推送 → 增量更新 | 显示他人光标+头像 |
| 斜杠命令 | 输入 "/" | 弹出命令菜单 | 模糊搜索过滤 |
| 版本恢复 | 点击历史版本→恢复 | 确认弹窗→覆盖当前 | Toast + 新版本记录 |

### 状态设计
| 状态 | UI 表现 |
|------|---------|
| 加载中 | 编辑器骨架屏 + 工具栏 disabled |
| 编辑中 | 正常编辑 + 实时保存指示 |
| 离线 | 顶部黄色横幅"离线编辑中，恢复后自动同步" |
| 冲突 | 弹窗"他人已修改，是否覆盖/合并/查看差异" |
| 只读 | 工具栏隐藏 + 背景微灰 + "只读"标签 |

## 2. Database Schema

### 表定义

```sql
CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(500) NOT NULL DEFAULT 'Untitled',
    content         JSONB NOT NULL DEFAULT '{"blocks":[]}',  -- 结构化内容
    content_text    TEXT GENERATED ALWAYS AS (jsonb_to_text(content)) STORED,  -- 纯文本(搜索用)
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','published','archived')),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id),
    folder_id       UUID REFERENCES folders(id) ON DELETE SET NULL,
    created_by      UUID NOT NULL REFERENCES users(id),
    last_edited_by  UUID REFERENCES users(id),
    last_edited_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    version         INTEGER NOT NULL DEFAULT 1,
    word_count      INTEGER NOT NULL DEFAULT 0,
    metadata        JSONB DEFAULT '{}'
);

CREATE TABLE document_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version         INTEGER NOT NULL,
    content         JSONB NOT NULL,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_summary  VARCHAR(200),
    UNIQUE(document_id, version)
);

-- 索引
CREATE INDEX idx_docs_workspace ON documents(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_docs_folder ON documents(folder_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_docs_status ON documents(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_docs_edited ON documents(last_edited_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_docs_search ON documents USING GIN(to_tsvector('english', content_text));
```

## 3. API Contract

| Method | Path | 描述 |
|--------|------|------|
| GET | /api/v1/docs/:id | 获取文档内容 |
| PATCH | /api/v1/docs/:id | 更新文档(增量) |
| POST | /api/v1/docs/:id/versions | 创建版本快照 |
| GET | /api/v1/docs/:id/versions | 版本历史列表 |
| POST | /api/v1/docs/:id/versions/:v/restore | 恢复版本 |
| WebSocket | /ws/docs/:id | 实时协作通道 |

### PATCH /api/v1/docs/:id
```yaml
requestBody:
  content:
    application/json:
      schema:
        type: object
        properties:
          title: { type: string, maxLength: 500 }
          operations:  # 增量操作 (类 OT/CRDT)
            type: array
            items:
              type: object
              properties:
                type: { enum: [insert, delete, replace, move] }
                path: { type: string }  # JSONPath
                value: {}
          base_version: { type: integer }  # 乐观锁
responses:
  200:
    schema:
      properties:
        version: { type: integer }
        saved_at: { type: string, format: date-time }
  409:  # 版本冲突
    schema:
      properties:
        error: { type: string, example: "VERSION_CONFLICT" }
        current_version: { type: integer }
```

## 4. Backend Architecture

### 模块结构
```
src/documents/
├── router.py           # REST + WebSocket 路由
├── service.py          # 文档业务逻辑
├── collaboration.py    # 实时协作 (WebSocket manager)
├── versioning.py       # 版本管理
├── repository.py       # 数据访问
├── schemas.py          # Pydantic models
├── models.py           # SQLAlchemy models
└── tests/
```

### 关键逻辑
- 自动保存: debounce → 增量 PATCH → 更新 version
- 冲突处理: 乐观锁 (base_version 对比)，冲突时返回 409
- 版本快照: 每 50 次操作或手动触发时创建 version 记录
- 协作: WebSocket 广播 operations 给同文档其他编辑者

## 5. Frontend Architecture

### 状态管理
| 状态 | 方案 |
|------|------|
| 文档内容 | 自定义 Editor State (基于 Block 模型) |
| 协作状态 | WebSocket + 本地 operation buffer |
| UI 状态 | Zustand (面板开关、工具栏状态) |
| 服务端数据 | React Query (文档元数据、版本列表) |

### 关键实现
- 编辑器: TipTap (ProseMirror) 或 BlockNote
- 协作: Yjs (CRDT) + WebSocket provider
- 自动保存: useDebounce + mutation

## 6. Infrastructure

| 服务 | 用途 |
|------|------|
| PostgreSQL | 文档存储 |
| Redis | WebSocket pub/sub (多实例协作广播) |
| S3/MinIO | 文档中嵌入的图片/文件 |

## 7. Testing Strategy

| 场景 | 类型 | 断言 |
|------|------|------|
| 创建文档 | 集成 | 201 + 默认内容结构 |
| 并发编辑冲突 | 集成 | 409 + 当前版本号 |
| 版本恢复 | 集成 | 内容回滚 + 新版本号 |
| 自动保存 | E2E | 编辑后 2s 状态变为"已保存" |
| 协作同步 | E2E | A 编辑 → B 实时看到变化 |

## 8. Security

- 文档访问权限: workspace 级 RBAC (owner/editor/viewer)
- WebSocket 认证: 连接时验证 JWT
- 内容校验: 防止 XSS (sanitize HTML blocks)
- 版本隔离: 用户只能恢复自己有编辑权限的版本
