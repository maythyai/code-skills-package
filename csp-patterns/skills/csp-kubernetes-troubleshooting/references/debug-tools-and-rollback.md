# 调试工具、时间线重建与升级回滚

约定：`{DEBUG_IMAGE}` = 含基础 shell 与常用工具的调试镜像；`{NET_DEBUG_IMAGE}` = 网络工具箱镜像。
两者都用环境变量注入并 mirror 到 `{REGISTRY}`，**不要硬编码公共仓库地址**——
故障期间集群可能正好拉不到公共仓库（那本身就是 `ImagePullBackOff` 的成因之一）。

---

## §1 `kubectl debug` 与临时容器

网络分层探测的用法见 `references/network-dns-triage.md` §1，这里给完整的四种模式与选型。

| 模式 | 命令 | 用途 | 副作用 / 前提 |
|---|---|---|---|
| Pod 内临时容器（共享网络栈） | `kubectl -n $NS debug -it $POD --image={DEBUG_IMAGE} --target=<container>` | distroless 镜像没 shell 时就地取证；查文件系统、环境变量、监听端口 | 临时容器**无法删除**，只能随 Pod 重建消失（K8s 1.30 前）。⚠ 生产 Pod 上加临时容器会改变该 Pod 的 spec，触发不了重建但会留下记录 |
| 复制 Pod 再调试（**生产首选**） | `kubectl -n $NS debug $POD -it --image={DEBUG_IMAGE} --copy-to=${POD}-dbg --share-processes` | 原 Pod 完全不动，副本可随意改命令、去探针、跑交互式工具 | 副本会占用一份资源；用完 `kubectl -n $NS delete pod ${POD}-dbg` |
| 复制 Pod 并替换其镜像 | `kubectl -n $NS debug $POD -it --copy-to=${POD}-dbg --set-image='*={DEBUG_IMAGE}' --share-processes` | 原容器一启动就崩、根本来不及 exec 时，把副本的镜像整个换成调试镜像 | 同上；`--set-image` 的 `*` 表示所有容器，也可写 `<container>=<image>` 精确替换 |
| 节点级调试 | `kubectl debug node/$NODE -it --image={DEBUG_IMAGE}` | 节点 NotReady、CNI 异常、磁盘/inode 耗尽、运行时卡死 | 在节点上以特权 Pod 运行，**宿主根文件系统挂在 `/host`**，宿主网络/PID 命名空间可见。⚠ 能改宿主任何东西，只做只读取证 |

节点级调试的标准只读取证序列：

```bash
kubectl debug node/$NODE -it --image={DEBUG_IMAGE} -- sh -c '
  chroot /host sh -c "
    echo ===UPTIME===;   uptime;
    echo ===DISK===;     df -h; df -i;
    echo ===MEM===;      free -m; cat /proc/meminfo | head -5;
    echo ===PID===;      ps -eLf | wc -l; cat /proc/sys/kernel/pid_max;
    echo ===KUBELET===;  systemctl status kubelet --no-pager | head -20;
    echo ===RUNTIME===;  systemctl status containerd --no-pager | head -20; crictl version 2>&1 | head -10;
    echo ===JOURNAL===;  journalctl -u kubelet --since \"-30m\" --no-pager | grep -iE \"error|fail|x509|cni\" | tail -50;
    echo ===DMESG===;    dmesg -T | tail -60;
    echo ===CNI===;      ls -l /etc/cni/net.d/; ip route | head -20;
    echo ===CLOCK===;    timedatectl 2>/dev/null || date -u;
  "'
```

`dmesg -T | tail -60` 常是最有价值的一段：内核 OOM kill 记录、conntrack 表满、
磁盘 IO 错误、网卡 reset 都只在这里出现，`kubectl` 侧完全看不到。

**`--share-processes` 能看到什么**（临时容器与目标容器共享 PID 命名空间）：

```bash
ps aux                                    # 同 Pod 所有容器的进程
cat /proc/<pid>/environ | tr '\0' '\n'    # 该进程真实拿到的环境变量（配置注入到底成没成，这是铁证）
ls -l /proc/<pid>/cwd /proc/<pid>/exe     # 工作目录与可执行文件真实路径
cat /proc/<pid>/status | grep -E 'VmRSS|Threads'   # 单进程真实内存与线程数
ls -l /proc/<pid>/fd | wc -l              # 打开的 fd 数（fd 泄漏导致的 "too many open files"）
cat /proc/<pid>/limits                    # 该进程的 rlimit（nofile 等）
```

注意共享 PID 后，容器内 `ps` 的 PID 1 不再是自己的主进程，`kill 1` 之类操作的影响面变化；
临时容器与主容器之间也失去 PID 隔离，仅用于调试副本。

---

## §2 日志与事件的时间线重建

目标是找到**首个异常点**，而不是最响的报错。级联故障里，日志量最大的组件通常是受害者。

### 步骤

1. **统一时钟**。这是最容易出错也最致命的一步：
   - K8s API 的时间戳（Events、`conditions.lastTransitionTime`）是 **UTC**，格式 `2026-03-14T09:26:53Z`。
   - 节点 `journalctl` 默认**本地时区**，`dmesg -T` 也是本地时区。
   - 应用日志可能是本地时区、可能是 UTC、也可能带毫秒和不带毫秒混用。
   - 全部转 UTC 再排序：`journalctl -u kubelet --since "..." -o short-iso-precise --utc`；
     `TZ=UTC0 date -d "<local-ts>" +"%Y-%m-%dT%H:%M:%SZ"`。
   - 时区错位 8 小时会让你得出完全颠倒的因果顺序（把结果当成原因）。
2. **收集四个源**：集群 Events → Pod 日志（含 `--previous`）→ 节点日志（kubelet / 运行时 / dmesg）→ 上游依赖日志（DB、下游服务、网关、Ingress 控制器）。
3. **归并排序成单一时间线**，每行只保留：时间(UTC) | 来源 | 事件 | 证据文件名。
4. **标出第一条异常**，然后对每个候选根因问：「它能否解释**全部**观测？」
   不能解释的现象就是反证——例如"只有 1/3 节点出问题"排除了全局配置错误，
   "只在整点发生"指向定时任务，"重启后自愈但几小时后复发"指向泄漏而非配置。
5. **区分相关与因果**：时间相邻不等于因果。要求因果链每一环都有独立证据支撑。

### 抓取命令

```bash
# Events 只保留约 1 小时，故障发生后必须第一时间落盘
kubectl -n "$NS" get events --sort-by=.lastTimestamp -o json > "$OUT/events.json"
kubectl get events -A --sort-by=.lastTimestamp -o wide > "$OUT/events-all-ns.txt"

# 时间窗口内的 Pod 日志（含崩溃前的）
kubectl -n "$NS" logs "$POD" --all-containers --since-time="<UTC-RFC3339>" --timestamps > "$OUT/logs-since.txt"
kubectl -n "$NS" logs "$POD" --all-containers --previous --timestamps --tail=2000 > "$OUT/logs-prev.txt"

# 节点侧（通过 node debug 或 SSH）
journalctl -u kubelet --since "<ts>" --until "<ts>" -o short-iso-precise --utc > "$OUT/kubelet.log"
journalctl -u containerd --since "<ts>" -o short-iso-precise --utc > "$OUT/containerd.log"
dmesg -T | tail -500 > "$OUT/dmesg.txt"

# Ingress / 网关访问日志（判定用户侧影响起止时间）
kubectl -n <ingress-ns> logs -l <ingress-controller-label> --since-time="<UTC-RFC3339>" \
  | grep -E ' 50[0-9] ' > "$OUT/ingress-5xx.txt"
```

### 时间线样例（填好的形态）

| 时间 (UTC) | 来源 | 事件 | 证据 |
|---|---|---|---|
| 09:12:03 | Deployment | 新 ReplicaSet `app-7d9f` 创建，镜像 tag 由 `v1.8.2` → `v1.8.3` | `13-describe-owner.txt` |
| 09:12:41 | Pod 日志 | 首个新 Pod 打印 `connection refused: {DB_HOST}:5432` | `03-logs-previous.txt` |
| 09:12:41 | Event | `Unhealthy: Readiness probe failed: HTTP 503` | `02-describe.txt` |
| 09:13:11 | Event | `Unhealthy: Liveness probe failed` → `Killing container` | `02-describe.txt` |
| 09:13:11 → 09:24 | Pod | `restartCount` 0 → 11，全部副本同步重启 | `07-container-status.txt` |
| 09:18:20 | DB 侧 | 数据库连接数达到上限，开始拒绝新连接 | DB 日志 |
| 09:26:53 | Ingress | 5xx 比例从 0.2% 升至 34% | `ingress-5xx.txt` |
| 09:31:10 | 人工 | 执行 `kubectl rollout undo`，RS 回到 `app-6c2e` | `rollout-history.txt` |
| 09:36:44 | Ingress | 5xx 回落至 0.1% | `ingress-5xx.txt` |

**读法**：首个异常是 09:12:41 的 DB 连接被拒，而不是 09:13:11 的 liveness 杀容器。
liveness 是**放大器**（把一次依赖抖动变成全副本重启风暴），DB 连接上限是**触发点**，
真正要修的是「v1.8.3 引入了连接池配置错误」+「liveness 探针不该含依赖检查」两项。
只回滚不改探针，下次任何依赖抖动都会重演。

---

## §3 升级与回滚

### rollout 卡住的判定

```bash
kubectl -n "$NS" rollout status deployment/<name> --timeout=10s   # 看它卡在哪句话
kubectl -n "$NS" get rs -l <selector> -o wide                     # 新旧 RS 的 DESIRED/CURRENT/READY
kubectl -n "$NS" describe rs <new-rs>                             # 新 RS 层的报错（配额、镜像）在这里
kubectl -n "$NS" get deploy <name> -o jsonpath='{.status.conditions}{"\n"}'
```

| `rollout status` 的输出 / Deployment condition | 含义 | 下一步 |
|---|---|---|
| `Waiting for deployment "<n>" rollout to finish: 0 of 3 replicas are available` | 新 Pod 起不来或 not-ready | 回到 `references/pod-state-trees.md`，按新 Pod 的状态走对应树 |
| `1 out of 3 new replicas have been updated` 长期不动 | `maxUnavailable` 与 readiness 互相卡死：旧 Pod 不摘、新 Pod 不 ready | 查新 Pod readiness；查 `strategy.rollingUpdate` 参数 |
| `ProgressDeadlineExceeded` | 超过 `progressDeadlineSeconds`（默认 600s）无进展，Deployment 判定失败 | 这是**判定信号**不是自动回滚——K8s 不会自动 undo。必须人工决策 |
| `kubectl rollout status` 立刻返回但 Pod 全是旧的 | 你以为在发布，其实 spec 没变化（镜像 tag 没变、或改了但被 webhook 改回） | diff `deploy.spec.template` 与 `rs.spec.template`；确认 CI 真的推送了新 manifest |
| 新 RS 报 `exceeded quota` / `FailedCreate` 但 Pod 一个都没建 | ReplicaSet 层就被拒，`describe pod` 看不到任何东西 | `describe rs`；`describe resourcequota` |
| 旧 Pod 一直 `Terminating` 挡住新 Pod 调度（节点资源不够同时放两份） | 滚动更新期需要 **1 份额外资源**余量 | 走 `references/pod-state-trees.md` §6；或临时把 `maxSurge` 设为 0（代价是可用副本数下降） |

### 回滚操作

```bash
kubectl -n "$NS" rollout history deployment/<name>              # 看 revision 列表
kubectl -n "$NS" rollout history deployment/<name> --revision=3 # 看某个 revision 的实际 spec
kubectl -n "$NS" rollout undo deployment/<name>                 # 回到上一个 revision
kubectl -n "$NS" rollout undo deployment/<name> --to-revision=3 # 回到指定 revision
kubectl -n "$NS" rollout pause deployment/<name>                # 暂停（改多处 spec 后一次性 resume）
kubectl -n "$NS" rollout resume deployment/<name>
```

**回滚的两个前提**：

1. `revisionHistoryLimit`（默认 10）必须 > 0，否则旧 ReplicaSet 已被删除，无版本可回。
2. **回滚不回滚数据**。如果这次发布伴随数据库 schema 迁移，`rollout undo` 只回滚镜像，
   新 schema 上的旧代码可能直接崩。有破坏性迁移的发布必须走「先兼容后清理」的两阶段：
   本次发布只加列/加表（旧代码可跑），下次发布才删旧列。

### 金丝雀 / 蓝绿出问题时：回滚还是修复

用这张表做决策，不要凭感觉。**先看影响面，再看是否有安全的回退路径。**

| 判据 | 倾向「立即回滚」 | 倾向「就地修复」 |
|---|---|---|
| 用户可见影响 | 错误率上升、有数据不一致、影响核心链路 | 仅内部指标劣化，用户无感 |
| 数据完整性 | 无破坏性 schema 变更，回滚安全 | 已有破坏性迁移，回滚后旧代码写新 schema 会更糟 → **只能向前修** |
| 影响范围 | 金丝雀比例小（≤ 10%），先把流量切回稳定版即可 | 已 100%，且回滚本身需要数分钟（镜像大、冷启动慢） |
| 根因明确度 | 根因不明 → 回滚争取时间，回滚后在离线环境复现 | 根因已定位且是一行配置 → 修复比回滚更快 |
| 回滚成本 | 回滚 < 5 分钟且可验证 | 回滚会牵连其他已上线的变更（同一 Deployment 里混了别的改动） |
| 是否有止血手段 | 有：切流量、关开关、限流 → **先止血，再从容定位** | 无 |

**决策顺序**：能止血就先止血（切流量/关 feature flag，比回滚更快且保留现场）→
不能止血且影响扩大就回滚 → 回滚前**必须先跑完统一取证序列**，否则根因永久丢失，
下次发布必然重演。

蓝绿的额外注意点：回滚 = 把入口流量切回旧环境，秒级完成，这是蓝绿相对滚动更新的核心优势。
但要确认旧环境的**依赖与数据**仍然兼容（旧环境的 DB 连接、缓存、下游版本可能已被同步升级），
以及旧环境在闲置期没有被自动缩容到 0——切回去才发现起不来，是最尴尬的二次事故。

---

## §4 事故报告模板

产物路径：`docs/analysis/INCIDENT-{service}-{date}.md`（`{date}` 用 `YYYYMMDD`）。
**不写仓库根目录**；报告里不出现真实主机名/IP/内部域名，用 `{PLACEHOLDER}` + 环境变量表述。

```markdown
# INCIDENT-{service}-{YYYYMMDD}：<一句话症状> caused by <已确认根因>

> 标题必须是具体结论，不是「服务异常」。
> 例：`checkout 服务 5xx 突增 caused by v1.8.3 连接池配置错误 + liveness 探针含依赖检查导致重启风暴`

## 1. 概述
- 集群 / 命名空间 / 受影响工作负载：
- 影响时间窗（UTC）：HH:MM – HH:MM，共 N 分钟
- 用户可见影响：错误率从 X% 升至 Y%，影响 Z 链路
- 严重级别与响应人：

## 2. 影响面
| 维度 | 范围 |
|---|---|
| 工作负载 | 哪些 Deployment/Pod，几个副本 |
| 节点 | 哪些节点，是否 NotReady |
| 控制面 | apiserver / etcd / scheduler 是否受影响 |
| 数据 | 是否有数据丢失或不一致（这是最高优先级项，必须明确 yes/no） |
| 用户 | 受影响请求数 / 比例 / 持续时间 |

## 3. 时间线（全部 UTC）
| 时间 | 来源 | 事件 | 证据文件 |
|---|---|---|---|
| HH:MM:SS | Deployment/Pod/Event/节点/DB/Ingress/人工 | … | `NN-xxx.txt` |

标出「首个异常点」与「放大点」，两者通常不是同一个。

## 4. 根因（分层写）
- **触发点**：最先失效的那个环节（例：连接池 max 从 50 误配为 5）
- **机制**：触发点如何导致用户可见故障（例：DB 连接排队 → readiness 超时 → Pod 被摘 → 剩余副本压力更大）
- **放大条件**：让影响远超触发点本身的设计缺陷（例：liveness 含依赖检查 → 全副本同步重启风暴）
- **为什么没被更早发现**：告警缺失 / 阈值过宽 / 无该指标

## 5. 证据链
| 证据 | 来源 | 说明了什么 |
|---|---|---|
| `connection refused {DB_HOST}:5432` | `03-logs-previous.txt` | 应用侧连接被拒，非 K8s 调度问题 |
| `restartCount=11`，`reason` 非 OOMKilled | `07-container-status.txt` | 排除内存，指向探针或应用退出 |
| `Liveness probe failed` 连续 3 次 | `02-describe.txt` | 确认是探针触发的重启 |

## 6. 修复动作
| # | 动作 | 为什么 | 如何验证 | 风险 |
|---|---|---|---|---|
| 1 | `kubectl rollout undo` 至 revision N | 快速止血，恢复用户可用 | `rollout status` 完成 + 5xx < 0.5% | 无（无破坏性迁移） |
| 2 | liveness 探针移除依赖检查，只留进程自检 | 消除放大条件 | 人为制造依赖抖动，确认 Pod 不重启 | 需评估"真僵死"如何被发现 |
| 3 | 修正连接池配置并加配置校验 | 消除触发点 | 压测下连接数稳定在预期范围 | 需回归测试 |

区分**止血动作**与**根治动作**，并写明止血动作掩盖了什么。

## 7. 防复发
| # | 项 | 类型 | 判据（可验证，不写"加强意识"） | Owner | 截止 |
|---|---|---|---|---|---|
| 1 | 加告警：Pod `restartCount` 5 分钟内增长 > 3 | 告警 | 告警在测试环境能触发并送达 | | |
| 2 | CI 门禁：禁止 liveness 探针配置中包含外部依赖地址 | 门禁 | 静态检查规则上线，对现有清单扫描零命中 | | |
| 3 | 发布前 `kubectl apply --dry-run=server` 校验配置引用完整性 | 流程 | 流水线中加入该步骤并有失败记录 | | |
| 4 | 压测基线：连接池在 N QPS 下的连接数上限 | 测试 | 基线数据入库，发布前对比 | | |

## 8. 本次排障中让问题变难的因素
直接写出来，这是最有复用价值的一段：
- 哪个指标缺失导致定位绕路
- 哪条日志具有误导性（症状而非根因）
- 哪个"看起来正常"的字段实际隐藏了配置漂移
- Events 已过期（1h 保留窗口）导致哪段证据丢失
```
