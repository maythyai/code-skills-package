# 数据采集：让每个数字都能追到一条命令

**读这份文件的时机**：Step 1 动手采集之前。命令直接从本文件复制，改 `{}` 里的参数。

## 零、总规则

> **报告里的每个数字都要能追到一条命令或一个查询。** 不能凭印象，不能「大概是」。

采集产出是一张**事实底稿**表。这张表通常不发给读者（高管版绝对不发），但必须存在——它是「口径跨期一致」这条铁律的唯一保障。下期采集时，第一件事是把上期底稿的口径列复制过来。

```markdown
| 指标 | 本期数值 | 上期数值 | 口径定义 | 来源命令 / 查询 | 采集时间 |
|---|---|---|---|---|---|
| 合并至主干的变更数 | 34 | 28 | 时间窗内 `--no-merges --first-parent` 到主干的提交数，排除 bot 作者 | 见 §2.1 命令 A | 2026-10-11 18:20 |
```

**「上期数值」列是必填的。** 填不出来说明这个指标是新引入的 → 必须在报告里声明「本期新增指标，无历史基线」。

## 一、五类事实源

| 源 | 取什么字段 | 能回答什么 | 不能回答什么 |
|---|---|---|---|
| **工单系统** | 本期状态变更（新建/进行中/已完成/已关闭/被打回）、每个任务的负责人角色、阻塞标记、优先级变更、逾期天数 | 「计划完成度」「哪些项未推进」「阻塞在谁那里」 | 实际技术进展（工单可能长期不更新） |
| **代码托管平台** | 提交数、合并请求数与状态、评审轮次与耗时、改动文件与行数分布、作者分布、分支存活时间 | 「代码层面动了什么」「改动集中在哪」「是否单人关键路径」 | 是否可用、是否上线、是否有效（提交 ≠ 成果） |
| **发布记录** | 版本号、发布时间、包含的变更清单、回滚记录、热修数 | 「实际交付到用户手上的东西」 | 交付后的效果（要看监控） |
| **监控与告警** | 关键 SLO 指标（可用性、P50/P95/P99 时延、错误率、饱和度）、本期告警数与分级、事故记录与时长 | 「效果与稳定性」「有没有变差」 | 原因（要归因分析，交给 `csp-product-metrics-review`） |
| **会议纪要与行动项** | 本期决策清单、行动项完成率、跨团队承诺项与到期日 | 「依赖方的沉默」「承诺是否兑现」 | 未记录的口头承诺（要主动问） |

**采集顺序**：代码托管平台 → 工单系统 → 发布记录 → 监控 → 会议纪要。前两个是硬事实，后三个用于交叉验证。

**交叉验证规则**：如果工单显示「已完成」但代码托管平台在时间窗内没有对应合并 → 标为**存疑项**，写进报告的「待核实」，不要直接当成果报。这是发现虚报最便宜的方法。

## 二、代码托管平台采集：`git log` 命令模板

以下命令假定在仓库根目录运行，时间窗用绝对日期。变量：

```bash
SINCE="2026-10-05"        # 周期起始（含）
UNTIL="2026-10-12"        # 周期结束（不含）= 下一周期起始
MAIN="origin/main"        # 主干分支
WORK="${TMPDIR:-/tmp}/csp-status"   # 采集中间文件目录，跟随环境
mkdir -p "$WORK"
```

事实底稿最终落到 `docs/analysis/`（见 §6），采集中间文件只写 `$WORK`，不要写仓库根目录。

### 2.1 命令 A：本期合并到主干的变更数（基线指标）

```bash
git log "$MAIN" --no-merges --first-parent \
  --since="$SINCE" --until="$UNTIL" \
  --pretty=format:'%h|%an|%ad|%s' --date=short \
  | tee "$WORK/commits.txt" | wc -l
```

- `--no-merges`：排除 merge 提交，否则一次分支合并会把 20 个提交算成 21 个
- `--first-parent`：只沿主干的第一父提交走，避免把特性分支内部提交重复计入
- **两个标志必须同时用**。只用 `--no-merges` 时，特性分支的所有内部提交仍会被计入，数字虚高

### 2.2 命令 B：排除自动化提交（避免虚高的关键一步）

机器人提交（依赖升级、代码生成、格式化、版本 bump、CI 产物）会让「变更数」看起来翻倍，但它们不代表人的进展。

```bash
# 先看本期作者分布，识别自动化账号
git log "$MAIN" --no-merges --first-parent \
  --since="$SINCE" --until="$UNTIL" \
  --pretty=format:'%an' | sort | uniq -c | sort -rn

# 再看提交主题的高频前缀，识别自动化模式
git log "$MAIN" --no-merges --first-parent \
  --since="$SINCE" --until="$UNTIL" \
  --pretty=format:'%s' \
  | grep -oiE '^(chore\(deps\)|deps:?|auto-?merge|bump|generated|format|lint:fix|ci:)' \
  | tr 'A-Z' 'a-z' | sort | uniq -c | sort -rn
```

按识别结果过滤（把模式换成上一步实际看到的）：

```bash
BOT_AUTHORS='ci-bot|release-bot|deps-updater|auto-merge'   # 追加本仓库实际的自动化账号名
BOT_SUBJECTS='^(chore\(deps\)|bump |deps:|auto-merge|generated:|ci:)'

git log "$MAIN" --no-merges --first-parent \
  --since="$SINCE" --until="$UNTIL" \
  --pretty=format:'%h|%an|%s' \
  | grep -Ev "$BOT_AUTHORS" \
  | grep -Ev "$BOT_SUBJECTS" \
  | tee "$WORK/human-commits.txt" | wc -l
```

**报告里必须写明排除了什么**，例如：「本期主干合并 47 次，其中自动化提交 13 次（依赖升级 11、格式修复 2），人工变更 34 次。口径：`--no-merges --first-parent`，排除 bot 作者与 `chore(deps)`/`bump`/`generated:` 主题。」

**跨期一致性**：一旦定了 `BOT_AUTHORS` / `BOT_SUBJECTS`，写进事实底稿的口径列，之后每期沿用。中途新增机器人账号 → 显式声明「本期起排除 X，按新口径上期应为 Y」。

### 2.3 命令 C：改动形状（`--stat`）——判断「大改还是小改」

```bash
# 每个提交的改动形状
git log "$MAIN" --no-merges --first-parent \
  --since="$SINCE" --until="$UNTIL" \
  --pretty=format:'### %h %an %ad %s' --date=short --stat

# 本期总增删行
git log "$MAIN" --no-merges --first-parent \
  --since="$SINCE" --until="$UNTIL" \
  --pretty=tformat: --numstat \
  | awk '{add+=$1; del+=$2} END {printf "added=%d deleted=%d net=%d\n", add, del, add-del}'

# 排除生成物/锁文件/测试快照后的净改动（否则数字会被 lockfile 淹没）
git log "$MAIN" --no-merges --first-parent \
  --since="$SINCE" --until="$UNTIL" \
  --pretty=tformat: --numstat \
  | grep -Ev '(\.lock$|lock\.json$|lock\.yaml$|\.snap$|/dist/|/build/|/vendor/|\.min\.(js|css)$)' \
  | awk '{add+=$1; del+=$2} END {printf "code_added=%d code_deleted=%d\n", add, del}'
```

**怎么用**：改动形状是**风险的信号源**，不是成果。

| 观察 | 含义 | 写进哪一段 |
|---|---|---|
| 单个提交 > 2000 行净变更且无对应测试文件改动 | 大范围改动无测试保护 | 风险段（信号源 4） |
| 某目录本期改动次数 ≥ 8 次 | 高频改动区，可能是设计不稳定或缺测试 | 风险段（信号源 4） |
| 净增行数远大于净删行数（如 +12000 / -300） | 可能在堆积而非重构；「重构」的说法需要证据 | 进展段需要核实 |
| 只有测试文件改动、无生产代码改动 | 补测试工作，应如实写为补测试而不是功能进展 | 进展段 |

### 2.4 命令 D：按目录看改动分布（找高频改动区）

```bash
git log "$MAIN" --no-merges --first-parent \
  --since="$SINCE" --until="$UNTIL" \
  --pretty=tformat: --name-only \
  | grep -v '^$' \
  | awk -F/ '{if (NF>2) print $1"/"$2; else print $1}' \
  | sort | uniq -c | sort -rn | head -20
```

输出示例（本期高频改动区）：

```
  41 services/checkout
  28 services/checkout/pricing
  12 shared/config
   9 web/src/pages
```

**怎么用**：Top 3 目录逐个问「有测试吗？谁在改？」：

```bash
# 该目录本期的作者分布（单人关键路径检测）
git log "$MAIN" --no-merges --first-parent \
  --since="$SINCE" --until="$UNTIL" -- services/checkout/pricing \
  --pretty=format:'%an' | sort | uniq -c | sort -rn

# 该目录是否有对应测试改动
git log "$MAIN" --no-merges --first-parent \
  --since="$SINCE" --until="$UNTIL" \
  --pretty=tformat: --name-only \
  | grep -E 'services/checkout/pricing' | grep -Ei '(test|spec)' | sort -u
```

若「单一作者占比 ≥ 70%」且「无测试文件改动」→ 同时命中信号源 3 与 4，必须写成风险条目。

### 2.5 命令 E：合并请求 / 评审状态

```bash
# 本期打开与关闭的合并请求（用平台的 CLI；此处为通用形态，按实际平台替换）
# {MR_CLI} 为团队使用的代码托管平台命令行工具
{MR_CLI} list --state merged   --created-after "$SINCE" --created-before "$UNTIL"
{MR_CLI} list --state opened   --created-before "$UNTIL"        # 仍开着的
{MR_CLI} list --state closed   --updated-after "$SINCE"          # 被拒/被撤的
```

**长期挂着的合并请求是风险信号**：打开超过 5 个工作日未合并的，逐条列出并写明卡在哪（评审未通过 / 冲突 / 等依赖 / 作者未响应）。

```bash
# 分支存活时间（无平台 CLI 时的替代）
git for-each-ref --sort=-committerdate refs/remotes/ \
  --format='%(committerdate:short) %(refname:short)' \
  | awk -v d="$SINCE" '$1 < d'
```

### 2.6 命令 F：发布与回滚

```bash
# 本期 tag（发布记录）
git tag --sort=-creatordate --format='%(creatordate:short) %(refname:short)' \
  | awk -v s="$SINCE" -v u="$UNTIL" '$1 >= s && $1 < u'

# 本期是否有 revert（回滚信号）
git log "$MAIN" --since="$SINCE" --until="$UNTIL" \
  --pretty=format:'%h %ad %s' --date=short \
  | grep -iE '^[0-9a-f]+ [0-9-]+ (revert|hotfix|rollback)'

# 本期修复类提交占比（质量信号）
git log "$MAIN" --no-merges --first-parent --since="$SINCE" --until="$UNTIL" \
  --pretty=format:'%s' \
  | grep -ciE '^(fix|hotfix|bugfix)'
```

## 三、工单系统采集

无统一 API 时用「导出 + 统计」，有 API 时用查询。**口径必须固定**：

| 指标 | 口径定义（写进事实底稿） | 常见口径漂移 |
|---|---|---|
| 计划完成率 | 本期计划任务中，状态到达「已完成」的数量 / 本期计划任务总数 | 分母偷偷改成「本期实际做的任务数」（把插入项算进去，完成率反而升高） |
| 新增任务数 | 本期创建的任务数（不含子任务 / 含子任务——选一个并固定） | 上期不含子任务，本期含 |
| 逾期项 | 截止日 < 周期结束日 且状态未到「已完成」的任务数 | 只算「已过期未开始」，漏掉「进行中但已逾期」 |
| 阻塞项 | 带有阻塞标记的任务数，且必须写明阻塞在**外部**还是**内部** | 把「等评审」也算阻塞，稀释真正的阻塞 |
| 打回数 | 本期从「已完成」被退回「进行中」的任务数 | 常被漏掉——这是质量信号，不是效率信号 |

**连续两期未推进项的查法**（信号源 2）：把上期底稿的任务状态列与本期对齐，状态字段完全相同的即为未推进项。

```bash
# 若两期任务清单已导出为 CSV（列序：任务ID, 标题, 状态, ...），放到 $WORK 下
PREV="$WORK/prev-period-tasks.csv"
THIS="$WORK/this-period-tasks.csv"

join -t, -1 1 -2 1 \
  <(sort "$PREV") \
  <(sort "$THIS") \
  | awk -F, '$3 == $6 {print $1","$3}'      # 上期状态 == 本期状态
```

## 四、监控与告警采集

只取**关键指标**，不做归因分析（归因交给 `csp-product-metrics-review`）。

| 指标 | 必含口径 | 报告里的写法 |
|---|---|---|
| 可用性 | 时间窗、计算方式（成功请求/总请求 还是 正常分钟/总分钟）、是否含计划内维护 | 「可用性 99.93%（W41，成功请求口径，含 2026-10-08 计划维护 12 分钟）」 |
| P95 / P99 时延 | 哪个接口或哪个服务、时间窗、是否含冷启动 | 「checkout 服务 P99 = 210ms（W41，全接口聚合，含冷启动）」 |
| 错误率 | 分子定义（5xx？含 4xx？含业务错误码？） | 「5xx 错误率 0.04%（W41，仅网关侧 5xx，不含业务错误码）」 |
| 告警数 | 分级口径、是否含自动恢复、是否去重 | 「P1 告警 0 次、P2 告警 3 次（W41，已按告警规则去重，含自动恢复 1 次）」 |
| 事故 | 影响时长口径（从检测到 还是 从发生到）、影响范围 | 「事故 1 起，影响 42 分钟（从检测到恢复），影响 checkout 支付链路约 3% 请求」 |

**规则**：监控指标是**最容易口径漂移**的一类。任何指标的分子/分母/时间窗变化，必须在报告里显式声明并给出新旧口径下的两期数值。

## 五、会议纪要与行动项

用 `csp-meeting-action-extraction` 的产物作为输入。状态报告只取三样：

| 取什么 | 用途 |
|---|---|
| 本期决策清单（谁在什么时候决定了什么） | 移到进展段；已决策的**不再**出现在决策项段 |
| 行动项完成率（含逾期项） | 进展段的「上期计划交代」 |
| **跨团队承诺项与到期日** | 风险段的信号源 1（依赖方的沉默）：承诺日已过而无回复 → 必须写成风险 |

**主动问一句**：本期有没有**未记录在纪要里**的口头承诺？口头承诺是依赖方沉默最常见的来源。

## 六、事实底稿模板（Step 1 的产物）

```markdown
## 附录：事实底稿（本期采集，{YYYY-MM-DD} {HH:MM}）

### 采集参数
| 参数 | 值 |
|---|---|
| 周期 | 2026-10-05 ~ 2026-10-11（W41） |
| 主干 | origin/main |
| 排除的作者模式 | `ci-bot|release-bot|deps-updater|auto-merge` |
| 排除的主题模式 | `^(chore\(deps\)|bump |generated:|ci:)` |
| 排除的路径模式 | `\.lock$|\.snap$|/dist/|/vendor/` |

### 指标底稿
| 指标 | 本期 | 上期 | 口径定义 | 来源命令 / 查询 | 采集时间 |
|---|---|---|---|---|---|
| 主干人工变更数 | 34 | 28 | 见 §2.1+§2.2 | 命令 A+B | 10-11 18:20 |
| 净代码增删 | +4,120 / -1,880 | +2,300 / -900 | 排除 lock/dist/vendor | 命令 C | 10-11 18:22 |
| 计划完成率 | 8/12 = 67% | 10/11 = 91% | 分母 = 本期计划任务数，不含插入项 | 工单导出 W41 | 10-11 18:30 |
| 逾期项 | 3 | 1 | 截止日 < 2026-10-12 且未完成 | 工单导出 W41 | 10-11 18:30 |
| 打开超 5 日的 MR | 4 | 2 | 创建日 < 2026-10-06 且状态 opened | 命令 E | 10-11 18:35 |
| P99（checkout） | 210ms | 820ms | 全接口聚合，含冷启动 | 监控系统查询 Q1 | 10-11 18:40 |
| 5xx 错误率 | 0.04% | 0.31% | 仅网关侧 5xx | 监控系统查询 Q2 | 10-11 18:40 |
| 发布次数 / 回滚 | 2 / 0 | 1 / 1 | git tag + revert 检索 | 命令 F | 10-11 18:45 |

### 存疑项（交叉验证不一致，需核实后再报）
| 项 | 工单状态 | 代码证据 | 处置 |
|---|---|---|---|
| 「支付重试逻辑优化」标记已完成 | 已完成（10-09） | 时间窗内无对应合并 | 待核实，本期不计入进展 |

### 高频改动区 Top 3（信号源 4 输入）
| 目录 | 本期改动文件次数 | 单一作者占比 | 本期是否有测试改动 |
|---|---|---|---|
| services/checkout/pricing | 28 | 88% | 无 |
| shared/config | 12 | 42% | 有 |
| web/src/pages | 9 | 61% | 有 |
```

**底稿到报告的映射规则**：报告里出现的每一个数字，都必须能在这张表里找到同名行。找不到的数字 → 删掉，或补采集。
