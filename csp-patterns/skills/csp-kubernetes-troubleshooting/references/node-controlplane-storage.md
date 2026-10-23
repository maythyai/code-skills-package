# 节点、控制面与存储排查

单 Pod 视角看不出问题时读这里：故障面覆盖整节点、控制面组件、或存储供给链路。

约定：`{REGISTRY}` = 镜像仓库地址（环境变量注入）；节点侧命令通过
`kubectl debug node/<name>` 或（有 SSH 通道时）直接登录执行——**先取证，不要重启节点**。

---

## §1 节点：NotReady 与资源压力驱逐

### NotReady 的排查顺序

按"最常见且最易确认"排序。每一步都是一条命令，命中即停。

```bash
NODE=<node-name>
kubectl describe node "$NODE" | sed -n '/Conditions:/,/Addresses:/p'   # 哪个 condition 是 True/Unknown
kubectl get node "$NODE" -o jsonpath='{range .status.conditions[*]}{.type}={.status} reason={.reason} lastTransition={.lastTransitionTime}{"\n"}{end}'
```

| 顺序 | 检查项 | 命令 | 判定 |
|---|---|---|---|
| 1 | kubelet 是否活着 | 节点上 `systemctl status kubelet`；`journalctl -u kubelet --since "-30m" \| grep -iE 'error\|fail\|panic\|certificate'` | 服务 dead → 直接根因。running 但日志报 `x509: certificate has expired` → kubelet 客户端证书过期（`RotateKubeletClientCertificate` 未开或 CSR 未被批准：`kubectl get csr` 有大量 `Pending`） |
| 2 | 容器运行时是否健康 | `systemctl status containerd`（或对应运行时）；`crictl ps`、`crictl info \| grep -i runtimeReady` | `crictl ps` 挂住/超时 = 运行时无响应，kubelet 必然报 NotReady。**注意**：`RuntimeReady=true` 不代表运行时**配置**正确，只代表能应答 |
| 3 | 磁盘压力 | `df -h`（重点看运行时数据目录 `/var/lib/containerd`、kubelet 目录 `/var/lib/kubelet`、日志目录 `/var/log`）；`df -i` 看 inode | `DiskPressure=True` 的默认阈值：可用 < 10%（`nodefs.available<10%`）或 inode < 5%（`nodefs.inodesFree<5%`）。容器日志撑爆磁盘是最常见成因 |
| 4 | 内存压力 | `free -m`；`dmesg \| grep -i "out of memory"` | `MemoryPressure=True` 阈值 `memory.available<100Mi`。`dmesg` 有全局 OOM 记录说明内核在杀进程，可能杀掉的正是运行时 |
| 5 | PID 压力 | `ps -eLf \| wc -l`；`cat /proc/sys/kernel/pid_max` | `PIDPressure=True` 阈值 `pid.available<1000`。容器内线程泄漏（未复用连接池、每请求起线程）会耗尽节点 PID |
| 6 | 网络插件（CNI） | `kubectl -n kube-system get pods -o wide \| grep "$NODE"`；该节点上 CNI Pod 的日志；节点上 `ls /etc/cni/net.d/`、`ip route` | CNI DaemonSet 在该节点没起来 / 崩溃 → kubelet 报 `cni plugin not initialized`，新建 Pod 全部卡 `ContainerCreating`。`/etc/cni/net.d/` 为空或存在多份冲突配置是典型 |
| 7 | 时间同步 | `timedatectl`；`chronyc tracking` 或等价命令 | 节点时钟偏差 > 数十秒会导致 TLS 握手失败、证书"未生效/已过期"、日志时间线错乱 |
| 8 | 节点到 apiserver 的连通 | 节点上 `curl -sk --max-time 5 https://{APISERVER_ENDPOINT}:6443/healthz` | 不通 = 网络分区或 apiserver/LB 问题。**此时节点上的 Pod 很可能仍在正常运行**（脑裂），不要据此判定业务已停 |

**横向对比是节点排障的核心手段**：多节点集群里，把故障节点与健康节点的
`describe node` 输出、运行时版本（`crictl version`）、CNI 版本、内核参数并排 diff。
"配置漂移"类根因（只有一个节点的运行时参数与他人不同）在单节点视角下**永远看不出来**。

```bash
for n in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  echo "== $n"
  kubectl get node "$n" -o jsonpath='{.status.nodeInfo.containerRuntimeVersion} {.status.nodeInfo.kernelVersion} {.status.nodeInfo.kubeletVersion}{"\n"}'
done
```

### 资源压力驱逐（Evicted）

Pod 状态为 `Evicted` 时，Pod 对象**不会被自动删除**，会一直留着作为证据。

```bash
kubectl -n "$NS" get pod "$POD" -o jsonpath='{.status.reason}{"\n"}{.status.message}{"\n"}'
kubectl -n "$NS" get pods --field-selector=status.phase=Failed -o wide   # 列出所有被驱逐的
```

`status.message` 会直接写明是哪种压力：`The node was low on resource: memory` /
`ephemeral-storage` / `DiskPressure`。驱逐优先级由 QoS 决定：
`BestEffort`（无 requests）最先被驱逐 → `Burstable`（requests < limits，超 requests 的部分越多越危险）→ `Guaranteed`（requests == limits）最后。
**长期修复是把关键服务的 QoS 提到 Guaranteed**，而不是给节点加内存。

清理已驱逐的 Pod 对象（⚠ 这是删除操作，但删的是已终止的证据 Pod，取证完成后再做）：

```bash
kubectl -n "$NS" delete pods --field-selector=status.phase=Failed
```

---

## §2 控制面

### `kubectl get componentstatuses` 的局限

**不要用它判断控制面健康。** 原因：

- 该 API 已废弃（自 1.19 起 deprecated），托管集群上常直接返回 `NotFound` 或全 `Healthy` 的假象。
- 它只反映 apiserver 到各组件健康检查端点的**探测结果**，不代表组件真的能服务。
- 不反映 etcd quorum 状态、证书有效期、apiserver 自身过载。

替代方案：

```bash
# apiserver 自身健康（逐条列出各 healthz 检查项，最有用）
kubectl get --raw='/readyz?verbose'
kubectl get --raw='/livez?verbose'
kubectl get --raw='/healthz?verbose'

# apiserver 是否能正常服务写请求（只读探测掩盖不了 etcd 问题）
kubectl auth can-i --list >/dev/null && echo "authz ok"
kubectl create ns healthcheck-probe-$(date +%s) --dry-run=server -o name   # 服务端 dry-run，不真创建

# 各控制面组件的 Pod 状态（自建集群；托管集群不可见，改看云侧控制台与指标）
kubectl -n kube-system get pods -l 'component in (kube-apiserver,kube-controller-manager,kube-scheduler,etcd)' -o wide
kubectl -n kube-system logs -l component=kube-apiserver --tail=200 | grep -iE 'error|timeout|x509|etcdserver'
```

### etcd 与 apiserver 异常的外部表征

| 症状 | 大概率根因 | 确认方法 |
|---|---|---|
| 所有 `kubectl` 命令超时，但已运行的 Pod 照常服务 | apiserver 不可用或过载。**注意**：数据面（kube-proxy/CNI）不依赖 apiserver，所以业务可能完全正常——这是判断"是否要拉最高优先级"的关键 | `kubectl get --raw='/readyz?verbose'` 失败；apiserver 指标 `apiserver_request_duration_seconds` P99 飙升、`apiserver_current_inflight_requests` 打满 |
| 报错 `etcdserver: request timed out` / `leader changed` | etcd 磁盘 fsync 延迟过高（最常见）或 leader 选举抖动 | etcd 指标 `etcd_disk_wal_fsync_duration_seconds` P99 **应 < 10ms**，`etcd_disk_backend_commit_duration_seconds` P99 **应 < 25ms**；超了就是磁盘慢（etcd 必须独占 SSD/NVMe，不能与其他 IO 密集负载共盘） |
| `etcdserver: unhealthy cluster` / 读写全失败 | 失去 quorum（3 节点挂 2、5 节点挂 3） | `etcdctl endpoint status --cluster -w table` 看各成员 `IS LEADER`/`RAFT INDEX` 是否一致；`etcdctl endpoint health --cluster` |
| Pod 状态不更新、Event 不产生、新 Pod 不创建，但旧 Pod 正常跑 | kube-controller-manager 或 kube-scheduler 挂了（lease 丢失） | `kubectl -n kube-system get lease`；`get lease kube-scheduler -o jsonpath='{.spec.holderIdentity}'` 看 holder 是否更新 |
| 大量 `Pending` 的 CSR | 证书轮换请求未被批准，kubelet 客户端证书即将/已经过期 | `kubectl get csr`；`kubectl certificate approve <csr>`（⚠ 批准前先核对 CSR 的 CN/O 是否合法，盲批等于开放权限） |
| `x509: certificate has expired` 出现在 kubectl 侧 | 客户端证书/kubeconfig 过期，与集群健康无关 | `kubectl config view --raw -o jsonpath='{.users[*].user.client-certificate-data}' \| base64 -d \| openssl x509 -noout -dates` |
| apiserver 日志出现 `Timeout: request did not complete within requested timeout` | webhook（admission/conversion）阻塞。第三方 Operator 的 ValidatingWebhook 挂掉会让**全集群所有写操作**卡住 | `kubectl get validatingwebhookconfigurations,mutatingwebhookconfigurations -o custom-columns='NAME:.metadata.name,FAIL:.webhooks[*].failurePolicy,SVC:.webhooks[*].clientConfig.service.name'`。`failurePolicy: Fail` + 后端服务挂 = 全集群写阻塞。临时止血：⚠ 把该 webhook 的 `failurePolicy` 改 `Ignore` 或删除该配置（需评估安全影响） |

---

## §3 存储：PVC 一直 Pending

```bash
kubectl -n "$NS" describe pvc <pvc>          # event 直接说明卡在哪一步
kubectl get pv | grep -E '<pvc>|Available|Released'
kubectl get sc
kubectl -n "$NS" get pvc <pvc> -o jsonpath='{.spec.storageClassName} {.spec.accessModes} {.spec.resources.requests.storage}{"\n"}'
```

| # | 根因 | event 关键字 / 确认方法 | 修复 | 验证 |
|---|---|---|---|---|
| 3.1 | StorageClass 不存在或名字写错 | `storageclass.storage.k8s.io "X" not found` | 补 SC 或改 PVC 的 `storageClassName`。注意 **PVC 的 storageClassName 不可变**，写错只能删了重建 | `describe pvc` 无该错误 |
| 3.2 | `volumeBindingMode: WaitForFirstConsumer` 且 Pod 未调度 | PVC 停在 `Pending` 且 event 是 `waiting for first consumer to be created before binding`——**这是设计行为，不是故障** | 无需修复。若 Pod 也 Pending，去查 Pod 的调度失败原因（`references/pod-state-trees.md` §1），PVC 会随 Pod 调度成功而绑定 | Pod 调度后 PVC 变 `Bound` |
| 3.3 | 动态供给失败（云盘配额/权限/可用区） | `failed to provision volume with StorageClass`，后跟云侧错误：配额不足、子网/可用区不匹配、CSI 用的凭证无权限 | 按云侧错误处理：提配额／把 PVC 与 Pod 约束到同一可用区／修 CSI 的云凭证 | `describe pvc` 出现 `ProvisioningSucceeded`；PVC `Bound` |
| 3.4 | 静态供给：没有匹配的 PV | `no persistent volumes available for this claim`。逐个 diff PV 的 `capacity`（须 ≥ 请求量）、`accessModes`（须包含请求的模式）、`storageClassName`、`nodeAffinity` | 创建匹配的 PV，或改用动态供给 | PVC `Bound` |
| 3.5 | CSI 驱动异常 | `kubectl -n kube-system get pods -l <csi-driver-label> -o wide` 看该节点的 CSI node plugin 是否 Running；`logs` 看报错；`kubectl get csidrivers,csinodes` 确认驱动已注册且该节点在 `csinodes` 里 | 重启/修复 CSI DaemonSet（⚠ 会影响该节点所有新挂载，先确认影响面）；升级驱动版本；确认 `csinodes` 包含该节点 | `kubectl get volumeattachment` 无长期 `attachdetach` 失败；新 PVC 能供给 |
| 3.6 | 卷已 `Released` 但带 `claimRef` 无法复用 | `kubectl get pv` 显示 `Released`。PV 仍指向上一个已删除的 PVC，不会被新 PVC 匹配 | 若确认数据可丢弃：清 `claimRef` 让 PV 回 `Available`（⚠ `kubectl patch pv <pv> -p '{"spec":{"claimRef":null}}'`）。若 `reclaimPolicy: Delete`，PV 会被自动删除，不要指望复用 | PV 变 `Available` 并被新 PVC 绑定 |

### `ReadWriteOnce` 跨节点挂载失败

RWO 卷同一时刻只能被**一个节点**挂载（不是"一个 Pod"——同节点多 Pod 可以共享）。
Pod 漂移到新节点时，旧节点必须先完成 detach，否则新节点报
`Multi-Attach error for volume "X" Volume is already used by pod(s) ...`。

```bash
kubectl get volumeattachment | grep <pv-name>
kubectl -n "$NS" describe pod "$POD" | grep -A3 -E 'FailedAttachVolume|Multi-Attach'
```

判定与处理：

1. 旧 Pod 是否还卡在 `Terminating`？是 → 走 `references/pod-state-trees.md` §6，
   通常是旧节点失联，kubelet 无法上报卸载完成。
2. 旧节点是否 `NotReady`？是 → 修节点。**不要**直接强删旧 Pod：
   强删后新节点挂载成功，而旧节点上的进程可能仍在写同一个卷 → 文件系统损坏。
3. 云侧是否显示卷仍 attached 到旧实例？是 → 先在云侧确认 detach 完成，再清理残留 VolumeAttachment。
4. 长期方案：需要跨节点共享读写就换 `ReadWriteMany` 的存储后端；
   有状态服务加 `podAntiAffinity` 或直接用 StatefulSet + 每副本独立 PVC，从设计上避免争抢。

---

## §4 卷权限与 fsGroup

**症状**：Pod 能 Running，但应用日志报 `permission denied` 写挂载路径；或 exit 1 且栈顶是文件写入。

```bash
kubectl -n "$NS" get pod "$POD" -o jsonpath='{.spec.securityContext}{"\n"}{.spec.containers[*].securityContext}{"\n"}'
kubectl -n "$NS" exec "$POD" -c <c> -- sh -c 'id; ls -ln <mountPath>; touch <mountPath>/.probe && echo WRITE_OK'
```

| 根因 | 确认 | 修复 |
|---|---|---|
| 卷的属主是 root，但容器 `runAsUser` 是非 0 用户 | `ls -ln <mountPath>` 显示 `0 0`，`id` 显示 uid=1000 | 设 Pod 级 `securityContext.fsGroup: <gid>`——kubelet 会把卷递归 chgrp 到该 gid 并加 `g+w`。注意 **Pod 级** `securityContext`，不是 container 级 |
| `fsGroup` 对某些 CSI 驱动不生效 | 设了 fsGroup 但属组仍未变。部分驱动（如某些 NFS/hostPath 场景）不支持 fsGroup 变更 | 用 `initContainer`（以 root 运行）做 `chown -R <uid>:<gid> <mountPath>`；或驱动侧配 `fsGroupPolicy: File` |
| 大卷上 `fsGroup` 导致挂载极慢 | Pod 长时间 `ContainerCreating`，event 无错误。`fsGroup` 会**递归**遍历整个卷改属组，百万级小文件时可耗时数分钟 | 设 `securityContext.fsGroupChangePolicy: OnRootMismatch`（只在根目录属组不匹配时才递归）；或改用 initContainer 精确 chown |
| `readOnlyRootFilesystem: true` 但应用要写根文件系统 | 应用报写 `/tmp`、`/var/cache` 失败 | 给这些路径挂 `emptyDir`，而不是放弃只读根文件系统 |
| SELinux 上下文不匹配 | 节点 `getenforce` 为 `Enforcing`，`ausearch -m avc -ts recent` 有 denied 记录 | 设 `seLinuxOptions`（`level`/`type`）或用 `:Z`/`:z` 语义的挂载标签；不要图省事把 SELinux 设 permissive |
| NFS 根挤压（root_squash） | 容器以 root 运行但写入被拒 | NFS 服务端配 `no_root_squash`（有安全代价），或容器改用非 root uid 并在服务端授权该 uid |

**验证**：修复后重跑上面的 `touch <mountPath>/.probe` 一行，看到 `WRITE_OK` 才算通过；
只看 Pod 变 Running 是不够的（应用可能仍写不进去，只是延迟报错）。
