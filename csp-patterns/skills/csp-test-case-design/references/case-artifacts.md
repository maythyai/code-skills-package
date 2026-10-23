# 用例落地：8 字段模板 / 表驱动代码 / AC 双向追溯

把设计好的用例变成可评审的文档、可执行的代码、可校验的追溯关系。

---

## 1. 用例模板（8 字段）

### 字段定义与硬要求

| # | 字段 | 硬要求 | 不合格示例 |
|---|---|---|---|
| 1 | **用例ID** | 格式 `TC-<模块>-<序号>`；只追加不复用；删除的 ID 保留占位并标 `DEPRECATED` | `1.`、`测试1`、`case_new`（自增行号，插入一条全体错位） |
| 2 | **标题** | 一句话："在什么条件下做什么，期望什么"；必须能看出用的是哪种设计技术 | `测试标题功能`、`边界值`（看不出测什么） |
| 3 | **前置条件** | 数据库状态 / 账号角色 / feature flag / 系统时间 / 已存在的数据；写不出前置 = 用例不可复现 | `无`（几乎所有用例都有前置，"无"通常意味着没想清楚） |
| 4 | **输入** | 精确值 + 类型 + 单位 + 编码。日期给绝对值或相对锚点（`today+365`），长度注明计量单位（码点/字节/UTF-16 unit） | `一个较长的字符串`、`明天的日期`（不可判定） |
| 5 | **步骤** | 有序、每步可独立执行、每步不含条件分支 | `如果校验通过则提交，否则修改`（这是两条流） |
| 6 | **预期结果** | 可观察断言：HTTP 状态码 + 业务错误码 + 返回字段值 + DB 行内容 + 界面精确文案 + 副作用（通知/日志/文件） | `显示正常`、`不报错`、`提交成功` |
| 7 | **优先级** | `P0` / `P1` / `P2`，判定标准见 `prioritization-and-review.md` | `高`、`★★★` |
| 8 | **关联AC** | ≥1 个 AC ID；无 AC 即孤儿用例，必须处置 | `TBD`、`-`、`通用测试` |

### 填好的样例（单条用例，Markdown）

| 字段 | 内容 |
|---|---|
| 用例ID | `TC-TITLE-B81` |
| 标题 | AC-01 边界值 off(max+1)：标题 81 码点时被拒绝并返回 `TITLE_TOO_LONG` |
| 前置条件 | ① 已登录普通成员账号 `member01`（无管理员角色）② feature flag `ticket_v2 = on` ③ 系统中不存在同名工单 ④ 服务器时区 `UTC+08:00` |
| 输入 | `POST /api/tickets`，body：`{"title": "<81 个 'a'>", "priority": "P2"}`；`title` 长度 = **81 Unicode 码点 / 81 字节 / 81 UTF-16 code unit**（三者一致，本条只测长度维度） |
| 步骤 | 1. 以 `member01` 身份调用 `POST /api/tickets`，body 如上<br>2. 记录响应状态码与响应体<br>3. 查询 DB：`SELECT COUNT(*) FROM tickets WHERE creator='member01'` |
| 预期结果 | ① HTTP `400`<br>② `error.code == "TITLE_TOO_LONG"`，`error.field == "title"`，`error.message` 含字面量 `"80"`<br>③ **不返回** `data.id`<br>④ DB 中 `tickets` 表**未新增行**（COUNT 与前置一致）<br>⑤ 附件表、审计表均无新增行（无孤立副作用） |
| 优先级 | P1 |
| 关联AC | AC-01 |

对照不合格写法：`输入 = 超长标题`、`预期 = 报错`、`前置 = 无`——这三处一旦含糊，用例在回归时就不可比对，等价于没有用例。

### 用例集文件模板

写到 `docs/analysis/test-cases-<feature>.md`，文件头必须包含元信息块：

```markdown
# 用例集：<feature 名>

| 项 | 值 |
|---|---|
| 需求文档 | `docs/<path>.md`（版本 / commit） |
| AC 总数 | 7 |
| 用例总数 | 96（P0 18 / P1 51 / P2 27） |
| 使用技术 | 等价类、边界值、判定表、状态迁移、因果图、Pairwise、场景法 |
| 追溯报告 | `docs/analysis/traceability-<feature>.md` |
| 裁剪记录 | `docs/analysis/case-pruning-<feature>.md`（本轮裁掉 12 条） |

## 列顺序（校验脚本依赖，禁止调整）
用例ID | 标题 | 前置条件 | 输入 | 步骤 | 预期结果 | 优先级 | 关联AC

## 1. 等价类用例
| 用例ID | 标题 | 前置条件 | 输入 | 步骤 | 预期结果 | 优先级 | 关联AC |
|---|---|---|---|---|---|---|---|
| TC-TITLE-V1 | ... | ... | ... | ... | ... | P1 | AC-01 |

## 2. 边界值用例
...
```

**列顺序固定为上述 8 列**——第 4 节的校验脚本按列号取"关联AC"（`awk -F'|'` 的 `$9`）。改列序会让校验静默失效。

### CSV 模板（用于导入测试管理平台）

```csv
case_id,title,precondition,input,steps,expected,priority,ac_ids,technique,layer,automated
TC-TITLE-B81,"AC-01 边界 off(max+1)：标题 81 码点被拒","已登录 member01；flag ticket_v2=on","POST /api/tickets {title:81xa, priority:P2}","1.调用接口 2.记录响应 3.查 DB","400 + TITLE_TOO_LONG + DB 无新增行",P1,AC-01,boundary,api,yes
```

多值单元格用 `;` 分隔（不是 `,`），避免与 CSV 分隔符冲突；`ac_ids` 多值时写 `AC-01;AC-03`。

---

## 2. 表驱动 / 参数化用例

### 铁律：数据与断言分离

| 放哪里 | 内容 |
|---|---|
| **数据表** | `case_id`、`ac`、输入、期望状态码、期望错误码、期望落库字段。全是**值**，没有函数 |
| **测试函数体（唯一一处）** | 取响应 → 断言状态码 → 断言错误码或断言落库字段。所有行共用同一段断言 |

**禁止**在表里塞 `lambda` / 闭包 / `assert` 片段。一旦塞了，加一行数据可能要改断言逻辑，表就失去了"可评审"和"可生成"两个核心属性。

如果某些行确实需要不同的断言路径，用**枚举字符串**表达（如 `want_code: "TITLE_TOO_LONG"`），在函数体里 `if/elif` 分派——分派逻辑仍然是统一的一处。

### Python / pytest 骨架

```python
# tests/ticket/test_create_ticket_cases.py
from typing import Any, NamedTuple

import pytest


class Case(NamedTuple):
    case_id: str                 # = 用例表的用例ID，追溯主键
    ac: str                      # = 用例表的关联AC；空串视为孤儿用例
    title: str
    payload: dict[str, Any]      # 输入
    want_status: int             # 期望 HTTP 状态码
    want_code: str | None        # 期望业务错误码；None = 期望成功
    want_stored: dict[str, Any]  # 期望落库字段（成功用例才填）


# ── 数据表：一行 = 一条用例 = 一个等价类 / 一个边界点 ────────────────
# 行由等价类表与边界矩阵推导，禁止凭记忆添加。
CREATE_CASES = [
    # 有效类（合并覆盖）
    Case("TC-TITLE-V1", "AC-01", "V-T1+V-P1+V-D1 全提供且有效",
         {"title": "服务器无法登录，报 502 " + "x" * 20, "priority": "P1", "due": "today+180"},
         201, None, {"priority": "P1"}),
    Case("TC-TITLE-V2", "AC-01", "V-T1+V-P2+V-D2 最小必填（走默认值）",
         {"title": "无法登录"},
         201, None, {"priority": "P2", "due_date": None}),
    # 无效类：标题维度，一类一条
    Case("TC-TITLE-E1", "AC-01", "E-T1 标题字段缺失",
         {"priority": "P1"}, 400, "TITLE_REQUIRED", {}),
    Case("TC-TITLE-E2", "AC-01", "E-T2 标题为空串",
         {"title": "", "priority": "P1"}, 400, "TITLE_REQUIRED", {}),
    Case("TC-TITLE-E3", "AC-01", "E-T3 标题全空白（trim 后为空）",
         {"title": "        ", "priority": "P1"}, 400, "TITLE_REQUIRED", {}),
    Case("TC-TITLE-E5", "AC-01", "E-T5 标题类型错（数字）",
         {"title": 12345, "priority": "P1"}, 400, "TITLE_TYPE_INVALID", {}),
    Case("TC-TITLE-E6", "AC-01", "E-T6 标题含控制字符 U+0000",
         {"title": "abc\u0000def", "priority": "P1"}, 400, "TITLE_INVALID_CHAR", {}),
    # 无效类：优先级维度
    Case("TC-PRIO-E2", "AC-02", "E-P2 优先级大小写不符 'p0'",
         {"title": "无法登录", "priority": "p0"}, 400, "PRIORITY_INVALID", {}),
    Case("TC-PRIO-E3", "AC-02", "E-P3 优先级枚举外取值 'P3'",
         {"title": "无法登录", "priority": "P3"}, 400, "PRIORITY_INVALID", {}),
    # 无效类：截止日期维度
    Case("TC-DUE-E3", "AC-03", "E-D3 日历上不存在的日期 2026-02-30",
         {"title": "无法登录", "due": "2026-02-30"}, 400, "DUE_DATE_INVALID", {}),
]


@pytest.mark.parametrize("case", CREATE_CASES, ids=[c.case_id for c in CREATE_CASES])
def test_create_ticket(case: Case, api_client, db):
    resp = api_client.post("/api/tickets", json=_resolve_dates(case.payload))

    # ── 断言：全部用例共用这一处，与数据表完全解耦 ───────────────
    assert resp.status_code == case.want_status, f"{case.case_id} 状态码不符"
    body = resp.json()

    if case.want_code is None:                       # 期望成功
        ticket_id = body["data"]["id"]
        row = db.fetch_ticket(ticket_id)
        for field, want in case.want_stored.items():
            assert row[field] == want, f"{case.case_id} 落库字段 {field} 不符"
    else:                                            # 期望失败
        assert body["error"]["code"] == case.want_code, f"{case.case_id} 错误码不符"
        assert not db.ticket_exists_for(case.payload), f"{case.case_id} 失败请求产生了脏数据"


# ── 元测试：保证数据表本身合格（这一条比任何业务用例都重要）───────────
def test_case_table_integrity():
    ids = [c.case_id for c in CREATE_CASES]
    assert len(ids) == len(set(ids)), "用例ID 重复"
    orphans = [c.case_id for c in CREATE_CASES if not c.ac]
    assert not orphans, f"孤儿用例（未关联 AC）: {orphans}"
    assert all(c.title for c in CREATE_CASES), "存在无标题用例"
```

`ids=[c.case_id ...]` 让失败输出直接是用例ID：

```
FAILED tests/ticket/test_create_ticket_cases.py::test_create_ticket[TC-TITLE-E3]
```

反查用例表 `TC-TITLE-E3` 即可定位到"E-T3 全空白串"这一等价类，不需要读代码。

### 边界值专用表（不要用循环生成行）

```python
# 边界矩阵直接映射成表：每一行的期望值必须显式写出，评审者要能逐行核对。
# 禁止写 `for n in range(0, 82): ...` —— 那会把 82 行全塞进去且期望值无法评审。
TITLE_BOUNDARY = [
    # case_id,        码点数, want_status, want_code
    ("TC-TITLE-B0",     0,    400, "TITLE_REQUIRED"),    # off(min)
    ("TC-TITLE-B1",     1,    201, None),                # on(min)
    ("TC-TITLE-B2",     2,    201, None),                # in(min+1)
    ("TC-TITLE-B40",   40,    201, None),                # typical
    ("TC-TITLE-B79",   79,    201, None),                # in(max-1)
    ("TC-TITLE-B80",   80,    201, None),                # on(max)
    ("TC-TITLE-B81",   81,    400, "TITLE_TOO_LONG"),    # off(max+1)
]


@pytest.mark.parametrize("case", TITLE_BOUNDARY, ids=[c[0] for c in TITLE_BOUNDARY])
def test_title_length_boundary(case, api_client, db):
    case_id, n, want_status, want_code = case
    resp = api_client.post("/api/tickets", json={"title": "a" * n})
    assert resp.status_code == want_status, f"{case_id} 状态码不符"
    if want_code:
        assert resp.json()["error"]["code"] == want_code, f"{case_id} 错误码不符"
        assert db.count_tickets() == 0, f"{case_id} 被拒请求写入了数据"
```

计量单位敏感的用例必须**显式构造**，不能靠 `"a" * n`：

```python
COUNTING_UNIT_CASES = [
    # case_id,            text,        want_status
    ("TC-TITLE-CP-01", "🙂" * 80,       201),  # 80 码点 / 160 字节 / 160 UTF-16 unit
    ("TC-TITLE-CP-02", "🙂" * 81,       400),  # 81 码点
    ("TC-TITLE-CP-03", "e\u0301" * 80,  None), # 160 码点 / 80 grapheme → 期望值取决于 AC-01 的计量口径，见下注
    ("TC-TITLE-CP-04", "中文标题" * 20,  201),  # 80 码点 / 240 字节
    ("TC-TITLE-CP-05", "中文标题" * 21,  400),  # 84 码点 / 252 字节
]


@pytest.mark.parametrize("case", COUNTING_UNIT_CASES, ids=[c[0] for c in COUNTING_UNIT_CASES])
def test_title_length_counting_unit(case, api_client):
    case_id, text, want_status = case
    if want_status is None:
        pytest.skip(f"{case_id}: AC-01 未定义计量口径（码点 vs grapheme），需求方确认前不执行")
    resp = api_client.post("/api/tickets", json={"title": text})
    assert resp.status_code == want_status, (
        f"{case_id}: codepoints={len(text)}, utf8_bytes={len(text.encode())}, "
        f"utf16_units={len(text.encode('utf-16-le'))//2} — 实现使用的计量单位与 AC-01 不一致"
    )
```

> `TC-TITLE-CP-03` 的期望值取决于 AC-01 到底按"码点"还是"用户感知字符（grapheme cluster）"计。`e\u0301` 是 2 码点 / 1 grapheme，80 个这样的序列 = 160 码点 / 80 grapheme。**这条用例的作用就是把需求歧义逼出来**：先填 `None` 让测试 skip 并打印歧义，在评审会上让需求方定死口径后再回填期望值。不要自己填一个。

### Go table-driven 骨架

```go
// internal/ticket/create_ticket_cases_test.go
func TestCreateTicket(t *testing.T) {
	tests := []struct {
		caseID      string         // = 用例表的用例ID
		ac          string         // = 用例表的关联AC
		name        string
		payload     CreateTicketReq
		wantStatus  int
		wantErrCode string         // "" = 期望成功
		wantStored  map[string]any
	}{
		{caseID: "TC-TITLE-V1", ac: "AC-01", name: "V-T1+V-P1+V-D1 全提供且有效",
			payload: CreateTicketReq{Title: strings.Repeat("a", 40), Priority: "P1"},
			wantStatus: 201, wantStored: map[string]any{"priority": "P1"}},

		{caseID: "TC-TITLE-E3", ac: "AC-01", name: "E-T3 标题全空白（trim 后为空）",
			payload: CreateTicketReq{Title: "        ", Priority: "P1"},
			wantStatus: 400, wantErrCode: "TITLE_REQUIRED"},

		{caseID: "TC-TITLE-B80", ac: "AC-01", name: "on(max) 标题 80 码点",
			payload: CreateTicketReq{Title: strings.Repeat("a", 80), Priority: "P2"},
			wantStatus: 201},

		{caseID: "TC-TITLE-B81", ac: "AC-01", name: "off(max+1) 标题 81 码点",
			payload: CreateTicketReq{Title: strings.Repeat("a", 81), Priority: "P2"},
			wantStatus: 400, wantErrCode: "TITLE_TOO_LONG"},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.caseID, func(t *testing.T) { // subtest 名 = 用例ID
			got, err := svc.CreateTicket(ctx, tt.payload)

			// ── 断言：唯一一处，与数据表解耦 ──────────────────
			if tt.wantErrCode != "" {
				requireBizError(t, err, tt.wantErrCode)
				requireNoTicketCreated(t, repo, tt.payload) // 失败请求不得产生脏数据
				return
			}
			requireNoError(t, err)
			requireStatus(t, got, tt.wantStatus)
			for field, want := range tt.wantStored {
				requireField(t, got, field, want)
			}
		})
	}
}

// 单跑一条用例：go test ./internal/ticket -run 'TestCreateTicket/TC-TITLE-B81' -v
```

Go 侧的等价约束：`t.Run(tt.caseID, ...)` 而不是 `t.Run(tt.name, ...)`——失败列表里出现的必须是用例ID。表里不出现 `func(t *testing.T)` 字段。

### 状态迁移的表驱动（三件套断言）

非法迁移用例的断言固定三条：**① 错误码 ② 状态不变 ③ 无副作用**。用"全字段快照对比"一次覆盖 ②③：

```python
ILLEGAL_TRANSITIONS = [
    # case_id,             from_state,    event,     want_status, want_code
    ("TC-ST-ILL-01",       "DRAFT",       "assign",  409, "INVALID_TRANSITION"),
    ("TC-ST-ILL-02",       "DRAFT",       "resolve", 409, "INVALID_TRANSITION"),
    ("TC-ST-ILL-03",       "OPEN",        "submit",  409, "INVALID_TRANSITION"),
    ("TC-ST-ILL-04",       "OPEN",        "edit",    403, "LOCKED_AFTER_SUBMIT"),
    ("TC-ST-ILL-05",       "IN_PROGRESS", "reopen",  409, "INVALID_TRANSITION"),
    ("TC-ST-ILL-06",       "RESOLVED",    "resolve", 409, "ALREADY_RESOLVED"),
    ("TC-ST-ILL-07",       "CLOSED",      "reopen",  409, "TERMINAL_STATE"),
    ("TC-ST-ILL-08",       "CLOSED",      "close",   409, "TERMINAL_STATE"),
    # ... 其余 18 条按同一模板批量补齐，总数 = 状态数 × 事件数 − 合法迁移数
]


@pytest.mark.parametrize("case", ILLEGAL_TRANSITIONS, ids=[c[0] for c in ILLEGAL_TRANSITIONS])
def test_illegal_transition_rejected(case, ticket_factory, api_client, db):
    case_id, state, event, want_status, want_code = case
    tid = ticket_factory(state=state)

    before = db.full_snapshot(tid)          # 工单全字段 + 关联表行数 + 审计行数
    resp = api_client.post(f"/api/tickets/{tid}/{event}", json={})

    assert resp.status_code == want_status, f"{case_id} 状态码不符"      # ①
    assert resp.json()["error"]["code"] == want_code, f"{case_id} 错误码不符"
    after = db.full_snapshot(tid)
    assert before == after, (                                              # ②③
        f"{case_id} 非法迁移产生了副作用: {_diff(before, after)}"
    )
```

`full_snapshot` 必须包含关联表（通知、审计、附件）的**行数与关键内容**，否则"状态没变但通知发了"这类缺陷会漏过。

---

## 3. AC 双向追溯矩阵

### 正向表（AC → 用例）

写到 `docs/analysis/traceability-<feature>.md`。

| AC ID | AC 摘要 | 覆盖用例（ID） | 使用技术 | 覆盖维度 | 测试层级 | 判定 |
|---|---|---|---|---|---|---|
| AC-01 | 标题必填，1–80 码点，trim 后校验 | TC-TITLE-V1/V2、TC-TITLE-E1..E6、TC-TITLE-B0/B1/B2/B40/B79/B80/B81、TC-TITLE-TRIM-01..03、TC-TITLE-CP-01..05 | 等价类 + 边界值 | 正常 / 边界 / 异常 | API | ✅ 充分（24 条） |
| AC-02 | 优先级枚举 + 未提供默认 P2 | TC-PRIO-V1/V2、TC-PRIO-E1..E4 | 等价类 | 正常 / 异常 | API | ✅（6 条） |
| AC-03 | 截止日期 ∈ `(today, today+365]` | TC-DUE-B*、TC-DUE-E1..E5 | 等价类 + 边界值 | 正常 / 边界 / 异常 | API | ⚠️ **缺跨时区用例**：`today` 在 UTC+08 与 UTC−05 下判定不同，补 TC-DUE-TZ-01/02 |
| AC-04 | 导出权限（管理员全字段 / 成员脱敏 / 其余拒绝 + 审计） | TC-EXP-01..04、TC-EXP-01a、TC-EXP-IMP-01..08 | 判定表 | 正常 / 异常 | API + DB | ✅（13 条） |
| AC-05 | 工单状态机 DRAFT→…→CLOSED + 14 天 reopen 窗口 | TC-ST-01..10、TC-ST-G1..G4、TC-ST-ILL-01..26、TC-ST-1S-01..13 | 状态迁移 | 正常 / 异常 / 并发 | API + DB | ⚠️ **缺并发迁移**：reopen 与 close 同时到达，补 TC-ST-CC-01/02 |
| AC-06 | 搜索违禁词拦截 + 访客登录引导 + 行为日志 | TC-SRCH-01..06、TC-SRCH-03a/b、TC-SRCH-04a/b | 因果图 + 判定表 | 正常 / 异常 | API | ✅（10 条） |
| **AC-07** | **重复提交幂等（同幂等键只产生一条工单）** | **（无）** | — | — | — | ❌ **未覆盖 AC** |

### 反向表（用例 → AC）

| 用例ID | 关联AC | 判定 |
|---|---|---|
| TC-TITLE-B81 | AC-01 | ✅ |
| TC-EXP-03 | AC-04 | ✅ |
| TC-ST-ILL-07 | AC-05 | ✅ |
| TC-FLOW-E2 | AC-07 | ✅（场景法产出的连点用例实际覆盖了 AC-07，但正向表漏登记 → **正向表本身有缺陷**） |
| **TC-EXPORT-XLS-01** | **（无）** | ❌ **孤儿用例** |

> 上面这行 `TC-FLOW-E2 → AC-07` 揭示了一个真实陷阱：**只查正向表会误判 AC-07 为"未覆盖"**。必须双向查——反向索引里能找到引用 AC-07 的用例时，问题是"正向表漏登记"而不是"没有用例"。两种缺陷的处置完全不同。

### 两类缺陷的判定与处置

| 缺陷 | 判定方法 | 处置 |
|---|---|---|
| **未覆盖 AC** | 正向表中某 AC 的"覆盖用例"列为空，**且**反向索引中也找不到任何用例引用该 AC ID | P0/P1 AC → **阻塞放行**。补用例，或由需求方书面降级该 AC（记录到裁剪记录）。<br>P2 AC → 可豁免，但必须在追溯报告里写明"AC-NN 本轮不测，风险 = …，补测计划 = …" |
| **维度不全的 AC** | 有用例，但只覆盖"正常"维度，缺边界/异常 | P0 AC → 阻塞；P1 → 记为待补，进入下一轮 |
| **孤儿用例** | 反向表中"关联AC"列为空 / `-` / `TBD` / `N/A` | 二选一，禁止直接留着：<br>① **删掉**（在测没人要的东西，白耗执行时间）<br>② **反向补 AC**（说明需求文档漏写了一条真实约束——这是需求缺陷，价值比用例本身大） |
| **正向表漏登记** | 反向索引能找到 AC 引用，正向表却为空 | 修正正向表；同时检查登记流程（通常是用例集与追溯表分开维护导致） |

**孤儿用例的正面价值**：孤儿用例不是纯浪费。它是"实现里存在但需求没写"的行为探测器。发现孤儿用例时的正确反应是先问"这段逻辑为什么存在"，而不是先删用例。

### 覆盖率指标（报这些，不要报用例条数）

| 指标 | 公式 | 门槛 |
|---|---|---|
| AC 覆盖率 | 有 ≥1 用例的 AC 数 / AC 总数 | 100%（P0/P1 阻塞） |
| AC 三维覆盖率 | P0 AC 中同时具备正常 / 边界 / 异常用例的比例 | 100% |
| 等价类覆盖率 | 有用例的类编号数 / 等价类表编号总数 | 100% |
| 边界点覆盖率 | 有用例的边界点数 / 边界矩阵中非"—"格数 | 100% |
| 迁移覆盖率（0-switch） | 有用例的迁移行数 / 迁移表总行数（含守卫失败行） | 100% |
| 1-switch 覆盖率 | 有用例的连续迁移对数 / 可连迁移对总数 | 高风险状态机 100%，其余可豁免 |
| 非法迁移覆盖率 | 有用例的非法迁移数 / (状态数 × 事件数 − 合法迁移数) | 100%，不抽样 |
| 判定表规则覆盖率 | 有用例的合并规则数 / 合并后规则数 | 100%，且每条 IMPOSSIBLE 规则有 1 条防御性用例 |
| Pair 覆盖率 | 被覆盖 pair 数 / 总 pair 数 | 100% |
| 孤儿用例数 | 无 AC 的用例数 | 0 |

用例条数**不是**指标。96 条正交用例的覆盖能力远高于 800 条重复覆盖同一等价类的用例。

---

## 4. 追溯自动校验脚本

无外部依赖，`bash` + `awk` + `grep`。**依赖第 1 节固定的 8 列顺序**（关联AC = `awk -F'|'` 的 `$9`）。

```bash
#!/usr/bin/env bash
# docs/analysis/check-traceability.sh
# 用法: bash docs/analysis/check-traceability.sh <需求文档> <用例集> [输出报告]
set -uo pipefail

REQ="${1:?需要需求文档路径}"
CASES="${2:?需要用例集路径}"
OUT="${3:-docs/analysis/traceability-report.md}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# 需求侧 AC 全集 / 用例侧引用的 AC 集合
grep -oE 'AC-[0-9]+' "$REQ"   | sort -u > "$TMP/ac-all"
grep -oE 'AC-[0-9]+' "$CASES" | sort -u > "$TMP/ac-hit"
comm -23 "$TMP/ac-all" "$TMP/ac-hit"    > "$TMP/ac-missing"   # 未覆盖 AC
comm -13 "$TMP/ac-all" "$TMP/ac-hit"    > "$TMP/ac-unknown"   # 引用了不存在的 AC（同样是缺陷）

# 孤儿用例：用例行的第 9 列（关联AC）为空 / - / TBD / N/A / 无
awk -F'|' '
  /^\|[[:space:]]*TC-/ {
    ac = $9; gsub(/^[[:space:]]+|[[:space:]]+$/, "", ac)
    id = $2; gsub(/^[[:space:]]+|[[:space:]]+$/, "", id)
    if (ac == "" || ac == "-" || ac == "TBD" || ac == "N/A" || ac == "无") print id
  }' "$CASES" > "$TMP/orphan"

# 用例ID 重复
awk -F'|' '/^\|[[:space:]]*TC-/ {id=$2; gsub(/[[:space:]]/, "", id); print id}' "$CASES" \
  | sort | uniq -d > "$TMP/dup"

{
  echo "# AC 追溯校验报告"
  echo
  echo "| 项 | 数量 |"
  echo "|---|---|"
  echo "| 需求 AC 总数 | $(wc -l < "$TMP/ac-all" | tr -d ' ') |"
  echo "| 被用例引用 | $(wc -l < "$TMP/ac-hit" | tr -d ' ') |"
  echo "| 未覆盖 AC | $(wc -l < "$TMP/ac-missing" | tr -d ' ') |"
  echo "| 引用了不存在的 AC | $(wc -l < "$TMP/ac-unknown" | tr -d ' ') |"
  echo "| 孤儿用例 | $(wc -l < "$TMP/orphan" | tr -d ' ') |"
  echo "| 重复用例ID | $(wc -l < "$TMP/dup" | tr -d ' ') |"
  echo
  echo "## 未覆盖 AC（P0/P1 阻塞放行）"
  cat "$TMP/ac-missing"
  echo
  echo "## 引用了不存在的 AC"
  cat "$TMP/ac-unknown"
  echo
  echo "## 孤儿用例"
  cat "$TMP/orphan"
  echo
  echo "## 重复用例ID"
  cat "$TMP/dup"
} > "$OUT"

fail=0
for f in ac-missing ac-unknown orphan dup; do
  [ -s "$TMP/$f" ] && fail=1
done

echo "报告已写入 $OUT"
if [ "$fail" -ne 0 ]; then
  echo "FAIL：存在未覆盖 AC / 幽灵 AC / 孤儿用例 / 重复 ID"
  exit 1
fi
echo "PASS：双向追溯完整"
```

**双向检查的关键**：脚本同时用 `comm -23`（需求有、用例无 = 未覆盖 AC）和 `comm -13`（用例有、需求无 = 幽灵 AC）两个方向。只查一个方向的校验脚本会漏掉一半缺陷。

在 CI 里挂上：

```bash
bash docs/analysis/check-traceability.sh docs/requirements/ticket-v2.md docs/analysis/test-cases-ticket-v2.md
```

退出码非 0 即阻塞。
