# ADB 实战命令参考

所有命令统一假设已导出：

```bash
export DEVICE_SERIAL="${DEVICE_SERIAL:?}"     # adb devices 第一列
export APP_PKG="${APP_PKG:?}"                 # 例如 com.example.app
export ARTIFACT_DIR="${ARTIFACT_DIR:-docs/analysis/device-evidence}"
```

---

## 1. 设备连接与多设备定位

### USB 连接

1. 设备侧：设置 → 关于手机 → 连点"版本号"7 次开启开发者选项 → 打开 **USB 调试**。
2. 连接后设备上会弹"允许 USB 调试？"，勾选"一律允许使用这台计算机进行调试"再确定。
3. USB 模式必须是 **文件传输（MTP）**，"仅充电"模式下 `adb devices` 为空。

### 无线连接

**Android 11+（无线调试）**

```bash
# 开发者选项 → 无线调试 → "使用配对码配对设备"，读出 IP:配对端口 与 6 位配对码
adb pair 192.0.2.20:37123 482913
# 回到"无线调试"主页面读出的 IP:连接端口（与配对端口不同）
adb connect 192.0.2.20:41567
adb devices -l
```

**Android 10 及以下（需先有一次 USB 连接）**

```bash
adb -s "$DEVICE_SERIAL" tcpip 5555
adb connect 192.0.2.20:5555
adb -s 192.0.2.20:5555 shell getprop ro.product.model   # 验证
adb disconnect 192.0.2.20:5555                          # 用完断开
```

无线连接易掉线时保持屏幕常亮：`adb -s "$DEVICE_SERIAL" shell svc power stayon true`。

### 多设备定位（三种方式，按优先级）

| 方式 | 命令 | 适用 |
|---|---|---|
| 显式 `-s` | `adb -s "$DEVICE_SERIAL" shell ...` | **默认选择**，脚本里全部这么写 |
| 环境变量 | `export ANDROID_SERIAL="$DEVICE_SERIAL"` | 调用第三方工具（gradle、appium、maestro）时它们不接 `-s` |
| 简写 `-d` / `-e` | `adb -d shell ...`（唯一 USB 设备）/ `adb -e shell ...`（唯一模拟器） | 只在手工排查时用 |

不带 `-s` 且接入 ≥2 台设备时，adb 直接报 `error: more than one device/emulator`——这是**好的失败**。更坏的情况是只接了一台真机 + 一台模拟器时命令静默打到错误设备，取证张冠李戴。

### `adb devices -l` 输出解读

下面是**示意输出**，serial 与 `product`/`device` 代号均为占位符；实际值以本机 `adb devices -l` 与 `getprop ro.product.model` 为准，并回填到设备矩阵的机型代号列（见 `device-matrix-and-interference.md` §1）。

```
List of devices attached
<USB-SERIAL-1>       device usb:1-2 product:prod_lowmid model:M-03 device:dev_lowmid transport_id:7
emulator-5554        device product:emul_arm64 model:emul_arm64 transport_id:3
192.0.2.20:41567     device product:prod_flagship model:M-11 transport_id:11
```

| 字段 | 用途 |
|---|---|
| 第 1 列 | serial，就是 `-s` 的值；USB 是硬件序列号，网络是 `IP:PORT`（示例用 `192.0.2.0/24` 文档保留段），模拟器是 `emulator-<端口>` |
| `model` | 机型代号，设备矩阵里用它对齐；**厂商命名风格差异很大**，不要把 `model` 前缀当成厂商判断依据写进脚本 |
| `product` / `device` | 厂商内部代号，比 `model` 更能区分同型号不同区域版本 |
| `transport_id` | 本次 adb server 会话内的连接 ID，**重启 adb server 后会变**，不要写进脚本 |

### 连接故障排查

| 现象 | 原因 | 处置 |
|---|---|---|
| `adb devices` 列表为空 | USB 模式是"仅充电"；或数据线只供电不传数据 | 切 MTP；换一根支持数据的线 |
| 状态 `unauthorized` | 设备上没点"允许 USB 调试" | 拔插重连，在设备上勾选"一律允许" |
| 状态 `offline` | adb server 状态错乱 / 设备刚重启 | `adb kill-server && adb start-server`；仍不行则 `adb reconnect offline` |
| Linux 下 `no permissions` | udev 规则缺失 | 加 `/etc/udev/rules.d/51-android.rules`：`SUBSYSTEM=="usb", ATTR{idVendor}=="<vid>", MODE="0666"`，然后 `sudo udevadm control --reload-rules` |
| 无线连接频繁掉 | 设备省电策略断 WiFi | `svc power stayon true`；或改用 USB |
| 同一台设备出现两条记录 | USB 与无线同时连着 | `adb disconnect <ip:port>` 只留一条 |
| 版本不匹配 `adb server version (41) doesn't match this client (39)` | 系统里装了多份 adb | `which -a adb`，统一用 SDK Platform-Tools 里的那一份 |

### 批量遍历所有在线设备

```bash
for s in $(adb devices | awk 'NR>1 && $2=="device"{print $1}'); do
  printf '%-24s %-16s %-8s %s\n' \
    "$s" \
    "$(adb -s "$s" shell getprop ro.product.model | tr -d '\r')" \
    "$(adb -s "$s" shell getprop ro.build.version.release | tr -d '\r')" \
    "$(adb -s "$s" shell dumpsys package "$APP_PKG" 2>/dev/null | grep -m1 versionName | tr -d '\r ')"
done
```

> `tr -d '\r'` 不可省。`adb shell` 返回的字符串带 CRLF，直接拼进 CSV 或 shell 变量会让后续比对静默失败。

---

## 2. logcat：过滤与级别

### 缓冲区

| buffer | 内容 | 何时用 |
|---|---|---|
| `main`（默认） | 应用与框架常规日志 | 常规排查 |
| `system` | 系统服务日志 | 系统级交互、权限、通知 |
| `crash` | 崩溃栈（Java/Kotlin 未捕获异常 + native crash 摘要） | **崩溃取证首选** |
| `events` | 二进制事件日志（`am_kill` / `am_anr` / `am_crash` / `am_proc_died`） | **后台被杀取证首选** |
| `radio` | 射频与电话 | 来电打断、信号切换 |
| `all` | 全部 | 完整取证（体积大） |

### 输出格式

| `-v` 值 | 内容 | 用途 |
|---|---|---|
| `brief`（默认） | 级别/tag(pid): msg | 人工快速看 |
| `threadtime` | `日期 时间 PID TID 级别 TAG: msg` | **取证必用**——唯一能与录屏、抓包时间对齐的格式 |
| `time` | `日期 时间 级别/PID/TID/TAG: msg` | 备选 |
| `long` | 每条一块，含所有字段 | 详细排查 |
| `raw` | 只有 msg | 喂给脚本 |

### 级别

| 级别 | 数值 | 含义 |
|---|---|---|
| `V` | 2 | Verbose，最详细，release 构建通常不输出 |
| `D` | 3 | Debug |
| `I` | 4 | Info |
| `W` | 5 | Warning，可疑但可恢复 |
| `E` | 6 | Error，操作失败 |
| `F` | 7 | Fatal，进程即将终止 |
| `S` | — | Silent，屏蔽该 tag |

### 过滤语法

```bash
# tag:级别 组合，其余全部静音（*:S）
adb -s "$DEVICE_SERIAL" logcat -v threadtime MyApp:V OkHttp:D *:S

# 只看 Error 及以上
adb -s "$DEVICE_SERIAL" logcat -v threadtime '*:E'

# 按应用 PID 过滤（应用重启后 PID 变，需重新取）
adb -s "$DEVICE_SERIAL" logcat -v threadtime \
  --pid="$(adb -s "$DEVICE_SERIAL" shell pidof -s "$APP_PKG")"

# 只 dump 当前缓冲后退出（-d），最近 2000 行（-t）
adb -s "$DEVICE_SERIAL" logcat -d -v threadtime -t 2000 > "$ARTIFACT_DIR/logcat-tail.log"

# 崩溃缓冲全量
adb -s "$DEVICE_SERIAL" logcat -b crash -d -v threadtime > "$ARTIFACT_DIR/logcat-crash.log"

# 进程被杀事件（后台被杀取证）
adb -s "$DEVICE_SERIAL" logcat -b events -d -v threadtime \
  | grep -E 'am_kill|am_anr|am_crash|am_proc_died|am_low_memory' \
  > "$ARTIFACT_DIR/events-kill.log"

# 清空缓冲（复现前必做，否则旧日志混入）
adb -s "$DEVICE_SERIAL" logcat -c
```

### 关键行速查表（取证时的 grep 目标）

| 关键词 | 含义 | 下一步 |
|---|---|---|
| `FATAL EXCEPTION` | Java/Kotlin 未捕获异常 | 取完整栈；`dumpsys activity processes` 看进程状态 |
| `Process: <pkg>` + `FATAL EXCEPTION` 相邻行 | 崩溃发生的包名与线程 | 确认是否本应用还是三方 SDK |
| `ANR in <pkg>` | 主线程 > 5s 无响应（输入事件）或广播超时 | `adb bugreport`（含 `/data/anr/` traces） |
| `Reason: Input dispatching timed out` | ANR 的具体原因 | 主线程有 IO / 锁等待 |
| `signal 11 (SIGSEGV)` / `signal 6 (SIGABRT)` | native 崩溃 | 需带符号的 so；`ndk-stack -sym <符号目录> -dump log` 反解 |
| `backtrace:` + `#00 pc` | native 崩溃栈帧 | 用 `addr2line` 或 `ndk-stack` 定位 |
| `Force finishing activity` | 系统强制结束 Activity | 配合 `dumpsys activity activities` |
| `Kill '<pkg>'` / `am_kill` | ActivityManager 杀进程 | 看 reason 字段（`cached`、`excessive cpu`、`remove task`） |
| `lowmemorykiller` / `lmkd` | 低内存回收 | 内存档位问题；转 `csp-mobile-performance` |
| `OutOfMemoryError` | OOM | `dumpsys meminfo "$APP_PKG" -d` |
| `SQLiteFullException` / `SQLITE_FULL` | 设备存储满 | `dumpsys diskstats`；测"存储满"场景需人为填满 |
| `SQLiteDiskIOException` | DB 文件损坏 | 升级/断电场景高发 |
| `SSLHandshakeException` / `CertPathValidatorException` | TLS 握手或证书链失败 | 检查系统时间是否正确、代理 CA 是否安装、证书是否过期 |
| `UnknownHostException` | DNS 解析失败 | 弱网/DNS 污染场景 |
| `SocketTimeoutException` / `timeout` | 请求超时 | 检查超时上限与重试策略 |
| `ECONNRESET` / `StreamResetException` | 连接被重置 | 切网场景高发 |
| `WindowManager$BadTokenException` | 在已销毁的 Activity 上弹窗 | 生命周期缺陷，异步回调未取消 |
| `TransactionTooLargeException` | Intent/Binder 数据超 ~1MB | 大数据跨 Activity 传递；旋转/后台恢复时高发 |
| `Choreographer: Skipped NN frames` | 主线程卡顿；NN > 30 即 > 500ms | 转 `csp-mobile-performance` |
| `StrictMode` | 主线程 IO / 资源泄漏 | 转 `csp-mobile-performance` |
| `W System.err` | 被吞掉的异常（`printStackTrace()`） | 常被忽视的真实错误来源 |
| `ReactNativeJS` | RN 的 JS 层日志与异常 | 跨端框架问题，见 `ios-and-cross-platform.md` |
| `E/flutter` | Flutter 的 Dart 层异常 | 同上 |
| `Background concurrent copying GC` | GC 频繁 | 内存压力信号 |

### 复现取证的标准组合

```bash
adb -s "$DEVICE_SERIAL" logcat -c
adb -s "$DEVICE_SERIAL" logcat -v threadtime -b main,system,crash,events \
  > "$ARTIFACT_DIR/logcat-$(date -u +%Y%m%dT%H%M%SZ).log" &
LOGCAT_PID=$!

# ……此处手工或脚本复现……

kill "$LOGCAT_PID"
adb -s "$DEVICE_SERIAL" logcat -b crash -d -v threadtime > "$ARTIFACT_DIR/crash.log"
```

不要用 `--pid` 做崩溃复现取证：崩溃后进程重启，PID 变化会让日志流断掉，恰好丢掉最关键的那几行。全量录 + 事后 grep 才可靠。

---

## 3. dumpsys 关键子命令

先看有哪些服务：`adb -s "$DEVICE_SERIAL" shell dumpsys -l | sort`（不同厂商 ROM 服务名不同）。

| 子命令 | 用途 | 关键输出 |
|---|---|---|
| `dumpsys package <pkg>` | 版本、权限、签名、组件、intent-filter | `versionName` / `versionCode` / `firstInstallTime` / `lastUpdateTime` / `requested permissions` / `install permissions`（含 `granted=true/false`）/ `signatures` |
| `dumpsys meminfo <pkg>` | 内存明细 | `TOTAL PSS` / `Java Heap` / `Native Heap` / `Graphics` / `Code`；加 `-d` 输出 `Objects` 段（`Views` / `Activities` / `AppContexts` 数量——**泄漏的直接证据**） |
| `dumpsys activity activities` | 任务栈 | `mResumedActivity` / `topResumedActivity` / `Task{...}` |
| `dumpsys activity top` | 当前 Activity 的 View 层级 | 比 uiautomator dump 更完整（含不可见节点），但输出极大 |
| `dumpsys activity processes` | 进程与 oom_adj | `proc` / `adj` / `lru`；判断进程是否已进入 cached（可被杀）状态 |
| `dumpsys activity services <pkg>` | 运行中的服务 | 服务是否被 ROM 限制 |
| `dumpsys activity exit-info <pkg>` | **应用上次退出原因**（Android 11+） | `reason: ANR / CRASH / SIGNALED / LOW_MEMORY / EXCESSIVE_RESOURCE_USAGE / USER_REQUESTED`——排查"莫名其妙被杀"的第一命令 |
| `dumpsys battery` | 电量状态 | `level` / `status`（1=未知 2=充电 3=放电 4=未充电 5=满）/ `health` / `temperature`（单位 0.1℃）/ `plugged` |
| `dumpsys battery set level 15` | **模拟低电量** | 配合 `set status 3`；复原用 `dumpsys battery reset` |
| `dumpsys deviceidle` | Doze 状态 | `mScreenOn` / `mLightIdleState` / `mDeepIdleState`；`force-idle` / `unforce` / `whitelist +<pkg>` |
| `dumpsys power` | 唤醒锁与屏幕状态 | `mWakefulness`（Awake/Asleep）/ `mHoldingDisplaySuspendBlocker` |
| `dumpsys window displays` | 屏幕物理参数 | `init=<WxH>` / `cur=` / `mCurrentRotation` / `density` |
| `dumpsys window \| grep -E 'mCurrentFocus\|mFocusedApp'` | 当前焦点窗口 | **判断系统弹窗（权限框、来电、低电量提示）是否覆盖在应用之上** |
| `dumpsys connectivity` | 网络连接与验证状态 | `NetworkAgentInfo` / `VALIDATED`（WiFi 已连但无外网时 `VALIDATED` 为 false） |
| `dumpsys netstats detail` | 分应用流量 | `rx_bytes` / `tx_bytes`；弱网测试前后对比 |
| `dumpsys usagestats` | 应用前台时长与 Standby Bucket | `bucket=active/working_set/frequent/rare/restricted` |
| `dumpsys notification --noredact` | 通知列表（含被拦截/降级的） | 验证通知是否真的发出、是否被 ROM 静默拦截 |
| `dumpsys appops <pkg>` | 权限操作历史 | 每个 op 的 `allow/deny/ignore` 与最近访问时间；**永久拒绝状态的权威来源** |
| `dumpsys input_method` | 输入法状态 | 软键盘是否遮挡、`mInputShown` |
| `dumpsys alarm` | 定时器 | 后台任务是否被 ROM 推迟到数小时后 |
| `dumpsys diskstats` | 存储占用 | 测"存储满"场景前的基线 |
| `dumpsys gfxinfo <pkg>` | 帧统计（性能向） | `Total frames rendered` / `Janky frames`；深入分析转 `csp-mobile-performance` |
| `dumpsys jobscheduler` | JobScheduler 待执行任务 | 后台任务是否被搁置 |

常用组合：

```bash
# 一键采"应用状态快照"
snap() {
  local out="$ARTIFACT_DIR/snapshot-$(date -u +%H%M%S).txt"
  {
    echo "### package"; adb -s "$DEVICE_SERIAL" shell dumpsys package "$APP_PKG" | head -60
    echo "### meminfo"; adb -s "$DEVICE_SERIAL" shell dumpsys meminfo "$APP_PKG"
    echo "### exit-info"; adb -s "$DEVICE_SERIAL" shell dumpsys activity exit-info "$APP_PKG"
    echo "### focus"; adb -s "$DEVICE_SERIAL" shell dumpsys window | grep -E 'mCurrentFocus|mFocusedApp'
    echo "### battery"; adb -s "$DEVICE_SERIAL" shell dumpsys battery
    echo "### connectivity"; adb -s "$DEVICE_SERIAL" shell dumpsys connectivity | head -40
  } > "$out"
  echo "$out"
}
```

---

## 4. uiautomator dump 与 accessibility tree

### 取控件树

```bash
# 方式 A：落设备再 pull（兼容性最好）
adb -s "$DEVICE_SERIAL" shell uiautomator dump /sdcard/window_dump.xml
adb -s "$DEVICE_SERIAL" pull /sdcard/window_dump.xml "$ARTIFACT_DIR/"

# 方式 B：压缩输出，节点更少更易读
adb -s "$DEVICE_SERIAL" shell uiautomator dump --compressed /sdcard/window_dump.xml

# 方式 C：直接取回本机（免 pull；部分 ROM 不支持 /dev/tty，失败就退回方式 A）
adb -s "$DEVICE_SERIAL" exec-out uiautomator dump /dev/tty
```

`uiautomator dump` 只能抓**当前活动窗口**。有系统弹窗、分屏、悬浮窗时可能只抓到其中一个；抓不到目标控件时先用 `dumpsys window | grep mCurrentFocus` 确认焦点在哪个窗口。

### 它和 accessibility tree 的关系

`uiautomator dump` 通过 `UiAutomation`（一个系统级 AccessibilityService）读取 **`AccessibilityNodeInfo` 树**，再序列化成 XML。**dump 出来的就是 accessibility tree 的 XML 快照，不是 View 树。** 三个直接推论：

1. **不在 accessibility tree 里的节点，dump 不到**：`importantForAccessibility="no"`、`visibility != VISIBLE`、被 RecyclerView 回收出屏的 item、`SurfaceView` / `TextureView` 内部绘制的内容、游戏引擎画面。
2. **属性是 accessibility 语义，不是视觉语义**：`text` 来自 `getText()`，`content-desc` 来自 `getContentDescription()`。一个只有图标、没设 `contentDescription` 的按钮，在 dump 里只有 `class` + `bounds`，没有任何可读标识——自动化只能退化到坐标点击。
3. **可点击性来自 `isClickable()`**：`clickable="false"` 的节点用框架 API 点不动（坐标 `input tap` 仍能点，因为那是注入触摸事件，不走 accessibility）。

### XML 属性 ↔ AccessibilityNodeInfo 映射

| XML 属性 | 来源方法 | 说明 |
|---|---|---|
| `text` | `getText()` | 可见文本；EditText 里是已输入内容；密码框通常为空或圆点 |
| `resource-id` | `getViewIdResourceName()` | 形如 `<pkg>:id/<name>`；**最稳定的定位符**，与语言、布局、分辨率无关 |
| `class` | `getClassName()` | 原生为 `android.widget.TextView` 等；跨端框架下退化为容器类名 |
| `package` | `getPackageName()` | 系统弹窗时这里是系统包名，可用于识别"当前被系统界面遮挡" |
| `content-desc` | `getContentDescription()` | 无障碍描述；图标按钮的唯一可靠定位符 |
| `clickable` | `isClickable()` | |
| `long-clickable` | `isLongClickable()` | |
| `checkable` / `checked` | | 开关与复选框状态断言用 |
| `enabled` | `isEnabled()` | 置灰按钮的断言依据 |
| `focusable` / `focused` | | 键盘导航与无障碍焦点 |
| `scrollable` | `isScrollable()` | 列表 / ViewPager / ScrollView 为 true；自动化滚动的前提 |
| `selected` | `isSelected()` | Tab 选中态 |
| `bounds` | `getBoundsInScreen()` | `[x1,y1][x2,y2]` 屏幕绝对像素；出屏节点的 bounds 可能为负或超出屏幕尺寸 |
| `index` | — | 同父节点下的序号 |

### 从 bounds 算中心点并点击

```bash
adb -s "$DEVICE_SERIAL" exec-out uiautomator dump --compressed /dev/tty > "$ARTIFACT_DIR/ui.xml" 2>/dev/null \
  || { adb -s "$DEVICE_SERIAL" shell uiautomator dump /sdcard/ui.xml && \
       adb -s "$DEVICE_SERIAL" pull /sdcard/ui.xml "$ARTIFACT_DIR/ui.xml" >/dev/null; }

python3 - "$ARTIFACT_DIR/ui.xml" "${TARGET_TEXT:-提交}" <<'PY'
import re, subprocess, sys
xml = open(sys.argv[1], encoding='utf-8').read()
target = sys.argv[2]
hits = []
for m in re.finditer(r'<node\b[^>]*/?>', xml):
    s = m.group(0)
    if f'text="{target}"' in s or f'content-desc="{target}"' in s or s.endswith(f'resource-id="{target}"'):
        b = re.search(r'bounds="\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]"', s)
        if not b:
            continue
        x1, y1, x2, y2 = map(int, b.groups())
        hits.append(((x1 + x2) // 2, (y1 + y2) // 2, s[:160]))
if not hits:
    print(f'NOT FOUND: "{target}" 不在 accessibility tree 里。')
    print('排查顺序：① resource-id / testID 是否设置 ② contentDescription 是否设置 '
          '③ 控件是否被回收出屏（先滚动）④ 是否自绘框架（Flutter/游戏引擎）⑤ 是否被系统弹窗遮挡')
    sys.exit(1)
for cx, cy, raw in hits:
    print(f'center=({cx},{cy})  node={raw}')
cx, cy, _ = hits[0]
if len(hits) > 1:
    print(f'WARNING: 命中 {len(hits)} 个节点，取第一个。用 resource-id 收窄。')
subprocess.run(['adb', '-s', sys.argv[3] if len(sys.argv) > 3 else '', 'shell', 'input', 'tap', str(cx), str(cy)])
PY
```

### 定位手段稳定性排序

| 定位手段 | 稳定性 | 失效条件 |
|---|---|---|
| `resource-id` / RN `testID` / Flutter `Key` | ★★★★★ | 代码重构改 ID |
| `content-desc` / `accessibilityLabel` | ★★★★ | 未设置、被 i18n 改动 |
| `text` 精确匹配 | ★★★ | 多语言、文案改版、动态内容（数字、时间） |
| `class` + `index` / xpath | ★★ | 布局层级重构 |
| 绝对坐标 `input tap x y` | ★ | 换分辨率、换密度、RTL 语言、系统弹窗、键盘弹起 |

坐标只在最后兜底时使用，且必须在用例里标注依赖：`# 脆弱：依赖 1080x2400 @480dpi，换机型需重算`。

---

## 5. shell 命令族：am / pm / input / settings / svc / wm / cmd

### `am`（Activity Manager）

| 命令 | 用途 |
|---|---|
| `am start -n <pkg>/<.MainActivity>` | 启动指定 Activity |
| `am start -a android.intent.action.VIEW -d "<deeplink>" <pkg>` | **深链直达目标页**——自动化减少导航步数的首选，也绕开不稳定的列表滚动 |
| `am start -W -n <pkg>/<activity>` | 带启动耗时（`ThisTime` / `TotalTime` / `WaitTime`）；性能向转 `csp-mobile-performance` |
| `am force-stop <pkg>` | 完全停止：进程 + 服务 + 广播 + Alarm 全部清除。**最激进**，等价于用户在设置里"强行停止" |
| `am kill <pkg>` | 只杀**后台缓存进程**；应用在前台时无效。比 force-stop 更接近真实的系统内存回收 |
| `am crash <pkg>` | 强制触发一次崩溃，用于验证崩溃恢复与上报链路 |
| `am broadcast -a <action> [-n <pkg>/<receiver>] [--es key value] [--ei key int]` | 发广播（自定义事件、推送模拟） |
| `am startservice -n <pkg>/<svc>` / `am stopservice` | 服务控制（Android 8+ 后台启动受限） |
| `am set-standby-bucket <pkg> rare` | 设置 Standby Bucket：`active` / `working_set` / `frequent` / `rare` / `restricted`。`rare`/`restricted` 下后台任务与推送被大幅限制——**厂商 ROM 后台管控的可复现近似** |
| `am get-inactive <pkg>` / `am set-inactive <pkg> true` | App Standby（旧机制） |
| `am monitor` | 实时打印 Activity 启动事件，排查跳转链路 |
| `am stack list` | 任务栈列表 |
| `am send-trace` | 触发 systrace |

**后台被杀的三个层次必须分别测**，它们走的是完全不同的代码路径：

| 手段 | 杀什么 | 恢复时走 | 真实对应场景 |
|---|---|---|---|
| `am kill <pkg>` | 仅后台缓存进程 | Application 重建 + Activity 从 `savedInstanceState` 恢复 | 系统内存回收（最常见） |
| 开发者选项"不保留活动" | 每个 Activity 一离开前台就销毁 | Activity 重建，进程仍在 | 低内存设备 |
| `am force-stop <pkg>` | 进程 + 服务 + 广播 + Alarm | 完全冷启动 | 用户手动强行停止 / 厂商 ROM 一键清理 |

### `pm`（Package Manager）与 `appops`

| 命令 | 用途 |
|---|---|
| `pm list packages -3` | 第三方应用列表 |
| `pm list packages -f <filter>` | 带 APK 路径 |
| `pm path <pkg>` | APK 路径；split APK 会输出多行 `package:/data/app/.../split_config.arm64_v8a.apk` |
| `pm clear <pkg>` | 清全部数据与缓存，等价全新安装但保留 APK。**会抹掉 versionName 采集窗口——先采指纹** |
| `pm grant <pkg> android.permission.CAMERA` | 授予运行时权限 |
| `pm revoke <pkg> android.permission.CAMERA` | 撤销 → 回到"未决定/拒绝"态 |
| `pm reset-permissions` | 全部权限复位到首次询问态 |
| `pm dump <pkg>` | ≈ `dumpsys package <pkg>` |
| `pm install-existing <pkg>` | 恢复被卸载的系统应用 |
| `pm compile -m speed -f <pkg>` | 触发 AOT 编译；性能对比测试前必须统一，否则 JIT/AOT 差异会污染数据 |
| `pm set-install-location 2` | 安装到外部存储（测 SD 卡场景） |
| `appops get <pkg>` | 查看所有 op 的当前模式与最近访问时间 |
| `appops set <pkg> <op> deny\|allow\|default` | 比 `pm grant` 更细粒度：`SYSTEM_ALERT_WINDOW`、`RUN_IN_BACKGROUND`、`RUN_ANY_IN_BACKGROUND`、`ACCESS_BACKGROUND_LOCATION`、`READ_CLIPBOARD`、`POST_NOTIFICATION` |
| `cmd appops set <pkg> RUN_IN_BACKGROUND deny` | 禁后台运行，模拟厂商 ROM 的严格后台管控 |

**权限三态的精确构造**：

| 目标状态 | 命令 |
|---|---|
| 首次（未决定，会弹窗） | `pm revoke <pkg> <perm>`（部分 ROM 需 `pm clear` 或重装才回到未决定态） |
| 已允许 | `pm grant <pkg> <perm>` |
| 已拒绝（一次，下次仍弹窗） | 手工点"拒绝"，或 `pm revoke` |
| **永久拒绝**（"不再询问"，不再弹窗） | 无法用单条命令直接构造——必须手工操作：连续拒绝两次（Android 11+ 第二次拒绝即等同"不再询问"），或在系统设置里手动关闭该权限。构造后 `dumpsys appops <pkg>` 里对应 op 应为 `deny` 且 `pm` 侧 `granted=false` |

Android 11 起行为变化：一次性权限（"仅本次允许"）、连续两次拒绝等同永久拒绝、长期未使用自动重置权限。这三条都要有独立用例。

### `input`

| 命令 | 说明 |
|---|---|
| `input tap <x> <y>` | 单击 |
| `input swipe <x1> <y1> <x2> <y2> [duration_ms]` | 滑动；省略 duration 时约 300ms。慢滑（触发下拉刷新）用 `1000`+；快滑（触发 fling）用 `100` |
| `input draganddrop <x1> <y1> <x2> <y2> [duration]` | 长按拖拽（Android 8+） |
| `input text "<s>"` | 输入文本。**空格必须写成 `%s`**；`&`、`(`、`)`、`<`、`>`、`\|`、`;` 需转义；**中文与非 ASCII 无法直接输入**，需装 ADBKeyboard 之类 IME 后 `ime set` 切换 |
| `input keyevent <code>` / `input keyevent --longpress <code>` | 按键 |
| `input motionevent DOWN\|MOVE\|UP <x> <y>` | 精细手势：长按 = `DOWN` → `sleep 1` → `UP`；多点触控需组合使用 |
| `input rollball <dx> <dy>` | 轨迹球（少见） |
| `ime list -s` / `ime set <id>` | 输入法切换（中文输入必需） |

常用 keycode：

| code | 名称 | 测试用途 |
|---|---|---|
| 3 | HOME | 切后台（测后台恢复） |
| 4 | BACK | 返回（测返回栈与二次确认弹窗） |
| 5 | CALL | 拨号键（模拟来电打断的低成本替代） |
| 6 | ENDCALL | |
| 24 / 25 | VOLUME_UP / VOLUME_DOWN | 音量键打断、播放器场景 |
| 26 | POWER | 锁屏/亮屏切换 |
| 61 | TAB | 键盘导航（外接键盘、无障碍） |
| 66 | ENTER | 表单提交、搜索 |
| 67 | DEL | 退格 |
| 82 | MENU | 打开菜单；**React Native 的 dev menu** |
| 84 | SEARCH | 触发应用内搜索 |
| 187 | APP_SWITCH | 最近任务（测多任务切换与分屏入口） |
| 223 | SLEEP | 熄屏 |
| 224 | WAKEUP | 亮屏（不切换锁定状态） |
| 231 | VOICE_ASSIST | 语音助手打断 |

> keycode 完整表见 AOSP `android.view.KeyEvent` 常量定义或设备上 `/system/usr/keylayout/*.kl`。**不确定的 keycode 不要凭记忆写进脚本**——按错键会静默改变设备状态，污染后续取证。用 `am start -a android.settings.SETTINGS` 这类显式 intent 代替 `keyevent 176`。

打开系统设置页的显式 intent（比 keycode 可靠）：

```bash
adb -s "$DEVICE_SERIAL" shell am start -a android.settings.SETTINGS                       # 设置首页
adb -s "$DEVICE_SERIAL" shell am start -a android.settings.APPLICATION_DETAILS_SETTINGS \
  -d "package:$APP_PKG"                                                                   # 本应用详情页（验证"引导去设置"深链）
adb -s "$DEVICE_SERIAL" shell am start -a android.settings.DISPLAY_SETTINGS               # 显示（字体缩放、深色）
adb -s "$DEVICE_SERIAL" shell am start -a android.settings.WIRELESS_SETTINGS              # 网络
adb -s "$DEVICE_SERIAL" shell am start -a android.settings.DATE_SETTINGS                   # 日期时间（测系统时间跳变）
```

### `settings` / `svc` / `wm` / `cmd`

| 命令 | 用途 |
|---|---|
| `settings get\|put\|delete <system\|secure\|global> <key> [value]` | 读写系统设置 |
| `settings put system font_scale 1.3` | 系统字体缩放。档位：`1.0` / `1.15` / `1.3` / `2.0`（部分 ROM 有 `0.85`） |
| `settings put system accelerometer_rotation 0` + `settings put system user_rotation 1` | 关自动旋转 + 固定方向（`0`=0° `1`=90° `2`=180° `3`=270°） |
| `settings put secure show_touches 1` | 屏幕上显示触摸点——**录屏取证必开**，让复核者看到操作位置 |
| `settings put secure pointer_location 1` | 显示坐标与压力，配合上一项 |
| `settings put global window_animation_scale 0`（同 `transition_animation_scale` / `animator_duration_scale`） | 关动画，自动化提速。**取证脚本必须在开头记录原值、结尾恢复为 1** |
| `settings get secure enabled_accessibility_services` | 已启用的无障碍服务（TalkBack 测试前后对比） |
| `settings put global stay_on_while_plugged_in 3` | 充电时屏幕常亮 |
| `svc wifi enable\|disable` | WiFi 开关（切网测试） |
| `svc data enable\|disable` | 蜂窝数据开关 |
| `svc bluetooth enable\|disable` | 蓝牙 |
| `svc power stayon true\|false` | 保持唤醒 |
| `svc usb setFunctions <none\|adb\|mtp>` | USB 功能切换 |
| `wm size` / `wm size 1080x2400` / `wm size reset` | 查/改/复位分辨率——**用小屏设备模拟大屏，或反之** |
| `wm density` / `wm density 480` / `wm density reset` | 查/改/复位密度 |
| `cmd uimode night yes\|no\|auto` | 深色模式（Android 10+）。`auto` 跟随系统 |
| `cmd notification post -S bigtext -t "<title>" <tag> "<text>"` | 发一条通知（Android 10+），模拟通知打断 |
| `cmd deviceidle force-idle` / `cmd deviceidle unforce` | 强制进入 / 退出 Doze |
| `cmd deviceidle whitelist +<pkg>` / `-<pkg>` | 电池优化白名单 |
| `cmd connectivity airplane-mode enable\|disable` | 飞行模式（比 `settings put global airplane_mode_on` 可靠，后者在部分版本需重启生效） |
| `cmd jobscheduler run -f <pkg> <jobId>` | 立即执行被搁置的后台任务 |
| `cmd statusbar expand-notifications` / `collapse` | 展开/收起通知栏（测通知打断） |
| `cmd package compile -m speed -f <pkg>` | 同 `pm compile` |

### 安装与卸载

| 命令 | 用途与注意 |
|---|---|
| `adb install -r <apk>` | **覆盖安装，保留数据**——升级测试的主命令 |
| `adb install -r -d <apk>` | 追加 `-d` 允许**降级**（需 debuggable 应用或 userdebug ROM；正式包会被拒 `INSTALL_FAILED_VERSION_DOWNGRADE`） |
| `adb install -r -g <apk>` | 追加 `-g` 安装时**授予全部运行时权限**。方便，但**会完全掩盖权限弹窗缺陷**——权限三态测试绝不能用 `-g` |
| `adb install -t <apk>` | 允许 test-only APK |
| `adb install --user 0 <apk>` | 指定用户（多用户、工作资料、分身场景） |
| `adb install -s <apk>` | 安装到外部存储 |
| `adb install-multiple base.apk split_config.arm64_v8a.apk ...` | split APK / AAB 产物。**用 `install` 装 AAB 产物会失败或装出缺资源的包** |
| `adb uninstall <pkg>` | 卸载并清数据 |
| `adb uninstall -k <pkg>` | 卸载但**保留数据与缓存目录**——测"卸载重装"残留与账号重绑 |
| `adb push <local> <remote>` / `adb pull <remote> <local>` | 文件传输 |
| `adb reverse tcp:<device_port> tcp:<host_port>` | 让真机访问本机服务（RN Metro、本地 mock server）：`adb reverse tcp:8081 tcp:8081` |
| `adb forward tcp:9222 localabstract:chrome_devtools_remote` | WebView 远程调试（配合 `csp-browser-testing-with-devtools`） |

常见安装错误码：

| 错误 | 原因 | 处置 |
|---|---|---|
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | 签名不一致 | 先 `adb uninstall` 再装（会丢数据，因此这不是升级测试的合法路径） |
| `INSTALL_FAILED_VERSION_DOWNGRADE` | 降级被拒 | 加 `-d`（仅 debuggable），或按"降级应被拒"记录为预期行为 |
| `INSTALL_FAILED_OLDER_SDK` | `minSdkVersion` 高于设备 | 换设备；同时确认矩阵里的最低 OS 版本 |
| `INSTALL_FAILED_INSUFFICIENT_STORAGE` | 存储不足 | 清理；顺便作为一个真实用户场景测一遍 |
| `INSTALL_FAILED_MISSING_SPLIT` | split APK 不全 | 用 `install-multiple` |
| `INSTALL_PARSE_FAILED_NO_CERTIFICATES` | 未签名或签名损坏 | 检查构建产物 |

### bugreport

```bash
adb -s "$DEVICE_SERIAL" bugreport "$ARTIFACT_DIR/bugreport-$(date -u +%Y%m%dT%H%M%SZ).zip"
# 进度可视：
adb -s "$DEVICE_SERIAL" bugreport --verbose "$ARTIFACT_DIR/bugreport.zip"
```

| 项 | 值 |
|---|---|
| 内容 | 全部 `dumpsys` 输出 + 所有 logcat 缓冲 + `/data/anr/` traces + batterystats + 已安装应用与权限清单 + 内核日志（部分设备） |
| 耗时 | 30–120 秒（期间设备明显变卡，不要同时做其他操作） |
| 体积 | 20–200 MB |
| **必须用** | ANR（唯一能拿到主线程 traces 的途径）、系统级异常、厂商 ROM 后台管控、电量异常、跨应用交互、`dumpsys activity exit-info` 给出可疑原因时 |
| **不必用** | 单纯的应用内 Java 崩溃——`logcat -b crash` 足够，bugreport 太大不便归档 |

bugreport zip 内关键文件：`bugreport-<model>-<date>.txt`（主文件，搜 `ANR in` / `VM TRACES` / `DUMP OF SERVICE`）、`FS/data/anr/anr_*`、`FS/data/system/batterystats*`、`dumpstate_board.txt`。

---

## 6. 截图 / 录屏取证

### 截图

```bash
# 推荐：exec-out 单次流式输出，不做 CRLF 转换，比 shell+pull 快 3–10 倍且不会损坏 PNG
adb -s "$DEVICE_SERIAL" exec-out screencap -p > "$ARTIFACT_DIR/shot-$(date -u +%Y%m%dT%H%M%SZ).png"

# 兼容写法（部分旧 ROM / Windows 下 exec-out 有问题时）
adb -s "$DEVICE_SERIAL" shell screencap -p /sdcard/shot.png
adb -s "$DEVICE_SERIAL" pull /sdcard/shot.png "$ARTIFACT_DIR/"
adb -s "$DEVICE_SERIAL" shell rm /sdcard/shot.png

# 连续多帧（捕捉动画/闪烁/瞬时弹窗）
for i in $(seq 1 10); do
  adb -s "$DEVICE_SERIAL" exec-out screencap -p > "$ARTIFACT_DIR/frame-$(printf %02d $i).png"
done
```

> **为什么不用 `adb shell screencap -p > shot.png`**：`adb shell`（非 `exec-out`）在部分平台会把 `\n` 转成 `\r\n`，PNG 二进制被改写后文件损坏。这是一个经典陷阱。

截图前打开触摸点显示，让证据可复核：

```bash
adb -s "$DEVICE_SERIAL" shell settings put secure show_touches 1
adb -s "$DEVICE_SERIAL" shell settings put secure pointer_location 1
# ……取证……
adb -s "$DEVICE_SERIAL" shell settings put secure show_touches 0
adb -s "$DEVICE_SERIAL" shell settings put secure pointer_location 0
```

### 录屏：参数与硬限制

| 参数 | 默认值 | 限制与建议 |
|---|---|---|
| `--time-limit <秒>` | **180**（上限也是 180） | 超时**静默停止且不报错**，长流程必须分段录制并在报告里拼接说明 |
| `--bit-rate <bps>` | 20000000（20 Mbps） | 1080p 建议 **8–12 Mbps**；过高会丢帧甚至录不出文件，过低则文字糊到无法辨认 |
| `--size <WxH>` | 设备原生分辨率 | 降分辨率显著减体积，如 `--size 720x1280`；宽高必须都是偶数 |
| `--rotate` | 关 | 竖屏设备录横屏内容时旋转 90° |
| `--display-id <n>` | 0 | 折叠屏外屏 / 多显示屏 |
| `--bug-report` | 关 | **在画面上叠加时间戳与触摸位置——取证首选** |
| `--verbose` | 关 | 打印分辨率、码率、帧数 |

**硬限制（必须知道，否则证据不可用）**

| 限制 | 后果 | 应对 |
|---|---|---|
| 最长 180 秒 | 长流程被静默截断 | 分段录制；或用 `--output-format=h264` 流式输出到本机管道 |
| 不录 `FLAG_SECURE` / DRM 内容 | 涉及安全界面（支付、密码、隐私页）时录出**纯黑帧** | 用 `screencap` 也一样黑；只能改用日志 + `uiautomator dump` 作为证据，并在报告里说明"该页面设置了 FLAG_SECURE，无法视觉取证" |
| 屏幕旋转会中断录制 | 旋转测试无法用一段录屏覆盖 | 旋转前后各录一段，报告里注明断点 |
| 不录系统音频（多数设备） | 有声缺陷（提示音、语音）无证据 | 外部录音，或用 `--output-format=h264` + 独立音频通道，报告中说明 |
| 文件写入 `/sdcard` 需 pull | 忘记 pull 就 `pm clear` / 重启会丢证据 | 用 `exec-out` 流式直接落本机 |

```bash
# 常规取证录屏（带时间戳与触摸点叠加）
adb -s "$DEVICE_SERIAL" shell screenrecord --bug-report --time-limit 60 \
  --bit-rate 8000000 /sdcard/rec.mp4
adb -s "$DEVICE_SERIAL" pull /sdcard/rec.mp4 "$ARTIFACT_DIR/"
adb -s "$DEVICE_SERIAL" shell rm /sdcard/rec.mp4

# 流式直接落本机（免 pull，避免中途丢证据）
adb -s "$DEVICE_SERIAL" exec-out screenrecord --output-format=h264 \
  --time-limit 120 --bit-rate 8000000 - > "$ARTIFACT_DIR/rec.h264"
# 裸 h264 需转封装才能被播放器/浏览器打开：
ffmpeg -i "$ARTIFACT_DIR/rec.h264" -c copy "$ARTIFACT_DIR/rec.mp4"

# 长流程分段（每段 ≤180s，串行执行）
for i in 1 2 3; do
  echo "== segment $i 开始 $(date -u +%H:%M:%S)"
  adb -s "$DEVICE_SERIAL" shell screenrecord --time-limit 180 --bit-rate 8000000 \
    /sdcard/rec-$i.mp4
  adb -s "$DEVICE_SERIAL" pull /sdcard/rec-$i.mp4 "$ARTIFACT_DIR/"
  echo "== segment $i 结束 $(date -u +%H:%M:%S)"
done
```

分段录制时每段的起止 UTC 时间必须写进缺陷报告，否则"第 47 秒出现白屏"这种描述无法定位到具体片段。

### 按缺陷类型确定必需证据

| 缺陷类型 | 必需证据 | 采集命令 |
|---|---|---|
| 崩溃（Java/Kotlin） | `logcat -b crash` 全栈 + 崩溃前 30s 的 main 缓冲 + 崩溃瞬间截图 | `logcat -b crash -d`；`exec-out screencap` |
| 崩溃（native） | 同上 + 带符号 so + `ndk-stack` 反解结果 | `ndk-stack -sym <符号目录> -dump crash.log` |
| ANR | **bugreport**（唯一含 `/data/anr/` traces）+ 录屏（含卡死起止）+ `dumpsys activity processes` | `adb bugreport` |
| 应用莫名消失/被杀 | `dumpsys activity exit-info <pkg>` + `logcat -b events \| grep am_kill` + `dumpsys deviceidle` | 见 §3 |
| UI 错位 / 截断 / 溢出 | 截图 + `wm size` + `wm density` + `font_scale` + 深色模式状态 + 语言 | 见下方"UI 缺陷环境快照" |
| 数据不一致（界面 vs 后端） | 截图 + 接口响应（抓包文件）+ `dumpsys package` 版本 + DB/缓存导出 | 抓包见 `network-install-upgrade.md` |
| 弱网相关 | 抓包文件 + `logcat` 网络 tag + `dumpsys connectivity` + tc/代理参数记录 | 同上 |
| 后台任务不执行 | `dumpsys alarm` + `dumpsys jobscheduler` + `dumpsys usagestats`（bucket）+ `logcat -b events` | 见 §3 |
| 通知未收到 | `dumpsys notification --noredact` + `appops get <pkg> POST_NOTIFICATION` + ROM 通知设置截图 | 见 §3、§5 |
| 电量 / 发热 | `dumpsys battery` + bugreport 内的 batterystats + 温度字段 | `adb bugreport` |
| 权限相关 | `dumpsys package <pkg>`（install/runtime permissions granted 值）+ `dumpsys appops <pkg>` + 权限弹窗截图 | 见 §3、§5 |

**UI 缺陷环境快照**（一行采齐，附在报告里）：

```bash
{
  echo "size       : $(adb -s "$DEVICE_SERIAL" shell wm size | tr -d '\r' | tr '\n' ' ')"
  echo "density    : $(adb -s "$DEVICE_SERIAL" shell wm density | tr -d '\r' | tr '\n' ' ')"
  echo "font_scale : $(adb -s "$DEVICE_SERIAL" shell settings get system font_scale | tr -d '\r')"
  echo "night_mode : $(adb -s "$DEVICE_SERIAL" shell cmd uimode night | tr -d '\r')"
  echo "rotation   : $(adb -s "$DEVICE_SERIAL" shell settings get system user_rotation | tr -d '\r')"
  echo "locale     : $(adb -s "$DEVICE_SERIAL" shell getprop persist.sys.locale | tr -d '\r')"
  echo "focus      : $(adb -s "$DEVICE_SERIAL" shell dumpsys window | grep -E 'mCurrentFocus' | tr -d '\r')"
} | tee "$ARTIFACT_DIR/ui-env-snapshot.txt"
```

### 取证结束的环境复位（每个脚本末尾固定这一段）

```bash
reset_device() {
  local s="${1:-$DEVICE_SERIAL}"
  adb -s "$s" shell wm size reset
  adb -s "$s" shell wm density reset
  adb -s "$s" shell settings put system font_scale 1.0
  adb -s "$s" shell settings put system accelerometer_rotation 1
  adb -s "$s" shell cmd uimode night auto
  adb -s "$s" shell dumpsys battery reset
  adb -s "$s" shell cmd deviceidle unforce
  adb -s "$s" shell settings put secure show_touches 0
  adb -s "$s" shell settings put secure pointer_location 0
  adb -s "$s" shell settings put global window_animation_scale 1.0
  adb -s "$s" shell settings put global transition_animation_scale 1.0
  adb -s "$s" shell settings put global animator_duration_scale 1.0
  adb -s "$s" shell svc wifi enable
  adb -s "$s" shell svc data enable
  adb -s "$s" shell cmd connectivity airplane-mode disable
  adb -s "$s" shell pm reset-permissions   # 谨慎：会影响设备上其他应用的测试状态
  echo "device $s reset done"
}
```

`pm reset-permissions` 会重置设备上**所有**应用的权限，共享设备上要谨慎；独占测试机才用。
