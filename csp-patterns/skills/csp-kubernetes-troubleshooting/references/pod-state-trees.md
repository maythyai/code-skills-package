# Pod 状态判定树（详细展开）

每个状态给：含义 → 首查命令 → 根因表（确认方法 / 修复动作 / 修复后验证）。
修复动作一律在取证完成后执行；带 ⚠ 的动作会改变线上状态，需先确认可接受影响。

约定：`NS` = 命名空间，`POD` = Pod 名，`{REGISTRY}` = 你的镜像仓库地址（用环境变量注入，不要硬编码）。

---

## §1 `Pending` — 调度不上去

**含义**：Pod 已被 apiserver 接受，但 scheduler 找不到能放它的节点，或已放到节点上但
kubelet 还没成功创建容器（后者会先短暂 Pending 再转 `ContainerCreating`）。

**首查命令**（`FailedScheduling` 的 message 直接说明原因，不需要猜）：

```bash
kubectl -n "$NS" describe pod "$POD" | grep -A5 -E 'FailedScheduling|FailedCreate|Warning'
kubectl -n "$NS" get pod "$POD" -o jsonpath='{.status.conditions[?(@.type=="PodScheduled")]}'
kubectl get nodes -o custom-columns='NODE:.metadata.name,CPU:.status.allocatable.cpu,MEM:.status.allocatable.memory,PODS:.status.allocatable.pods'
```

| # | 根因 | 确认方法 | 修复动作 | 修复后验证 |
|---|---|---|---|---|
| 1.1 | 资源不足：message 含 `Insufficient cpu` / `Insufficient memory` | `kubectl describe nodes \| grep -A8 "Allocated resources"`，看 Requests 百分比。注意判定依据是 **requests 之和**而非实际用量——节点可能很闲但 requests 已满 | 降 requests（按实测 P50 重设）／加节点／给该 workload 单独的 nodeSelector。⚠ 调 requests 前先看 `kubectl top nodes` 确认真实水位 | `kubectl -n $NS get pod $POD -o wide` 出现 NODE 名；`describe nodes` 的 Requests% 回落 |
| 1.2 | 亲和/反亲和不满足：message 含 `node(s) didn't match Pod's node affinity/selector` | `kubectl get nodes --show-labels` 与 `pod.spec.affinity`／`nodeSelector` 逐条 diff。常见是 label 拼写、大小写、或新节点忘打 label | 给节点补 label（⚠ 会触发其他 Pod 重调度）／修正 selector／把 `requiredDuringScheduling` 降级为 `preferredDuringScheduling` | `get pod -o wide` 有 NODE；`describe pod` 不再出现 `FailedScheduling` |
| 1.3 | 污点未被容忍：message 含 `node(s) had untolerated taint` | `kubectl describe node <n> \| grep -i taints` 与 `pod.spec.tolerations` 对比。`node.kubernetes.io/not-ready`、`unreachable`、`disk-pressure` 等系统污点也在此列 | 加对应 `tolerations`（含 `effect`，`NoSchedule` 与 `NoExecute` 不能混）／若是系统污点则先修节点 | `get pod -o wide` 有 NODE |
| 1.4 | PVC 未绑定：Pod 卡在 `Pending` 且 event 是 `FailedAttachVolume` / `unbound immediate PersistentVolumeClaim` | `kubectl -n $NS get pvc`；`describe pvc` 看 provision 失败原因。`WaitForFirstConsumer` 的 StorageClass 会让 PVC 在 Pod 调度前**故意**保持 Pending | 见 `references/node-controlplane-storage.md` §3 的 PVC 原因树 | `get pvc` 为 `Bound`；Pod 转 `ContainerCreating` |
| 1.5 | ResourceQuota / LimitRange 超限：event 是 `FailedCreate ... exceeded quota` | `kubectl -n $NS describe resourcequota`；`kubectl -n $NS get limitrange -o yaml`。注意这是 **ReplicaSet 层**报错，`describe pod` 可能看不到，要 `describe rs` | 提额度／降副本数／给 Pod 补上 LimitRange 要求的 requests+limits（缺失时 LimitRange 会拒绝） | `describe rs` 无 `exceeded quota`；新 Pod 被创建 |
| 1.6 | 拓扑分布约束（`topologySpreadConstraints`）无解：message 含 `didn't match pod topology spread constraints` | 数一下各 zone/node 上匹配 label 的 Pod 数量，`maxSkew` 是否已不可满足。单可用区集群里写 `topology.kubernetes.io/zone` 的 `DoNotSchedule` 必然全 Pending | 加 `whenUnsatisfiable: ScheduleAnyway`／放宽 `maxSkew`／补齐 zone label | `get pod -o wide` 有 NODE |
| 1.7 | Pod 数超过节点 `pods` 上限（默认 110，CNI 可能更低） | `describe node \| grep -i "Non-terminated Pods"` 数一下；message 含 `Too many pods` | 把 Pod 分散到更多节点／提高该节点的 `--max-pods`（⚠ 需评估 CNI IP 池容量） | 新 Pod 落到其他节点 |

**Pending 的通用判定顺序**：读 `FailedScheduling` message → 按 message 关键字落到上表某一行 →
只改那一行。**不要**同时调 requests、加 tolerations、改 affinity——三个一起改就无法知道是哪个生效。

---

## §2 `ImagePullBackOff` / `ErrImagePull`

**含义**：kubelet 调容器运行时拉镜像失败。`ErrImagePull` 是首次失败，
`ImagePullBackOff` 是进入指数退避（10s → 20s → … 上限 5min），所以看到 BackOff 说明已失败多次。

**首查命令**（event 里的错误字符串区分度极高，直接决定走哪一行）：

```bash
kubectl -n "$NS" describe pod "$POD" | grep -A3 -E 'Failed|Back-off|pull'
kubectl -n "$NS" get pod "$POD" -o jsonpath='{.spec.containers[*].image}{"\n"}{.spec.imagePullSecrets[*].name}{"\n"}'
```

| # | 根因 | event 关键字 / 确认方法 | 修复动作 | 修复后验证 |
|---|---|---|---|---|
| 2.1 | 镜像名或 tag 不存在 | `manifest unknown` / `not found` / `repository does not exist`。把 image 串逐字符核对，重点看：`{REGISTRY}` 前缀、项目名、`:` 与 tag、有无误写 `@sha256:` | 改成正确 tag；生产建议用 `@sha256:<digest>` 固定，避免 `latest` 漂移 | `describe pod` 无 `Failed to pull`；Pod 进 `ContainerCreating` |
| 2.2 | 拉取凭证缺失/过期 | `unauthorized` / `authentication required` / `pull access denied`。查 `kubectl -n $NS get secret`，确认 Secret 类型是 `kubernetes.io/dockerconfigjson`、**在 Pod 所在命名空间**、且被 `spec.imagePullSecrets` 或 ServiceAccount 引用 | 重建 dockerconfigjson Secret（凭证轮换后最常见）；把 `imagePullSecrets` 挂到 ServiceAccount 上而非每个 Pod | `kubectl -n $NS get secret <s> -o jsonpath='{.data.\.dockerconfigjson}' \| base64 -d` 能解出正确 auth；Pod 拉取成功 |
| 2.3 | 私有仓库网络不通 | `dial tcp ... i/o timeout` / `connection refused` / `no such host`。在节点上验证而不是在本机：`kubectl debug node/<node> -it --image={NET_DEBUG_IMAGE} -- nc -vz {REGISTRY} 443` | 放通节点出口到仓库的 443／配代理（containerd 的 `systemd` drop-in 里设 `HTTPS_PROXY`）／改用集群内可达的 mirror | 节点侧 `nc -vz` 通；Pod 拉取成功 |
| 2.4 | CPU 架构不匹配（arm64 vs amd64） | `exec format error`（这条其实是**启动**失败而非拉取失败，常与 2.5 混淆）／或拉取报 `no matching manifest for linux/arm64/v8`。查节点架构：`kubectl get nodes -o custom-columns='N:.metadata.name,ARCH:.status.nodeInfo.architecture'` | 构建 multi-arch manifest list（`docker buildx --platform linux/amd64,linux/arm64`）／给 workload 加 `nodeAffinity` 锁定架构 | `get nodes` 的 ARCH 与镜像 platform 一致；容器进入 Running |
| 2.5 | TLS 证书不被信任 | `x509: certificate signed by unknown authority`。自签仓库最常见 | 把 CA 分发到节点的 `/etc/containerd/certs.d/{REGISTRY}/ca.crt`（containerd）或 `/etc/docker/certs.d/`，重启运行时。⚠ **不要**配 `insecure_skip_verify` | 节点侧 `openssl s_client -connect {REGISTRY}:443 -CAfile <ca>` 验证通过 |
| 2.6 | 镜像过大 / 拉取超时 / 磁盘不足 | `context deadline exceeded` / `no space left on device`。查 `describe node` 的 `DiskPressure` 与运行时数据目录用量 | 瘦身镜像（多阶段构建、distroless）／扩容节点磁盘／清理无用镜像 | `df -h` 运行时分区 < 80%；拉取在退避窗口内完成 |
| 2.7 | `imagePullPolicy: Always` + 仓库限流 | `toomanyrequests` / `rate limit`。公共仓库对匿名拉取有配额 | 改用私有 mirror／配仓库凭证／非必要不用 `Always`（用 digest 时 `IfNotPresent` 足够） | 拉取不再返回 429 |

**注意**：`ImagePullBackOff` 有退避，改完 Secret 后 Pod 不会立刻重试，最多等 5 分钟。
需要立刻验证时，⚠ 可以删掉这一个 Pod 让上层控制器重建（**只在已抓完取证后**）。

---

## §3 `CrashLoopBackOff`

**含义**：容器启动后退出（或 liveness 把它杀了），kubelet 按指数退避重启，
退避上限 5 分钟。`CrashLoopBackOff` 是**症状**，真正的信息在退出码和上一次日志里。

**首查命令**（三步定性）：

```bash
# 1. 退出码 + 是否 OOM —— 决定分流方向
kubectl -n "$NS" get pod "$POD" -o jsonpath='{range .status.containerStatuses[*]}{.name}: exit={.lastState.terminated.exitCode} reason={.lastState.terminated.reason} signal={.lastState.terminated.signal} restarts={.restartCount}{"\n"}{end}'
# 2. 崩溃前日志（当前容器已重启，不加 --previous 只会看到空输出）
kubectl -n "$NS" logs "$POD" --previous --tail=200
# 3. 是不是探针杀的：有 Unhealthy 就说明是 liveness
kubectl -n "$NS" describe pod "$POD" | grep -A2 -E 'Unhealthy|Liveness|Readiness|Killing'
```

**按退出码分流**（详见 SKILL.md「退出码速查」）：

- `exit=1/2` 且无 `Unhealthy` → 根因 3.1 / 3.4（应用自身报错）
- `exit=137` 且 `reason=OOMKilled` → 走 §4
- `exit=137` 且 `reason` 为空、有 `Unhealthy: Liveness probe failed` → 根因 3.2
- `exit=143` → 根因 3.2 或外部 SIGTERM
- `exit=127` → 根因 3.5（镜像里没有那个可执行文件）
- `exit=0` 但 `restartCount` 上升 → 根因 3.6（主进程不是常驻进程）

| # | 根因 | 确认方法 | 修复动作 | 修复后验证 |
|---|---|---|---|---|
| 3.1 | 依赖未就绪（DB/缓存/下游）导致启动即失败 | `logs --previous` 出现 `connection refused` / `ECONNREFUSED` / `timeout` 且指向依赖地址。手动验连通：`kubectl debug -it $POD --image={NET_DEBUG_IMAGE} --target=<c> -- nc -vz <dep-host> <port>` | **不要在应用里硬重试到死**：加 `startupProbe` 给足启动预算／用 initContainer 做 wait-for-dependency／应用侧加带上限的退避重连 | `restartCount` 停止增长；`logs` 出现"依赖已连接"类日志 |
| 3.2 | 探针配置错误，liveness 在杀健康进程 | `describe pod` 有 `Liveness probe failed: ...` + `Killing container`。典型：`initialDelaySeconds` 小于冷启动时间、`timeoutSeconds: 1` 对一个含 DB 查询的端点、探针路径写成 404 | 加 `startupProbe`（`periodSeconds × failureThreshold` ≥ 冷启动 P99 × 2）／把 liveness 换成进程内自检／放宽 timeout。⚠ 改探针属于改线上，先取证 | 连续观察 ≥ 10 分钟 `restartCount` 不变；`describe pod` 无 `Unhealthy` |
| 3.3 | 配置缺失或错误（环境变量/挂载文件） | `logs --previous` 报 `KeyError` / `env not set` / `no such file`。核对：`kubectl -n $NS get pod $POD -o jsonpath='{.spec.containers[0].env}'` 与 ConfigMap 实际 key 逐个 diff | 补 ConfigMap/Secret 的正确 key；`envFrom` 换 `valueFrom.configMapKeyRef` + `optional: false` 让缺失**在部署时**就失败而不是运行时 | Pod Running；应用日志出现正确配置加载记录 |
| 3.4 | 应用启动崩溃（代码/依赖版本/权限） | `logs --previous` 有栈。若无栈且立刻退出，用临时容器手动跑 entrypoint：`kubectl debug -it $POD --image={DEBUG_IMAGE} --target=<c> --copy-to=<pod>-dbg -- sh` | 修代码／回滚到上一个已知良好版本（见 `references/debug-tools-and-rollback.md` §3） | 新版本 Pod `READY 1/1` 且 `restartCount=0` |
| 3.5 | `command`/`args` 指向不存在的可执行文件 | `exit=127` + event `failed to start container ... executable file not found`。distroless 镜像里没有 `sh`、`ls`、`cat` 是最常见踩坑 | 修正路径；确认二进制在镜像里存在（本地 `docker run --rm --entrypoint="" <image> ls -l <path>`） | 容器进入 Running |
| 3.6 | 主进程不是常驻进程，跑完就退出 | `exit=0`、`restartCount` 持续上升、`logs` 显示脚本正常执行完毕 | 前台运行（不要用 `&`/`nohup`/`systemd`）；长驻服务用 `tail -f /dev/null` 只是权宜，正确做法是让进程本身前台阻塞 | Pod 稳定 Running ≥ 15 分钟 |
| 3.7 | 卷挂载权限/属主不对导致写失败 | `logs --previous` 报 `permission denied` 且路径是挂载点。`kubectl exec` 进去（或用 debug 容器）`ls -ln <mountpath>` 看 uid/gid | 设 `securityContext.fsGroup`／`runAsUser`／`initContainer` 里 `chown`。详见 `references/node-controlplane-storage.md` §4 | 应用能写入挂载路径；无 permission denied |
| 3.8 | `Init:0/1` 卡住（initContainer 永不成功） | `kubectl -n $NS logs $POD -c <initContainerName>`；`get pod -o jsonpath='{.status.initContainerStatuses}'` | 修 initContainer 逻辑；给 wait-for-* 类 initContainer 加**超时上限**，否则依赖永久不可用时 Pod 会无限等待并掩盖真实故障 | `get pod` 的 `INIT` 列为 `0/0` 或已完成 |

---

## §4 `OOMKilled`（exit 137 + reason=OOMKilled）

**含义**：容器 cgroup 内存用量超过 `limits.memory`，被内核 OOM killer 杀掉。
`reason` 字段是判据；只有 137 而没有 `OOMKilled` 就不是内存问题（多半是 liveness 强杀）。

**首查命令**：

```bash
kubectl -n "$NS" get pod "$POD" -o jsonpath='{range .status.containerStatuses[*]}{.name}: reason={.lastState.terminated.reason} exit={.lastState.terminated.exitCode}{"\n"}{end}'
kubectl -n "$NS" get pod "$POD" -o jsonpath='{.spec.containers[*].resources}{"\n"}'
kubectl -n "$NS" top pod "$POD" --containers
# 节点侧：是否整机内存压力（会连带触发 Evicted，而不只是 OOMKilled）
kubectl describe node "$NODE" | grep -A6 -E 'Conditions|Allocated resources'
```

**关键区分**：`OOMKilled`（超容器 limits，单容器被杀）≠ 节点内存耗尽驱逐
（`Evicted`，`describe node` 出现 `MemoryPressure=True`）≠ 内核全局 OOM
（`dmesg` 里有 `Out of memory: Killed process`，可能杀的不是你的容器）。

| # | 根因 | 确认方法 | 修复动作 | 修复后验证 |
|---|---|---|---|---|
| 4.1 | limits 定得过低 | 对比 `top pod` 的稳态用量与 limits。经验阈值：稳态 > limits 的 80% 就是没有余量；P99 峰值应 ≤ limits 的 75% | 按 **requests = P50 实测、limits = P99 × 1.5** 重设。⚠ 无脑调大 limits 会推迟问题、并把 OOM 从单容器扩散到整节点 | 连续 24h（含业务高峰）无 `OOMKilled`；`top pod` 峰值 < limits × 0.75 |
| 4.2 | 真内存泄漏 | 用量随时间单调上升且不随流量回落。取两个时间点的指标做差：`kubectl top pod` 隔 1h 采两次；应用侧抓 heap dump 对比对象数 | 抓 heap dump / pprof profile 定位；修复前**先加告警**（内存斜率）而不是先扩 limits | 相同流量下内存曲线变平；heap 中可疑对象数不再增长 |
| 4.3 | JVM 堆与容器 limits 不匹配 | Java 进程 RSS 远超 `-Xmx`。原因：堆外内存（Metaspace、线程栈、DirectByteBuffer、GC 结构）不计入 `-Xmx` | `-Xmx` 设为 limits 的 **50–70%**（留堆外余量）；或 JDK 10+ 用 `-XX:MaxRAMPercentage=60`；显式限制 `-XX:MaxDirectMemorySize`、`-Xss`；确认 JVM 能识别 cgroup（JDK 8u191+ / `-XX:+UseContainerSupport`） | 容器 RSS < limits × 0.8；`jcmd <pid> VM.native_memory summary` 各区域之和可解释 |
| 4.4 | Go/其他 runtime 不归还内存 | Go 的 `GOGC` 默认 100，堆会涨到活跃对象的 2 倍才 GC，且归还给 OS 有延迟，RSS 看起来像泄漏 | 设 `GOMEMLIMIT` 为 limits 的 80%（软上限，触发更积极 GC）；必要时降 `GOGC` | RSS 稳定在 `GOMEMLIMIT` 附近 |
| 4.5 | 单次大操作打爆（大文件全量读入、无分页查询、大批量导入） | 崩溃时间与某类请求/定时任务强相关。`logs --previous` 最后一条正在处理什么 | 流式处理／分页／限制单批大小／把大任务拆到独立 Job 并给它单独的高 limits | 触发同类操作不再 OOM |
| 4.6 | Sidecar 与主容器共享 limits 认知偏差 | `top pod --containers` 分容器看。多容器 Pod 里每个容器**各自**有 limits，不是共享池 | 给每个容器单独设合理的 limits；注意 `kubectl top pod`（不带 `--containers`）显示的是 Pod 汇总 | 每个容器的用量都在各自 limits 内 |

**修完必须做的验证**：`kubectl -n $NS get pod $POD -o jsonpath='{.status.containerStatuses[0].restartCount}'`
记录当前值，观察一个完整业务高峰周期后再取一次——数值不变才算修好。

---

## §5 `Running` 但 `READY 0/N`

**含义**：容器进程活着，但 readiness 探针没通过，Pod 被从 Service 的 EndpointSlice 摘除。
用户侧表现是 503 / 无后端，而 `kubectl get pod` 看着"正常"——最容易被忽略的状态。

**首查命令**：

```bash
kubectl -n "$NS" describe pod "$POD" | grep -A3 'Unhealthy'
kubectl -n "$NS" get pod "$POD" -o jsonpath='{.spec.containers[*].readinessProbe}{"\n"}'
# 从 Pod 自己的网络命名空间里打一次探针，区分"应用没监听"与"探针配错"
kubectl -n "$NS" exec "$POD" -c <container> -- wget -qO- --timeout=2 http://127.0.0.1:<port><probePath>
```

| # | 根因 | 确认方法 | 修复动作 | 修复后验证 |
|---|---|---|---|---|
| 5.1 | 探针端口与容器实际监听端口不匹配 | `describe pod` 的 `Unhealthy` 里是 `connection refused`。对比 `readinessProbe.httpGet.port`（或 `containerPort` 名）与应用真实监听端口；进 Pod `ss -ltnp` 或 `netstat -ltn` 看实际监听 | 统一端口来源：用**命名端口**（`port: http`）而非数字，避免两处硬编码漂移 | `READY 1/1`；`get endpointslices -l kubernetes.io/service-name=<svc>` 有该 Pod IP |
| 5.2 | 探针路径返回非 2xx/3xx | `Unhealthy` 里是 `HTTP probe failed with statuscode: 404/500`。手动打一次看返回什么 | 修路径（常见：应用加了 context path 如 `/api`，探针还是 `/healthz`）；500 说明健康检查自己依赖的东西挂了，回到 5.3 | 手动 curl 返回 200；`READY 1/1` |
| 5.3 | readiness 里的依赖检查失败（DB/缓存/下游） | 应用日志显示依赖连接失败；健康端点返回体里带 `{"db":"down"}` 之类明细 | 先修依赖（这是 readiness 的**正确**用法，它在保护用户）。若依赖是可选的，把它从 readiness 里移出，只保留在 metrics | 依赖恢复后 Pod 自动回到 `READY 1/1`，无需重启 |
| 5.4 | 应用还在初始化（加载模型/预热缓存），探针预算不够 | `Unhealthy` 从容器启动就连续出现，之后自行恢复 | 加 `startupProbe` 覆盖初始化期；或调大 readiness 的 `failureThreshold` | 启动期不再出现反复摘挂流量 |
| 5.5 | `timeoutSeconds` 太紧 | `Unhealthy` 里是 `context deadline exceeded`，但手动 curl 稳定返回（只是慢） | `timeoutSeconds` 提到 2–3（仍须 < `periodSeconds`）；同时查应用为什么慢 | 无 timeout 类 `Unhealthy` |
| 5.6 | 应用只监听 `127.0.0.1` 以外的地址／或只监听 IPv6 | 进 Pod `ss -ltn` 看监听地址是 `0.0.0.0:<port>` 还是 `127.0.0.1:<port>`；kubelet 探测走 Pod IP，只听 loopback 会失败 | 应用绑定 `0.0.0.0`；或探针改用 `httpGet` 配 `Host` 头 | `READY 1/1` |
| 5.7 | exec 型探针依赖镜像里不存在的命令 | `Unhealthy` 里是 `executable file not found`。distroless/alpine 精简镜像常没有 `sh`、`curl`、`wget` | 改用 `httpGet`/`tcpSocket` 探针；或应用自带一个健康检查二进制 | `READY 1/1` |

**注意**：Pod `READY 0/1` 但 Deployment 显示 `AVAILABLE 0`，说明**所有**副本都没就绪——
这时优先怀疑「配置/依赖/镜像版本」这类共性原因，而不是单 Pod 偶发。
用 `kubectl -n $NS get pods -l <selector> -o wide` 看是否全军覆没。

---

## §6 `Terminating` 卡住

**含义**：`deletionTimestamp` 已设，但 Pod 在 `terminationGracePeriodSeconds`（默认 30s）后仍未消失。

**首查命令**：

```bash
kubectl -n "$NS" get pod "$POD" -o jsonpath='{.metadata.deletionTimestamp}{"\n"}{.metadata.finalizers}{"\n"}{.spec.terminationGracePeriodSeconds}{"\n"}'
kubectl -n "$NS" describe pod "$POD" | grep -A3 -E 'Killing|preStop|Failed'
kubectl -n "$NS" get pod "$POD" -o jsonpath='{.spec.containers[*].lifecycle}{"\n"}'
NODE=$(kubectl -n "$NS" get pod "$POD" -o jsonpath='{.spec.nodeName}'); kubectl get node "$NODE"
```

| # | 根因 | 确认方法 | 修复动作 | 修复后验证 |
|---|---|---|---|---|
| 6.1 | finalizer 未摘除 | `.metadata.finalizers` 非空。控制器崩溃/无权限时，它永远不会摘 | 修好那个控制器（首选）；确认控制器确实已不存在后，⚠ `kubectl -n $NS patch pod $POD -p '{"metadata":{"finalizers":null}}' --type=merge`。**强摘 finalizer 会跳过清理逻辑**（如云负载均衡器解绑、外部资源释放），可能留下孤儿资源与持续计费 | Pod 消失；确认外部资源（LB/卷/DNS 记录）也已释放 |
| 6.2 | preStop hook 或应用优雅关闭耗时超过宽限期 | `.spec.containers[*].lifecycle.preStop` 存在；应用日志显示"正在处理剩余请求"。`terminationGracePeriodSeconds` 到期后 kubelet 发 SIGKILL，但 Pod 对象仍会正常消失——若**没消失**则不是这条 | 让 `preStop 时长 + 应用关闭 P99` < `terminationGracePeriodSeconds`；调大宽限期给足时间 | 正常滚动更新时 Pod 在宽限期内消失，无 SIGKILL 记录 |
| 6.3 | 节点失联（`NotReady`/`unreachable`），kubelet 无法上报删除完成 | `kubectl get node $NODE` 为 `NotReady`。此时 apiserver 不敢确认 Pod 真的停了——**Pod 可能仍在该节点上运行**（脑裂） | 先修节点（见 `references/node-controlplane-storage.md` §1）。⚠ 对有状态服务**绝不能**直接 `delete pod --force --grace-period=0`，会造成同一卷被两处挂载、数据双写损坏 | 节点回 `Ready`；Pod 自然消失 |
| 6.4 | 卷卸载/detach 卡住 | event 有 `FailedMount` / `VolumeDetach` 相关；`kubectl get volumeattachment` 有残留条目 | 查 CSI 驱动 Pod 是否健康（`kubectl -n kube-system get pods -l <csi-label>`）；确认云侧卷已 detach 后清理 VolumeAttachment。⚠ 手动删 VolumeAttachment 前先确认节点上真的没在用 | `volumeattachment` 清空；Pod 消失 |
| 6.5 | 容器进程忽略 SIGTERM | 应用日志在收到 SIGTERM 后无任何关闭动作，直到被 SIGKILL | 应用处理 SIGTERM 并主动退出；或用 `preStop: exec: sleep 5` 给连接排空留时间（配合上游 EndpointSlice 更新延迟） | 关闭日志出现；Pod 在宽限期内退出 |

**`--force --grace-period=0` 的使用边界**：只对**无状态**且**已确认节点上进程真的死了**
（例如节点已被销毁、或通过带外方式确认）的 Pod 使用。有状态服务（数据库、带 PVC 的 StatefulSet）
强删是数据损坏的经典成因。

---

## §7 `CreateContainerConfigError`

**含义**：容器创建阶段解析配置失败——几乎都是引用的 ConfigMap/Secret 或其 key 不存在。
（`RunContainerError` 是运行时启动失败，方向不同，见 §3.5。）

**首查命令**：

```bash
kubectl -n "$NS" describe pod "$POD" | grep -A3 -E 'CreateContainerConfigError|Error|configmap|secret'
# 把 Pod 引用的所有配置对象名列出来，逐个核对是否存在
kubectl -n "$NS" get pod "$POD" -o json | \
  python3 -c 'import json,sys;p=json.load(sys.stdin)
for c in p["spec"]["containers"]:
    for e in c.get("env",[]):
        vf=e.get("valueFrom",{})
        for k in ("configMapKeyRef","secretKeyRef"):
            if k in vf: print(k, vf[k]["name"], vf[k].get("key"), "optional=",vf[k].get("optional"))
    for s in c.get("envFrom",[]):
        for k in ("configMapRef","secretRef"):
            if k in s: print(k, s[k]["name"], "optional=",s[k].get("optional"))
    for v in p["spec"].get("volumes",[]):
        for k in ("configMap","secret"):
            if k in v: print("volume",k,v[k].get("name") or v[k].get("secretName"))'
kubectl -n "$NS" get cm,secret
```

| # | 根因 | 确认方法 | 修复动作 | 修复后验证 |
|---|---|---|---|---|
| 7.1 | ConfigMap/Secret 不存在（被删、或从没在这个命名空间创建） | event 明确写 `configmap "X" not found` / `secret "X" not found`。上表输出与 `get cm,secret` 结果 diff | 创建缺失对象（优先走 GitOps/IaC，不要手 `kubectl create` 造成配置漂移）；多命名空间部署时确认每个 ns 都有 | `describe pod` 无该 error；Pod 进 `ContainerCreating` → `Running` |
| 7.2 | 对象存在但 **key** 不存在 | event 写 `couldn't find key Y in ConfigMap ns/X` | 补 key；或把 `optional: true` 让缺失可容忍（仅当应用真有默认值时） | 同上 |
| 7.3 | Secret 的 data 不是合法 base64 | `kubectl -n $NS get secret X -o jsonpath='{.data.Y}' \| base6 -d` 解码失败。常见于手工 `kubectl apply` 时把明文写进了 `data:` 而非 `stringData:` | 用 `stringData:` 写明文，或用 `kubectl create secret generic --from-literal` | base64 解码成功且内容正确 |
| 7.4 | RBAC：kubelet / ServiceAccount 无权读该 Secret | event 含 `forbidden`。启用了 Secret 加密或外部 Secret 存储（如外部 KMS 提供器）时常见 | 补 Role/RoleBinding；确认外部 Secret 提供器的同步任务已成功（对象存在但内容为空也是这类） | `kubectl auth can-i get secrets -n $NS --as=system:serviceaccount:$NS:<sa>` 返回 yes |
| 7.5 | volume 引用的 ConfigMap/Secret 不存在导致挂载失败 | event 是 `FailedMount` + `MountVolume.SetUp failed for volume "v" : configmap "X" not found` | 同 7.1；注意 `volumes[].configMap.items` 里列的 key 也必须存在 | Pod 挂载成功并进入 Running |

**防复发**：把「Pod 引用的 ConfigMap/Secret 是否存在」变成部署前门禁——
`kubectl apply --dry-run=server` 能在服务端校验阶段就报出缺失引用，
比等 Pod 起不来再查早一整个发布周期。
