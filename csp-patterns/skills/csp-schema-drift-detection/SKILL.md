---
name: csp-schema-drift-detection
description: "Detect schema drift between migration claims and actual database state. Catches the 'alembic current==head but column missing' pattern — when migration tools say schema is applied but physical columns differ. Use whenever DB schema changes are made, before release, or when 500 errors suggest missing columns."
version: "1.0.0"
layer: 3
category: patterns
phase: verify
domain: quality
scope: testing
role: specialist
tools: [Read, Bash, Glob, Grep]
triggers:
  - "schema drift"
  - "migration drift"
  - "列不存在"
  - "column does not exist"
  - "migration says applied but"
  - "alembic head says OK"
  - "DDL 未执行"
related_skills: [csp-db-migration, csp-db-migration-testing, csp-postgres-patterns]
anti_rationalizations:
  "alembic current==head 所以没问题": "迁移工具只说 stamp 存在——不代表 DDL 真的执行了。已 applied 的迁移中插入增量列是最常见的漂移根因。"
  "之前能跑现在也能跑": "回溯补交的迁移插入已 applied 链 = 新库有列、旧库没有 = 漂移。迁移链完整性 ≠ 物理 schema 一致性。"
---

# Schema Drift Detection

> 迁移工具声称的 schema ≠ 数据库物理 schema。检测"alembic current==head 但列不存在"的模式——这是 500 错误的头号根因。

## When to Run

- 任何 `ALTER TABLE` / `ADD COLUMN` 变更后
- 发布前（06 gate）
- 出现 `column ... does not exist` 500 错误时
- 迁移链出现回溯插入（往已 applied 的 migration 中间插入新 migration）之后

## Detection Method

### Step 1: 从 ORM 模型提取声明列

```python
# SQLAlchemy 示例
from app.models import Base
for table in Base.metadata.sorted_tables:
    for col in table.columns:
        print(f"{table.name}.{col.name} {col.type}")
```

### Step 2: 从 information_schema 提取物理列

```sql
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

### Step 3: Diff

对每个 ORM 声明的 `table.column`，检查物理 schema 是否存在：
- 物理不存在 → **DRIFT**：列未创建。检查迁移链中间是否被回溯插入
- 类型不匹配 → **DRIFT**：类型漂移。检查是否有未 applied 的 migration 改了此列
- 物理有多余列 → **DRIFT**：废弃列未清理（可能是以前 DROP COLUMN 的 migration 在某些库上没跑）

### Step 4: 迁移链完整性检查

```bash
# 列出已 applied 的 migration（按 applied 时间排序）
alembic history --verbose 2>/dev/null || echo "不是 Alembic 项目"

# 检查迁移链中是否有插入操作
git log --oneline -- migrations/versions/
```

**回溯插入检测**：如果 git log 显示新 migration 的 commit date 晚于已有 migration，但文件名序号落在已 applied 范围 → **高危**：新 migration 不会被 applied（alembic 认为它已经在链中）。

## Severity

| 发现 | 严重度 | 处置 |
|------|--------|------|
| 物理列缺失（ORM 声明了但 DB 没有） | CRITICAL | **阻断**：创建独立 migration 补列，不编辑已 applied 的 migration |
| 已 applied 链中存在回溯插入 | CRITICAL | 删除插入文件，创建新 migration（序号在链尾） |
| 类型不匹配 | HIGH | 检查迁移顺序和未 applied migration |
| 物理多余列 | MEDIUM | 记录技术债，后续版本清理 |

## Execution Constraints

- 必须连接真实数据库运行——不能用 ORM metadata 模拟
- 项目无数据库时标注 N/A
- 报告附实际执行的 SQL 查询和结果行数