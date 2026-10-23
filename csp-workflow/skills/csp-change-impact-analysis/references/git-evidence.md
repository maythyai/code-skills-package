# git 侧证据采集命令库

用途：为影响分析提供"这块代码谁最熟、改动多频繁、这个符号经历过什么"的证据。约定 `{file}` = 目标文件，`{dir}` = 目标目录，`{symbol}` = 目标符号。

## 1. 改动形状：这次变更碰了什么

```bash
# 相对基线分支的改动概览（文件数、行数分布、哪些模块被碰）
base=$(git merge-base HEAD origin/main)
git diff --stat --find-renames "$base"...HEAD
git diff --name-status --find-renames "$base"...HEAD   # A/M/R/D/T 分类，R=重命名要特别关注

# 只看契约类文件的改动（对应六维的维度 2）
git diff --name-only "$base"...HEAD -- '*.proto' '*.sql' '*openapi*' '*migration*' '*schema*'

# 单个提交的形状
git show --stat --find-renames {commit}
```

解读要点：

- `--find-renames` 必须带：重命名被识别为 R 才能正确追踪；识别为 D+A 会让你漏掉历史。
- 改动分散在 ≥5 个模块 = 跨服务风险信号，风险分级至少 R2 起评。
- 出现 `migration`/`schema` 文件 = 立即进入不可逆变更判定（见 `irreversible-changes.md`）。

## 2. 真实作者与责任人：该找谁确认

```bash
# 某文件每行的最后修改人与时间（找 owner 用）
git blame --date=short -- {file}

# 只看某几行（被改动的行）
git blame -L {起},{止} --date=short -- {file}

# blame 会被"格式化提交"污染：忽略纯移动/空白提交
git blame -w -M -C --date=short -- {file}

# 文件的完整变更历史与作者分布
git log --follow --format='%h %an %ad %s' --date=short -- {file}
git log --follow --format='%an' -- {file} | sort | uniq -c | sort -rn | head -5   # 谁改得最多 = 最该咨询的人

# 某目录的近期活跃贡献者
git log --since='6 months ago' --format='%an' -- {dir} | sort | uniq -c | sort -rn | head -5
```

注意：`git blame` 给的是"最后碰过的人"，不等于"最懂的人"；结合 `git log -S` 找到**引入该逻辑的提交**，其作者通常才是设计者。

## 3. 高频变更文件 = 高风险区

```bash
# 近 12 个月目录内文件变更频次排行（热点分析）
git log --since='12 months ago' --name-only --format= -- {dir} \
  | grep -v '^$' | sort | uniq -c | sort -rn | head -20

# 近 90 天的热点（更贴近当前迭代）
git log --since='90 days ago' --name-only --format= -- . \
  | grep -v '^$' | sort | uniq -c | sort -rn | head -20

# 热点 + 缺陷修复占比：修复类提交多的文件质量更差
git log --since='12 months ago' --format='%s' -- {file} | grep -ciE 'fix|bug|hotfix|revert'
git log --since='12 months ago' --oneline -- {file} | wc -l   # 总提交数，算占比
```

解读要点：

- 高频变更（如近 12 个月 ≥20 次）+ 高 fan-in（被 20+ 处引用）= 危险组合，风险分级至少 R3 起评。
- fix/revert 占比 > 30% 的文件，本次改动应要求补充测试而不是仅靠既有测试。
- 出现 `revert` 提交的文件要读那次 revert 的原因：`git log --grep='revert' -i --format='%h %s' -- {file}`。

## 4. 符号历史：这个符号经历过什么

```bash
# 追踪一个字符串/符号的增删历史（-S = pickaxe，统计出现次数变化的提交）
git log -S'{symbol}' --oneline --date=short --format='%h %ad %an %s' -- '*.ext'

# 追踪正则形态（-G，匹配 diff 中的行）
git log -G'{symbol}\s*\(' --oneline -- '*.ext'

# 某符号在某文件内的行级历史
git log -L :'{symbol}':{file} --format='%h %ad %an %s' --date=short   # 需 {symbol} 是函数名

# 找到引入提交后，读完整上下文与关联说明
git show {commit} --stat
git show {commit} -- {file}
```

解读要点：

- `-S` 找的是"该字符串出现次数发生变化"的提交，即引入与删除点；`-G` 找的是"diff 里出现过该模式"的提交，包含仅修改调用的提交。先用 `-S` 定位引入，再用 `-G` 看演化。
- 读引入提交的 message 与关联工单号，常能发现"上次改这里炸过什么"和当年的约束条件（例如某个看似多余的分支是为兼容某历史数据）。
- **要删除某个符号前，`git log -S'{symbol}'` 是必做项**：历史上反复被删又被加回来的符号，说明有隐性依赖。

```bash
# 检查符号是否曾被删除又恢复（反复出现 = 隐性依赖信号）
git log -S'{symbol}' --format='%h %ad %s' --date=short | head -20
```

## 5. 版本共存期证据（对应维度 5）

```bash
# 当前分支与基线的提交差异（发布时会一起上线的内容）
git log --oneline origin/main..HEAD
git log --oneline HEAD..origin/main          # 基线领先的部分：合并顺序影响

# 某文件的改动是否已在其他分支/发布分支上（是否有并行改动会冲突）
git branch -a --contains {commit}
git log --all --oneline --since='30 days ago' -- {file}

# tag 与发布点对齐：被改文件上次发布是哪个版本
git tag --contains {commit} | head -5
git describe --tags {commit}
```

解读要点：

- 同一文件在 30 天内被多个分支改动 = 合并冲突与语义冲突风险，发布顺序需与这些分支的负责人对齐。
- `git tag --contains` 为空说明改动尚未进入任何发布，此时是成本最低的干预点。

## 6. 证据写入报告的格式

每条 git 证据在报告中记为一行：`命令` → `输出摘要（数字/前 5 行）` → `结论`。示例：

| 命令 | 输出摘要 | 结论 |
|------|---------|------|
| `git log --since='12 months ago' --name-only --format= -- src/order/ \| sort \| uniq -c \| sort -rn \| head -5` | `OrderService.java 47`、`OrderMapper.xml 31`、`OrderStatus.java 22` | OrderService 为热点文件（47 次/年），本次改动落在热点上 → 风险升档 |
| `git log -S'legacyFlag' --format='%h %ad %s' --date=short` | 3 条：引入于 2023-04；2024-01 有一次删除尝试被 revert | 该字段曾被尝试删除并回滚 → 存在隐性依赖，必须先查 revert 原因 |
| `git blame -L 120,140 --date=short -- src/order/OrderService.java` | 全部为同一作者，最近改动 2025-11 | 责任人明确，评审邀请该作者 |
