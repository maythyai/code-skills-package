# 网络与 DNS 分层排查

网络类故障的症状（超时、502/503、connection refused、DNS 解析失败）**不指向根因**。
必须按层收窄：Service 定义 → Endpoint → kube-proxy 数据面 → DNS → 策略拦截 → Pod 内应用。
跳过任一层直接猜，是网络排障时间失控的主因。

约定：`{NET_DEBUG_IMAGE}` = 集群内可拉取的网络工具箱镜像（含 `curl`/`dig`/`nslookup`/`nc`/`ip`/`ss`），
用环境变量注入，不要硬编码仓库地址；离线集群应先把它 mirror 到 `{REGISTRY}`。

---

## §1 起一个临时 debug pod（网络排障的标准工具）

被排障的业务镜像往往是 distroless，没有 `curl`/`nslookup`，无法就地取证。起临时 Pod：

```bash
# 独立临时 Pod：指定 namespace / node / serviceaccount，让网络环境与目标一致
kubectl -n "$NS" run netdbg --rm -it --restart=Never \
  --image={NET_DEBUG_IMAGE} \
  --overrides='{"spec":{"nodeName":"'"$NODE"'","serviceAccountName":"'"$SA"'"}}' \
  -- sh
# --rm        退出即删，不留垃圾
# --restart=Never  避免变成 Deployment 语义
# nodeName    把 debug pod 钉在与故障 Pod 同一节点，用于判定"跨节点"问题
# serviceAccountName  复现依赖 SA token 的调用

# 给已存在的 Pod 挂临时容器（共享其网络命名空间，等价于"就地在故障现场探测"）
kubectl -n "$NS" debug -it "$POD" --image={NET_DEBUG_IMAGE} --target=<container>

# 完整复制一份 Pod 再调试（原 Pod 保持不动，适合生产：改副本的探针/命令都不影响线上）
kubectl -n "$NS" debug "$POD" -it --image={NET_DEBUG_IMAGE} --copy-to="${POD}-dbg" --share-processes
```

`--share-processes` 让临时容器能看到同 Pod 内**其他容器的进程**（共享 PID 命名空间），
可以 `ps aux` 看主进程、`cat /proc/<pid>/environ` 看它真实拿到的环境变量、
`ls -l /proc/<pid>/cwd` 看工作目录。这是排查"配置到底注入没有"的最快手段。
副作用：容器间失去 PID 隔离，`/proc` 与 `/sys` 可见性变化，仅用于临时调试副本。

---

## §2 Service 无 Endpoint

**这是 503/无后端的第一嫌疑**，先于任何应用怀疑。

```bash
# EndpointSlice 是现代来源（Endpoints 对象已被弃用，且大集群下会截断）
kubectl -n "$NS" get endpointslices -l kubernetes.io/service-name=<svc> \
  -o custom-columns='NAME:.metadata.name,ADDRS:.endpoints[*].addresses,COND:.endpoints[*].conditions,PORTS:.ports[*].port,TARGET:.endpoints[*].targetRef.name'
kubectl -n "$NS" get svc <svc> -o jsonpath='{.spec.selector}{"\n"}{.spec.ports}{"\n"}'
kubectl -n "$NS" get pods -l <key>=<value> -o wide   # selector 实际匹配到几个 Pod
```

| 根因 | 确认方法 | 修复 | 验证 |
|---|---|---|---|
| selector 与 Pod label 不匹配 | `svc.spec.selector` 与 `pod.metadata.labels` 逐 key diff。注意 Deployment 的 label 常有多余维度（如 `pod-template-hash` 不该出现在 Service selector 里） | 改 Service selector 或补 Pod label（改 Deployment 的 `spec.template.metadata.labels`） | EndpointSlice 出现 Pod IP |
| Pod 有 IP 但 `conditions.ready=false` | 上表 COND 列为 `false` → 不是网络问题，是 Pod readiness 没过 | 走 `references/pod-state-trees.md` §5 | COND 变 true |
| `targetPort` 与容器实际监听端口不一致 | EndpointSlice 有 IP，但 `curl <svc>:<port>` 超时。对比 `svc.spec.ports[].targetPort` 与 `kubectl exec <pod> -- ss -ltn` | 改 `targetPort`（用命名端口最稳） | `curl` 通 |
| `publishNotReadyAddresses` 需要但未设 | 有状态服务（如集群引导期）所有副本互为依赖，全部 not-ready 导致永远无 Endpoint | 对 headless 引导场景设 `publishNotReadyAddresses: true` | 引导期就能互相解析 |
| Service 是 `ExternalName` / `headless` 语义误解 | `get svc -o jsonpath='{.spec.type}{.spec.clusterIP}'`。headless（`clusterIP: None`）不分配 VIP，`curl` ClusterIP 必然失败 | 用 DNS 名解析到 Pod IP 列表，不要指望 VIP | `dig <svc>.<ns>.svc.cluster.local` 返回多条 A 记录 |
| EndpointSlice 控制器 / kube-proxy 异常 | 所有 Service 都无 Endpoint，不只一个 | `kubectl -n kube-system get pods -l k8s-app=kube-proxy`；查其日志 | 全集群 Service 恢复 |

---

## §3 CoreDNS 解析失败

**分层判定**：先确认是不是 DNS 的问题，再确认是 CoreDNS 挂了还是网络到不了 CoreDNS。

```bash
# 在目标 Pod 的网络命名空间里做，而不是在你本机做
kubectl -n "$NS" exec "$POD" -c <c> -- cat /etc/resolv.conf
kubectl -n "$NS" exec "$POD" -c <c> -- nslookup kubernetes.default.svc.cluster.local
kubectl -n "$NS" exec "$POD" -c <c> -- nslookup <svc>.<ns>.svc.cluster.local

# CoreDNS 自身状态
kubectl -n kube-system get pods -l k8s-app=kube-dns -o wide
kubectl -n kube-system logs -l k8s-app=kube-dns --tail=200 | grep -iE 'error|SERVFAIL|i/o timeout|NXDOMAIN'
kubectl -n kube-system get cm coredns -o yaml     # 看 Corefile：forward、kubernetes 域、ndots 相关 plugin

# 集群外域名解析（区分「集群内解析挂」与「上游 forward 挂」）
kubectl -n "$NS" run netdbg --rm -it --restart=Never --image={NET_DEBUG_IMAGE} -- \
  sh -c 'nslookup kubernetes.default.svc.cluster.local; echo ---; nslookup {EXTERNAL_HOST}'
```

| 现象 | 根因 | 确认 | 修复 |
|---|---|---|---|
| `SERVFAIL` 且 CoreDNS Pod 全 CrashLoop | CoreDNS 起不来（配置语法错、上游 forward 不可达、内存 OOM） | `logs -l k8s-app=kube-dns` 看栈；`top pod -n kube-system` 看是否 OOM | 修 Corefile／给 CoreDNS 提 limits（它常被漏配，默认无 limits 在高 QPS 下被打爆） |
| 只有**集群外**域名解析失败 | 上游 forward 不通，或节点 `/etc/resolv.conf` 指向的 DNS 不可达 | 在节点上 `nslookup {EXTERNAL_HOST}`；对比 Corefile 里 `forward . /etc/resolv.conf` 与 `forward . <ip>` | 修上游 DNS／改 Corefile forward 目标 |
| 集群内解析超时（5s 后失败）但 CoreDNS 健康 | 到 CoreDNS 的 UDP 53 被拦（NetworkPolicy）或 conntrack 表满/竞态 | `kubectl get netpol -A`；节点 `conntrack -S` 看 `insert_failed`；`dmesg \| grep -i "conntrack table full"` | 放行 kube-system:53；调大 `nf_conntrack_max`。UDP conntrack 竞态是 K8s 经典问题，长期方案是启用 NodeLocal DNS 缓存或改用 TCP |
| 解析成功但很慢，且 `resolv.conf` 里 `ndots:5` | `ndots:5` 让短名先尝试 4 个 search 域再查真实域，外部域名解析放大 5 倍 | 抓包或 CoreDNS metrics 看 QPS 里 NXDOMAIN 占比 | 应用侧用 FQDN（结尾加 `.`）；或给该 workload 设 `dnsConfig.options: [{name: ndots, value: "2"}]`；或部署 NodeLocal DNS |
| 解析到过期 IP（Pod 重建后仍连旧 IP） | 应用做了 DNS 结果长缓存（JVM `networkaddress.cache.ttl` 默认永久；Go 侧长连接不重连） | 对比 `dig` 实时结果与应用连接的 IP | JVM 设 `networkaddress.cache.ttl=30`；客户端启用连接健康检查与重连 |
| headless Service 解析不到某个 Pod | 该 Pod `ready=false`（headless 默认只返回 ready 地址） | `get endpointslices`；`describe pod` | 修 readiness；或引导期用 `publishNotReadyAddresses` |

---

## §4 NetworkPolicy 误拦

**默认全通**：没有任何 NetworkPolicy 时，Pod 间流量不受限。
一旦出现**任意一条**选中某 Pod 的 policy，该 Pod 就变成默认拒绝，只有被显式允许的流量才通。
这条语义是"加了个只对某命名空间生效的 policy，结果另一个服务突然不通"的根源。

```bash
kubectl get netpol -A
kubectl -n "$NS" get netpol -o yaml | grep -B2 -A12 -E 'podSelector|namespaceSelector'
# 关键：NetworkPolicy 拒绝是静默的，被拦方看不到任何日志。
# 只能从"发起方超时 + 目标 Pod 无访问日志"这个组合反推
```

| 根因 | 确认 | 修复 |
|---|---|---|
| policy 的 `namespaceSelector` 用了不存在的 label | `kubectl get ns --show-labels` 与 policy 里的 `matchLabels` diff。经典坑：写 `name: ns-x` 但集群实际 label 是 `kubernetes.io/metadata.name: ns-x` | 用 `kubernetes.io/metadata.name`（1.22+ 内置，无需手工打标）或给命名空间补 label |
| 只放了 `ingress` 没放 `egress`（或反之） | policy 同时声明 `policyTypes: [Ingress, Egress]` 时，两个方向都必须显式允许 | 补 egress 规则，**别忘了 DNS**：`egress` 必须放行到 `kube-system` 的 UDP/TCP 53，否则一开 egress 策略全集群 DNS 挂 |
| CNI 不支持 NetworkPolicy | 部分轻量 CNI 不实现 policy，写了也不生效；反向情况是集群换了 CNI 后 policy 语义变化 | `kubectl -n kube-system get ds` 看 CNI；用一个已知会被拒的流量做正向验证，确认 policy 真的在生效 |
| 新 Pod 换了 label 后不再被 allow 规则覆盖 | 对比 Pod label 与 policy 的 `podSelector` | 修 label 或 policy；把这类检查纳入 CI |

**验证 policy 是否真在拦**：起两个临时 Pod，一个带匹配 label 一个不带，分别打同一目标。
两者结果不同 = policy 生效且在拦。这比读 YAML 可靠。

---

## §5 kube-proxy 模式差异

```bash
kubectl -n kube-system get cm kube-proxy -o yaml | grep -E '^\s*mode:'
kubectl -n kube-system logs -l k8s-app=kube-proxy --tail=100 | grep -iE 'error|fallback|iptables|ipvs'
```

| 模式 | 行为 | 排障要点 |
|---|---|---|
| `iptables`（默认） | 每个 Service 后端生成一条链，O(n) 规则数。大规模集群（> 1000 Service）规则同步慢，Endpoint 变更后收敛可能达秒级 | 规则巨多时 `iptables-save \| wc -l`；变更后短暂 503 可能是收敛延迟而非故障。节点上 `iptables -t nat -L KUBE-SERVICES -n \| grep <clusterIP>` 看有没有对应规则 |
| `ipvs` | 哈希表查找，O(1)，大规模更快；需要节点加载 `ip_vs*` 内核模块 | 模块缺失时 kube-proxy 会**静默回退**到 iptables——日志里有 `Fallback` 字样。`lsmod \| grep ip_vs`、`ipvsadm -Ln` 确认实际在跑哪个 |
| `nftables`（1.31+ 可选） | 用 nftables 替代 iptables，性能与规则规模更优 | `nft list ruleset \| grep <clusterIP>`；老工具链（依赖 iptables-save 的排障脚本）需同步更新 |

**判定"是不是 kube-proxy 的问题"**：从 Pod 内直接 `curl <podIP>:<targetPort>`。
直连 Pod IP 通、走 ClusterIP 不通 → 问题在 kube-proxy/Service 层，不在应用。
这一步能砍掉一半的排查面。

---

## §6 分层连通性定位法

**按这个顺序打，第一个失败的层就是问题层。** 每层一条命令，全部在集群内执行。

| 层 | 目标 | 命令（在 debug pod 或目标 Pod 内执行） | 通 → 结论 | 不通 → 结论 |
|---|---|---|---|---|
| L0 | 同 Pod 内进程 | `curl -sv --max-time 3 http://127.0.0.1:<port>/` | 应用本身在监听且能响应 | 应用没起来／没监听该端口。与网络无关，回去查应用 |
| L1 | 同 Pod 其他容器 | `curl -sv --max-time 3 http://127.0.0.1:<sidecarPort>/` | sidecar 正常 | sidecar 问题（同 Pod 共享网络栈，`127.0.0.1` 即可） |
| L2 | 同节点其他 Pod | `curl -sv --max-time 3 http://<同节点PodIP>:<port>/` | 节点内 Pod 网络正常 | 该节点 CNI 异常／节点级 iptables 或路由损坏。查 `kubectl debug node/<node>` |
| L3 | 跨节点 Pod | `curl -sv --max-time 3 http://<其他节点PodIP>:<port>/` | Pod 网络跨节点正常 | CNI overlay/路由问题，或 NetworkPolicy 拦截。对比 L2 通过而 L3 不通 = 跨节点特有 |
| L4 | Service ClusterIP | `curl -sv --max-time 3 http://<clusterIP>:<port>/` | kube-proxy 数据面正常 | Service 层问题：无 Endpoint（§2）／targetPort 错／kube-proxy 异常（§5）。用 L3 已通的 Pod IP 对比确认 |
| L5 | 集群内 DNS 名 | `nslookup <svc>.<ns>.svc.cluster.local` 然后 `curl` 该名字 | DNS + Service 都正常 | L4 通而 L5 不通 = DNS 问题，走 §3 |
| L6 | 集群外 | `curl -sv --max-time 5 {EXTERNAL_ENDPOINT}` 且 `nslookup {EXTERNAL_HOST}` | egress 正常 | SNAT/网关/egress 策略/上游防火墙问题。分别测 DNS 与 TCP，区分是解析失败还是出口被拦 |

**从外向内也要打一遍**（L6→L0 反方向），因为 Ingress/LB 路径与集群内路径完全不同：

```bash
# 集群外 → Ingress/LB → Service → Pod
curl -sv --max-time 5 -H 'Host: {INGRESS_HOST}' {LB_ENDPOINT}/<path>   # 走外部入口
kubectl -n "$NS" get ingress -o wide
kubectl describe ingress <name>          # 看 backend 是否解析到有效 Service
kubectl -n <ingress-ns> logs -l <ingress-controller-label> --tail=200 | grep -E '<podIP>|502|504|upstream'
```

**Ingress 层错误码判定**：

| 返回 | 含义 | 下一步 |
|---|---|---|
| `502 Bad Gateway` | 控制器连上了后端但拿到非法响应，或后端拒绝连接 | 后端 Pod 是否 `READY`（§5）；`targetPort` 是否对；应用是否返回了非 HTTP 内容 |
| `504 Gateway Timeout` | 后端在控制器的超时窗口内没响应 | 应用慢（查 P99 延迟）／控制器 `proxy-read-timeout` 太短／连接被中间层挂住 |
| `503 Service Unavailable` | 无可用后端 | EndpointSlice 为空（§2）；或控制器限流/熔断生效 |
| `404` 但 Pod 直连正常 | Ingress 的 `host`/`path` 规则不匹配 | `describe ingress` 核对 rules 与请求的 Host 头、path 前缀、`pathType` |
| TLS 握手失败 | 证书 Secret 不存在/过期/域名不匹配 | `kubectl -n $NS get secret <tls-secret>`；`openssl s_client -connect {LB_ENDPOINT}:443 -servername {INGRESS_HOST}` 看实际证书 |

---

## §7 网络排障产物

排查完把证据写到 `docs/analysis/`（不要写仓库根目录）：分层定位表每一层的通/不通结果、
第一个失败层、该层的确认命令输出、结论。这样下一次同类故障可以直接从第一个失败层开始。
