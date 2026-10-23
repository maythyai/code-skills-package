# 弱网 / 断网测试与安装升级迁移验证

## 1. 弱网与断网

### 1.1 手段对比：选错工具就测不到目标场景

| 手段 | 作用层级 | 能做什么 | 前置条件 | 关键限制 |
|---|---|---|---|---|
| **HTTP 代理**（Charles / mitmproxy） | L7（HTTP/HTTPS） | 按请求粒度限速、加延迟、改状态码、改响应体、断点手工干预、Map Local/Remote | 设备 WiFi 设代理 + 安装 CA 证书 | **只作用于 HTTP(S)**；长连接（WebSocket/MQTT）、QUIC/HTTP3、原生 TCP 不受影响 |
| **`tc` + `netem`** | L3/L4（网络接口） | 精确控制 delay / jitter / loss / duplicate / corrupt / reorder / rate，对**全部流量**生效 | 设备需 **root** 或 userdebug ROM；或在本机热点/路由器侧做 | 无 root 的真机做不了；改的是设备侧接口（`wlan0` / `rmnet0`） |
| **宿主机热点 + `tc`** | L3/L4 | 同上，但**无需设备 root** | Linux 宿主开 WiFi 热点，对热点接口（如 `ap0`）做 tc；设备连该热点 | macOS 上没有 `tc`，需用 `dnctl`（dummynet）+ `pfctl` |
| **adb 开关** | 系统 | 断网：`svc wifi disable` / `svc data disable` / `cmd connectivity airplane-mode enable` | 无 | **只有开/关二值，不能模拟弱网** |
| **Network Link Conditioner**（iOS） | 系统级 | 预设档位（3G / Edge / Lossy / Very Bad Network）+ 自定义上下行带宽、延迟、丢包 | 模拟器：额外工具包；真机：开发者设置内 | 仅 iOS |
| **云真机弱网面板** | 平台实现 | 一键档位 | 平台支持 | 参数不透明——**必须自己核对实际生效值**（用 `ping` 或抓包时间戳验证） |
| **Android 开发者选项** | — | — | — | **无原生弱网模拟**，这是常见误解 |

**release 包抓不到 HTTPS 的根因**：Android 7（API 24）起，应用默认**不信任用户安装的 CA**。正式包用 Charles/mitmproxy 抓 HTTPS 会直接握手失败。三条出路：

1. 用 debug 包，且在 `network_security_config.xml` 里显式声明 `<certificates src="user"/>`（**只在 debug variant 里加**，release 加了就是安全缺陷）。
2. 用 debuggable 包 + `adb install -g`，配合系统级 CA。
3. **改用 `tc netem`**——它在 L3/L4 生效，不需要 CA，对 release 包同样有效。这是弱网测试的推荐路径。

### 1.2 `tc` + `netem` 命令

```bash
S="${DEVICE_SERIAL:?}"
IFACE="${IFACE:-wlan0}"       # WiFi 用 wlan0；蜂窝用 rmnet0 / rmnet_data0，先用 `ip addr` 确认

# 加规则：单向延迟 400ms ± 100ms（正态分布）+ 丢包 5% + 重复 1% + 限速 1Mbit/s
adb -s "$S" shell su -c "tc qdisc add dev $IFACE root netem \
  delay 400ms 100ms distribution normal loss 5% duplicate 1% rate 1mbit"

# 修改规则（change，不是 add）
adb -s "$S" shell su -c "tc qdisc change dev $IFACE root netem delay 800ms 200ms loss 10%"

# 查看当前规则与实际统计（sent/dropped/reordered 计数）
adb -s "$S" shell su -c "tc -s qdisc show dev $IFACE"

# 删除（每次测试结束必须执行，否则污染该设备后续所有测试）
adb -s "$S" shell su -c "tc qdisc del dev $IFACE root"

# 只对目标应用限速：先标记该应用的包，再对标记生效
adb -s "$S" shell su -c "iptables -t mangle -A OUTPUT -m owner --uid-owner \$(stat -c %u /data/data/$APP_PKG) -j MARK --set-mark 1"
adb -s "$S" shell su -c "tc qdisc add dev $IFACE root handle 1: prio"
adb -s "$S" shell su -c "tc qdisc add dev $IFACE parent 1:3 handle 30: netem delay 500ms loss 8%"
adb -s "$S" shell su -c "tc filter add dev $IFACE parent 1:0 protocol ip prio 1 handle 1 fw flowid 1:3"
```

**netem 参数与建议档位**

| 参数 | 含义 | 建议档位 |
|---|---|---|
| `delay T [J] [distribution normal]` | **单向**延迟 + 抖动 | 良好 4G：20–50ms；弱 4G：80–200ms；3G：150–300ms；2G/EDGE：300–600ms；极弱/卫星：1000ms+ |
| `loss P [correlation]` | 丢包率 | 5%（轻度）/ 10%（中度）/ 20%（重度） |
| `duplicate P` | 重复包 | 1% |
| `corrupt P` | 包损坏 | 0.1% |
| `reorder P gap N` | 乱序 | `reorder 5% gap 4` |
| `rate R` | 限速 | 128kbit（极慢）/ 384kbit（2G）/ 1mbit（弱 4G）/ 4mbit（正常 4G） |

> **`delay` 是单向的，RTT ≈ 2 × delay。** 写用例时必须标明口径：`delay 400ms` = RTT 约 800ms。这是弱网测试最常见的口径混乱——两个人说"延迟 400ms"，一个指单向一个指 RTT，测出来的东西完全不同。

**验证规则真的生效**（不要假设）：

```bash
adb -s "$S" shell ping -c 10 -i 0.5 "${EXTERNAL_PROBE_IP:-192.0.2.1}"   # 换成你的网络里确实可达的外部探测点；看 rtt 的 min/avg/max/mdev 是否落在预期区间
adb -s "$S" shell su -c "tc -s qdisc show dev $IFACE"   # 看 Sent / dropped / overlimits 计数是否在增长
```

探测点必须是**在你的网络里真的可达**的地址，否则 ping 全丢包时你分不清是规则生效还是根本没通。
默认值 `192.0.2.1` 是 RFC 5737 文档段，一定不可达——它是提醒你必须替换的占位符，不是可用配置。

### 1.3 代理与开关手段

```bash
# 设置全局 HTTP 代理（Charles / mitmproxy 监听在宿主机）
adb -s "$DEVICE_SERIAL" shell settings put global http_proxy "$(hostname -I 2>/dev/null | awk '{print $1}'):8888"
adb -s "$DEVICE_SERIAL" shell settings get global http_proxy
# 清除（测试结束必须执行）
adb -s "$DEVICE_SERIAL" shell settings put global http_proxy :0

# 断网三档（严格程度递增）
adb -s "$DEVICE_SERIAL" shell svc wifi disable                        # 只关 WiFi
adb -s "$DEVICE_SERIAL" shell svc data disable                        # 只关蜂窝
adb -s "$DEVICE_SERIAL" shell cmd connectivity airplane-mode enable   # 飞行模式（含蓝牙）
# 复位
adb -s "$DEVICE_SERIAL" shell cmd connectivity airplane-mode disable
adb -s "$DEVICE_SERIAL" shell svc wifi enable
adb -s "$DEVICE_SERIAL" shell svc data enable

# WiFi 已连但无外网（captive portal / VALIDATED=false）——容易被漏的场景
adb -s "$DEVICE_SERIAL" shell dumpsys connectivity | grep -E 'VALIDATED|state'
```

`VALIDATED=false` 是一个独立的测试场景：WiFi 图标显示已连接，但实际没有外网。很多应用只检查"有没有网络接口"而不检查"能不能出网"，导致一直转圈而不给错误提示。

### 1.4 mitmproxy 故障注入脚本

```python
# docs/analysis/mitm-weaknet.py
# 启动：mitmdump -p 8888 -s docs/analysis/mitm-weaknet.py
import random
import time

from mitmproxy import http

DELAY_RANGE = (0.8, 2.0)   # 秒，模拟慢响应
FAIL_RATE = 0.3            # 30% 请求返回 503
TIMEOUT_PATHS = ("/api/v1/orders",)   # 这些路径第一次超时、第二次成功，用于验幂等
_seen: set[str] = set()


def response(flow: http.HTTPFlow) -> None:
    time.sleep(random.uniform(*DELAY_RANGE))
    if random.random() < FAIL_RATE:
        flow.response = http.Response.make(
            503,
            b'{"error":{"code":"UPSTREAM_UNAVAILABLE"}}',
            {"Content-Type": "application/json"},
        )


def request(flow: http.HTTPFlow) -> None:
    path = flow.request.path.split("?")[0]
    key = f"{path}|{flow.request.headers.get('Idempotency-Key', '')}"
    if path in TIMEOUT_PATHS and key not in _seen:
        _seen.add(key)
        # 第一次：不返回响应，让客户端超时 → 用于验证重试与幂等
        flow.response = None
        time.sleep(35)
```

### 1.5 必须覆盖的弱网场景

**弱网测试的判据不是"功能还能跑通"，而是超时 / 重试 / 幂等三件事各自的行为是否符合设计。** "页面最终加载出来了"证明不了任何事——同一个能跑通的页面背后，可能同时藏着超时不设上限、重试无退避、写操作无幂等键三个缺陷。执行任何场景前，先把三件判据的口径写进用例：

| 判据 | 测试前必须明确的口径 | 口径缺失时的典型缺陷 |
|---|---|---|
| **超时** | 每类请求的超时上限（连接 / 读取 / 整体，建议从 5s / 15s / 30s 谈起）；超时后的 UI 行为（可重试的明确报错，不是无限转圈）；用户离开页面时进行中请求是否取消 | 不设超时或超时 120s，用户对着转圈干等；被放弃的请求仍在后台执行，回调"成功"后修改已销毁的界面或写入脏数据 |
| **重试** | 哪些错误可重试（网络层错误可重试、4xx 不可）、次数上限（≤ 3）、退避策略（指数 1s/2s/4s + 随机抖动）；静默重试还是需用户触发 | 无限重试造成流量与服务端雪崩；无抖动导致全量客户端在同一时刻重试风暴；对非幂等写操作盲目重试 |
| **幂等** | 每个写操作携带客户端生成的幂等键（请求 ID / 业务单号）；服务端对同一键返回同一结果而非新建记录；离线队列 flush 时按键去重 | 超时后用户手动重试 → 双单；恢复网络后队列重发 → 重复记录；幂等键在每次重试时重新生成（等于没有键） |

下表 16 个场景就是这三件判据的展开：场景 1 / 14 主要断言超时，2 / 15 主要断言重试，8 / 9 / 10 主要断言幂等。评审用例时按这三列核对覆盖，缺哪件补哪件。

| # | 场景 | 构造参数 | 预期断言 | 取证 |
|---|---|---|---|---|
| 1 | 高延迟 | `delay 400ms 100ms`（RTT ≈ 800ms） | loading 态在 300ms 内出现；超时上限 ≤ 30s；用户可取消；**不重复提交** | 录屏（含 loading 出现/消失时间戳）+ logcat 网络 tag |
| 2 | 丢包 | `loss 10%` | 重试 ≤ 3 次；指数退避（1s/2s/4s）；不雪崩；最终失败给可读提示而非"网络异常" | logcat 重试日志 + 抓包看重传 |
| 3 | 限带宽 | `rate 128kbit` | 图片渐进或占位；列表不卡死；首屏关键内容优先加载；总下载量有上限 | 录屏 + 截图 + `dumpsys netstats detail` 前后差值 |
| 4 | 乱序 | `reorder 5% gap 4` | 分片下载/流式响应能正确重组；不出现内容错位 | 抓包 |
| 5 | 切网 WiFi → 蜂窝 | `svc wifi disable`（蜂窝已开） | 长连接在 ≤ 10s 内重连；进行中请求不丢或明确失败可重试；**不重复计费** | `dumpsys connectivity` 前后对比 + logcat |
| 6 | 切网 蜂窝 → WiFi | `svc wifi enable` | 同上；注意切换瞬间的双栈抖动 | 同上 |
| 7 | WiFi 已连但无外网 | 连一个无出口的热点 | 明确报错而非无限转圈；提供"切换网络"引导 | 截图 + logcat |
| 8 | 完全离线提交 | `svc data disable` + `svc wifi disable` + 飞行模式 | 离线队列落盘（**进程被杀后仍在**）；恢复网络后按序发送；幂等键去重；离线期间 UI 明确提示 | 导出本地队列文件 + logcat |
| 9 | 弱网连点 3 次 | `delay 800ms` + 手工连点提交 | 后端只产生 **1 条**记录；后两次返回同一 ID 或 `409 DUPLICATE` | 后端记录 + 抓包 + 截图 |
| 10 | 请求中途断网 / 飞行模式中途开关 | 请求发出后立即 `svc wifi disable`；变体：`cmd connectivity airplane-mode enable`，5 秒后 `disable`（飞行模式中途开关，覆盖射频整体掉电再恢复的路径） | 明确失败态；重试可成功；不产生半成品数据；飞行模式关闭后长连接与请求自动恢复 | 抓包 + DB + `dumpsys connectivity` |
| 11 | DNS 失败 | 代理阻断 DNS 或改 hosts | 提示可读（不把 `UnknownHostException` 抛给用户）；不崩；可重试 | logcat |
| 12 | TLS 握手 / 证书失败 | mitmproxy 用错误证书 | 提示"证书异常"而非笼统的"网络异常"；**绝不静默降级到 HTTP** | logcat（`SSLHandshakeException` / `CertPathValidatorException`） |
| 13 | 服务端 5xx | mitmproxy 脚本 30% 返回 503 | 降级 UI（缓存/占位）；不白屏；有重试入口；不重复上报同一错误到崩溃平台 | 截图 + logcat |
| 14 | 慢响应 + 用户离开页面 | `delay` 超过用户耐心 + 按 BACK | 请求被取消或结果被丢弃；**不出现"回来后发现重复创建"** | logcat + DB |
| 15 | 大文件上传中断续传 | `rate 128kbit` + 中途断网 | 支持断点续传或明确从头重传；不产生损坏文件 | 抓包 + 服务端文件校验 |
| 16 | 长连接保活 | `delay` + 息屏 5 分钟 | 心跳间隔合理（不过度耗电）；回到前台后消息不丢；离线期间消息在恢复后补齐 | `logcat -b events` + 消息条数对比 |

### 1.6 离线队列用例的脚本化骨架

```bash
#!/usr/bin/env bash
# TC-NET-OFFLINE-01：离线提交 → 落队列 → 进程被杀 → 恢复网络 → 按序发送 → 幂等去重
set -uo pipefail
S="${DEVICE_SERIAL:?}"; P="${APP_PKG:?}"
OUT="${ARTIFACT_DIR:-docs/analysis/device-evidence}/offline-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$OUT"

# 1. 断网
adb -s "$S" shell svc wifi disable
adb -s "$S" shell svc data disable
adb -s "$S" shell cmd connectivity airplane-mode enable
sleep 3
adb -s "$S" shell dumpsys connectivity | grep -iE 'state|VALIDATED' > "$OUT/net-before.txt"

# 2. 起日志，执行 3 次提交（手工或自动化）
adb -s "$S" logcat -c
adb -s "$S" logcat -v threadtime > "$OUT/logcat.log" &
LOG_PID=$!
adb -s "$S" shell monkey -p "$P" -c android.intent.category.LAUNCHER 1
sleep 5
echo ">>> 此处执行 3 次提交操作"
sleep 30

# 3. 杀进程，验证队列已持久化
adb -s "$S" shell input keyevent 3
sleep 2
adb -s "$S" shell am force-stop "$P"
adb -s "$S" shell dumpsys activity exit-info "$P" > "$OUT/exitinfo.txt"

# 4. 恢复网络并冷启动
adb -s "$S" shell cmd connectivity airplane-mode disable
adb -s "$S" shell svc wifi enable
sleep 10
adb -s "$S" shell monkey -p "$P" -c android.intent.category.LAUNCHER 1
sleep 30

kill "$LOG_PID"
grep -iE 'offline|queue|flush|idempot|retry' "$OUT/logcat.log" > "$OUT/queue.log"

echo "证据目录: $OUT"
echo "断言（需人工或接后端 API 核对）:"
echo "  ① 后端收到的记录数 == 期望值（去重后）"
echo "  ② 记录顺序 == 提交顺序"
echo "  ③ queue.log 中每条记录都有幂等键，且无重复键被接受两次"
```

### 1.7 弱网取证的三条硬规则

1. **参数必须写进报告**：不是"弱网下有问题"，而是 `delay 400ms±100ms / loss 5% / rate 1mbit / RTT≈800ms`，并注明是 `tc` 还是代理构造的。
2. **抓包与 logcat 时间戳对齐**：抓包文件、logcat（`-v threadtime`）、录屏三者都要有可对齐的时间基准，报告里写明"抓包 12:03:11 的 request-id X 对应 logcat 12:03:12.345 的异常"。
3. **敏感数据脱敏后再归档**：抓包文件里的手机号、证件号、token、cookie、`Authorization` 头必须打码后才能进 `docs/analysis/` 或工单系统。原始未脱敏文件放 `.csp/artifacts/verify/evidence/mobile/<defect-id>/` 并限定访问。

---

## 2. 安装与升级

### 2.1 安装升级矩阵

| 路径 | 命令 | 数据状态 | 必须验证 |
|---|---|---|---|
| **全新安装** | `adb -s "$S" install -r -g base.apk`（split 产物用 `install-multiple`） | 空 | 首启引导流程、权限申请顺序与文案、默认配置、协议同意、推送 token 首次注册、深链首次解析 |
| **覆盖升级 同版本** | `adb -s "$S" install -r app-vN.apk` | 保留 | 版本号显示正确、无重复初始化、无数据被误清 |
| **覆盖升级 v(n−1) → v(n)** | `adb -s "$S" install -r app-vN.apk` | 保留 | **DB migration**、KV 兼容、登录态保留、草稿保留、离线队列保留并继续发送、推送 token 重新注册、深链与桌面快捷方式仍有效 |
| **跨版本升级 v(n−3) → v(n)** | 直接 `install -r`（不逐级） | 保留 | 多级 migration 链路完整性；不允许跳级丢字段；旧格式数据能被新代码解析 |
| **逐级升级链 v1→v2→v3→v4** | 依次 `install -r` | 保留 | 与跨版本升级的**结果必须一致**；不一致说明 migration 不是幂等/可组合的 |
| **降级 v(n) → v(n−1)** | `adb -s "$S" install -r -d app-v{N-1}.apk`（需 debuggable 或 userdebug ROM） | 保留 | 新版本写入的字段/表不导致旧代码崩溃；或明确拒绝降级并给可读提示；`onDowngrade` 已实现 |
| **卸载重装** | `adb -s "$S" uninstall "$P"` → `install` | 内部存储清空 | 外部存储残留是否清理、账号可重新绑定、服务端设备记录是否重复、推送 token 重新生成 |
| **卸载保留数据** | `adb -s "$S" uninstall -k "$P"` → `install` | 部分保留 | 残留数据目录与新版本的兼容；不出现"半新半旧"状态 |
| **清除数据** | `adb -s "$S" shell pm clear "$P"` | 清空 | 等价全新安装但保留 APK；不应崩溃。**先采指纹与版本，`pm clear` 之后就采不到了** |
| **换机迁移** | 系统备份恢复 / 厂商换机工具 | 迁移 | **Keystore 加密的数据在新设备无法解密**（密钥绑定设备硬件）→ 必须验证是走"重新登录"还是"密钥可迁移"；token 失效处理；推送重注册 |
| **副用户 / 工作资料安装** | `adb -s "$S" shell pm list users` 查 userId → `adb -s "$S" install --user <userId> app.apk`；`am switch-user <userId>` 切换 | 每个用户独立的数据目录、权限授予与推送实例 | 数据隔离、权限按用户独立授予、通知点击路由进正确 profile、单侧卸载不影响另一侧；详见 §2.8 |
| **split / AAB 安装** | `adb -s "$S" install-multiple base.apk split_config.arm64_v8a.apk split_config.zh.apk` | — | 缺 split 时的降级行为；语言 split 缺失时的 fallback；用 `install` 装 split 产物应失败而非装出残包 |
| **签名不一致** | 用另一签名的包 `install -r` | — | 应报 `INSTALL_FAILED_UPDATE_INCOMPATIBLE`；**绝不能静默卸载重装导致用户数据丢失** |
| **存储不足** | 人为填满存储后安装 | — | 报 `INSTALL_FAILED_INSUFFICIENT_STORAGE`；已装应用不因存储满而崩溃（`SQLiteFullException` 的处理） |

**最少必须覆盖的四条路径**：全新安装、v(n−1)→v(n) 覆盖升级、v(n−3)→v(n) 跨版本升级、卸载重装。降级与换机迁移在大版本发布前加入。

### 2.2 每条路径要验的数据类别

| 数据类别 | 存储位置 | 覆盖升级 | 降级 | 卸载重装 | `pm clear` |
|---|---|---|---|---|---|
| 关系型 DB | `databases/*.db` | migration 必须成功且非破坏性 | 新表/新列不导致旧代码崩 | 丢失 | 丢失 |
| KV / 偏好 | `shared_prefs/*.xml`、DataStore、MMKV | 键名与类型兼容；存储方案迁移（SharedPrefs→DataStore）必须搬迁旧值 | 新增键被旧代码忽略 | 丢失 | 丢失 |
| 文件缓存 | `cache/`、`files/` | 格式版本兼容 | — | 丢失 | 丢失 |
| 外部存储 | `Android/data/<pkg>/`、公共目录 | 分区存储限制（OS 10/11）下的访问路径变化 | — | `Android/data` 通常被清；**公共目录残留** | 保留 |
| 登录态 / token | Keystore 加密的 KV | Keystore 密钥在覆盖升级后仍可用 | 同 | 失效（需重新登录） | 失效 |
| 推送 token | 本地 + 服务端 | **必须重新注册并上报** | 同 | 必须重新生成并上报 | 必须重新注册 |
| 离线队列 | DB 或文件 | 保留并继续发送，幂等去重 | 新格式队列旧代码不能崩 | 丢失（需提示用户） | 丢失 |
| 深链 / 桌面快捷方式 | 系统 | 仍指向正确页面；组件改名后旧深链要有重定向 | 同 | 快捷方式被移除 | 保留 |
| 埋点未上报数据 | 本地队列 | 升级后补报，**不丢也不重复** | 同 | 丢失 | 丢失 |
| 本地加密密钥 | Keystore | 覆盖升级保留 | 保留 | **丢失且不可恢复** | 丢失 |
| 应用权限授予状态 | 系统 | 覆盖升级**保留** | 保留 | 全部回到未决定态 | 保留 |

> 最后一行是一个高频误解：`pm clear` 清数据但**不清权限授予状态**，卸载重装才会。所以"权限首次弹窗"测试不能靠 `pm clear` 复现，必须卸载重装或 `pm reset-permissions`。

### 2.3 DB schema 兼容验证步骤

```bash
S="${DEVICE_SERIAL:?}"; P="${APP_PKG:?}"
OUT="${ARTIFACT_DIR:-docs/analysis/device-evidence}/schema-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$OUT"

# 0. 前置：设备上装的是旧版本，且已产生真实业务数据
adb -s "$S" shell dumpsys package "$P" | grep -E 'versionName|versionCode' | tee "$OUT/version-before.txt"

# 1. 导出旧版本 DB（debuggable 包用 run-as；release 包需 root）
adb -s "$S" shell run-as "$P" ls databases/ | tee "$OUT/db-list.txt"
adb -s "$S" exec-out run-as "$P" cat databases/app.db > "$OUT/app-before.db"
#   run-as 不可用时的替代：
# adb -s "$S" shell su -c "cp /data/data/$P/databases/app.db /sdcard/app-before.db"
# adb -s "$S" pull /sdcard/app-before.db "$OUT/"

# 2. 记录旧 schema 与版本号
sqlite3 "$OUT/app-before.db" 'PRAGMA user_version;' | tee "$OUT/user_version-before.txt"
sqlite3 "$OUT/app-before.db" '.schema'             > "$OUT/schema-before.sql"
sqlite3 "$OUT/app-before.db" 'PRAGMA integrity_check;'

# 3. 记录每张表的行数（升级后对比，行数无故减少 = 数据丢失）
for t in $(sqlite3 "$OUT/app-before.db" ".tables"); do
  printf '%-28s %s\n' "$t" "$(sqlite3 "$OUT/app-before.db" "SELECT COUNT(*) FROM \"$t\"")"
done | tee "$OUT/rowcount-before.txt"

# 4. 覆盖升级并盯日志
adb -s "$S" logcat -c
adb -s "$S" install -r "$OUT/app-after.apk"
adb -s "$S" shell monkey -p "$P" -c android.intent.category.LAUNCHER 1
sleep 20                                     # 留足 migration 时间，大表可能更久
adb -s "$S" logcat -d -v threadtime \
  | grep -iE 'migration|onUpgrade|onDowngrade|SQLite|Room|Alembic|CoreData' \
  > "$OUT/migration.log"
adb -s "$S" logcat -d -v threadtime -b crash > "$OUT/crash.log"
adb -s "$S" shell dumpsys activity exit-info "$P" > "$OUT/exitinfo.txt"

# 5. 导出升级后的 DB 并对比
adb -s "$S" exec-out run-as "$P" cat databases/app.db > "$OUT/app-after.db"
sqlite3 "$OUT/app-after.db" 'PRAGMA user_version;' | tee "$OUT/user_version-after.txt"
sqlite3 "$OUT/app-after.db" '.schema'             > "$OUT/schema-after.sql"
sqlite3 "$OUT/app-after.db" 'PRAGMA integrity_check;'
diff -u "$OUT/schema-before.sql" "$OUT/schema-after.sql" > "$OUT/schema.diff"

for t in $(sqlite3 "$OUT/app-after.db" ".tables"); do
  printf '%-28s %s\n' "$t" "$(sqlite3 "$OUT/app-after.db" "SELECT COUNT(*) FROM \"$t\"")"
done > "$OUT/rowcount-after.txt"
diff -u "$OUT/rowcount-before.txt" "$OUT/rowcount-after.txt"

# 6. 判定
echo "升级后崩溃行数: $(wc -l < "$OUT/crash.log")（必须为 0）"
echo "migration 日志: $(wc -l < "$OUT/migration.log")"
```

**判定标准**

| 检查项 | 通过条件 |
|---|---|
| `crash.log` | 空（0 行） |
| `exit-info` 的 `reason` | 不是 `CRASH` / `ANR` / `INITIALIZATION_FAILURE` |
| `PRAGMA integrity_check` | `ok` |
| `user_version` | 已推进到新版本号，且与 schema 实际状态一致 |
| `rowcount` diff | 行数只增不减；减少的每一行都能解释（例如清理过期缓存表） |
| `schema.diff` | 每一处变更都对应 migration 代码里的一条语句；**不能有"代码里没写但 schema 变了"的差异** |
| 二次启动 | 再启动一次不崩（migration 幂等性验证） |
| 冷启动耗时 | 不应因 migration 显著劣化（大表 migration 需分批 + 进度提示） |

### 2.4 migration 实现的危险信号（代码审查清单）

| 信号 | 为什么危险 | 处置 |
|---|---|---|
| `fallbackToDestructiveMigration()` | migration 失败时**静默删库重建**，用户数据全丢且无任何报错 | 移除；改用显式 `Migration`，最多用 `fallbackToDestructiveMigrationFrom(<已知无关的旧版本>)` |
| `onUpgrade` 里只有 `DROP TABLE` + `onCreate` | 同上，且更隐蔽 | 写真正的 `ALTER TABLE` 与数据搬迁语句 |
| migration 未包事务 | 中途失败留下半迁移状态：`user_version` 已推进但 schema 不完整 → **每次启动都崩，用户只能卸载重装（数据全丢）** | 包在 `beginTransaction()` / `setTransactionSuccessful()` / `endTransaction()` 里 |
| migration 不幂等 | 崩溃重启后重复执行 `ALTER TABLE ADD COLUMN` → `duplicate column name` | 先查 `PRAGMA table_info(<table>)` 判断列是否已存在 |
| `onDowngrade` 未实现 | `SQLiteOpenHelper` 默认抛 `SQLiteException` → **降级即崩**，且崩溃循环无法自愈 | 显式实现 `onDowngrade`（保守做法：保留数据但忽略新列），或在安装层明确拒绝降级 |
| 大表 migration 在主线程 | ANR（> 5s）；用户看到卡死 | 分批迁移 + 后台执行 + 首启进度提示 + 迁移期间功能降级 |
| 新增非空列没有默认值 | 旧行无法满足约束 → migration 直接失败 | `ALTER TABLE ... ADD COLUMN x TEXT NOT NULL DEFAULT ''` |
| 重命名列用了 DROP+CREATE | 数据丢失；SQLite 3.25+ 支持 `RENAME COLUMN` | 用 `RENAME COLUMN`，或建临时表 → 拷数据 → 换名 → 建索引，全程在一个事务里 |
| Keystore 加密的数据未考虑换机 | Keystore 密钥绑定设备硬件，备份恢复到新机后**无法解密** | 明确"换机需重新登录"，或改用可迁移的密钥方案 |
| 只在最新版测升级 | 真实用户从任意历史版本升上来 | 至少覆盖 v(n−1)→v(n)、v(n−2)→v(n)、v(n−3)→v(n) 三条路径 |
| 逐级升级与跨版本升级结果不一致 | migration 不可组合 | 两条路径都测，结果必须一致 |

### 2.5 升级链自动化脚本

```bash
#!/usr/bin/env bash
# docs/analysis/upgrade-chain.sh —— 逐级升级 v1 → v2 → v3 → v4，每级都取证
set -uo pipefail
S="${DEVICE_SERIAL:?}"; P="${APP_PKG:?}"; APK_DIR="${APK_DIR:?}"
OUT="${ARTIFACT_DIR:-docs/analysis/device-evidence}/upgrade-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$OUT"
fail=0

# 起点：卸载后装最老版本（保证干净基线）
adb -s "$S" uninstall "$P" >/dev/null 2>&1

for v in "${VERSIONS[@]:-v1 v2 v3 v4}"; do
  apk="$APK_DIR/app-$v.apk"
  [ -f "$apk" ] || { echo "SKIP $v（无该版本产物）"; continue; }

  echo "== install $v"
  adb -s "$S" install -r -d "$apk" || { echo "FAIL: install $v 失败"; fail=1; break; }

  ver=$(adb -s "$S" shell dumpsys package "$P" | grep -m1 versionName | tr -d '\r ')
  echo "   installed: $ver"

  adb -s "$S" logcat -c
  adb -s "$S" shell monkey -p "$P" -c android.intent.category.LAUNCHER 1
  sleep 20                                        # 留足 migration 时间

  adb -s "$S" logcat -d -v threadtime -b crash > "$OUT/crash-$v.log"
  adb -s "$S" logcat -d -v threadtime \
    | grep -iE 'migration|onUpgrade|onDowngrade|SQLite|Room' > "$OUT/migration-$v.log"
  adb -s "$S" shell dumpsys activity exit-info "$P" > "$OUT/exitinfo-$v.txt"
  adb -s "$S" exec-out screencap -p > "$OUT/screen-$v.png"

  if [ -s "$OUT/crash-$v.log" ]; then
    echo "   FAIL: $v 升级后崩溃，见 $OUT/crash-$v.log"
    fail=1; break
  fi
  if grep -qE 'reason: (CRASH|ANR|INITIALIZATION_FAILURE)' "$OUT/exitinfo-$v.txt"; then
    echo "   FAIL: $v 退出原因异常，见 $OUT/exitinfo-$v.txt"
    fail=1; break
  fi
  echo "   OK"
done

echo "证据目录: $OUT"
[ "$fail" -eq 0 ] && echo "PASS: 升级链完成" || { echo "FAIL"; exit 1; }
```

跑完逐级链后，**再单独跑一次跨版本**（v1 直接 → v4）并对比两次的 DB schema 与行数，两者必须一致。

### 2.6 常见升级缺陷

| 缺陷 | 触发路径 | 检测手段 |
|---|---|---|
| 升级后首启崩溃 | migration 抛异常且无 fallback | `logcat -b crash` + `exit-info` |
| **崩溃循环无法自愈** | migration 半途失败，`user_version` 已推进但 schema 不完整 | 二次启动仍崩；用户只能卸载重装 → 数据全丢 |
| 登录态丢失 | token 存储方案变更（SharedPrefs → DataStore）但未搬迁旧值 | 升级后直接进入登录页 |
| 推送不达 | 升级后未重新注册推送 token，或推送 SDK 升级导致 token 变化未上报 | `dumpsys notification` + 服务端 token 记录 |
| 草稿丢失 | 草稿格式版本化但未写转换 | 升级前存草稿，升级后检查 |
| 离线队列重复发送 | 队列条目缺幂等键 | 升级前后对比服务端记录条数 |
| 深链失效 | Activity 改名或 intent-filter 变更，旧深链与桌面快捷方式指向不存在的组件 | 升级后逐个点旧快捷方式 |
| 降级后崩溃 | 新版本写入的 JSON 字段被旧代码严格解析 | `install -r -d` 后启动 |
| 资源缺失 | split APK 的语言包未随升级安装，界面出现键名裸露 | `install-multiple` 后切语言 |
| 签名不一致导致静默丢数据 | CI 用了不同签名，用户侧变成"卸载重装" | 对比两版 APK 的签名指纹 |
| 权限状态误判 | 覆盖升级保留权限授予，但应用代码假设"新版本会重新申请" | 升级后 `dumpsys package` 看 `granted` |
| 分区存储路径失效 | OS 10/11 起外部存储访问方式改变，升级后读不到旧文件 | 升级后检查历史附件能否打开 |
| KV 反序列化失败 | 旧版本把序列化对象（JSON / Java 序列化 / 自定义格式）写进 SharedPreferences，新版本改了类结构或字段类型，读取时抛 `ClassCastException` / `JSONException` | 升级后首启即崩在读取处；`logcat` grep `ClassCastException` / `JSONException`；升级前后各导出一份 `shared_prefs/*.xml`（导出方法同 §2.3 的 DB，改用 `run-as "$P" cat shared_prefs/<name>.xml`）对比键与值格式 |

### 2.7 升级验证记录表

写到 `docs/analysis/upgrade-matrix-<from>-to-<to>.md`。

| 起始版本 | 目标版本 | 路径 | 设备矩阵行号 | 首启 | migration | 登录态 | 草稿 | 推送 | 深链 | 行数对比 | 证据目录 | 结论 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| v3.1.0 | v3.4.0 | 跨版本 | #1 M-01 | OK | OK | 保留 | 保留 | 重注册 | OK | 无减少 | `.csp/.../schema-…` | PASS |
| v3.3.0 | v3.4.0 | 覆盖升级 | #3 M-03 | OK | OK | 保留 | 保留 | 重注册 | OK | 无减少 | `.csp/.../schema-…` | PASS |
| v3.1.0 | v3.4.0 | 跨版本 | #6 M-06（3GB） | **ANR** | 主线程迁移 12s | — | — | — | — | — | `.csp/.../schema-…` | **FAIL** |
| v3.4.0 | v3.3.0 | 降级 | #1 M-01 | **CRASH** | `onDowngrade` 未实现 | — | — | — | — | — | `.csp/.../schema-…` | **FAIL** |

第 3 行是低内存档位特有的失败：同样的 migration 在 8GB 设备上 3 秒完成，在 3GB 设备上因为频繁 GC 拉到 12 秒触发 ANR。**这就是设备矩阵里"最低内存档"必留的原因**——它承载了一整类只在低配机上出现的失效模式。

---

### 2.8 多用户、工作资料与 targetSdk 权限回收

**多用户 / 工作资料是独立的安装路径**：数据目录（`/data/user/<userId>/<pkg>`）、权限授予、推送实例、深链路由全部按用户隔离，主用户上通过的用例不自动在工作资料里成立。厂商"应用分身"与系统应用克隆本质也是多用户实现（userId 段不同），行为可能偏离 AOSP——每个支持分身的 ROM 家族至少实测一台。

**构造命令**

```bash
S="${DEVICE_SERIAL:?}"; P="${APP_PKG:?}"

adb -s "$S" shell pm list users                                   # UserInfo{0:Owner:...} / UserInfo{10:...}
adb -s "$S" shell pm create-user --profileOf 0 --managed WorkTest # 创建工作资料，输出新 userId（通常 10+）
adb -s "$S" install --user 10 app.apk                             # 仅对用户 10 安装
adb -s "$S" shell am switch-user 10                               # 切到工作资料（部分 ROM 需在设置里确认）
adb -s "$S" shell pm list packages --user 10 | grep "$P"          # 核对该用户下的安装态
adb -s "$S" shell run-as "$P" --user 10 ls databases/             # debuggable 包：读该用户的数据目录
adb -s "$S" shell pm remove-user 10                               # 清理：连带该 profile 的全部应用与数据
```

**验证矩阵**

| 验证项 | 断言 | 常见缺陷 |
|---|---|---|
| 数据隔离 | `/data/user/0/<pkg>` 与 `/data/user/10/<pkg>` 互不可见；主用户的写操作不落进工作资料数据 | 硬编码 `/data/data/<pkg>`（恒等于 user 0），多用户下读写串档 |
| 安装态组合 | 仅主用户装 / 仅工作资料装 / 两边都装，三种状态都能正常启动；单侧卸载不影响另一侧的数据与图标 | 卸载一侧后另一侧崩溃、图标残留或状态错乱 |
| 权限按用户独立授予 | 每个 userId 各自走一遍权限三态；`pm grant --user 10` 不改变 user 0 的授予状态 | 应用把"已授权"缓存成全局结论，切到工作资料调用即 `SecurityException` |
| 推送实例 | 每个用户下的安装实例各自注册推送 token；通知点击路由进正确的 profile | 两个 profile 共用一个 token 导致消息串档；工作资料侧永远收不到推送 |
| 深链与默认应用 | 两侧都安装时，从主用户打开深链不得启动工作资料侧实例 | intent 解析未带 userId，落到错误 profile 或反复弹系统选择器 |
| Keystore / 加密数据 | 工作资料侧首次启动走完整初始化，不复用主用户的密钥材料 | 跨 profile 读 Keystore 失败后无兜底，登录态永久损坏 |

**targetSdk 权限回收**：权限模型由**应用的 targetSdkVersion** 与设备 OS 版本共同决定——同一台设备上，targetSdk 22 与 targetSdk 34 的应用行为完全不同。升级矩阵必须包含"targetSdk 跨门槛提升"这条路径（权限的 OS 版本行为差异清单见 `device-matrix-and-interference.md` §2.1，此处只管升级视角）：

| targetSdk 跨越 | 升级后权限行为变化 | 高危缺陷 |
|---|---|---|
| ≤22 → ≥23 | 安装时授予的权限仍保留，但从此可被用户在设置里单独收回 | 旧代码没有任何 request/deny 分支，权限一收回即 `SecurityException` 崩溃 |
| → ≥30（Android 11+） | 连续两次拒绝 = 永久拒绝；**长期未使用自动重置运行时权限** | 应用缓存"已授权"结论；数月未用后权限被系统收回，下次调用即崩 |
| → ≥31（Android 12+） | 应用休眠（hibernation）：回收运行时权限 + 停后台任务；位置可选"大致位置" | 休眠解除后本地缓存的授权态与实际状态不一致；后台任务被停后无补偿 |
| → ≥33（Android 13+） | `POST_NOTIFICATIONS` 运行时化 | 只抬 targetSdk 不加申请代码 → 通知从"默认开"变"静默丢失"，无任何报错 |

```bash
# 应用休眠的构造与核对（Android 12+；cmd 服务名随版本有差异，不存在时走"设置 → 应用 → 未使用的应用"手工构造）
adb -s "$S" shell cmd app_hibernation get "$P"
adb -s "$S" shell cmd app_hibernation set "$P" enabled true      # 强制休眠：回收运行时权限、停后台任务
adb -s "$S" shell dumpsys package "$P" | grep -iE 'hibernat|granted='   # 核对回收后的权限状态
adb -s "$S" shell cmd app_hibernation set "$P" enabled false     # 复位
```

**断言**：权限被系统回收后，下次进入对应功能重新走请求流程（不崩、不死循环弹窗）；休眠不清除本地数据；解除休眠后后台任务恢复且不重复执行已完成的写操作。验证记录并入 §2.7 的升级矩阵表（"路径"列写 `targetSdk 22→34` 这类形式），用例ID 前缀 `TC-UPGRADE-`。
