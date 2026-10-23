# 隧道、端口转发与跳板机

## §1 三种转发的语义差别

| 类型 | 命令行 | 谁在监听 | 谁发起连接 | 典型场景 |
|---|---|---|---|---|
| 本地转发 | `-L [bind:]<localPort>:<destHost>:<destPort>` | **你的本机** | 远端 SSH 服务器 | 把远端才能访问的服务（内网数据库、管理面板）拿到本地用 |
| 远程转发 | `-R [bind:]<remotePort>:<destHost>:<destPort>` | **远端 SSH 服务器** | 你的本机 | 把本地服务暴露给远端（远端回调你本地的 webhook 接收器、给远端的人演示本地构建） |
| 动态转发 | `-D [bind:]<localPort>` | **你的本机**（SOCKS5 代理） | 远端 SSH 服务器（按 SOCKS 请求逐个连） | 出口在远端：需要从远端网络位置访问一批**事先不确定**的目标 |

记法：`-L` = "把远端的能力拉到 **L**ocal"；`-R` = "把本地的能力推到 **R**emote"。
`<destHost>` 一律**从建立连接的那一端**解析——这是最常搞错的点：
`-L 5432:db.internal:5432 bastion` 里的 `db.internal` 由 **bastion** 解析，不是你本机。

### 本地转发 `-L`：访问内网数据库

```bash
# 场景：{DB_HOST}:5432 只有跳板机 {JUMP_HOST} 能访问，你本机访问不到
ssh -N -L 5432:{DB_HOST}:5432 {BASTION_USER}@{JUMP_HOST}
# -N  不执行远端命令（纯隧道，不给 shell）
# 现在本机的 5432 → 跳板机视角的 {DB_HOST}:5432

# 本地连接（注意连 127.0.0.1，不是 localhost——后者可能先解析成 ::1 导致拒绝）
psql -h 127.0.0.1 -p 5432 -U {DB_USER} {DB_NAME}

# 多个端口一次建（数据库 + 缓存 + 管理面板）
ssh -N \
  -L 5432:{DB_HOST}:5432 \
  -L 6379:{CACHE_HOST}:6379 \
  -L 8080:127.0.0.1:8080 \
  {BASTION_USER}@{JUMP_HOST}

# 本地端口用高位端口，避免与本机已有服务冲突（<1024 需要 root）
ssh -N -L 15432:{DB_HOST}:5432 {BASTION_USER}@{JUMP_HOST}

# 只让本机回环可访问（默认行为）。显式写 bind 地址更安全：
ssh -N -L 127.0.0.1:15432:{DB_HOST}:5432 {BASTION_USER}@{JUMP_HOST}
# 写 0.0.0.0 会把隧道暴露给整个局域网——除非你确实要，否则不要写
```

### 远程转发 `-R`：让远端回调你本地

```bash
# 场景：远端服务需要把 webhook 推到你本地跑的接收器（localhost:3000）
ssh -N -R 8080:localhost:3000 {DEPLOY_USER}@{TARGET_HOST}
# 现在在远端执行 curl http://127.0.0.1:8080 → 打到你本机的 :3000

# 远端默认只绑 127.0.0.1（loopback）。要让远端的其他网卡也能访问，需要两个条件：
#   1) 服务端 /etc/ssh/sshd_config 里 GatewayPorts yes（或 clientspecified）
#   2) 命令行显式指定绑定地址
ssh -N -R 0.0.0.0:8080:localhost:3000 {DEPLOY_USER}@{TARGET_HOST}
```

**`GatewayPorts` 对 `-R` 的影响**（服务端 `sshd_config` 选项）：

| 服务端设置 | `-R 8080:...` 的实际绑定 | `-R 0.0.0.0:8080:...` 的实际绑定 |
|---|---|---|
| `GatewayPorts no`（默认） | `127.0.0.1:8080`，只有远端本机能连 | **仍然**被强制为 `127.0.0.1:8080` —— 客户端写了 `0.0.0.0` 也没用 |
| `GatewayPorts clientspecified` | 按客户端指定的地址绑定 | 按客户端指定绑定（`0.0.0.0` = 所有网卡） |
| `GatewayPorts yes` | 强制绑 `0.0.0.0`（所有网卡） | 所有网卡 |

**这是 `-R` 最经典的困惑**：客户端加了 `0.0.0.0:` 却仍连不上——
因为服务端是默认的 `GatewayPorts no`，客户端的绑定地址被忽略。
必须在服务端改 `GatewayPorts` 并 `systemctl reload sshd`（reload 不断现有连接，restart 会）。

⚠ 开 `GatewayPorts` 等于把隧道暴露到远端的所有网络接口上。
如果那台机器有公网 IP，你就是把一个内网服务开放到了公网。
需要对外时，优先用远端本机上的反向代理消费 loopback 端口，而不是开 `GatewayPorts`。

### 动态转发 `-D`：SOCKS 代理

```bash
# 场景：需要从 {JUMP_HOST} 的网络位置访问一批事先不确定的内网服务
ssh -N -D 1080 {BASTION_USER}@{JUMP_HOST}

# curl 走 SOCKS5（用 --socks5-hostname 让 DNS 也在远端解析，这对内网域名是必须的）
curl --socks5-hostname 127.0.0.1:1080 http://{INTERNAL_HOST}:{PORT}/health

# ❌ --socks5 会让 DNS 在本地解析——内网域名在你本机解析不到
curl --socks5 127.0.0.1:1080 http://{INTERNAL_HOST}:{PORT}/health

# 浏览器：代理设 SOCKS5 / 127.0.0.1:1080，并勾选"通过代理解析主机名"
# 只代理部分域名（避免全局走隧道拖慢）：浏览器 PAC 或 proxychains
proxychains4 -q curl http://{INTERNAL_HOST}:{PORT}/
```

`-L` vs `-D` 的取舍：目标**固定且少**用 `-L`（端口显式、可审计、失败早）；
目标**多变或未知**用 `-D`（灵活，但流量走向不透明，排障更难）。

---

## §2 后台隧道与保活

```bash
# -f  认证后转入后台（在 -N 之前生效，注意 -f 会在需要 passphrase 时先在前台问）
ssh -fN -L 15432:{DB_HOST}:5432 {BASTION_USER}@{JUMP_HOST}

# 推荐：配合 ControlMaster，之后用 -O 精确管理，不用 pkill 猜进程
ssh -f -N -o ControlMaster=auto -o ControlPath=~/.ssh/sockets/%C -o ControlPersist=0 \
      -o ExitOnForwardFailure=yes \
      -L 15432:{DB_HOST}:5432 {BASTION_USER}@{JUMP_HOST}
ssh -O check {BASTION_USER}@{JUMP_HOST}    # 主连接是否还活着
ssh -O exit  {BASTION_USER}@{JUMP_HOST}    # 干净退出（连同所有转发）

# 没有 ControlMaster 时只能按特征匹配杀（易误伤同类进程，尽量别走到这一步）
pgrep -af 'ssh -f -N -L 15432'
pkill    -f 'ssh -f -N -L 15432'
```

⚠ 别写成 `ssh -f N ...`（`N` 与 `-N` 差一个横线）：那样 `N` 会被当成要在远端执行的命令名，
结果是登录后执行 `N: command not found` 然后立刻退出，隧道根本没建起来。

`-fN` 的三个坑：

1. **失败也返回 0**：如果本地端口已被占用且没设 `ExitOnForwardFailure yes`，
   ssh 会成功连上并转后台，只有隧道是坏的。脚本后续连数据库时报的错完全指不到隧道。
2. **`-f` 与 passphrase 冲突**：`-f` 在认证阶段仍在前台，会提示输 passphrase。
   自动化里必须先用 `ssh-add` 把密钥加进 agent，或用 `ControlMaster` 复用已认证的主连接。
3. **断了不会自愈**：`-fN` 建立的隧道在网络抖动、跳板重启、NAT 超时后就是死的，
   而后台进程可能还挂着（半开连接）。需要自愈就用 `autossh`。

### `autossh` 保活

```bash
# 推荐写法：-M 0 关掉 autossh 自己的探测端口，改用 OpenSSH 原生的 ServerAlive 探活
AUTOSSH_PIDFILE=/var/run/tunnel-{ENV}.pid \
AUTOSSH_LOGFILE=/var/log/tunnel-{ENV}.log \
AUTOSSH_GATETIME=0 \
autossh -M 0 -f -N \
  -o ServerAliveInterval=15 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  -o StrictHostKeyChecking=yes \
  -L 15432:{DB_HOST}:5432 {BASTION_USER}@{JUMP_HOST}
```

| 参数 | 作用 | 为什么这么设 |
|---|---|---|
| `-M 0` | 禁用 autossh 的监控端口机制 | 老机制要开两个额外端口且探的是"端口可达"而非"SSH 会话健康"；`ServerAliveInterval` 探的是加密信道内的真实往返，更准 |
| `ServerAliveInterval=15` | 每 15s 一次探测 | 必须**小于**链路上最短的空闲超时（很多云 NAT 是 60s、部分企业防火墙是 30s） |
| `ServerAliveCountMax=3` | 连续 3 次无响应判定断开 | 15×3 = 45s 检测窗口，够快又不至于误判 |
| `AUTOSSH_GATETIME=0` | 关闭"启动后 N 秒内断开就不重试"的保护 | 默认 30s，在网络尚未就绪的开机场景会导致 autossh 直接放弃。设 0 让它一直重试 |
| `AUTOSSH_POLL` | 轮询间隔（默认 600s） | `-M 0` 时意义不大，可不管 |

用 systemd 管隧道比 `-fN` 可靠得多（开机自启、崩溃自动拉起、日志集中）：

```ini
# /etc/systemd/system/ssh-tunnel-{ENV}.service
[Unit]
Description=SSH tunnel to {ENV} datastore
After=network-online.target
Wants=network-online.target

[Service]
User={TUNNEL_USER}
ExecStart=/usr/bin/ssh -N \
  -o ServerAliveInterval=15 -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes -o BatchMode=yes \
  -L 15432:%i:5432 {BASTION_USER}@{JUMP_HOST}
Restart=always
RestartSec=10
# 不要用 -f：systemd 需要进程留在前台才能管理它

[Install]
WantedBy=multi-user.target
```

`Restart=always` + `RestartSec=10` 提供带退避的自愈，比 `while true` 循环干净——
后者无退避，跳板侧 `MaxStartups` 会被打爆进而拒绝合法连接。

---

## §3 `ExitOnForwardFailure yes` 为什么必须加

默认值是 `no`，语义是：**转发建立失败时，SSH 会话仍然成功建立**。

不加时发生什么：

```
本地 15432 已被上次没退干净的隧道占用
→ ssh -f -N -L 15432:... 打印 "Warning: remote port forwarding failed" / "bind: Address already in use"
→ 但退出码仍是 0，进程照常转后台
→ 部署脚本认为隧道就绪，继续跑
→ 应用连 127.0.0.1:15432，连到的是【上一次的旧隧道】，指向旧环境
→ 数据写错地方，或读到过期数据，报错信息与隧道毫无关系
```

这是**静默的错误路径**：失败被吞掉，错误在很远的地方以另一种形式出现。
加了 `ExitOnForwardFailure yes` 之后，ssh 直接非零退出，脚本在第一步就停住，
报错明确指向"端口转发失败"。

全局开启（写进 `Host *`）没有副作用——**除非**你的脚本依赖"部分转发成功也继续"，
那种依赖本身就是 bug。

---

## §4 跳板机与多层网络

### `ProxyJump`（现代写法，OpenSSH 7.3+）

```bash
# 单级跳板：一条命令直达内网机器，无需先登跳板再 ssh
ssh -J {BASTION_USER}@{JUMP_HOST} {DEPLOY_USER}@{TARGET_HOST}

# 多级跳板：逗号分隔，按顺序穿越
ssh -J {U1}@{JUMP1},{U2}@{JUMP2} {DEPLOY_USER}@{TARGET_HOST}

# 带非标准端口的跳板
ssh -J {BASTION_USER}@{JUMP_HOST}:{JUMP_PORT} {DEPLOY_USER}@{TARGET_HOST}

# 跳板 + 端口转发（转发在到达目标后建立，跳板只做 TCP 中转）
ssh -J {BASTION_USER}@{JUMP_HOST} -L 15432:{DB_HOST}:5432 {DEPLOY_USER}@{TARGET_HOST}

# 跳板 + 执行命令（CI 里常用）
ssh -J {BASTION_USER}@{JUMP_HOST} {DEPLOY_USER}@{TARGET_HOST} 'systemctl status {SERVICE} --no-pager'

# scp/rsync 也能走跳板
scp -o ProxyJump={BASTION_USER}@{JUMP_HOST} ./build.tar.gz {DEPLOY_USER}@{TARGET_HOST}:/tmp/
rsync -avz -e 'ssh -J {BASTION_USER}@{JUMP_HOST}' ./dist/ {DEPLOY_USER}@{TARGET_HOST}:/var/www/{APP}/
```

### `ProxyJump` vs `ProxyCommand` 的等价关系

`ProxyJump X` 就是 `ProxyCommand "ssh -W %h:%p X"` 的语法糖：

```bash
# 这两条完全等价
ssh -J {BASTION_USER}@{JUMP_HOST} {DEPLOY_USER}@{TARGET_HOST}
ssh -o ProxyCommand="ssh -W %h:%p {BASTION_USER}@{JUMP_HOST}" {DEPLOY_USER}@{TARGET_HOST}
```

`-W %h:%p` 让跳板上的 ssh 进程把 stdio 直接桥接到目标的 `host:port`，
**不在跳板上落任何 shell、不写文件、不需要跳板上有 nc**。
`%h`/`%p` 由外层 ssh 展开为目标的主机名与端口。

| | `ProxyJump` | `ProxyCommand` |
|---|---|---|
| 最低版本 | OpenSSH 7.3（2016） | 很老版本即可 |
| 可读性 | 高，多级用逗号 | 低，要手写引号与 token |
| 灵活性 | 只做 TCP 桥接 | **任意命令**：可走 `nc`、`socat`、企业自研代理客户端、需要先跑一段 VPN 命令 |
| 何时必须用后者 | — | 目标只能通过非 SSH 通道到达（如 `ProxyCommand /usr/bin/ncat --proxy {PROXY_HOST}:{PROXY_PORT} --proxy-type http %h %p`），或跳板上没有 OpenSSH 只有 `nc` |

老写法（跳板只有 `nc` 时的历史形态，仍能在旧文档里看到）：

```bash
ssh -o ProxyCommand="ssh {BASTION_USER}@{JUMP_HOST} nc %h %p" {DEPLOY_USER}@{TARGET_HOST}
```

这要求跳板上有 `nc`，且会在跳板上 fork 一个进程——比 `-W` 更重，能用 `ProxyJump` 就不要用它。

### 写进 config，之后一条命令直达

```sshconfig
Host bastion
    HostName {JUMP_HOST}
    User {BASTION_USER}
    Port {JUMP_PORT}
    IdentityFile ~/.ssh/bastion_ed25519

Host mid-tier
    HostName {MID_HOST}
    User {MID_USER}
    ProxyJump bastion                     # 引用上面的别名，而不是重复写一遍地址

Host app-prod
    HostName {TARGET_HOST}
    User {DEPLOY_USER}
    IdentityFile ~/.ssh/deploy_ed25519
    ProxyJump mid-tier                    # 三级：本机 → bastion → mid-tier → app-prod
```

```bash
ssh app-prod          # 一条命令穿三层
ssh -G app-prod | grep proxyjump    # 确认展开后的跳板链
```

`ProxyJump` 可以引用 config 里的 **Host 别名**，跳板自身的 `User`/`Port`/`IdentityFile`
从那个块继承——这是多级跳不散架的关键。直接把地址写在 `ProxyJump` 里则每级都要重复参数。

### `-J` 与 config 中 `ProxyJump` 的取舍

| | 命令行 `-J` | config `ProxyJump` |
|---|---|---|
| 适合 | 一次性访问、临时借道、脚本参数化（跳板由变量决定） | 固定拓扑的日常访问 |
| 优点 | 不改配置、不留痕迹、可在 CI 里用变量注入 | 一条 `ssh app-prod` 搞定，所有工具（scp/rsync/git/ansible）自动继承 |
| 缺点 | 每次都要打全；scp/rsync 要额外用 `-o ProxyJump=` | 配置漂移风险；`~/.ssh/config` 泄露即拓扑泄露 |
| 建议 | 排障与临时任务 | **默认**用它。多环境用 `Include` 拆分并把 `config.d/` gitignore |

`git`、`rsync`、`ansible` 等工具都会读 `~/.ssh/config`，
所以 config 里配好 `ProxyJump` 后 `git clone {REPO_SSH_URL}` 也自动走跳板，
而命令行 `-J` 对这些工具无效（要另外配 `GIT_SSH_COMMAND`、`rsync -e`、ansible `ssh_common_args`）。

### 跳板机自身的加固（别让它成为最弱一环）

跳板机通常有公网 IP 且能到达整个内网，是最高价值目标：

- 禁用密码登录：`PasswordAuthentication no`、`KbdInteractiveAuthentication no`
- 禁用 root 直登：`PermitRootLogin no`（或 `prohibit-password`）
- 只允许密钥：`AuthenticationMethods publickey`
- 限制来源：`AllowUsers {BASTION_USER}@{OFFICE_CIDR}` 或防火墙白名单
- 跳板上**不给 shell**：`authorized_keys` 里加 `command="/usr/sbin/nologin"` 之外，
  对 `-W` 转发场景用 `permitopen` 限定可转发的目标：
  `command="/bin/false",permitopen="{TARGET_HOST}:22",no-pty,no-agent-forwarding,no-X11-forwarding <pubkey>`
- 开审计：`journalctl -u sshd` 集中收集；跳板上禁用 `.bashrc` 里的历史清理
- 用 `fail2ban` 或等价机制对暴力尝试做限流（注意别把自己封了——先加白名单）

`permitopen` 是最容易被忽略但收益最高的一条：它把"能到达整个内网"收窄成
"只能转发到指定的 host:port"，跳板被攻破时的横向移动面直接砍掉。
