# 故障判定与会话交接

## §0 先分层，再查表

SSH 失败一定落在四层之一。**先定位是哪一层**，再去下面的小节——否则会在错误的层里翻半天。

```bash
HOST={TARGET_HOST}; PORT=${PORT:-22}

# L1 TCP 可达性：三次握手能不能完成
nc -zv -w 5 "$HOST" "$PORT"          # 或 timeout 5 bash -c "</dev/tcp/$HOST/$PORT" && echo TCP_OK
getent hosts "$HOST" || dig +short "$HOST"   # 先确认解析到的 IP 是对的

# L2 SSH 协议握手：能不能拿到 banner、算法能不能协商
timeout 5 nc "$HOST" "$PORT" | head -1        # 应看到 SSH-2.0-<实现>；看不到就是 L2 失败
ssh -vvv -o BatchMode=yes -o ConnectTimeout=5 "$HOST" true 2>&1 | tail -40

# L3 认证：密钥有没有被接受
ssh -v -o BatchMode=yes -o IdentitiesOnly=yes -i ~/.ssh/{NAME}_ed25519 "$HOST" true 2>&1 \
  | grep -E 'Offering|Server accepts|Authentications that can continue|Permission denied'

# L4 会话与命令：登录后命令能不能跑
ssh -o BatchMode=yes "$HOST" 'echo L4_OK; which {TOOL}; echo $PATH'
```

| 层 | 失败表现 | 去查 |
|---|---|---|
| L1 TCP | `Connection refused` / `Connection timed out` / `No route to host` | §2 |
| L2 协议握手 | `kex_exchange_identification` / `Unable to negotiate ... no matching key exchange method` / 连上立刻断 | §9 |
| L3 认证 | `Permission denied (publickey)` / `Too many authentication failures` / `Host key verification failed` | §1 / §3 / §4 |
| L4 会话 | 能登录但命令失败、`command not found`、`Broken pipe`、复用异常 | §8 / §5 / §6 |

---

## §1 `Permission denied (publickey)`

**含义**：TCP 通了、协议握手成功、主机密钥也认了，服务端只是不接受你提供的凭据。
（如果还允许密码，报错会是 `Permission denied (publickey,password)`。）

| # | 根因 | 确认方法 | 修法 |
|---|---|---|---|
| 1.1 | **权限过宽，sshd 静默忽略 `authorized_keys`**（第一大坑） | 远端 `stat -c "%a %n" ~ ~/.ssh ~/.ssh/authorized_keys`。home 不能对 group/other 可写；`~/.ssh` 需 700；`authorized_keys` 需 600。客户端**不会**给出任何权限提示 | `chmod 755 ~ && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys`。服务端 `sudo sshd -T \| grep strictmodes` 确认是否开启（默认 yes） |
| 1.2 | 公钥根本没上去 / 上到了错误的用户家目录 | `ssh -v` 里看 `Offering public key: <path> SHA256:<fp>`；远端 `sudo ssh-keygen -lf ~/.ssh/authorized_keys`（对**目标用户**的家目录）逐条比对指纹 | `ssh-copy-id -i ~/.ssh/{NAME}.pub {USER}@{HOST}`。注意用 `root` 登录时公钥要在 `/root/.ssh/`，不是 `/home/xxx/.ssh/` |
| 1.3 | 本地提供了错的密钥，或 `IdentitiesOnly` 导致指定密钥不对 | `ssh -v` 的 `Offering` 列表；`ssh -G {HOST} \| grep identityfile` 看最终生效的是哪个路径 | 显式 `-i <正确路径>`；或改 config 的 `IdentityFile` |
| 1.4 | 远端禁用 pubkey，或 `AuthorizedKeysFile` 指向别处 | `sudo sshd -T \| grep -iE 'pubkeyauthentication\|authorizedkeysfile'` | 服务端改回 `PubkeyAuthentication yes` 与标准路径，`systemctl reload sshd`（reload 不断现有连接） |
| 1.5 | `AllowUsers`/`AllowGroups`/`DenyUsers`/`Match` 块把你排除了 | `sudo sshd -T \| grep -iE 'allowusers\|allowgroups\|denyusers\|denygroups'`；注意 `Match` 块可能对特定来源生效 | 服务端调整白名单 |
| 1.6 | SELinux 上下文错误 | `getenforce` = Enforcing；`ls -Z ~/.ssh/authorized_keys` 不是 `ssh_home_t`；`sudo ausearch -m avc -ts recent` 有 denied | `sudo restorecon -R -v ~/.ssh` |
| 1.7 | 密钥格式/算法不被服务端接受（老 sshd 不支持 ed25519，或新版禁用了 ssh-rsa/SHA-1） | `ssh -vv` 里出现 `no mutual signature algorithm` / `userauth_pubkey` 被拒但指纹正确 | 老服务端：改用 rsa 密钥。新客户端连老服务端：`-o PubkeyAcceptedAlgorithms=+ssh-rsa`（⚠ 这是降级，只作临时兼容） |
| 1.8 | home 目录在网络文件系统（NFS）且 root 被挤压 | 远端 `df ~ \| tail -1` 显示 NFS；`showmount`/`exportfs` 配了 `root_squash` | NFS 服务端配 `no_root_squash`（有代价）或改用非 root 账号 + 明确 uid 映射 |

**决定性动作**：看**服务端**日志。客户端的 `Permission denied (publickey)` 对上面 8 种根因
给出的信息完全一样，服务端日志才有区分度：

```bash
sudo journalctl -u sshd -n 30 --no-pager
# 典型输出的含义：
#   "Authentication refused: bad ownership or modes for directory /home/u"  → 1.1
#   "Authentication refused: bad ownership or modes for file .../authorized_keys" → 1.1
#   "Failed publickey for u from <ip> port N ssh2: ED25519 SHA256:xxx"        → 密钥确实不匹配（1.2/1.3）
#   "User u not allowed because not listed in AllowUsers"                    → 1.5
```

---

## §2 `Connection refused` / `Connection timed out`

两者在 L1 就是不同的失败，**根因方向完全相反**，不要混着查。

| | `Connection refused` | `Connection timed out` |
|---|---|---|
| 底层含义 | 收到了 **RST**：主机在，但那个端口没有进程在监听 | **什么都没收到**：包被丢弃（DROP）或根本没到达 |
| 大概率根因 | sshd 没运行／端口写错（服务端改了 `Port` 而你连 22）／被 REJECT 规则拒绝／连到了错的主机 | 防火墙 DROP／云安全组未放行／路由不通／主机宕机／主机名解析到了一个不通的地址 |

```bash
# 通用第一步：确认解析到的 IP 与端口
ssh -G {ALIAS} | grep -E '^(hostname|port|user|proxyjump) '
getent hosts {TARGET_HOST}

# refused → 查端口与进程（需要另一条通道，如云控制台 console）
sudo ss -tlnp | grep -E ':22\b'          # sshd 在听吗，听在哪个地址/端口
sudo systemctl status sshd                # 或 ssh（Debian 系服务名是 ssh）
sudo sshd -T | grep -iE '^port |^listenaddress '
sudo firewall-cmd --list-all 2>/dev/null || sudo nft list ruleset 2>/dev/null | head -40

# timed out → 查路径上的丢包点
traceroute -T -p {SSH_PORT} {TARGET_HOST}     # TCP traceroute，比 ICMP 更能反映真实路径（很多网禁 ICMP）
sudo iptables -L INPUT -n -v | head -20       # 看有没有 DROP 计数在涨
# 云环境：控制台的安全组/网络 ACL 是头号原因，且从主机内部完全看不出来
```

**其他 refused/timeout 成因**：

| 根因 | 确认 | 修法 |
|---|---|---|
| 云安全组未放行来源 IP | 控制台查入站规则；`traceroute` 在云边界就断 | 放行来源 CIDR。⚠ 不要图省事开 `0.0.0.0/0` |
| fail2ban 把你的 IP 封了 | `sudo fail2ban-client status sshd` 看 Banned IP list | `sudo fail2ban-client set sshd unbanip <your-ip>`；把自己的办公/跳板 IP 加进 `ignoreip` |
| 走了跳板但跳板本身不通 | `ssh -G {ALIAS} \| grep proxyjump` 确认链路；单独测 `ssh bastion true` | 逐跳测试，定位是哪一跳断的 |
| MTU 问题导致握手后卡住 | 能连上但传输大文件时挂住；`ping -M do -s 1400 {TARGET_HOST}` 失败 | 调小 MTU 或加 `IPQoS` 设置；VPN/overlay 网络上常见 |
| 服务端 `MaxStartups` 打满 | 表现为间歇性 refused/立即断开；`sudo sshd -T \| grep maxstartups` | 提高 `MaxStartups`（默认 `10:30:100`）；根因常是某处脚本在做无复用的并发连接 → 开 `ControlMaster` |

---

## §3 `Host key verification failed`

**含义**：服务端提供的主机公钥与 `~/.ssh/known_hosts` 里的记录**不一致**，
或者没有记录而 `StrictHostKeyChecking` 被设为 `yes`。

```bash
# 先看清是哪一种
ssh -v {ALIAS} true 2>&1 | grep -iE 'host key|known_hosts|WARNING: REMOTE HOST IDENTIFICATION'
# 完整报错形态：
#   @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
#   @    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @
#   ...
#   Host key for {HOST} has changed and you have requested strict checking.
```

| 情形 | 判定 | 动作 |
|---|---|---|
| 报错含 `WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED` | known_hosts 里有旧记录且**不匹配** | **停下来核实**，见下面流程 |
| 报错只是 `Host key verification failed` 且无 CHANGED 字样 | known_hosts 里**没有**记录，而 `StrictHostKeyChecking=yes`（常见于 CI） | 预注入正确指纹（带外核对后），或首次改用 `accept-new` |
| 端口变了（`[host]:2222`） | known_hosts 按 `[host]:port` 存条目，换端口 = 新条目 = 找不到 | `ssh-keygen -F '[{HOST}]:2222'` 查；确认后 `ssh-keygen -R '[{HOST}]:2222'` |
| `HashKnownHosts yes` 导致你以为没记录 | 条目是哈希形式，`grep {HOST} ~/.ssh/known_hosts` 查不到 | 用 `ssh-keygen -F {HOST}` 查，它会正确处理哈希条目 |

**核实流程（不可跳过）**：

```bash
# 1. 看服务端现在声称的指纹（这一步本身不可信，只是拿到"待核实的值"）
ssh-keyscan -t ed25519 -T 5 {TARGET_HOST} 2>/dev/null | ssh-keygen -lf -

# 2. 从带外渠道拿预期指纹，任选一条独立通道：
#    - 云控制台的主机指纹/实例详情页
#    - 装机时的交付记录、IaC 输出（Terraform 的 tls_private_key / 实例 metadata）
#    - 通过已有的另一条可信连接登上去执行：
ssh {USER}@{OTHER_TRUSTED_PATH} 'ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub'
#    - 供应商/运维同事通过 IM 语音或另一个渠道确认

# 3a. 指纹一致 → 正常轮换，清理旧记录后重连
ssh-keygen -R {TARGET_HOST}
ssh-keygen -R '[{TARGET_HOST}]:{SSH_PORT}'    # 非标准端口时也要清
ssh {ALIAS} true                               # 重新 TOFU，再核对一次落库的指纹

# 3b. 指纹不一致 → 不要连。按安全事件处理：
#     隔离该主机、检查同网段是否有异常设备、审计近期所有会话与凭据使用记录、
#     假定经由该链路的凭据已泄露并全部轮换
```

**为什么"警告变了就直接删"是坏习惯**：指纹变化的两个成因（正常轮换 / 中间人攻击）
在客户端看起来**完全一样**。直接删除等于把已建立的信任清零并对当前链路上的任何主机重新无条件信任——
攻击者只要在那一刻仍在链路上，就会被记录为合法主机，此后**永远不再报警**。
详见 `config-and-hostkeys.md` §3。

---

## §4 `Too many authentication failures`

**含义**：客户端在被拒的次数超过了服务端 `MaxAuthTries`（默认 6），
服务端在真正的密钥还没被尝试之前就断开了连接。

```bash
# 确认是不是这个原因：看 -v 里 Offering 的条数
ssh -v -o BatchMode=yes {ALIAS} true 2>&1 | grep -c 'Offering public key'
# > 6 基本必中。也看一眼 agent 里加载了几把
ssh-add -l | wc -l
```

| 根因 | 说明 | 修法 |
|---|---|---|
| agent 里加载了大量密钥 | `AddKeysToAgent yes` 用久了、或 `ssh-add ~/.ssh/*` 一把全加。ssh 会把 agent 里**每一把**都试一遍 | `ssh-add -D` 清空后只加需要的那把 |
| config 里同一 Host 写了多条 `IdentityFile` | 多条都会依次尝试 | 精简到 1 条；或用 `Match` 按条件区分 |
| 默认密钥文件太多 | `~/.ssh/` 下有 `id_rsa`、`id_ed25519`、`id_ecdsa`… 未指定时全都会被试 | `IdentitiesOnly yes` |

**根治办法：`IdentitiesOnly yes`**

```sshconfig
Host *
    IdentitiesOnly yes     # 只用本 Host 块里 IdentityFile 明确列出的密钥，忽略 agent 里的其他密钥
```

```bash
# 一次性验证（不改配置）
ssh -o IdentitiesOnly=yes -i ~/.ssh/{NAME}_ed25519 {USER}@{HOST} true
```

语义细节：`IdentitiesOnly yes` 并不禁止使用 agent，
而是限制"只用 `IdentityFile` 指定的那些密钥"——
如果指定的密钥在 agent 里，仍然走 agent（不会重复问 passphrase）。
这正是想要的行为。

其他相关手段：`PreferredAuthentications publickey`（跳过 password/keyboard-interactive 的无效尝试）、
服务端提高 `MaxAuthTries`（⚠ 这是放宽暴力破解防护，只在客户端确实无法精简时才做，且应配合 fail2ban）。

---

## §5 `Broken pipe` / 空闲后被断开

| 根因 | 确认 | 修法 |
|---|---|---|
| 无 keepalive，中间 NAT/防火墙回收空闲连接（最常见） | 断开总是在"闲置一段时间后"，且时长很规律（如 5 分钟、10 分钟）——那就是某个中间设备的空闲超时 | 客户端 `ServerAliveInterval 30` + `ServerAliveCountMax 3`（写进 `Host *`）。间隔必须**小于**链路上最短的空闲超时 |
| 服务端 `ClientAliveInterval` 主动断 | `sudo sshd -T \| grep -i clientalive`，看 `ClientAliveInterval`/`ClientAliveCountMax` | 服务端调大，或客户端配合发流量 |
| `TCPKeepAlive` 被中间设备识别并丢弃 | 设了 `TCPKeepAlive yes` 仍断 | 改用 `ServerAliveInterval`（走加密信道内的 SSH 层探测，中间设备看不见也改不了） |
| 长时间只读输出（如 `tail -f` 大日志）触发中间设备限流 | 有持续输出反而不断，纯空闲才断 → 就是空闲超时 | 同上 |
| 网络真的抖了 | 断开无规律，伴随丢包 | `mtr {TARGET_HOST}` 看链路质量；跨地域链路考虑 `autossh` 自愈 |
| 会话被卡住（不是断开） | 终端完全无响应，Ctrl-C 也无效 | 按 `Enter` 然后 `~.`（波浪号必须是行首第一个字符）强制断开；`~?` 列出所有转义命令；`~#` 列出当前转发连接；`~&` 把 ssh 转入后台 |

`~.` 是唯一能在不关终端的情况下杀掉僵死会话的手段——
因为它是 SSH 客户端自己在**发送前**拦截的转义序列，不依赖网络。

---

## §6 `mux_client_hello_exchange: read packet: No such file or directory`

**含义**：`ControlMaster` 复用出错。客户端去连 `ControlPath` 指向的 Unix socket，
socket 文件不存在、已损坏、或另一端的主连接已经死了。

```bash
# 1. 看 ControlPath 最终解析到哪
ssh -G {ALIAS} | grep -i controlpath
# 2. 检查主连接状态
ssh -O check {ALIAS}
#    "Master running (pid=NNNN)"  → 主连接活着，问题在别处
#    "Control socket ... No such file or directory" → socket 没了
ls -l ~/.ssh/sockets/
```

| 根因 | 修法 |
|---|---|
| 主连接进程已死但 socket 文件残留（机器重启、OOM、手动 kill） | `rm -f ~/.ssh/sockets/<对应文件>`；或 `ssh -O exit {ALIAS}`（可能也报错，那就直接 rm） |
| socket 目录不存在 | `mkdir -p ~/.ssh/sockets && chmod 700 ~/.ssh/sockets`。**目录不存在时 ssh 不会自动创建**，会直接复用失败 |
| `ControlPath` 路径超过 Unix socket 长度限制（104/108 字节） | 改用 `%C`（固定长度哈希）而非 `%r@%h-%p`；或缩短目录路径 |
| socket 文件权限/属主不对（多用户共用目录、或从 root 切回普通用户） | `chmod 700 ~/.ssh/sockets`；确保 socket 属主是当前用户；**不要**把 sockets 目录设在 `/tmp` 共享路径下 |
| 网络文件系统上的 socket（`~/.ssh` 在 NFS 上） | Unix socket 不能放 NFS。把 `ControlPath` 指到本地磁盘，如 `/run/user/$UID/.ssh-sockets/%C` |
| 并发脚本竞争同一个 socket | 主连接被 `ssh -O exit` 关掉时，正在复用的会话会报此错。脚本里避免随意 `-O exit`，或给批处理任务用独立 `ControlPath` |
| 老版本 OpenSSH 的 mux 实现 bug | `ssh -V` 看版本；升级客户端，或对该主机临时 `ControlMaster no` |

**快速恢复三连**：

```bash
ssh -O exit {ALIAS} 2>/dev/null; rm -f "$(ssh -G {ALIAS} | awk '/^controlpath /{print $2}')"
ssh -o BatchMode=yes {ALIAS} true && echo RECOVERED
```

**预防**：一次性脚本用 `ControlPersist=0`（用完即关，不留残留 socket）；
交互式用 `ControlPersist 10m`（自动超时清理）。两者都比 `ControlPersist yes`（永不超时）安全。

---

## §7 `Bad configuration option`

```bash
ssh -V                     # 客户端版本。选项支持度按版本差异很大
man ssh_config | grep -A3 -i '{OPTION_NAME}'   # 确认拼写与可用版本
```

| 根因 | 说明 | 修法 |
|---|---|---|
| 客户端版本太老，不支持该选项 | `UseKeychain`（macOS 专属）、`PubkeyAcceptedAlgorithms`（8.5+，旧名 `PubkeyAcceptedKeyTypes`）、`SecurityKeyProvider`、`RequiredRSASize`（8.2+） | 升级客户端；或按版本用旧选项名 |
| 平台专属选项写进了跨平台共享的 config | `UseKeychain` 在 Linux 上报错；`IgnoreUnknown` 可以救 | `Host *` 块开头加 `IgnoreUnknown UseKeychain`，让它在不支持的平台上被忽略 |
| 选项写在了命令行 `-o` 但拼写错 | `-o` 的错误会立刻报出，比 config 里的更好定位 | 对照 `man ssh_config` 校正 |
| 服务端 `sshd_config` 里写了客户端选项（或反之） | `ServerAliveInterval` 是**客户端**选项，写进 `sshd_config` 会报 `Bad configuration option`；服务端对应的是 `ClientAliveInterval` | 分清两侧选项集：`man ssh_config`（客户端）vs `man sshd_config`（服务端） |

`IgnoreUnknown` 是跨平台团队共享 config 的救命选项：

```sshconfig
Host *
    IgnoreUnknown UseKeychain,AddKeysToAgent
    UseKeychain yes          # Linux 上被忽略，不报错
```

---

## §8 能登录但远端命令失败

| 现象 | 根因 | 修法 |
|---|---|---|
| `bash: {TOOL}: command not found`，但交互登录后同一个命令能跑 | **非交互、非登录 shell 不读 `.bashrc`/`.zshrc`/`.profile`**，`PATH` 是 sshd 给的最小集。`ssh host cmd` 走的就是这条路径 | ① 用绝对路径（最稳）：`ssh host '/usr/local/bin/{TOOL} ...'`；② 显式加载环境：`ssh host 'source ~/.bashrc && {TOOL} ...'`；③ 把 PATH 写进 `~/.ssh/environment` 并在 sshd 开 `PermitUserEnvironment`（⚠ 有安全影响，不推荐）；④ 用 `ssh host 'bash -lc "..."'` 强制登录 shell |
| 命令跑了但退出码是 0，实际失败 | `ssh host 'cmd1; cmd2'` 只返回**最后一条**的退出码 | 用 `&&` 串联，或 `bash -s` + heredoc 里加 `set -euo pipefail`（见 `keys-auth-and-automation.md` §5） |
| 退出码 255 | ssh **自身**失败（连不上/认证失败），不是远端命令的返回值 | 回到 §1–§4 查通道 |
| 需要 sudo 但 `sudo: a password is required` | 非交互会话没有 tty，sudo 无法读密码 | 服务端 `visudo` 配 NOPASSWD 但**收窄到具体命令**：`{DEPLOY_USER} ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart {SERVICE}`；或 `ssh -t host 'sudo ...'` 分配 tty（⚠ `-t` 会让输出带上 tty 控制字符，不适合脚本解析） |
| stdin 被 ssh 吃掉，循环体只跑一次 | `ssh` 默认读 stdin，把外层 `while read` 的输入全消费了 | `ssh -n host cmd`（stdin 重定向到 `/dev/null`），或 `ssh host cmd < /dev/null` |
| 输出顺序错乱（stderr/stdout 交错） | ssh 把两个流合并到同一通道，且缓冲不同 | 远端 `cmd 2>&1`；或分别重定向到文件再取回 |
| 交互式程序在 `ssh host cmd` 下行为异常 | 没有 tty，`read`、进度条、颜色检测全部失效 | `ssh -t` 分配伪终端；但脚本里优先改造成非交互形式 |

`ssh -n` 那条是批量脚本的经典坑：

```bash
# ❌ 只会处理第一台，因为 ssh 把 hostlist.txt 剩下的内容当 stdin 读走了
while read -r h; do ssh "$h" 'uptime'; done < hostlist.txt

# ✅ 加 -n
while read -r h; do ssh -n "$h" 'uptime'; done < hostlist.txt

# ✅ 或者用不同的 fd
while read -r h <&3; do ssh "$h" 'uptime'; done 3< hostlist.txt
```

---

## §9 `kex_exchange_identification` / 协议握手失败

**含义**：TCP 连上了，但在 SSH 版本交换或密钥交换阶段就断了——**还没到认证**。
所以这与密钥、密码完全无关，不要往认证方向查。

| 报错形态 | 根因 | 修法 |
|---|---|---|
| `kex_exchange_identification: Connection closed by remote host` | 服务端在握手阶段主动关闭。最常见三种：① `MaxStartups` 限流（并发未认证连接过多）；② fail2ban/hosts.deny 在 TCP 层放行但 sshd 层拒绝；③ 服务端 sshd 配置损坏或正在重启 | `sudo sshd -T \| grep maxstartups`（默认 `10:30:100` = 10 个以内全接受，10–100 之间按 30% 概率随机拒，超 100 全拒）；`sudo fail2ban-client status sshd`；`sudo cat /etc/hosts.deny`。根因常是某处脚本在做无复用的并发连接 → 开 `ControlMaster` 或串行化 |
| `kex_exchange_identification: read: Connection reset by peer` | 中间设备（LB、防火墙、IDS）重置了连接；或连到了非 SSH 端口（如 HTTPS 端口） | `nc {HOST} {PORT} \| head -1` 看有没有 banner。确认端口；检查 LB 的协议模式（TCP 直通 vs 七层解析——**七层 LB 不能代理 SSH**） |
| `Unable to negotiate with <ip> port <p>: no matching key exchange method found. Their offer: diffie-hellman-group1-sha1` | 老服务端只提供已被禁用的弱算法（新版 OpenSSH 默认关闭了 SHA-1 相关算法） | 临时兼容：`ssh -o KexAlgorithms=+diffie-hellman-group14-sha1 -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa {HOST}`。⚠ 这是安全降级，只作过渡，正确做法是升级服务端 |
| `SSH-2.0-...` banner 能拿到但随后断 | 算法协商成功但认证前断开，多为 `MaxAuthTries` 之前的限制或 PAM 模块异常 | `sudo journalctl -u sshd -n 30`；`sudo sshd -t`（配置文件语法检查，很有用） |
| banner 是 `HTTP/1.1 ...` 或乱码 | 连到了非 SSH 服务（端口写错） | `ssh -G {ALIAS} \| grep '^port'`；核对服务端 `Port` |

```bash
# 一次性诊断：只取 banner，不做认证
timeout 5 nc -v {TARGET_HOST} {SSH_PORT} | head -3
# 服务端配置语法检查（改完 sshd_config 必做，避免 reload 失败把自己锁在外面）
sudo sshd -t && echo CONFIG_SYNTAX_OK
```

⚠ **改 sshd_config 前先确认有第二条通道**（云控制台 console、另一个已建立的会话、
或另一台能到达的机器）。sshd 配错后 reload 失败、现有会话又断了，就只能走带外救援。

---

## §10 会话交接与协作

排障到一半要换人，或要把上下文交给下一班。目标是**转移知识，不是转移凭据**。

### 两种交接方式的选择

| 方式 | 适合 | 优点 | 风险 |
|---|---|---|---|
| **共享 tmux/screen 会话**（实时协作） | 两人同时在线、需要即时问答、操作复杂难以文字化 | 完整保留终端状态：当前目录、已加载的环境变量、正在跑的命令、历史输出 | 对方看到**你的**身份在操作，审计日志记的是你；会话里可能残留凭据（`ssh-add` 状态、`export TOKEN=...`、`.bash_history`）；对方误操作无法区分是谁做的 |
| **只交接命令记录与结论**（异步） | 跨时区、非紧急、需要留档 | 审计清晰、无凭据泄露面、可复核 | 丢失终端隐性状态（当前目录、未导出的变量、"我刚才试过 X 不行"） |

**默认选异步交接**，只在实时协作确实必要时才共享会话，且遵守：

```bash
# 共享 tmux（第二人 attach 同一个 session）
tmux new-session -d -s incident-{YYYYMMDD} -n triage
tmux attach -t incident-{YYYYMMDD}          # 两人都 attach，实时同屏
tmux capture-pane -t incident-{YYYYMMDD} -p -S -3000 > /tmp/session-log.txt   # 导出全部滚动历史

# 共享 screen
screen -S incident-{YYYYMMDD}
screen -x incident-{YYYYMMDD}               # 第二人接入
screen -X hardcopy -h /tmp/screen-log.txt   # 导出
```

共享会话前必须做的三件事：
1. `history -c` 或确认历史里没有凭据；`env | grep -iE 'token|pass|key|secret'` 检查环境变量。
2. 确认会话里没有活跃的 agent forwarding（`echo $SSH_AUTH_SOCK`）——
   共享 tmux 不会共享 agent socket，但如果对方通过你的会话执行命令，用的是**你的** agent。
3. 约定谁操作：同屏两人同时敲键盘会互相覆盖。指定一人主操作，另一人只读+口头指挥。

### 为什么不建议共享私钥

| 共享私钥 | 各自加 `authorized_keys` |
|---|---|
| 审计日志里所有人的操作都是同一个身份，出事无法归因 | 每人的密钥独立，日志可归因到个人 |
| 吊销粒度是"所有人"：一人泄露就要全员换钥 | 只吊销那一个人的公钥，其他人不受影响 |
| 私钥必须通过某个渠道传输（IM、邮件、网盘）——每一次传输都是泄露点 | 只传公钥，公钥泄露无害 |
| 无法知道私钥还被复制到了多少台机器上 | `authorized_keys` 里每一条都可清点、可加注释溯源 |
| 违反"私钥永不落远端/永不共享"的基本原则 | 符合 |

正确做法：把对方的**公钥**追加进目标机器的 `authorized_keys`，
并在注释里写明是谁、什么时候、为什么加：

```bash
# 对方提供公钥（一行，含注释）
# ssh-ed25519 AAAA... {PEER_NAME}@{PEER_HOST}-{YYYYMMDD}-incident-{TICKET_ID}
echo 'ssh-ed25519 AAAA... {PEER_NAME}@{PEER_HOST}-{YYYYMMDD}-incident-{TICKET_ID}' \
  | ssh {DEPLOY_USER}@{TARGET_HOST} 'umask 077; cat >> ~/.ssh/authorized_keys'

# 事件结束后立即移除（按注释精确定位）
ssh {DEPLOY_USER}@{TARGET_HOST} \
  'grep -v "{PEER_NAME}@{PEER_HOST}-{YYYYMMDD}-incident-{TICKET_ID}" ~/.ssh/authorized_keys > /tmp/ak && cat /tmp/ak > ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && rm -f /tmp/ak'
```

**临时访问要设到期**：更好的方案是给临时公钥加限制前缀，
或用 SSH 证书（`ssh-keygen -s ca_user_key -I incident-{TICKET} -n {DEPLOY_USER} -V +8h pubkey.pub`）
让访问在 8 小时后自动失效，不依赖"记得删"。

```
# authorized_keys 里给临时密钥加限制（无 pty、不能转发、只能从指定来源、只能跑指定命令）
from="{PEER_CIDR}",no-agent-forwarding,no-port-forwarding,no-X11-forwarding,command="/usr/bin/journalctl -u {SERVICE} --no-pager -n 500" ssh-ed25519 AAAA... {PEER_NAME}-temp
```

### 交接内容清单（异步交接时照着写）

```markdown
## 交接：{TARGET_HOST} 排障（{TICKET_ID}）

### 环境
- 目标别名 / 走哪条跳板：{ALIAS} → via {JUMP_HOST}
- 用哪个密钥文件：~/.ssh/{NAME}_ed25519（**不附内容**）
- 需要的隧道：`ssh -N -L 15432:{DB_HOST}:5432 bastion`
- 访问方式：我的公钥已在 authorized_keys（注释 `{MY_NAME}-{YYYYMMDD}`）；
  你需要用你自己的密钥，联系 {OWNER} 追加，**不要**找我要私钥

### 已确认的事实（每条附命令与输出摘要）
| 事实 | 验证命令 | 输出摘要 |
|---|---|---|
| sshd 正常监听 22 | `sudo ss -tlnp \| grep :22` | `LISTEN 0 128 0.0.0.0:22` |
| 认证方式是 publickey only | `sudo sshd -T \| grep -i passwordauth` | `passwordauthentication no` |

### 已排除的假设（避免下一个人重复劳动）
| 假设 | 怎么排除的 |
|---|---|
| 防火墙拦截 | 从跳板 `nc -zv {TARGET_HOST} 22` 通 |
| 密钥权限问题 | `stat -c %a ~/.ssh/authorized_keys` = 600 |

### 当前最优假设（未验证）
- 假设：…
- 支持证据：…
- 反证 / 还不能解释的现象：…
- 下一步验证命令：…

### 已执行过的**有副作用**操作
| 操作 | 时间(UTC) | 影响 | 是否可回滚 |
|---|---|---|---|

### 待办
- [ ] …
```

**最重要的一段是"已排除的假设"**——它直接决定下一个人要花多久。
以及"已执行过的有副作用操作"：如果没人记录，下一个人会在被改过的现场上得出错误结论。

---

## §11 产物：环境连接清单模板

写到 `docs/analysis/ssh-topology-{env}.md`。**绝不写仓库根目录。**

硬性要求（违反任意一条即视为产物不合格）：

- ❌ 不出现私钥内容、passphrase、密码、令牌——一个字符都不行，包括"脱敏后的一半"。
- ❌ 不出现真实主机名、真实公网/内网 IP、真实内部域名。
- ✅ 一律用占位符 + 环境变量：`{JUMP_HOST}`、`{JUMP_PORT}`、`{BASTION_USER}`、
  `{TARGET_HOST}`、`{DEPLOY_USER}`、`{DB_HOST}`、`{SSH_PORT}`。
- ✅ 需要 IP 形式举例时用文档保留地址段：`192.0.2.0/24`、`198.51.100.0/24`、`203.0.113.0/24`。
- ✅ 真实值通过环境变量或未入库的 `~/.ssh/config.d/*.conf` 提供。

```markdown
# SSH 连接清单：{ENV_NAME}

> 本文档只记录**拓扑与访问方式**，不含任何凭据。真实地址通过环境变量或未入库的
> `~/.ssh/config.d/{ENV_NAME}.conf` 提供。

## 环境变量对照
| 占位符 | 含义 | 来源 |
|---|---|---|
| `{JUMP_HOST}` | 跳板机地址 | 密钥管理服务 / 团队密码库，**不入仓库** |
| `{JUMP_PORT}` | 跳板机 SSH 端口 | 同上 |
| `{BASTION_USER}` | 跳板机登录用户 | 同上 |
| `{TARGET_HOST}` | 目标应用机地址（仅跳板可达） | 同上 |
| `{DEPLOY_USER}` | 部署账号 | 同上 |
| `{DB_HOST}` | 数据库地址（仅目标机可达） | 同上 |

## 拓扑
本机 ──(公网)──> {JUMP_HOST}:{JUMP_PORT}
                      └──(内网)──> {TARGET_HOST}:22   [{DEPLOY_USER}]
                                       └──(内网)──> {DB_HOST}:5432

## 主机清单
| 别名 | 地址（占位符） | 用户（占位符） | 经由 | 密钥文件 | 转发端口 | 谁能访问 |
|---|---|---|---|---|---|---|
| `bastion` | `{JUMP_HOST}` | `{BASTION_USER}` | 直连 | `~/.ssh/bastion_ed25519` | — | 运维组 |
| `app-prod` | `{TARGET_HOST}` | `{DEPLOY_USER}` | `ProxyJump bastion` | `~/.ssh/deploy_ed25519` | — | 运维组 + 发布流水线 |
| `db-prod` | `{DB_HOST}` | `{DB_ADMIN_USER}` | `ProxyJump app-prod` | `~/.ssh/dbadmin_ed25519` | `LocalForward 15432 → 127.0.0.1:5432` | DBA（需审批） |

## 常用命令
| 目的 | 命令 |
|---|---|
| 登录应用机 | `ssh app-prod` |
| 建数据库隧道 | `ssh -f -N db-prod`（config 里已配 `LocalForward`）后连 `127.0.0.1:15432` |
| 查配置最终生效值 | `ssh -G app-prod \| grep -E 'hostname\|user\|proxyjump\|identityfile'` |
| 验证通道（不执行命令） | `ssh -o BatchMode=yes -o ConnectTimeout=5 app-prod true` |
| 部署产物 | `rsync -avz --delete ./dist/ app-prod:/var/www/{APP}/` |

## 安全基线（本环境的既定约定）
- `ForwardAgent no`（全局）；跳板需求一律 `ProxyJump`
- `StrictHostKeyChecking accept-new`（人工）/ `yes` + 预注入指纹（CI）
- `ExitOnForwardFailure yes`、`ConnectTimeout 10`、`ServerAliveInterval 30`
- 跳板 `authorized_keys` 全部带 `permitopen` 限制转发目标
- 临时访问用带有效期的 SSH 证书，不用长期公钥
- 密钥轮换周期：个人 12 个月 / 部署 90 天 / CI 30–90 天

## 变更记录
| 日期 | 变更 | 原因 | 操作人（角色，不写姓名） |
|---|---|---|---|
```
