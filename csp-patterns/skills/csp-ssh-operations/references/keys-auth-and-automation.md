# 密钥、认证与自动化

## §1 密钥生成与算法选择

| 算法 | 命令 | 判断 |
|---|---|---|
| **ed25519** | `ssh-keygen -t ed25519 -a 100 -C "{KEY_COMMENT}" -f ~/.ssh/{NAME}_ed25519` | **默认首选**。密钥短（68 字符公钥）、签名快、无参数选择陷阱、抗侧信道。OpenSSH 6.5+（2014）支持，现在几乎没有不支持的环境 |
| rsa ≥ 3072 | `ssh-keygen -t rsa -b 4096 -a 100 -C "{KEY_COMMENT}" -f ~/.ssh/{NAME}_rsa` | 只在必须兼容老设备时用（旧网络设备、老版本 sshd、某些嵌入式系统）。下限 3072，推荐 4096 |
| ecdsa | `ssh-keygen -t ecdsa -b 521` | 可用但不推荐：性能不比 ed25519 好，且历史上对 NIST 曲线参数的信任争议。新系统直接用 ed25519 |
| **dsa** | — | ❌ **不要用**。上限 1024 位，早已被认为不安全；OpenSSH 7.0（2015）起客户端默认禁用，7.8 起彻底移除 |

`-a 100` 是 KDF 轮数（passphrase 派生时的 bcrypt 成本），默认 16。
调到 100 显著增加离线爆破 passphrase 的成本，代价只是每次生成/解锁多几十毫秒。
只对**新格式**密钥（`-o`，OpenSSH 6.5+ 默认开启）有效；老 PEM 格式（`-m PEM`）忽略此参数。

```bash
# 生成一对密钥（交互提示 passphrase——不要图省事按回车跳过）
ssh-keygen -t ed25519 -a 100 -C "{USER}@{WORKSTATION}-{YYYYMM}" -f ~/.ssh/work_ed25519

# CI 专用密钥：无 passphrase（因为无人交互），但必须收窄权限 + 可吊销 + 短生命周期
ssh-keygen -t ed25519 -a 100 -N "" -C "ci-{PIPELINE_NAME}-{YYYYMM}" -f ./ci_deploy_key
# -N "" = 空 passphrase。只用于 CI；这类密钥必须是仓库级 deploy key（只读优先），不能是个人密钥

# 看公钥内容（用于粘贴到 authorized_keys / 平台的 Deploy Keys 页面）
cat ~/.ssh/work_ed25519.pub
# 看指纹（用于带外核对）
ssh-keygen -lf ~/.ssh/work_ed25519.pub
```

**注释（`-C`）写什么**：`{谁}@{哪台机器}-{什么时候}`。
它是 `authorized_keys` 里唯一能区分不同密钥的字段，轮换时靠它决定删哪条。
写 `user@host` 这种默认值等于没写——多人环境下会出现一堆无法辨识的相同注释。

**每个用途一对密钥**，不要一把走天下：

| 密钥 | 用途 | 权限范围 |
|---|---|---|
| `~/.ssh/personal_ed25519` | 个人日常登录 | 你自己的机器 |
| `~/.ssh/bastion_ed25519` | 登录跳板机 | 仅跳板，且配 `permitopen` 限制转发目标 |
| `~/.ssh/deploy_ed25519` | 部署到应用服务器 | 部署账号，`sudo` 收窄到具体命令 |
| `./ci_deploy_key` | CI 拉代码 | 单仓库、只读、可单独吊销 |

理由：泄露时吊销粒度是"一把密钥"而不是"你的全部身份"；审计时能区分是人还是流水线做的操作。

---

## §2 passphrase 与 ssh-agent

**交互用途一律加 passphrase。** 无 passphrase 的私钥文件一旦泄露（笔记本丢失、
误提交进 git、备份盘外泄）即刻等于身份被盗，且没有任何事后补救窗口。
passphrase 把"文件泄露"降级为"文件泄露 + 爆破 passphrase"。

```bash
# agent 管理
eval "$(ssh-agent -s)"                 # 手动启动（多数桌面环境已自启）
ssh-add ~/.ssh/work_ed25519            # 加入（提示一次 passphrase，之后本会话免输）
ssh-add -l                             # 列出已加载的密钥**指纹**（不是内容）
ssh-add -L                             # 列出已加载的**公钥**内容
ssh-add -d ~/.ssh/work_ed25519         # 移除单个
ssh-add -D                             # 移除全部（离开共享机器前必做）
ssh-add -t 3600 ~/.ssh/work_ed25519    # 加 1 小时后自动移除（临时借机器时用）
ssh-add -x ~/.ssh/work_ed25519         # 加锁：需要 agent 自己的密码才能使用
```

macOS：把 passphrase 存进 Keychain，重启后自动加载：

```bash
ssh-add --apple-use-keychain ~/.ssh/work_ed25519
```
```sshconfig
Host *
    AddKeysToAgent yes
    UseKeychain yes            # macOS 专属；Linux 上写这行会报 Bad configuration option
```

Linux：`AddKeysToAgent yes` + `SSH_ASKPASS` 或桌面环境的 agent 即可。
systemd 用户实例可启用 `ssh-agent.service`。

### agent 的安全边界

| 风险 | 说明 | 对策 |
|---|---|---|
| agent socket 可被同机其他用户/进程使用 | `/tmp/ssh-XXXX/agent.NNN` 权限由 umask 决定 | 确认 socket 是 `0700`；共享机器上用 `ssh-add -x` 加锁，或用完 `ssh-add -D` |
| agent forwarding 把身份带到远端 | 远端 root 可接管 socket 以你身份签名 | `ForwardAgent no` 全局默认；见 SKILL.md 安全边界 §1 |
| agent 里加载了太多密钥 | 触发 `Too many authentication failures`；也扩大了误用面 | `ssh-add -D` 后只加当前任务需要的那一把；配合 `IdentitiesOnly yes` |
| passphrase 存在 Keychain | 便利与安全的权衡：磁盘未加密时等于无 passphrase | 开启全盘加密（FileVault / LUKS）是前提条件 |

---

## §3 下发公钥：`ssh-copy-id` 与权限要求

```bash
# 标准做法（会把公钥追加到远端 ~/.ssh/authorized_keys，并自动修正权限）
ssh-copy-id -i ~/.ssh/work_ed25519.pub {DEPLOY_USER}@{TARGET_HOST}

# 指定非标准端口 / 走跳板
ssh-copy-id -i ~/.ssh/work_ed25519.pub -p {SSH_PORT} {DEPLOY_USER}@{TARGET_HOST}
ssh-copy-id -i ~/.ssh/work_ed25519.pub -o ProxyJump=bastion {DEPLOY_USER}@{TARGET_HOST}

# 没有 ssh-copy-id 时的等价手工命令（注意用单引号，让 mkdir/chmod 在远端执行）
cat ~/.ssh/work_ed25519.pub | ssh {DEPLOY_USER}@{TARGET_HOST} \
  'umask 077; mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
```

`umask 077` 是关键：它保证新建的 `~/.ssh` 与 `authorized_keys` 天然就是 700/600，
而不是先建错再 chmod。

### 权限要求：过宽会被 sshd **静默拒绝**

| 路径 | 要求 | 过宽时的后果 |
|---|---|---|
| 用户 home 目录 | 不能对 group/other 可写（`755` 可以，`775`/`777` 不行） | sshd 忽略该用户的 `authorized_keys` |
| `~/.ssh/` | `700`（上限 `755`，但必须**不可被他人写**） | 同上 |
| `~/.ssh/authorized_keys` | `600`（上限 `644`，必须不可被他人写） | 同上 |
| 私钥文件（客户端） | `600` | ssh 客户端直接拒绝加载：`Permissions 0644 for ... are too open` —— 这条**会**报错 |
| `~/.ssh/config` | `600` | 部分版本忽略该文件，表现为"配置写了不生效"，**不报错** |

**关键区别**：客户端对私钥权限过宽会明确报错；**服务端对 `authorized_keys` 权限过宽则完全静默**——
你只会在客户端看到 `Permission denied (publickey)`，没有任何线索指向权限。
这是 SSH 排障第一大坑。sshd 的 `StrictModes`（默认 `yes`）就是干这个的。

```bash
# 一条命令查全（在远端执行）
ssh {DEPLOY_USER}@{TARGET_HOST} 'ls -ld ~ ~/.ssh ~/.ssh/authorized_keys; stat -c "%a %n" ~ ~/.ssh ~/.ssh/authorized_keys 2>/dev/null || stat -f "%Lp %N" ~ ~/.ssh ~/.ssh/authorized_keys'

# 修复
ssh {DEPLOY_USER}@{TARGET_HOST} 'chmod 755 ~ && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys'

# 客户端侧
chmod 700 ~/.ssh && chmod 600 ~/.ssh/config ~/.ssh/*_ed25519 ~/.ssh/known_hosts && chmod 644 ~/.ssh/*.pub
```

权限正确后仍被拒，就去**服务端**看日志——那里才写明真正原因：

```bash
# 服务端（需要 sudo）
sudo journalctl -u sshd -n 50 --no-pager        # 或 sudo journalctl -u ssh
sudo tail -50 /var/log/auth.log                 # Debian 系
sudo tail -50 /var/log/secure                   # RHEL 系
# 提高 sshd 日志级别做一次性诊断（⚠ 改完记得改回，DEBUG 级日志量大且可能记录敏感信息）
sudo sshd -T | grep -iE 'loglevel|strictmodes|pubkeyauthentication|authorizedkeysfile|allowusers|denyusers|permitrootlogin|passwordauthentication|maxauthtries'
```

`sudo sshd -T` 打印服务端**实际生效**的完整配置（合并了所有 `Include` 与 `Match` 块），
是服务端侧的 `ssh -G` 等价物，比读 `sshd_config` 文件可靠。

### SELinux / AppArmor

RHEL 系上 `~/.ssh` 的 SELinux 上下文错了也会导致静默拒绝：

```bash
getenforce                       # Enforcing 时才可能是这个原因
ls -Z ~/.ssh/authorized_keys     # 应为 ssh_home_t
sudo restorecon -R -v ~/.ssh     # 恢复正确上下文
sudo ausearch -m avc -ts recent  # 看有没有 denied 记录
```

---

## §4 密钥轮换流程

**触发时机**：定期（建议个人密钥 12 个月、部署密钥 90 天、CI 密钥 30–90 天）、
人员离职、密钥疑似泄露、密钥文件权限曾被破坏。

```bash
# 阶段 1：生成新密钥（不删旧的，保证零中断）
ssh-keygen -t ed25519 -a 100 -C "{USER}@{WORKSTATION}-{YYYYMM}-new" -f ~/.ssh/work_new_ed25519

# 阶段 2：新旧并存下发。authorized_keys 是追加语义，可以有多条
ssh-copy-id -i ~/.ssh/work_new_ed25519.pub {DEPLOY_USER}@{TARGET_HOST}

# 阶段 3：验证新密钥可用（显式指定，避免 agent 里混着旧密钥造成"看起来能用"的假象）
ssh -o IdentitiesOnly=yes -i ~/.ssh/work_new_ed25519 {DEPLOY_USER}@{TARGET_HOST} 'echo NEW_KEY_OK'

# 阶段 4：把本地默认切到新密钥（改 ~/.ssh/config 的 IdentityFile），再验证一次不指定 -i 的连接
ssh {DEPLOY_USER}@{TARGET_HOST} 'echo DEFAULT_OK'

# 阶段 5：从所有远端移除旧公钥。按注释精确定位要删的那条
ssh {DEPLOY_USER}@{TARGET_HOST} 'cp ~/.ssh/authorized_keys ~/.ssh/authorized_keys.bak-$(date +%Y%m%d) \
  && grep -v "{OLD_KEY_COMMENT}" ~/.ssh/authorized_keys.bak-$(date +%Y%m%d) > ~/.ssh/authorized_keys \
  && chmod 600 ~/.ssh/authorized_keys'

# 阶段 6：确认旧密钥已被拒（应当返回 Permission denied）
ssh -o IdentitiesOnly=yes -i ~/.ssh/work_old_ed25519 {DEPLOY_USER}@{TARGET_HOST} 'echo SHOULD_NOT_HAPPEN'

# 阶段 7：销毁旧私钥（不可恢复，确认阶段 6 通过后再做）
shred -u ~/.ssh/work_old_ed25519 ~/.ssh/work_old_ed25519.pub   # 或 rm -P（macOS）
```

轮换的三个易错点：

1. **不要先删后加**。中间会有一段谁都连不上的窗口，如果你只有这一条访问通道，就把自己锁在外面了。
   永远保持至少一条可用凭据，并确认有带外救援通道（云控制台的 console/VNC）再动手。
2. **`.bak` 文件不要留在 `~/.ssh/` 里**。备份放别处（如 `~/.ssh-rotation-backup/`），
   因为某些 sshd 配置的 `AuthorizedKeysFile` 通配、或运维脚本会扫到它；且备份文件权限常是 644。
   轮换验证通过后立刻销毁备份。
3. **盘点所有落点**。同一把公钥往往散落在：多台机器的 `authorized_keys`、
   代码托管平台的 SSH Keys / Deploy Keys、CI 系统的 secret、Ansible/Terraform 的变量文件、
   `~/.ssh/config` 的 `IdentityFile`。漏掉任何一处都会导致"轮换完了但旧密钥还能用"。

```bash
# 盘点本地引用了哪些私钥
grep -rn 'IdentityFile' ~/.ssh/config ~/.ssh/config.d/ 2>/dev/null
# 盘点本地有哪些私钥文件（按修改时间排序，找长期没轮换的）
ls -lt ~/.ssh/ | grep -v '\.pub'
```

---

## §5 自动化与脚本化

### 非交互 SSH 的必备选项

```bash
ssh -o BatchMode=yes \
    -o ConnectTimeout=5 \
    -o StrictHostKeyChecking=yes \
    -o IdentitiesOnly=yes \
    -i ~/.ssh/ci_deploy_key \
    {DEPLOY_USER}@{TARGET_HOST} 'systemctl is-active {SERVICE}'
```

| 选项 | 为什么必须 | 不加会怎样 |
|---|---|---|
| `BatchMode=yes` | 禁止一切交互提示（密码、passphrase、主机确认） | 脚本**挂住等人输入**，CI 里表现为超时而非失败；本地跑会莫名其妙停在提示符 |
| `ConnectTimeout=5` | TCP 连接超时 | 默认约 2 分钟（受系统 TCP 重试影响），批量脚本里一台不可达就浪费 2 分钟 |
| `StrictHostKeyChecking=yes` | 主机密钥未知或变化时**拒绝** | 用 `ask` 会挂住等确认；用 `no` 则放弃中间人防护 |
| `IdentitiesOnly=yes` | 只用 `-i` 指定的密钥 | agent 里有 8 把密钥时会挨个试，触发 `Too many authentication failures` |
| `-i <path>` | 显式指定密钥 | 依赖 agent 状态，"在我机器上能跑"到 CI 就挂 |

配合预注入的 known_hosts，CI 里就能做到既非交互又不牺牲主机验证：

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
printf '%s\n' "$KNOWN_HOST_ENTRY" > ~/.ssh/known_hosts   # 从 CI secret 注入，内容事先带外核对过
chmod 600 ~/.ssh/known_hosts
printf '%s' "$DEPLOY_PRIVATE_KEY" > ~/.ssh/ci_deploy_key && chmod 600 ~/.ssh/ci_deploy_key
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=~/.ssh/known_hosts \
    -i ~/.ssh/ci_deploy_key {DEPLOY_USER}@{TARGET_HOST} 'true'
```

**CI 用密钥而非密码的理由**：密码会出现在进程列表（`sshpass -p`）、shell history、
CI 日志、以及任何一次误 `set -x`；无法细粒度吊销（改密码会同时踢掉所有人）；
无法审计到人/到流水线。密钥可以做到：单仓库只读、独立吊销、带注释可溯源、支持短期化。
更进一步用 OIDC 联邦换取临时凭据，连长期密钥都不落盘。

### `-o` 覆盖：临时改配置而不改文件

```bash
ssh -o ProxyJump=bastion -o IdentityFile=~/.ssh/tmp_key -o LogLevel=VERBOSE {TARGET_ALIAS} 'cmd'
```

`-o` 的优先级**高于** `~/.ssh/config`，因为 SSH 取"第一次出现的值"，而命令行排在所有文件之前。
适合一次性调试；固定需求应写进 config（否则每次都要打全，且 scp/rsync/git 不继承命令行 `-o`）。

### `ControlMaster` 连接复用：频繁短连接的数量级提速

```sshconfig
Host *
    ControlMaster auto
    ControlPath ~/.ssh/sockets/%C     # %C = 对 %l%h%p%r 做哈希，避免路径过长与特殊字符问题
    ControlPersist 10m                # 主连接在最后一次使用后再保持 10 分钟
```

```bash
mkdir -p ~/.ssh/sockets && chmod 700 ~/.ssh/sockets

# 效果对比：20 条命令，每条独立建连 vs 复用
time for i in $(seq 20); do ssh -o ControlPath=none {TARGET_ALIAS} 'true'; done   # 基线：20 次完整握手
time for i in $(seq 20); do ssh {TARGET_ALIAS} 'true'; done                       # 复用：1 次握手 + 19 次秒连

# 手动管理主连接
ssh -O check {TARGET_ALIAS}    # 主连接是否存在
ssh -O stop  {TARGET_ALIAS}    # 停止接受新复用，等现有会话结束
ssh -O exit  {TARGET_ALIAS}    # 立刻关闭主连接与所有转发
ssh -O forward -L 15432:{DB_HOST}:5432 {TARGET_ALIAS}   # 给已存在的主连接动态加转发
ssh -O cancel  -L 15432:{DB_HOST}:5432 {TARGET_ALIAS}   # 取消
```

**为什么是数量级**：每次独立 SSH 连接要做 DNS 解析 + TCP 三次握手 + SSH 版本交换 +
密钥交换（KEX，含非对称运算）+ 用户认证，典型 300–800ms（跨地域或经跳板时 1–3s）。
复用后只剩一次 channel open，约 5–20ms。部署脚本里 30 条 `ssh host cmd` 从 ~15s 降到 ~1s。

三个坑：

| 坑 | 现象 | 对策 |
|---|---|---|
| socket 残留损坏 | `mux_client_hello_exchange: read packet: No such file or directory` | `rm -f <ControlPath 对应的 socket>` 或 `ssh -O exit`；见 `troubleshooting-and-handoff.md` §6 |
| `ControlPath` 路径超长 | 老版本 OpenSSH 对 Unix socket 路径有 104/108 字节限制，报 `ControlPath too long` | 用 `%C`（固定长度哈希）而不是 `%r@%h-%p`；或把 socket 目录设短一点 |
| `ControlPersist` 太长 + 后台脚本 | 主连接一直挂着，占用跳板的 `MaxSessions`；或脚本结束后隧道仍在 | 交互式设 `10m` 合适；一次性脚本设 `ControlPersist=0` 并在结尾 `ssh -O exit` |

`ControlPath` 里的 token：`%h` 目标主机、`%p` 端口、`%r` 远端用户、`%l` 本地主机名、
`%C` = `hash(%l%h%p%r)`、`%i` = PID（不建议，会让每次连接都新建主连接）。

### 远端命令的引号与变量展开陷阱

规则只有一条：**双引号由本地 shell 展开，单引号原样传给远端**。

```bash
VAR=local-value

ssh {TARGET_ALIAS} "echo $VAR"       # 本地展开 → 远端执行 echo local-value
ssh {TARGET_ALIAS} 'echo $VAR'       # 远端展开 → 打印远端 shell 里的 $VAR（通常是空）
ssh {TARGET_ALIAS} "echo \$VAR"      # 转义 → 远端展开
ssh {TARGET_ALIAS} 'echo '"$VAR"     # 拼接：单引号段 + 本地展开的变量 → 远端看到 echo local-value
```

典型事故：

| 写法 | 实际行为 | 后果 |
|---|---|---|
| `ssh host "cd $DIR && rm -rf *"` | `$DIR` 在本地展开；本地未定义时变成 `cd  && rm -rf *` → 在**家目录**删东西 | 灾难。远端破坏性命令必须用单引号 + 显式校验变量非空 |
| `ssh host 'for f in *.log; do echo $f; done'` | 正确：通配与变量都在远端展开 | — |
| `ssh host "for f in *.log; do echo $f; done"` | `*.log` 与 `$f` 都在**本地**展开：本地无 `.log` 时 `*.log` 原样传过去，`$f` 变空 | 循环体永远 echo 空行 |
| `ssh host "grep 'pattern with spaces' file"` | 内层单引号被本地 shell 吃掉一层 | 用 `\"` 或改用 heredoc |
| `ssh host "cmd with \"quotes\""` | 嵌套引号地狱，改一次错一次 | 见下面的 heredoc 写法 |

**复杂远端脚本一律用 heredoc，不要拼引号**：

```bash
# 引号在 heredoc 里不需要转义；<<'EOF'（带引号）= 不做本地展开，全部交给远端
ssh {DEPLOY_USER}@{TARGET_HOST} 'bash -s' -- <<'REMOTE'
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/app}"          # 远端展开
cd "$APP_DIR"
echo "current: $(git rev-parse --short HEAD)"
systemctl is-active app.service
REMOTE

# 需要把本地变量传进去时：用 <<EOF（不加引号）做本地展开，但远端变量必须转义
RELEASE="v1.8.3"
ssh {DEPLOY_USER}@{TARGET_HOST} 'bash -s' -- <<EOF
set -euo pipefail
RELEASE="$RELEASE"                       # 本地展开
cd /opt/app && ./deploy.sh "\$RELEASE"    # 远端展开（转义）
echo "host is \$(hostname)"               # 远端展开
EOF

# 或者更干净：本地变量走环境变量传，脚本本体完全不做本地展开
ssh {DEPLOY_USER}@{TARGET_HOST} "RELEASE='$RELEASE' bash -s" -- <<'REMOTE'
set -euo pipefail
echo "deploying $RELEASE to $(hostname)"
REMOTE
```

`bash -s` + heredoc 的好处：脚本本体不经远端 shell 的二次解析，
`set -euo pipefail` 能真正生效（`ssh host 'cmd1; cmd2'` 里前一条失败不会中断，
且 ssh 的退出码是**最后一条**命令的退出码）。

**退出码传递**：

```bash
ssh host 'false'; echo $?          # 1 —— 远端退出码会被传回来
ssh host 'exit 42'; echo $?        # 42
ssh host 'cmd1 && cmd2'; echo $?   # 只有 cmd2 的退出码；cmd1 失败且用了 && 时返回 cmd1 的码
ssh host 'cmd1; cmd2'; echo $?     # ⚠ 只有 cmd2 的退出码，cmd1 失败被吞。用 && 或 set -e
# ssh 自身失败（连不上、认证失败）返回 255——用这个区分"远端命令失败"与"根本没连上"
```

`255` 是关键判据：脚本里 `[ $? -eq 255 ]` 就是"SSH 通道本身的问题"，
去查网络/认证；其他非零才是"远端命令失败"。

### 批量执行

```bash
# 串行 + 失败即停
for h in app-1 app-2 app-3; do
  ssh -o BatchMode=yes -o ConnectTimeout=5 "$h" 'systemctl restart {SERVICE}' || { echo "FAILED: $h"; break; }
done

# 并行（GNU parallel）：--tagstring 给每台输出加主机前缀，否则无法归属
parallel --tagstring '{1}' -j 5 \
  'ssh -o BatchMode=yes -o ConnectTimeout=5 {1} "systemctl is-active {SERVICE}"' \
  ::: app-1 app-2 app-3

# 超过 5 台就该上专门工具（ansible / 配置管理），手写 for 循环会失控：
# 没有幂等保证、没有失败重试、没有输出归属、没有并发控制、没有 dry-run
```
