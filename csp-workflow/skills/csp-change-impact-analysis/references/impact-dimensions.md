# 六维度影响面采集命令库

每个维度一节。约定：`{symbol}` = 被改的函数/类/方法名，`{field}` = 被改的字段名，`{path}` = 被改的 URL 路径/文件路径，`{topic}` = 消息主题名。命令按语言生态给出常见变体，按仓库实际技术栈选用。每条命令的输出都要摘录进报告的六维表（对象 + 证据 + 结论：需改动/需通知/不受影响）。

## 维度 1：代码级

### 1.1 直接调用方与符号引用

```bash
# 函数/类/方法名全仓搜索（含测试、脚本、文档中的代码块）
grep -rn --include='*.{java,kt,scala}' "{symbol}" . | grep -v "{定义所在文件}"

# 区分定义与引用：搜带调用形态的引用
grep -rn "{symbol}\s*(" --include='*.py' .

# 前端/TS：符号的 import 方
grep -rn "import.*{symbol}" --include='*.{ts,tsx,js,jsx}' .

# Go：包级引用（先找 import 该包的文件，再找符号）
grep -rln '"{module}/{pkg}"' --include='*.go' . | xargs grep -n "{symbol}"
```

### 1.2 构建工具反向依赖（比 grep 可靠，优先用）

```bash
# Maven/Gradle：哪些模块依赖被改模块
mvn dependency:tree -Dincludes={groupId}:{artifactId}
gradle :{module}:dependents 2>/dev/null || grep -rn "{artifactId}" --include='pom.xml' --include='*.gradle*' .

# Node monorepo
npm ls --all {package} 2>/dev/null; grep -rln '"{package}"' --include='package.json' .

# Python
grep -rln "{package}" --include='pyproject.toml' --include='requirements*.txt' --include='setup.py' .

# Bazel / Nx
bazel query 'rdeps(//..., //{target})'
npx nx affected -t test --base=origin/main --graph=stdout
```

### 1.3 动态引用四类排查（静态搜索盲区）

```bash
# a) 反射/按名加载：先找反射入口，再人工审查 name 的取值来源
grep -rn "Class.forName\|getMethod(\|importlib\|getattr(\|__import__\|require(\s*[a-zA-Z]" --include='*.{java,py,js,ts}' .
# 对 name 可能的字面量取值二次搜索
grep -rn '"{symbol}"' .   # 符号名作为字符串出现 = 疑似反射/序列化引用

# b) 字符串路由/URL/事件名/topic：用字面量而不是函数名搜
grep -rn '"{path}"' . --include='*.{java,py,go,ts,yml,yaml,json,xml,properties}'
grep -rn '"{topic}"' . 

# c) 依赖注入/接口实现：找实现类清单 + 注册点
grep -rn "implements {接口名}\|extends {抽象类名}\|: {接口名}" --include='*.java' .
grep -rn "@Component\|@Service\|@Bean.*{symbol}" --include='*.java' .

# d) CI/部署/外部引用：搜产物名、模块名、镜像名
# {CI配置目录} = 仓库实际的流水线配置位置（如 ci/、.ci/、流水线脚本目录）
grep -rn "{artifact名}\|{模块名}" {CI配置目录}/ deploy/ k8s/ scripts/ 2>/dev/null
```

## 维度 2：契约级

```bash
# 本次改动是否触碰契约文件（API 定义、schema、迁移、proto、OpenAPI）
git diff --name-only origin/main...HEAD -- '*api*' '*schema*' '*proto*' '*openapi*' '*swagger*' '*migration*' '*.sql' '*.thrift' '*.avsc'

# API 请求/响应结构：找序列化 DTO 与其所有引用
grep -rn "{DTO名}" --include='*.{java,ts,go,py}' . | grep -v test

# 事件/消息 schema：找生产者与消费者两侧
grep -rn '"{topic}"' . ; grep -rn "{事件类名}\|{EventName}" --include='*.{java,ts,go,py}' .

# DB 表结构：迁移目录 + ORM 实体 + 手写 SQL 三路
ls {migration目录}/ | tail -20
grep -rn "{表名}" --include='*.{sql,java,py,go,xml}' . | grep -iv test | head -50

# CLI 参数 / 对外 SDK 方法签名：搜参数解析与公开导出
grep -rn '"--{flag名}"\|add_argument.*{flag名}\|flag\.{Flag名}' .
grep -rn "export.*{symbol}" --include='index.{ts,js}' .   # SDK 公开导出面

# 配置项键名：代码 + 配置样例 + 文档三路（外部运维脚本常引用键名）
grep -rn "{config.key}" --include='*.{yml,yaml,properties,json,toml,env}' .
grep -rn "{config.key}" docs/ README* 2>/dev/null
```

契约级结论必须写清：**契约本身是否变化**（变 → 传导穿透边界，走维度 6；不变 → 边界外记"无需通知"）。

## 维度 3：数据级

四类必查项，逐项给出结论：

| 必查项 | 查法 | 危险信号 |
|--------|------|---------|
| 存量数据兼容 | 新代码读旧数据的行为：`SELECT` 出改造前的样本行，对照新逻辑人工推演；统计特殊值 `SELECT count(*) FROM {表} WHERE {字段} IS NULL OR {字段} = ''` | 新代码假设字段非空/新格式，存量有旧值 |
| 双写与回填 | 是否存在双写窗口；回填脚本是否幂等（`grep -rn "ON DUPLICATE\|ON CONFLICT\|upsert" {migration}/`） | 回填不幂等，重跑产生脏数据 |
| **字段语义变化** | 类型没变但含义变了（如 `amount` 从"分"改为"元"、`status=3` 从"取消"改为"退款中"）：grep 该字段所有读写点，逐个确认对新语义的解释 | 最危险的一类：编译器与 schema 校验都拦不住，只有逐个读写点审查能发现 |
| 缓存与索引失效 | 改字段后缓存 key/序列化结构是否变化：`grep -rn "{缓存key前缀}"`；索引是否覆盖新查询：对照 `SHOW INDEX FROM {表}` 或迁移文件 | 老缓存条目用新代码反序列化报错；新查询条件走不到索引全表扫 |

```bash
# 字段的所有读写点（语义变化审查的入口）
grep -rn "{field}" --include='*.{java,py,go,ts,sql,xml}' . | grep -iv test | wc -l   # 先看规模
grep -rn "{field}" --include='*.{java,py,go,ts,sql,xml}' . | grep -iv test          # 再逐点审查
```

## 维度 4：运行时级

| 必查项 | 查法 | 说明 |
|--------|------|------|
| 共享资源 | `grep -rn "dataSource\|connectionPool\|ThreadPool\|Executor\|maxMemory\|Semaphore" --include='*.{java,go,py,yml}' .` | 新代码是否新增连接/线程/内存占用，与谁共享池；批量任务是否会把池打满拖垮在线请求 |
| 启动顺序与依赖就绪 | 查启动钩子与依赖初始化：`grep -rn "@PostConstruct\|on_start\|init(\|readiness" --include='*.{java,py,go}' .` | 改动是否引入新的启动依赖（新中间件、新配置项）；依赖未就绪时是阻塞还是降级 |
| 定时任务与幂等 | `grep -rn "@Scheduled\|cron\|crontab\|schedule.every\|quartz" --include='*.{java,py,yml,xml}' .` | 被改函数是否被定时任务调用；任务重跑/并发执行时新逻辑是否幂等 |
| 锁与并发 | `grep -rn "synchronized\|Lock\|mutex\|FOR UPDATE\|atomic" --include='*.{java,go,py,sql}' . \| grep {相关模块}` | 改动是否扩大或缩小临界区；新老版本共存期锁语义是否一致 |

## 维度 5：部署级

逐服务回答三问，产出发布顺序表：

1. **先发谁后发谁**：提供方先于消费方发布（消费方依赖新接口时）；消费方先于提供方发布（提供方要删除旧接口时，先确认所有消费方已切走）。
2. **能否独立灰度与回滚**：每个服务单独灰度 10% 时，与未灰度实例之间是否兼容（共享 DB/缓存/消息的版本共存问题）；单独回滚某一步是否会把数据留在中间态。
3. **版本共存期兼容性**：新老版本同时在跑的窗口内（灰度期、多机房发布不同步期），新写的消息老版本能否消费、新写的 DB 行老代码能否读、新缓存结构老代码能否反序列化。

```bash
# 找出所有部署单元
find . -name 'Dockerfile' -o -name '*.service' -o -name 'deployment*.yaml' | grep -v node_modules
# 各部署单元引用的被改产物版本
grep -rn "{artifact名}\|{镜像名}" deploy/ k8s/ charts/ 2>/dev/null
```

## 维度 6：使用方级

| 必查项 | 查法 |
|--------|------|
| 下游团队/外部客户 | 从维度 2 的契约清单反查：每个变化的契约，列出现有消费方（服务目录/网关访问日志抽样/消息组订阅列表）；无法枚举的外部客户按"对外"处理，走废弃流程 |
| 文档与示例 | `grep -rn "{接口路径}\|{字段名}\|{CLI flag}" docs/ README* examples/ 2>/dev/null` — 命中即列入"需更新"清单 |
| 监控看板与告警规则 | `grep -rn "{指标名}\|{接口路径}\|{字段名}" dashboards/ alerts/ monitoring/ *.rules.yml 2>/dev/null` — 改字段/改路径会让既有告警静默失效，这本身是检测难度升级 |
| 埋点与报表口径 | `grep -rn "{事件名}\|{埋点字段}" --include='*.{sql,py,yml}' analytics/ reports/ 2>/dev/null` — 语义变化（维度 3）几乎必然影响报表口径，需通知数据团队 |

访问日志抽样（有网关/日志平台时用，替代"猜有没有人在调"）：

```bash
# 统计过去 N 天被改接口的调用量与来源分布（命令形态依日志系统而定）
# 输入：接口路径；输出：总调用量、按调用方分组的量、最后一次调用时间
grep "{path}" {访问日志导出文件} | awk '{print $来源字段}' | sort | uniq -c | sort -rn
```

调用量为 0 也**不能直接删除**：记录抽样窗口（如"近 30 天网关日志 0 次调用"），低频调用方（季度批处理）可能在窗口外。
