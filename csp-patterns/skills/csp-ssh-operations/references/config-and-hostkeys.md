# 连接配置与主机密钥管理

## §1 `~/.ssh/config` 的结构化写法

### 选项优先级：SSH 取**第一个**出现的值

这是 config 不生效的头号原因。同一选项在多个匹配块里出现时，**最靠前**的那条胜出，
不是最具体的那条。所以 `Host *` 全局默认块必须写在**文件末尾**才不会被抢占——
但惯例是写在开头以便阅读，代价是：任何在 `Host *` 之后定义的块都无法覆盖它。

**推荐做法**：把"想被覆盖的全局默认"放在**文件末尾**的 `Host *` 块里，
把"必须强制生效、不允许被覆盖"的项（如 `ForwardAgent no`）放在**文件开头**的 `Host *` 块里。

```bash
# 不要靠读 config 猜最终值——直接问 ssh
ssh -G app-prod | grep -E '^(hostname|user|port|identityfile|proxyjump|forwardagent|controlmaster|controlpath|controlpersist|serveraliveinterval|exitonforwardfailure|identitiesonly|stricthostkeychecking) '
```

`ssh -G` 的输出是所有来源合并后的最终值，来源包括：命令行 `-o`（最高）→ `~/.ssh/config` →
`Include` 引入的文件（按出现位置）→ `/etc/ssh/ssh_config` → OpenSSH 内置默认。

### 常用选项速查

| 选项 | 作用 | 推荐值 |
|---|---|---|
| `Host` | 匹配模式，支持 `*`、`?`、`!`（取反）与多模式空格分隔，如 `Host app-* !app-legacy` | 用语义化别名，不要用 IP 当别名 |
| `HostName` | 真实主机名/IP；支持 `%h`（原始输入）等 token | 占位符或环境变量注入，不硬编码 |
| `User` | 登录用户 | 按环境区分，别都用 root |
| `Port` | 端口 | 默认 22；改了端口不能提升安全性，只是减少日志噪音 |
| `IdentityFile` | 私钥路径；可写多条按序尝试 | 每环境一对密钥，路径写全（`~` 只在行首展开） |
| `IdentitiesOnly` | 只用 `IdentityFile` 指定的密钥，**不**把 agent 里所有密钥挨个试一遍 | `yes`（防 `Too many authentication failures`） |
| `ProxyJump` | 经一个或多个跳板到达目标，认证仍在本地完成 | 现代写法，替代 `ProxyCommand ssh -W` |
| `LocalForward` | 连上即建本地转发，等价命令行 `-L` | 数据库/管理面板类常用 |
| `RemoteForward` | 连上即建远程转发，等价 `-R` | 把本地调试服务暴露给远端 |
| `DynamicForward` | 建 SOCKS 代理，等价 `-D` | 需要按目标动态选出口时 |
| `ServerAliveInterval` | 客户端每 N 秒发一次探测包（走加密信道） | `30`（比常见的 60s NAT 超时更保险） |
| `ServerAliveCountMax` | 连续多少次无响应才断 | `3` → 30×3 = 90s 容忍窗口 |
| `TCPKeepAlive` | 走 TCP 层 keepalive（**未加密**，可被中间设备伪造/观察） | 保持默认 `yes` 但不要依赖它；主用 `ServerAliveInterval` |
| `ForwardAgent` | 是否转发 agent | `no`，只对具名可信主机单独 `yes` |
| `ExitOnForwardFailure` | 转发建立失败时是否退出 | `yes`（否则连上了但隧道是坏的，报错指不到真因） |
| `ControlMaster` / `ControlPath` / `ControlPersist` | 连接复用 | `auto` / `~/.ssh/sockets/%C` / `10m` |
| `BatchMode` | 禁止一切交互提示（密码、passphrase、主机确认） | 脚本里 `yes` |
| `ConnectTimeout` | TCP 连接超时秒数 | 交互 `10`；CI `5` |
| `Compression` | 压缩传输 | 高延迟低带宽链路 `yes`；局域网/大文件传输 `no`（CPU 白烧） |
| `ServerAliveInterval` vs `ClientAliveInterval` | 前者客户端发，后者服务端 `sshd_config` 发 | 两端都配才最稳；服务端 `ClientAliveInterval 60` + `ClientAliveCountMax 3` 是常见硬化配置 |

### `Include` 拆分多环境

```sshconfig
# ~/.ssh/config
Host *
    ForwardAgent no
    IdentitiesOnly yes
    ExitOnForwardFailure yes

Include ~/.ssh/config.d/*.conf      # 通配引入，按文件名排序生效
```

```sshconfig
# ~/.ssh/config.d/10-personal.conf   数字前缀控制加载顺序（第一个值胜出）
# ~/.ssh/config.d/20-work-staging.conf
# ~/.ssh/config.d/30-work-prod.conf
# ~/.ssh/config.d/99-defaults.conf   把"可被覆盖的全局默认"放最后
```

拆分理由：
1. 生产配置与个人配置分离，误操作面变小。
2. `config.d/` 整个目录 gitignore，仓库里只放 `config.d/*.conf.template`（含 `{PLACEHOLDER}`）。
3. 换机器时只同步需要的文件。
4. 加载顺序由文件名数字前缀显式控制，不依赖"我记得哪个块在前"。

### `Match` 块（条件生效）

```sshconfig
# Match 必须写在它要作用的选项之前；Match 块一直延伸到下一个 Host/Match 或文件末尾
Match host *-prod exec "test -n \"$PROD_ACCESS_APPROVED\""
    User {DEPLOY_USER}
    IdentityFile ~/.ssh/prod_ed25519
    ProxyJump bastion

Match host app-* !app-legacy
    ServerAliveInterval 15

Match all
    # 兜底默认
```

`Match exec` 会执行本地命令，退出码 0 才匹配——可以用它把"是否已获得生产访问授权"
这类外部条件接进来（例如检查一个短期授权文件是否存在）。注意 `exec` 命令在本地以你的权限运行，
不要在里面放需要交互的东西。

---

## §2 `ssh -v` / `-vv` / `-vvv` 分级排错

**从 `-v` 开始**，只在信息不足时升级。

| 级别 | 新增可见信息 | 典型用途 |
|---|---|---|
| `-v` | 读取了哪些 config 文件、DNS 解析结果、TCP 连接、协议版本、KEX 算法协商、**`Offering public key: <path>` 逐条列出**、`Server accepts key`、认证成功/失败、`Authenticated to <host>` | 认证问题、"到底用了哪个密钥"、"config 有没有被读" |
| `-vv` | 密钥文件的加载与解析细节、每个认证方法的完整尝试序列、`expecting SSH2_MSG_*` | 密钥被拒但你确信它该被接受；算法/格式问题（如 PEM vs OpenSSH 格式） |
| `-vvv` | 逐包（packet-level）trace、每个 channel 的 open/confirm/close | 协议层不兼容、连接莫名中断、多路复用异常 |

```bash
# 只看认证部分，噪音最小
ssh -v -o BatchMode=yes -o ConnectTimeout=5 app-prod true 2>&1 \
  | grep -E 'Reading configuration|Offering|Server accepts|Authentications that can continue|Authenticated|Permission denied|debug1: Connecting'
```

`-v` 输出里最有诊断价值的四行：

| 行 | 说明 |
|---|---|
| `debug1: Reading configuration data /home/u/.ssh/config` | config 有没有被读到（没有 → 路径或权限问题，`chmod 600`） |
| `debug1: Connecting to <hostname> [<ip>] port <port>` | 解析到的**实际 IP** 与端口——`Connection timed out` 时先看这行是不是解析错了 |
| `debug1: Offering public key: /path/to/key ED25519 SHA256:xxxx` | 本地提供了哪些密钥。列出 8 个 → 必然 `Too many authentication failures` |
| `debug1: Authentications that can continue: publickey` | 服务端还接受哪些方法。只剩 `publickey` 说明密码登录已被禁（好事） |

---

## §3 主机密钥与 known_hosts

### 看指纹

```bash
# 看远端主机的公钥指纹（不登录，只做握手）
ssh-keyscan -t ed25519 {TARGET_HOST} 2>/dev/null | ssh-keygen -lf -

# 看 known_hosts 里已记录的指纹（逐行）
ssh-keygen -lf ~/.ssh/known_hosts

# 看本地某对密钥的指纹
ssh-keygen -lf ~/.ssh/deploy_ed25519.pub
ssh-keygen -lf ~/.ssh/deploy_ed25519        # 私钥也能读（OpenSSH 格式）

# 看 known_hosts 里某个主机的条目（HashKnownHosts yes 时用 -H 后的哈希名查不到，用 -F）
ssh-keygen -F {TARGET_HOST}
ssh-keygen -F '[{TARGET_HOST}]:2222'        # 非标准端口在 known_hosts 里是 [host]:port 形式
```

指纹格式是 `SHA256:<base64>`（旧格式是 `MD5:xx:xx:...`，已不可信）。
**核对必须走带外渠道**：云控制台的主机指纹页、装机时的记录、供应商提供的指纹、
或通过另一条已建立的信任通道（例如你已经在机器上，直接 `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`）。
在**同一条待验证的连接**里核对指纹没有意义——中间人会把两边都换掉。

### `ssh-keyscan` 的正确与危险用法

```bash
# ✅ 正确：为 CI 预先注入 known_hosts，且指纹来自可信来源
ssh-keyscan -t ed25519,rsa -T 5 {TARGET_HOST} > /tmp/hostkeys
ssh-keygen -lf /tmp/hostkeys                          # 先打印出来，与带外记录核对
# 核对无误后再合并
ssh-keyscan -t ed25519 {TARGET_HOST} >> ~/.ssh/known_hosts

# ✅ 正确：CI 里把指纹作为 secret/变量注入，完全不在线扫描
printf '%s\n' "$KNOWN_HOST_ENTRY" >> ~/.ssh/known_hosts
ssh -o StrictHostKeyChecking=yes -o UserKnownHostsFile=~/.ssh/known_hosts {DEPLOY_USER}@{TARGET_HOST} 'true'

# ❌ 危险：扫完直接追加，不做核对
ssh-keyscan {TARGET_HOST} >> ~/.ssh/known_hosts      # 等于 TOFU，中间人在扫描这一刻就能投毒
# ❌ 危险：写进循环批量扫整个网段
for h in $(seq 1 254); do ssh-keyscan 192.0.2.$h; done >> ~/.ssh/known_hosts   # 一次投毒 254 条
```

`ssh-keyscan` **不做任何验证**，它只是把对方声称的公钥抓下来。
所以它的输出必须与带外记录核对，否则等价于 `StrictHostKeyChecking no`，只是换了个形式。

`-T 5` 设超时（默认 5s，但批量场景要显式设）；`-t ed25519,rsa` 限定类型，
避免抓到主机上已弃用的旧密钥类型。

### 密钥轮换后清理 known_hosts

主机重装、`/etc/ssh/ssh_host_*` 重新生成、IP 被复用给另一台机器——都会让指纹变化。

```bash
# 精确移除某个主机的所有条目（会同时处理 [host]:port 形式）
ssh-keygen -R {TARGET_HOST}
ssh-keygen -R '[{TARGET_HOST}]:2222'

# 移除后重连，会重新走 TOFU 提示——此时必须核对新指纹
ssh {DEPLOY_USER}@{TARGET_HOST}

# 大规模轮换后重建（例如整个环境重装）：先确认没有别的会话在用，再原子替换
cp ~/.ssh/known_hosts ~/.ssh/known_hosts.$(date +%Y%m%d%H%M%S)
ssh-keyscan -t ed25519 -T 5 {HOST_1} {HOST_2} {HOST_3} > /tmp/new-hostkeys
ssh-keygen -lf /tmp/new-hostkeys          # 与带外记录逐条核对
cat /tmp/new-hostkeys >> ~/.ssh/known_hosts && sort -u ~/.ssh/known_hosts -o ~/.ssh/known_hosts
```

**为什么"警告变了就直接删"是坏习惯**：

1. 指纹变化的两个成因——正常轮换 与 中间人攻击——在客户端看起来**完全一样**。
2. 直接删并重连等于把已建立的信任清零，然后对新主机重新 TOFU。
   攻击者只要在你删的那一刻还在链路上，就会被无条件信任，且之后**永远不再报警**。
3. 这类"清一下就好了"的操作在团队里会被复制成习惯，等到真的是攻击时，
   没人会觉得那条警告值得停下来核实。

正确流程：**先核实，后清理**。
从带外渠道拿到预期新指纹 → 比对 → 一致才 `ssh-keygen -R` → 重连 → 再比对一次落库的指纹。
不一致就**不要连**，按安全事件处理（隔离该主机、检查网段内是否有异常设备、审计近期会话）。

### `HashKnownHosts yes`

把 known_hosts 里的主机名做 HMAC 哈希，防止别人读到这个文件就知道你连过哪些机器。
代价：无法用 `grep` 直接查，必须用 `ssh-keygen -F <host>`。
共享机器/多用户环境建议开启；纯个人笔记本可选。
注意开启只影响**新写入**的条目，已有明文条目需 `ssh-keygen -H` 转换（会生成 `.old` 备份，记得清理）。

### 更好的方案：SSH 证书（有 CA 时）

主机数量多、轮换频繁时，known_hosts 维护成本会失控。用 SSH CA：

```bash
# CA 签发主机证书（在服务端侧一次性做）
ssh-keygen -s ca_host_key -I host-{TARGET_HOST} -h -n {TARGET_HOST},{TARGET_HOST_ALIAS} -V +52w /etc/ssh/ssh_host_ed25519_key.pub

# 客户端只需信任 CA 公钥一次，之后所有该 CA 签发的主机自动可信
# ~/.ssh/known_hosts 里加一行：
#   @cert-authority *.{YOUR_DOMAIN} <CA 公钥内容>
```

收益：主机密钥轮换不再需要客户端改 known_hosts；证书可设有效期（`-V`）；
可以按域/环境分组信任。代价：CA 私钥成为高价值目标，必须离线保管或放 HSM。
