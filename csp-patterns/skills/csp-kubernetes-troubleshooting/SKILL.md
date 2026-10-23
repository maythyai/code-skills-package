---
name: csp-kubernetes-troubleshooting
description: >
  Evidence-first troubleshooting for live Kubernetes incidents. Collect forensic artifacts
  before mutating anything, then walk a per-state decision tree (Pending, ImagePullBackOff,
  CrashLoopBackOff, OOMKilled, Running-but-not-Ready, stuck Terminating,
  CreateContainerConfigError) from symptom to confirmed root cause to verified fix. Use when
  a workload is already broken in a running cluster — pod stuck, crash looping, node NotReady,
  service unreachable, PVC never bound, rollout hung — and you must find out why without
  destroying the scene.
  触发：K8s 排障、Pod 起不来、容器反复重启、CrashLoopBackOff、OOMKilled、ImagePullBackOff、
  节点 NotReady、Service 访问不通、DNS 解析失败、PVC 一直 Pending、滚动更新卡住、
  kubectl debug、线上故障诊断、事故复盘、kubernetes troubleshooting.
version: "1.0.0"
layer: 3
category: patterns
phase: verify
domain: devops
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
triggers:
  - "k8s 排障"
  - "kubernetes 排障"
  - "pod 起不来"
  - "容器反复重启"
  - "CrashLoopBackOff"
  - "OOMKilled"
  - "ImagePullBackOff"
  - "CreateContainerConfigError"
  - "节点 NotReady"
  - "service 访问不通"
  - "DNS 解析失败"
  - "PVC 一直 Pending"
  - "滚动更新卡住"
  - "kubectl debug"
  - "线上故障诊断"
  - "kubernetes troubleshooting"
related_skills:
  - csp-kubernetes-patterns
  - csp-deployment
  - csp-monitoring-alerting
  - csp-incident-commander
  - csp-observability-and-instrumentation
  - csp-solo-oncall
  - csp-systematic-debugging
---

# Kubernetes 故障诊断（线上排障）

> 本技能回答的是**「线上出事了，怎么查」**，不是「怎么设计」。
> 设计与配置（Resource Requests/Limits 怎么定、HPA/VPA、Pod Security Standards、
> NetworkPolicy 怎么写、StatefulSet/Operator/Helm Chart 结构）走 `csp-kubernetes-patterns`（phase=build）。
> 本技能是 phase=verify：从症状出发，取证 → 判定 → 修复 → 验证 → 出报告。

## 铁律：先取证，后动手

诊断期间**禁止**任何改变线上状态的操作。重启会销毁现场——容器日志、Events、
`lastState.terminated`、cgroup 计数、进程表全部随容器消失，而 Events 默认只保留 1 小时。
现场一没，剩下的就只有猜测。

| 类别 | 命令 | 为什么禁 |
|---|---|---|
| 销毁现场 | `kubectl delete pod` / `kubectl rollout restart` | 重建后 `--previous` 日志、Events、`restartCount`、OOM 证据全部归零 |
| 掩盖症状 | `kubectl edit` / `kubectl patch` 调大 limits、放宽探针 | 症状消失≠根因消失；下次以更大代价复现 |
| 扩大影响面 | `kubectl scale --replicas=0` / `kubectl delete deploy,sts,ds` | 从"部分不可用"变成"完全不可用" |
| 不可逆 | `kubectl delete pvc` / `delete namespace` / `drain --force` | 数据与调度状态无法回滚 |
| 污染证据 | `kubectl exec` 里改配置、写文件、杀进程 | 让后续复现条件与故障时不一致 |

**唯一例外**：影响面正在扩大（如级联重启打挂数据库、故障 Pod 占满节点资源），
且已明确记录「谁批准、批准了什么、预期影响是什么」，才可以先止血再补取证。
止血动作执行前，先把 `## 统一取证命令序列` 跑完——它全程只读，耗时 < 60 秒。

**改任何东西之前先写下一句可证伪的假设**：
「我认为根因是 X，因为证据 Y；如果我做 Z，那么 W 指标应该在 N 分钟内变化。」
写不出这句话，说明还没到动手的时候，回去继续取证。

## 统一取证命令序列

只读、可复制、幂等。任何 K8s 故障的第一步都是它，产物落到本地目录供时间线重建。

```bash
# ── 统一取证序列（全程只读，不改变任何线上状态）─────────────────
NS="${NS:-default}"; POD="${POD:?用法: NS=<ns> POD=<pod> bash}"; OUT="${OUT:-/tmp/k8s-evidence}"
mkdir -p "$OUT"

# 0. 先确认 context——在错误集群上做"修复"是二次事故的头号来源
kubectl config current-context | tee "$OUT/00-context.txt"

# 1. 事件按时间排序：最便宜的定位器，多数故障这里就有直接线索
kubectl -n "$NS" get events --sort-by=.lastTimestamp -o wide | tee "$OUT/01-events.txt"

# 2. Pod 全量描述：调度失败原因、探针失败、退出码、挂载失败都在这里
kubectl -n "$NS" describe pod "$POD" | tee "$OUT/02-describe.txt"

# 3. 崩溃前日志。--previous 是 CrashLoopBackOff 的唯一有效证据：
#    当前容器已重启，stdout 已被清空，只看 logs 会看到空输出并误判为"应用没报错"
kubectl -n "$NS" logs "$POD" --all-containers --previous --tail=500 2>/dev/null | tee "$OUT/03-logs-previous.txt"
kubectl -n "$NS" logs "$POD" --all-containers --tail=500             | tee "$OUT/04-logs-current.txt"

# 4. 结构化状态：conditions（PodScheduled/Initialized/ContainersReady/Ready）
#    + containerStatuses（exitCode / reason / restartCount）
kubectl -n "$NS" get pod "$POD" -o yaml > "$OUT/05-pod.yaml"
kubectl -n "$NS" get pod "$POD" -o jsonpath='{range .status.conditions[*]}{.type}={.status} reason={.reason} msg={.message}{"\n"}{end}' \
  | tee "$OUT/06-conditions.txt"
kubectl -n "$NS" get pod "$POD" -o jsonpath='{range .status.containerStatuses[*]}{.name}: ready={.ready} restarts={.restartCount} state={.state} last={.lastState}{"\n"}{end}' \
  | tee "$OUT/07-container-status.txt"

# 5. 实际用量 vs requests/limits：OOMKilled 与 CPU 限流的判定依据
kubectl -n "$NS" top pod "$POD" --containers 2>/dev/null | tee "$OUT/08-top-pod.txt"

# 6. 节点侧：Pod 落在哪个节点，节点是否有 DiskPressure/MemoryPressure/PIDPressure
NODE=$(kubectl -n "$NS" get pod "$POD" -o jsonpath='{.spec.nodeName}')
echo "node=$NODE" | tee "$OUT/09-node.txt"
kubectl describe node "$NODE" 2>/dev/null | tee "$OUT/10-describe-node.txt"
kubectl top node "$NODE" 2>/dev/null | tee "$OUT/11-top-node.txt"

# 7. 上层工作负载：rollout 卡住、副本反复重建、RS 无法扩容的判定
OWNER=$(kubectl -n "$NS" get pod "$POD" -o jsonpath='{.metadata.ownerReferences[0].kind}/{.metadata.ownerReferences[0].name}')
echo "owner=$OWNER" | tee "$OUT/12-owner.txt"
kubectl -n "$NS" describe "$OWNER" 2>/dev/null | tee "$OUT/13-describe-owner.txt"

# 8. 依赖面：引用的 ConfigMap/Secret/PVC 是否真的存在（CreateContainerConfigError 首查）
kubectl -n "$NS" get pod "$POD" -o jsonpath='{range .spec.containers[*].env[*]}{.name} <- {.valueFrom}{"\n"}{end}' > "$OUT/14-env-sources.txt"
kubectl -n "$NS" get cm,secret,pvc 2>/dev/null | tee "$OUT/15-config-objects.txt"
```

跑完看三个地方就能分流：
`06-conditions.txt`（调度/初始化卡在哪）→ `07-container-status.txt`（退出码与重启次数）→
`01-events.txt`（kubelet 给出的 `reason`，如 `FailedScheduling`/`FailedMount`/`Unhealthy`）。

## 从症状到状态：报障语言 → 排查入口

用户报障用的词和 `kubectl get pod` 显示的状态通常对不上。先用本表把报障翻译成排查入口。

| 报障原话 | 先跑什么 | 大概率落到哪 |
|---|---|---|
| "服务 502/503 了" | `kubectl -n $NS get endpointslices -l kubernetes.io/service-name=<svc>` | EndpointSlice 为空 → Pod 是 `Running` 但 `READY 0/1`（下方索引表 → `references/pod-state-trees.md` §5）；有 IP → Ingress/kube-proxy 层（`references/network-dns-triage.md` §6） |
| "接口超时，时好时坏" | `kubectl -n $NS get pods -l <sel> -o wide`（看是否部分副本 not-ready）+ `top pod` | 部分副本摘流量导致剩余副本过载 → OOM/限流；或 CPU throttling（`top` 接近 limits） |
| "刚发完版就挂了" | `kubectl -n $NS rollout status` + `rollout history` | `references/debug-tools-and-rollback.md` §3，先判定回滚还是修复 |
| "服务突然全没了" | `kubectl get nodes` + `kubectl get --raw='/readyz?verbose'` | 节点 NotReady 或控制面异常（`references/node-controlplane-storage.md` §1/§2） |
| "数据库/缓存连不上" | 在 Pod 内做 L0→L6 分层探测 | `references/network-dns-triage.md` §6 |
| "域名解析不了" | `kubectl -n $NS exec $POD -- nslookup <name>` | `references/network-dns-triage.md` §3 |
| "Pod 一直重启" | `get pod -o jsonpath` 取 `restartCount` + `lastState.terminated` | 靠退出码分流：`references/pod-state-trees.md` §3（CrashLoopBackOff）或 §4（OOMKilled） |
| "扩不上去 / 副本数不够" | `kubectl -n $NS describe rs <rs>` + `describe resourcequota` | `references/pod-state-trees.md` §1 根因 1.5（配额超限）；或 HPA 取不到指标 |
| "磁盘/存储挂载失败" | `kubectl -n $NS describe pvc` + `get volumeattachment` | `references/node-controlplane-storage.md` §3 |
| "只有某几台机器有问题" | 横向 diff 所有节点的 `describe node` 与运行时版本 | 配置漂移（`references/node-controlplane-storage.md` §1 末尾的对比循环） |

**一条经验**：报障里的"服务挂了"有超过一半其实是 `READY 0/1`——Pod 状态栏写着 `Running`，
所以看 `kubectl get pod` 的第一眼会以为一切正常。**永远看 READY 列的分数，不要只看 STATUS 列。**

## Pod 状态诊断索引表

先用本表分流，再去对应 reference 读完整判定树。每棵树给：含义 → 首查命令 →
3–6 个根因 → 每个根因的确认方法 → 修复动作 → 修复后如何验证。

| Pod 状态 | 一句话根因方向 | 首查命令 | 详细判定树 |
|---|---|---|---|
| `Pending` | 调度不上：资源不足 / 亲和与污点 / PVC 未绑定 / 配额超限 | `describe pod` 看 `FailedScheduling` message | `references/pod-state-trees.md` §1 |
| `ImagePullBackOff` / `ErrImagePull` | 镜像名或 tag 错 / 拉取凭证缺失或过期 / 私有仓库网络不通 / 架构不匹配（arm64 vs amd64） | `describe pod` 看 `Failed` event 的具体 err | `references/pod-state-trees.md` §2 |
| `CrashLoopBackOff` | 应用启动即失败 / 探针配错把它杀了 / 依赖未就绪 / 配置缺失；靠退出码先分流 | `logs --previous` + `lastState.terminated.exitCode` | `references/pod-state-trees.md` §3 |
| `OOMKilled`（exit 137） | memory limits 过低 / 内存泄漏 / JVM 堆与容器 limits 不匹配 | `lastState.terminated.reason` + `top pod` | `references/pod-state-trees.md` §4 |
| `Running` 但 `READY 0/1` | readiness 探针失败 / 探针端口与容器端口不匹配 / 依赖检查写在 readiness 里 | `describe pod` 的 `Unhealthy` event | `references/pod-state-trees.md` §5 |
| `Terminating` 长时间不消失 | finalizer 未摘 / preStop 或 terminationGracePeriod 过长 / 节点失联 kubelet 无法上报 | `get pod -o yaml` 看 `finalizers` 与 `deletionTimestamp` | `references/pod-state-trees.md` §6 |
| `CreateContainerConfigError` | 引用的 ConfigMap/Secret 或其 key 不存在；envFrom 指向已删对象 | `describe pod` event 里的对象名 | `references/pod-state-trees.md` §7 |
| `Evicted` | 节点 DiskPressure/MemoryPressure 触发驱逐 | `get pod -o yaml` 看 `status.message` | `references/node-controlplane-storage.md` §1 |
| `Init:0/1` 卡住 | initContainer 失败或等待条件永不满足（如 `wait-for-db`） | `logs <pod> -c <initContainer>` | `references/pod-state-trees.md` §3 |
| 节点 `NotReady` | kubelet / 容器运行时 / 磁盘 / 内存 / PID / CNI 之一 | `describe node` 的 `Conditions` | `references/node-controlplane-storage.md` §1 |
| Service 不通 / DNS 失败 | 无 Endpoint / CoreDNS 挂 / NetworkPolicy 误拦 / kube-proxy 模式差异 | `get endpointslices -l kubernetes.io/service-name=<svc>` | `references/network-dns-triage.md` |
| PVC 一直 `Pending` | StorageClass 不存在或 `volumeBindingMode: WaitForFirstConsumer` / CSI 驱动异常 / RWO 跨节点 | `describe pvc` | `references/node-controlplane-storage.md` §3 |
| rollout 卡住 | 新 RS 的 Pod 起不来（回到上表）/ progressDeadlineSeconds 到期 / PDB 阻塞 | `kubectl rollout status` + `get rs` | `references/debug-tools-and-rollback.md` §3 |

## 退出码速查

退出码决定 `CrashLoopBackOff` 的分流方向，先看它再看日志。

| exitCode | 含义 | 第一反应 |
|---|---|---|
| `0` | 正常退出——但容器主进程本该常驻 | 前台进程退出了：脚本跑完就 return、`sh -c` 里最后一条命令结束。用 `command`/`args` 检查是否有常驻进程 |
| `1` / `2` | 应用自身报错（未捕获异常、参数错误） | 看 `logs --previous` 的栈顶；配置/依赖缺失最常见 |
| `126` | 找到文件但不可执行 | 镜像里 entrypoint 没有 `+x` 权限，或挂载 volume 覆盖了可执行文件 |
| `127` | command not found | `command`/`args` 路径写错；distroless 镜像里根本没有 `sh` |
| `137` | `128 + 9` = SIGKILL | **两种可能，必须区分**：OOMKilled（看 `reason=OOMKilled`）或 liveness 探针失败后 kubelet 强杀（看 `Unhealthy` event）。仅凭 137 断言"内存不够"是常见误判 |
| `139` | `128 + 11` = SIGSEGV | 段错误：原生库/CGO 崩溃、镜像与节点 CPU 架构或 glibc 不匹配 |
| `143` | `128 + 15` = SIGTERM | 被优雅终止。若伴随 `restartCount` 上升，通常是 liveness 探针在杀它，或滚动更新中正常终止 |

## 探针三连

三种探针失败的**后果完全不同**，混用是级联故障的头号成因。

| 探针 | 失败后 kubelet 做什么 | 用户可见后果 | 里面该放什么 |
|---|---|---|---|
| `startupProbe` | 在成功前**屏蔽** liveness/readiness；超过 `failureThreshold × periodSeconds` 才判启动失败并重启 | 慢启动应用被 liveness 提前杀掉 | 与应用健康检查相同的端点，但给足时间预算 |
| `livenessProbe` | **重启容器**（不摘流量） | 反复重启 → CrashLoopBackOff → 全站抖动 | 只放「进程是否死锁/僵死」的自检，如 `/healthz` 返回进程内状态 |
| `readinessProbe` | 把 Pod 从 Service EndpointSlice 摘除，**不重启** | 503 / 无 Endpoint，但 Pod 仍是 Running | 放「能否正确服务一次请求」，可含依赖检查 |

**为什么 liveness 探针里绝不能放依赖检查**：数据库或下游短暂抖动 →
所有 Pod 的 liveness 同时失败 → kubelet 同时重启全部 Pod → 重启风暴打满节点、
连接池重建、缓存冷启动 → 下游压力更大 → 更长时间抖动。
一个下游 30 秒的抖动被放大成 10 分钟的全站不可用。
依赖不可用时正确行为是**摘流量（readiness 失败）**，等依赖恢复自动挂回，而不是重启。

参数怎么定（用数字，不用"合理值"）：

| 参数 | 定法 | 典型值 |
|---|---|---|
| `initialDelaySeconds` | 有 startupProbe 时**留 0**，交给 startupProbe；无 startupProbe 时设为「冷启动 P99 时间」 | 0（有 startup）/ 15–30（无 startup） |
| `periodSeconds` | liveness 10s、readiness 5s。readiness 要比 liveness 密，摘流量要快 | liveness 10 / readiness 5 |
| `timeoutSeconds` | 必须 < `periodSeconds`，否则探测堆积。默认 1s 对含 DB 查询的 readiness 偏紧 | 1–3 |
| `failureThreshold` | liveness 3（= 30s 才重启，容忍单次抖动）；readiness 2–3（= 10–15s 摘流量） | 3 |
| `successThreshold` | liveness/readiness 固定 1；只有 startupProbe 可调大 | 1 |
| startupProbe 预算 | `failureThreshold × periodSeconds` ≥ 冷启动 P99 × 2。例：`periodSeconds: 5, failureThreshold: 30` = 150s 预算 | 按实测冷启动定 |

## 时间线重建（最小可用）

定位「首个异常点」而不是「最响的报错」。把四类日志按**同一时钟**对齐：

1. 统一时区：`kubectl get events -o jsonpath` 出来的是 UTC；节点 `journalctl` 常是本地时区。
   先把两边都转成 UTC，否则时间线会错位几小时，得出完全错误的因果顺序。
2. 四个源：集群 Events（`01-events.txt`）→ Pod 日志（`03/04`）→ 节点日志
   （`journalctl -u kubelet --since`）→ 上游依赖日志（DB/下游服务/网关）。
3. 排序后找**最早的一条异常**，而不是最多的那条。级联故障里，最响的报错通常是受害者。
4. 对每个候选根因问一句：「它能不能解释所有观测到的现象？」
   不能解释的现象（例如只有 1/3 节点出问题）就是反证，用它排除假设。

完整对齐步骤、命令与一个填好的时间线样例见
`references/debug-tools-and-rollback.md` §2（当故障涉及多组件、需要判定因果顺序时读取）。

## references/ 路由

主干只放分流表和跨状态通用知识。命中下表任一情形时读对应文件：

| 文件 | 什么时候读 |
|---|---|
| `references/pod-state-trees.md` | 已从索引表定位到某个 Pod 状态，需要「根因 → 确认方法 → 修复 → 验证」的完整判定树（§1 Pending、§2 ImagePullBackOff、§3 CrashLoopBackOff、§4 OOMKilled、§5 Running-not-Ready、§6 Terminating、§7 CreateContainerConfigError） |
| `references/network-dns-triage.md` | 症状是"连不上/超时/502/503/DNS 解析失败"而非"Pod 起不来"；需要 Service 无 Endpoint、CoreDNS、NetworkPolicy、kube-proxy 模式的分层排查，或用临时 debug pod 做连通性验证 |
| `references/node-controlplane-storage.md` | 故障面超出单个 Pod：节点 NotReady/资源驱逐、控制面（apiserver/etcd/scheduler）异常的外部表征、PVC 一直 Pending、CSI 驱动异常、RWO 跨节点挂载失败、卷权限与 fsGroup |
| `references/debug-tools-and-rollback.md` | 需要给 distroless 镜像加临时调试容器、用 `kubectl debug node/` 上节点、重建跨组件时间线、判定 rollout 卡住原因、在金丝雀/蓝绿出问题时决定"回滚还是修复"，或写事故报告 |

## 产物

故障报告写到 `docs/analysis/INCIDENT-{service}-{date}.md`（`{date}` 用 `YYYYMMDD`）。
绝不写仓库根目录。模板与一个填好的样例见 `references/debug-tools-and-rollback.md` §4。

报告必须含六段：时间线（带时间戳与证据文件名）、根因（分层：触发 → 机制 → 放大条件）、
证据链（表格：证据 | 来源 | 说明了什么）、影响面（哪些服务/节点/用户，持续多久）、
修复动作（每条附「为什么」「如何验证」「风险」）、防复发项（可执行的告警或门禁，不是"加强意识"）。

## Key Principles

1. **取证先于动手**：`delete pod` / `rollout restart` / `edit` 在证据抓完前一律不执行——
   重启清空 `--previous` 日志与 `lastState`，Events 只留 1 小时，现场没了就只剩猜。
2. **一条可证伪假设才允许改线上**：写下「根因是 X，证据是 Y，做 Z 后 W 指标应在 N 分钟内变化」，
   写不出就继续取证。
3. **退出码先于日志**：137 必须区分 OOMKilled 与 liveness 强杀（看 `reason` 与 `Unhealthy` event），
   143 是 SIGTERM 不是崩溃，127 是镜像里没有那个可执行文件。
4. **liveness 只测自身，readiness 才测依赖**：liveness 里放依赖检查会把下游 30 秒抖动
   放大成 10 分钟全站重启风暴。
5. **多节点故障必须横向对比健康节点**：`describe node` 逐个 diff conditions、运行时配置、
   CNI 版本；单节点视角会漏掉"配置漂移"这类根因。
6. **修复的判据是验证命令，不是"看起来好了"**：每个修复动作必须配一条可重跑的验证命令
   （如 `kubectl rollout status` + `get endpointslices` 有 IP + 探针连续 N 次成功）。
7. **止血与根治分开记录**：先止血（回滚/扩容/摘流量）可以，但报告里必须写明
   止血动作掩盖了什么，以及根治项的 owner 与截止条件。

## Anti-Patterns

| 反模式 | 为什么错 | 正确做法 |
|---|---|---|
| 一上来 `kubectl delete pod` 试试 | 重建后 `--previous` 日志、`restartCount`、`lastState.terminated` 全部消失，故障变成不可复现 | 先跑「统一取证命令序列」（只读，< 60s），再决定动作 |
| 只看 `kubectl logs`，不看 `--previous` | CrashLoopBackOff 下当前容器刚重启，stdout 为空，会误判为"应用没报错，是 K8s 的问题" | `kubectl logs --previous`；镜像多容器时加 `-c <container>` |
| 见到 exit 137 就调大 memory limits | 137 = SIGKILL，可能是 liveness 探针在杀它。调大内存后仍会重启，且掩盖真因 | 看 `lastState.terminated.reason`：`OOMKilled` 才是内存；否则查 `Unhealthy` event 与探针配置 |
| liveness 探针写成"查一次数据库" | 依赖抖动 → 全部 Pod 同时重启 → 重启风暴 → 下游更抖，级联放大 | liveness 只测进程自身；依赖检查移到 readiness |
| `kubectl get events` 不加 `--sort-by` | 默认顺序不是时间序，最新的关键事件可能夹在中间被忽略 | `kubectl get events --sort-by=.lastTimestamp`（Events 仅保留约 1h，故障后要立刻抓） |
| 用 `kubectl get componentstatuses` 判断控制面健康 | 该 API 已废弃，只探 apiserver 到各组件的健康检查端点，不反映 etcd quorum、证书过期、真实可用性，且经常返回假阳性 | 直接查 `kubectl get --raw='/readyz?verbose'`、`kubectl get --raw='/livez?verbose'`，etcd 侧查 `etcdctl endpoint status` 与告警指标 |
| 节点 NotReady 就 `kubectl drain --force` | Pod 会因 `--force` 跳过优雅终止被强删，有状态服务可能丢数据；且节点可能只是网络分区，Pod 仍在跑（脑裂） | 先 `describe node` 定位 condition，确认节点上 Pod 的真实状态，再决定是否 drain 及是否加 `--ignore-daemonsets --delete-emptydir-data` |
| PVC Pending 就直接删 PVC 重建 | 若底层 PV 是 `Retain` 之外的回收策略，删 PVC 可能连带删数据 | 先 `describe pvc` + `get pv` 确认 `reclaimPolicy` 与绑定状态，快照/备份后再动 |
| Service 不通就先怀疑应用 | 大概率是 selector 与 Pod label 不匹配导致 EndpointSlice 为空，应用完全无辜 | 先 `get endpointslices -l kubernetes.io/service-name=<svc>`；为空则 diff `svc.spec.selector` 与 `pod.metadata.labels` |
| 在 distroless 镜像里 `kubectl exec -it ... sh` | 镜像里没有 shell，`exec` 直接报 `executable file not found`，被误判为"容器挂了" | 用 `kubectl debug -it <pod> --image={DEBUG_IMAGE} --target=<container>` 加临时容器 |
| 修完不做验证就关单 | "看起来好了"经常是流量低谷造成的假象，几小时后以更大规模复现 | 每个修复动作附一条可重跑验证命令，并观察至少一个完整业务周期 |
| 报告只写"内存泄漏，已扩容" | 扩容是止血不是根治，泄漏速率、触发条件、复发时间全部丢失 | 分层写：触发 → 机制 → 放大条件，并给出可执行的防复发项（告警阈值 / CI 门禁 / 压测基线） |
