---
name: csp-ssh-operations
description: "Operate SSH itself as infrastructure: host key and known_hosts hygiene, local/remote/dynamic port forwarding, ProxyJump and multi-hop bastion access, key generation and rotation. Use when you need to reach a machine, tunnel to a service behind it, or diagnose why a connection fails."
version: "1.0.0"
layer: 3
category: patterns
phase: build
domain: devops
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
triggers:
  - "ssh 连不上"
  - "ssh 配置"
  - "ssh config"
  - "端口转发"
  - "内网穿透"
  - "ssh 隧道"
  - "跳板机"
  - "堡垒机"
  - "ProxyJump"
  - "known_hosts"
  - "ssh 免密"
  - "ssh 密钥"
  - "ssh agent forwarding"
  - "远程主机运维"
  - "批量远程执行"
related_skills:
  - csp-vps-deploy
  - csp-platform-deploy
  - csp-indie-deploy-ops
  - csp-deployment
  - csp-infrastructure-as-code
  - csp-cicd-pipelines
  - csp-security-review
  - csp-docker-patterns
role: specialist
---

# SSH 运维操作

> 本技能管的是 **SSH 这条通道本身**：怎么连、怎么配、怎么转端口、怎么发密钥、怎么在脚本里稳定地用、
> 连不上时怎么判。
> 「怎么把应用部署到服务器上」走 `csp-vps-deploy` / `csp-platform-deploy` / `csp-indie-deploy-ops`；
> 本技能是它们的**前置通道层**——那条通道不通或配得不安全，上面的部署流程全是空谈。

## 安全边界（本技能的立场，优先于一切便利性）

SSH 是拿到远端 shell 的钥匙。便利写法（`StrictHostKeyChecking no`、`-A` 全开、私钥拷到远端）
都能"让命令跑通"，代价是把认证与加密的保证全部丢掉。**下面每一条都是不可协商的。**

### 1. Agent forwarding：绝不向不可信主机开 `-A`

`ssh -A` 会在远端主机上创建一个 agent socket（`SSH_AUTH_SOCK`）。
远端的 **root 用户可以接管这个 socket**，用你的身份对任意挑战签名——
包括以你的名义登录其他机器、推代码、签发证书。你本机私钥没有被拷走，
但攻击者获得了"以你的身份做一次签名"的能力，这通常已经足够横向移动。

```bash
# 默认全局关闭转发，只对明确信任的主机单独打开（写进 ~/.ssh/config）
Host *
    ForwardAgent no
    ForwardX11 no

Host {TRUSTED_BUILD_HOST}          # 例如你自己的构建机，且你信任其 root
    ForwardAgent yes
```

| 场景 | 做法 |
|---|---|
| 临时想关掉转发（即使 config 里开了） | `ssh -a <host>` —— 显式禁用 agent 转发，比改 config 快且不留痕迹 |
| 需要从本机经跳板再跳到内网机 | 用 `ProxyJump`（**不**需要 agent forwarding），不要用 `-A` 后再在跳板上 `ssh` |
| CI 里需要拉私有仓库 | 用 deploy key（只对单仓库只读）或短期令牌，**不要**把 CI 的 agent forward 到构建容器 |
| 必须转发才能工作 | 先问"为什么"。九成情况下 `ProxyJump` 或把公钥加到目标机的 `authorized_keys` 就够了 |

### 2. `StrictHostKeyChecking` 为什么不能设成 `no`

SSH 防中间人的唯一机制是：首次连接时记住主机公钥（TOFU，Trust On First Use），
之后每次连接都比对。**设成 `no` 等于把这个比对彻底关掉**——
任何人 ARP 欺骗、DNS 劫持、或在网段里插一台机器，都能无声地拿到你的会话、
你的凭据、你转发过去的 agent。而且它不报错，你不会知道。

| 取值 | 行为 | 用在哪 |
|---|---|---|
| `yes` | known_hosts 里没有就**直接拒绝连接** | CI、自动化脚本（配合预先 `ssh-keyscan` 注入的正确指纹） |
| `ask`（默认） | 没有就提示确认；**变了就拒绝** | 人工交互 |
| `accept-new` | 没有就自动接受并记录；变了仍拒绝 | 首次连接大量新机器的受控环境（比 `no` 安全得多，仍保留"变了就拒绝"） |
| `no` | 一律接受，包括**指纹变化** | ❌ 不用。没有任何生产理由 |

`UserKnownHostsFile=/dev/null` 的**唯一正当场景**：一次性容器/临时 CI 作业，
连完即销毁、不承载凭据、目标主机是内部固定服务且网络可信。
配合它必须用 `ExitOnForwardFailure` 与短超时，避免失败时静默挂住。
在开发者笔记本上用 `/dev/null` = 每次都接受任何主机 = 等于关掉了主机验证。

### 3. 私钥永远不落到远端

需要"从远端 A 再连到 B"时，正确做法是二选一：

1. **`ProxyJump`（首选）**：认证在你本机完成，A 只负责转发 TCP 流，看不到你的私钥也不做签名。
2. **给 A 单独生成一对密钥**，把 A 的公钥加到 B 的 `authorized_keys`。A 的私钥只属于 A，
   泄露影响面限于 A→B 这一条链路，且可以单独吊销。

**绝不**：`scp ~/.ssh/id_ed25519 user@hostA:` ——一旦拷过去，
这对密钥就同时代表你和 A，A 上任何进程（包括被入侵的 Web 服务）都能以你的身份对外签名，
而且你无法只吊销"A 的那一份"。

### 4. `~/.ssh/config` 里不该放什么

| 不要放 | 为什么 | 放什么替代 |
|---|---|---|
| 密码 / `PasswordAuthentication` 依赖 | config 是明文，且密码无法细粒度吊销 | `IdentityFile` + passphrase + ssh-agent |
| 密钥的 passphrase | 同上，明文存储等于没有 passphrase | 交给 ssh-agent（macOS 用 Keychain，Linux 用 agent + `ssh-add`） |
| `StrictHostKeyChecking no` | 关掉中间人防护 | `accept-new`，或 CI 里 `yes` + 预注入指纹 |
| 真实的公网 IP / 内部域名（若 config 会进版本库） | 泄露网络拓扑，且 config 常被误提交 | 用 `Include` 引入 gitignore 掉的本地文件；团队共享的 config 只放别名与占位符 |
| `ForwardAgent yes` 写在 `Host *` 里 | 向所有主机（含未来新增的不可信主机）开放你的身份 | 只在具名可信主机块里开 |
| 一次性调试参数长期留着（如 `UserKnownHostsFile /dev/null` 配通配 Host） | 会静默影响后续所有连接 | 用完删掉；临时需求用命令行 `-o` 覆盖 |

`~/.ssh/config` 权限必须 `600`。过宽时 OpenSSH 会忽略它（不同版本行为不同，
表现为"配置明明写了却不生效"），排查时先 `ls -l ~/.ssh/config`。

## 最小可用配置骨架

多环境用 `Include` 拆分，避免一个文件涨到几百行且无法共享。

```sshconfig
# ~/.ssh/config  (chmod 600)

# ── 全局默认：所有 Host 继承。放在文件开头，因为 SSH 对每个选项取"第一次出现的值" ──
Host *
    ForwardAgent no
    ForwardX11 no
    IdentitiesOnly yes           # 只尝试本块指定的 IdentityFile，避免 "Too many authentication failures"
    ServerAliveInterval 30       # 每 30s 发一次探测，防 NAT/防火墙掐掉空闲连接（Broken pipe 的主因）
    ServerAliveCountMax 3        # 连续 3 次无响应才断开 = 90s 容忍窗口
    ConnectTimeout 10            # 连不上时 10s 失败，而不是默认的 2 分钟挂住脚本
    ExitOnForwardFailure yes     # 端口转发建不起来就立刻退出，而不是"连上了但转发是坏的"
    AddKeysToAgent yes           # 首次用到私钥时自动加进 agent，免去重复输 passphrase
    ControlMaster auto           # 连接复用：同一目标的后续 ssh/scp/rsync 秒连
    ControlPath ~/.ssh/sockets/%C
    ControlPersist 10m           # 主连接在最后一次使用后再保持 10 分钟
    HashKnownHosts yes

# ── 分环境拆分：这些文件不进版本库（写进 ~/.gitignore 或用占位符模板） ──
Include ~/.ssh/config.d/personal
Include ~/.ssh/config.d/work-prod
Include ~/.ssh/config.d/work-staging
```

```sshconfig
# ~/.ssh/config.d/work-prod  (chmod 600)

Host bastion
    HostName {JUMP_HOST}
    User {BASTION_USER}
    IdentityFile ~/.ssh/bastion_ed25519
    Port {JUMP_PORT}

Host app-prod                     # 内网机器：一条 `ssh app-prod` 直达，无需手动登跳板
    HostName {TARGET_HOST}
    User {DEPLOY_USER}
    IdentityFile ~/.ssh/deploy_ed25519
    ProxyJump bastion             # 认证仍在本机完成，跳板看不到私钥

Host db-prod
    HostName {DB_HOST}
    User {DB_ADMIN_USER}
    ProxyJump bastion
    LocalForward 5432 127.0.0.1:5432    # 连上即建隧道，本地 5432 → 远端 localhost:5432
    ExitOnForwardFailure yes
```

```bash
mkdir -p ~/.ssh/sockets ~/.ssh/config.d && chmod 700 ~/.ssh ~/.ssh/sockets ~/.ssh/config.d
chmod 600 ~/.ssh/config ~/.ssh/config.d/* ~/.ssh/*_ed25519
chmod 644 ~/.ssh/*.pub
```

## 三个必学的排查利器

| 命令 | 看到什么 | 什么时候用 |
|---|---|---|
| `ssh -G <host>` | 所有配置来源（命令行 `-o`、`~/.ssh/config`、`Include`、`/etc/ssh/ssh_config`、内置默认）合并后的**最终生效值**，不发起连接 | "我明明在 config 里写了 X 却不生效"——90% 是因为同一选项在更靠前的块里已被赋值（SSH 取第一个值），或 `Host` 模式没匹配上 |
| `ssh -v <host>` | 配置加载、DNS/TCP 连接、协商的算法、**提供了哪些密钥**（`Offering public key: ...`）、服务器接受了哪个、认证成功/失败 | 认证类问题。看 `Offering` 列表就知道是不是在乱试密钥 |
| `ssh -vv` | 加上密钥文件的读取与签名细节、每个认证方法的尝试顺序 | 密钥被拒但你确信它该被接受时 |
| `ssh -vvv` | 加上逐包（packet-level）细节 | 极少需要；协议层/算法协商不兼容时用 |

分级原则：**从 `-v` 开始**，只在需要更细节时升级。直接上 `-vvv` 会淹没在噪音里。

## references/ 路由

主干放立场、骨架与分流。命中下表任一情形时读对应文件：

| 文件 | 什么时候读 |
|---|---|
| `references/config-and-hostkeys.md` | 要写或重构 `~/.ssh/config`（`Include` 拆分、`Match` 块、选项优先级）；要用 `ssh -G`/`-v` 定位配置不生效；要处理主机密钥：看指纹、`ssh-keyscan` 的正确与危险用法、密钥轮换后清理 known_hosts、`ssh-keygen -R` |
| `references/tunnels-and-jumphosts.md` | 要建端口转发：`-L` 本地转发、`-R` 远程转发、`-D` 动态 SOCKS 的语义差别与可跑例子；`GatewayPorts` 对 `-R` 的影响；后台隧道 `-fN` 与 `autossh` 保活；`ExitOnForwardFailure` 为什么必须加；`ProxyJump` vs `ProxyCommand` 的等价关系与多级跳 |
| `references/keys-auth-and-automation.md` | 要生成密钥（算法选择：ed25519 / rsa ≥3072 / 不用 dsa）、管 passphrase 与 ssh-agent、`ssh-copy-id` 下发、密钥轮换流程、`authorized_keys` 权限要求（700/600，权限过宽被 sshd 拒绝且报错不明显）；要在脚本/CI 里非交互地用 SSH：`BatchMode`、`ConnectTimeout`、`-o` 覆盖、`ControlMaster` 复用、远端命令的引号与变量展开陷阱 |
| `references/troubleshooting-and-handoff.md` | 连接报错要定位根因：先跑 §0 的四层判定（TCP → 协议握手 → 认证 → 会话），再按报错落到 §1–§9（`Permission denied (publickey)`、`Connection refused` / `timed out`、`Host key verification failed`、`Too many authentication failures`、`Broken pipe`、`mux_client_hello_exchange`、`Bad configuration option`、能登录但远端命令失败、`kex_exchange_identification`）。§10 是会话交接与协作（tmux 共享 vs 只交接命令记录、为什么不共享私钥、交接内容清单）；§11 是环境连接清单模板 |

## 故障判定表（分流入口）

先用四层判定确定失败在哪一层，再查下表对应小节（均在 `references/troubleshooting-and-handoff.md`）：

```bash
nc -zv -w 5 {TARGET_HOST} ${SSH_PORT:-22}                      # L1 TCP 可达？
timeout 5 nc {TARGET_HOST} ${SSH_PORT:-22} | head -1           # L2 能拿到 SSH-2.0 banner？
ssh -v -o BatchMode=yes {ALIAS} true 2>&1 | grep -E 'Offering|Permission denied|Authenticated'   # L3 认证？
ssh -o BatchMode=yes {ALIAS} 'echo L4_OK'                      # L4 会话与命令？
```

每条的完整根因树、确认命令与修法见 `references/troubleshooting-and-handoff.md` 对应小节。

| 报错 | 一句话根因方向 | 详见 |
|---|---|---|
| `Permission denied (publickey)` | 公钥不在远端 `authorized_keys`／权限过宽被 sshd 拒／本地没提供对的私钥／远端禁用了 pubkey | §1 |
| `Connection refused` | TCP 到了但没人监听：sshd 没起、端口不对、或被 REJECT 规则拒绝 | §2 |
| `Connection timed out` | 包发出去没回应：防火墙 DROP、安全组未放行、路由不通、主机名解析到错的地址 | §2 |
| `Host key verification failed` | 主机公钥与 known_hosts 记录不符（重装/IP 复用/真的中间人）或 known_hosts 里没有且设了 `StrictHostKeyChecking yes` | §3 |
| `Too many authentication failures` | 本地挨个试的密钥数超过服务端 `MaxAuthTries`（默认 6），正确的密钥还没轮到就被断开 → `IdentitiesOnly yes` + 单一 `IdentityFile` 解决 | §4 |
| `Broken pipe` / 空闲后断开 | 无 keepalive，中间 NAT/防火墙掐掉空闲连接；或 `ClientAliveInterval` 服务端主动断 | §5 |
| `mux_client_hello_exchange: read packet: No such file or directory` | `ControlPath` 指向的复用 socket 损坏或过期（主机重启、`~/.ssh/sockets` 被清、跨会话残留） | §6 |
| `Bad configuration option` | 客户端版本不支持该选项，或选项写在错误的块里 | §7 |
| `command not found` 但交互登录正常 | 非交互 shell 不读 `.bashrc`/`.zshrc`，`PATH` 里没有该命令 | §8 |
| `kex_exchange_identification: Connection closed by remote host` | 服务端在协议握手阶段就断开：`MaxStartups` 限流、fail2ban 封了你的 IP、`/etc/hosts.deny` | §9 |

## 产物

环境连接清单写到 `docs/analysis/`（例如 `docs/analysis/ssh-topology-{env}.md`）。
**绝不写仓库根目录**，且产物里必须遵守：

- 不出现私钥、passphrase、密码、令牌——**一个字符都不行**，包括"脱敏后的一半"。
- 不出现真实主机名、真实公网 IP、真实内部域名。
- 一律用占位符 + 环境变量：`{JUMP_HOST}`、`{JUMP_PORT}`、`{BASTION_USER}`、
  `{TARGET_HOST}`、`{DEPLOY_USER}`、`{DB_HOST}`。
- 需要 IP 形式举例时用文档保留地址段（`192.0.2.0/24`、`198.51.100.0/24`、`203.0.113.0/24`）。
- 清单只记：别名 → 占位符 → 走哪条跳板 → 用哪个密钥文件路径 → 开放了哪些转发端口 → 谁能访问。

模板见 `references/troubleshooting-and-handoff.md` §11。

## Key Principles

1. **默认不转发 agent**：`ForwardAgent no` 写在 `Host *`，只对具名的、你信任其 root 的主机单独开；
   临时要关就 `ssh -a`。跳板需求一律用 `ProxyJump` 解决，它不需要转发身份。
2. **主机密钥验证不能关**：`StrictHostKeyChecking` 只用 `ask`（交互）/`accept-new`（受控批量）/
   `yes`（CI，配预注入的正确指纹）；`no` 与笔记本上的 `UserKnownHostsFile /dev/null` 等于放弃中间人防护。
3. **指纹变了先查再删**：`ssh-keygen -R` 之前必须从**带外渠道**（云控制台、供应商、装机记录）
   确认新指纹。"警告变了就直接删"把 TOFU 降级成了零验证。
4. **私钥不落远端**：需要 A→B 时，要么 `ProxyJump`（认证在本机完成），要么给 A 单独生成一对密钥
   并把 A 的公钥加到 B。拷贝你自己的私钥到远端等于把身份复制了一份无法单独吊销的副本。
5. **配置用 `ssh -G` 验证，不靠读**：SSH 对每个选项取**第一次出现的值**，
   `Host *` 写在文件末尾会被前面的块抢占；改完 config 跑一次 `ssh -G <host>` 看最终生效值。
6. **脚本里必须非交互且会失败**：`BatchMode=yes`（禁止弹密码提示，让脚本立刻失败而不是挂住等人）
   + `ConnectTimeout`（默认 2 分钟对 CI 太长）+ `ExitOnForwardFailure yes`（转发建不起来就退出，
   不要"连上了但隧道是坏的"）。
7. **频繁短连接开 `ControlMaster`**：一次握手 + 后续复用，对"跑 20 条 `ssh host cmd`"的部署脚本
   是数量级提速（每条省掉 TCP + KEX + 认证，通常 300–800ms）。
8. **权限过宽会被静默拒绝**：`~/.ssh` 700、私钥与 `authorized_keys` 600、`config` 600。
   sshd 对权限过宽的 `authorized_keys` 直接忽略，客户端只看到 `Permission denied (publickey)`，
   报错完全不指向真因——这是 SSH 排障第一大坑。

## Anti-Patterns

| 反模式 | 为什么错 | 正确做法 |
|---|---|---|
| `StrictHostKeyChecking no` 写进 `Host *` "省得每次确认" | 关掉主机身份验证，中间人可以无声劫持会话与凭据，且**不报错** | 交互用默认 `ask`；批量新机用 `accept-new`；CI 用 `yes` + 预先把正确指纹写进 known_hosts |
| 主机密钥警告出现后直接 `ssh-keygen -R` 再连 | 这正是中间人攻击希望你做的动作——它会伪装成"密钥变了" | 先从带外渠道核对新指纹（云控制台/装机记录），确认后再清理并重连 |
| `ssh -A` 连到不信任的主机（如客户环境、临时机器） | 远端 root 可接管 agent socket，以你的身份签名做横向移动 | 用 `ProxyJump` 替代；确需转发时只对具名可信主机开，用完 `ssh -a` 关 |
| `scp ~/.ssh/id_ed25519 user@host:` 把私钥拷上远端 | 私钥一旦落地就无法只吊销那一份；远端任何被入侵进程都能以你身份对外签名 | 给远端单独生成一对密钥，或全程 `ProxyJump` 让认证留在本机 |
| 用 `sshpass -p '<密码>'` 或把密码写进脚本/CI 变量 | 密码进不了细粒度吊销、会出现在进程列表与 shell history、无法审计到个人 | 用密钥 + `BatchMode=yes`；CI 用短期 deploy key 或 OIDC 换取的临时凭据 |
| `authorized_keys` 权限 644／`~/.ssh` 权限 755 | sshd 出于安全**静默忽略**权限过宽的文件，客户端只看到 `Permission denied (publickey)` | `chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys`；仍失败就看服务端 `/var/log/auth.log` 或 `journalctl -u sshd`，那里才写明原因 |
| 生成 `ssh-keygen -t dsa` 或 `-t rsa -b 1024` | DSA 已被 OpenSSH 7.0+ 默认禁用且上限 1024 位；1024 位 RSA 早已不安全 | `ssh-keygen -t ed25519`（首选）；需要兼容老设备时用 `-t rsa -b 4096`（下限 3072） |
| 无 passphrase 的密钥放在开发者笔记本上 | 设备丢失/被入侵即刻等于身份被盗，且无法事后补救 | 交互用途一律加 passphrase + `AddKeysToAgent yes` 交给 agent；只有 CI 专用密钥可免 passphrase，且权限收窄到单仓库只读 |
| 团队共用一对密钥登录同一批机器 | 无法审计谁做了什么，离职/泄露时必须全员换钥，吊销粒度是"所有人" | 每人一对，公钥各自追加进 `authorized_keys`；或用 SSH 证书（CA 签发、可设有效期） |
| 端口转发不加 `ExitOnForwardFailure yes` | 本地端口被占用时 ssh **仍会连上**，只是转发是坏的，脚本报的错完全指不到真因 | 全局设 `ExitOnForwardFailure yes`，让失败立刻且明确 |
| `-R` 远程转发时以为对端所有网卡都能访问 | 默认只绑远端 loopback；需 `GatewayPorts yes`（服务端）+ `-R 0.0.0.0:<port>:...` 才对外 | 优先保持只绑 loopback，用远端本机上的服务消费；确需对外时评估暴露面并加防火墙限制 |
| 隧道断了就手动重连，或写个 `while true` 循环 | 无退避的重连会打爆服务端 `MaxStartups`；手动重连在凌晨不会有人做 | 用 `autossh` + `-M 0`（依赖 `ServerAliveInterval` 探活）+ `ServerAliveCountMax`，让它带退避地自愈 |
| 部署脚本里连续 30 次 `ssh host <cmd>` 各自建连 | 每次都要 TCP + 密钥交换 + 认证，通常 300–800ms，累加起来分钟级浪费 | 开 `ControlMaster auto` + `ControlPersist`；或把多条命令合并成一次 `ssh host 'bash -s' < script.sh` |
| `ssh host "echo $VAR"` 期望远端展开变量 | 双引号里 `$VAR` 由**本地** shell 先展开，远端拿到的是本地值（本地没定义就是空串） | 远端展开用单引号：`ssh host 'echo $VAR'`；本地展开用双引号。混用时显式转义 `\$VAR` |
| 排障会话结束后只发一句"已修好" | 下一个人从零开始；同样的坑会再踩一次；关键命令与判定过程全部丢失 | 交接命令记录 + 结论 + 未验证的假设；共享 tmux 会话用于实时协作，但**不共享私钥** |
| `~/.ssh/config` 里写死真实 IP/内部域名并提交进仓库 | 泄露网络拓扑；换环境就得改历史 | `Include` 拆分本地文件（gitignore），仓库里只放带 `{PLACEHOLDER}` 的模板 |
