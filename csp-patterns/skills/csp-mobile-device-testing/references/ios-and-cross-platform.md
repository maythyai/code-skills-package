# iOS 侧手段与跨端框架的控件树问题

## 1. iOS：simctl / devicectl / Instruments

### 1.1 `xcrun simctl`（模拟器，脚本化能力最强）

```bash
export SIM_UDID="${SIM_UDID:-$(xcrun simctl list devices available -j \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["devices"]; \
print(next(u["udid"] for rs in d.values() for u in rs if u["state"]=="Booted"))' 2>/dev/null || echo booted)}"
export BUNDLE_ID="${BUNDLE_ID:?}"
export ARTIFACT_DIR="${ARTIFACT_DIR:-docs/analysis/device-evidence}"
mkdir -p "$ARTIFACT_DIR"
```

| 命令 | 用途 |
|---|---|
| `xcrun simctl list devices available` | 列出可用模拟器（`-j` 输出 JSON，便于脚本解析） |
| `xcrun simctl list runtimes` | 列出已安装的 iOS 版本 |
| `xcrun simctl boot <UDID>` / `shutdown <UDID>` | 启动 / 关闭模拟器 |
| `xcrun simctl bootstatus <UDID> -b` | **等待启动完成**（`-b` 表示未启动则先启动）；CI 里必用，否则后续命令会打到未就绪的设备 |
| `xcrun simctl erase <UDID>` | 抹除 = 恢复出厂。**测"全新安装"与"权限首次弹窗"的标准手段** |
| `xcrun simctl create <name> <deviceType> <runtime>` | 创建指定机型与系统版本的模拟器——**iOS 覆盖不同屏幕尺寸的唯一方式**（不能像 Android 那样在同一台设备上改分辨率） |
| `xcrun simctl install <UDID> <path.app>` | 安装（同 bundle id 即覆盖升级，保留数据） |
| `xcrun simctl uninstall <UDID> <bundleid>` | 卸载（数据清空，**Keychain 项可能残留**，取决于 `kSecAttrAccessible` 设置） |
| `xcrun simctl launch <UDID> <bundleid>` | 启动；`--console` 把 stdout/stderr 接到终端；`--terminate-running-process` 先杀后启 |
| `xcrun simctl terminate <UDID> <bundleid>` | 干净终止。**注意：这不等于 Android 的 `am kill`（内存回收）**，走的是正常退出路径 |
| `xcrun simctl spawn <UDID> log stream --predicate '...' --level debug` | 系统日志流 |
| `xcrun simctl spawn <UDID> log show --last 10m --predicate '...' --info --debug` | 历史日志 |
| `xcrun simctl io <UDID> screenshot out.png` | 截图 |
| `xcrun simctl io <UDID> recordVideo --codec=h264 out.mp4` | 录屏（Ctrl-C / SIGINT 停止；**无 180 秒硬上限**，但文件增长快） |
| `xcrun simctl privacy <UDID> grant\|deny\|reset <service> <bundleid>` | **权限三态构造（仅模拟器）**；service 如 `photos` / `camera` / `location` / `notifications` / `contacts` / `all` |
| `xcrun simctl privacy <UDID> list` | 列出所有权限状态 |
| `xcrun simctl push <UDID> <bundleid> payload.json` | 推送模拟，**无需 APNs 与真实证书** |
| `xcrun simctl openurl <UDID> "<scheme>://<path>"` | 深链 / Universal Link |
| `xcrun simctl ui <UDID> appearance dark\|light\|auto` | 深色模式 |
| `xcrun simctl ui <UDID> increase_contrast enable\|disable` | 增强对比度 |
| `xcrun simctl ui <UDID> reduce_motion enable\|disable` | 减弱动态效果 |
| `xcrun simctl status_bar <UDID> override --time "9:41" --batteryLevel 15 --batteryState discharging --cellularMode notReachable --wifiMode failed` | 状态栏覆盖，用于**截图一致性** |
| `xcrun simctl status_bar <UDID> clear` | 复位 |
| `xcrun simctl scale <UDID> set 2\|3` | 渲染倍率（**不是改分辨率**） |
| `xcrun simctl addmedia <UDID> photo.jpg` | 注入相册图片（测图片选择器） |
| `xcrun simctl location <UDID> set <lat>,<lon>` / `clear` | 位置模拟 |
| `xcrun simctl get_app_container <UDID> <bundleid> data` | **拿到应用沙盒路径**，可直接读 DB 与 plist |
| `xcrun simctl keychain <UDID> ...` | 钥匙串操作 |
| `xcrun simctl notify <UDID> post <name>` | 发 darwin notification（应用内监听的自定义事件） |

**`status_bar override` 的致命误用**：它**只改状态栏图标的视觉呈现，不改变真实连通性与电量行为**。用它"模拟断网"或"模拟低电量"，应用的网络请求照常成功、系统的省电策略照常不触发。真实断网要关宿主网络或模拟器 Network Link Conditioner 的 `100% Loss` 档位；真实低电量行为只能上真机放电。截图美化才用它。

**模拟器上直接读应用数据**（比 Android 的 `run-as` 方便得多，且 release 配置也可读）：

```bash
DATA="$(xcrun simctl get_app_container "$SIM_UDID" "$BUNDLE_ID" data)"
echo "$DATA"
ls "$DATA/Library/" "$DATA/Documents/" "$DATA/tmp/"
sqlite3 "$DATA/Library/app.sqlite" 'PRAGMA user_version;'
sqlite3 "$DATA/Library/app.sqlite" '.schema'
plutil -p "$DATA/Library/Preferences/$BUNDLE_ID.plist"
```

DB schema 兼容验证（见 `network-install-upgrade.md` §2.3）在 iOS 模拟器上可以完全脚本化，**不需要 debuggable 构建**——这是相对 Android 的一个显著优势，升级测试优先在 iOS 模拟器上打通流程再推广到 Android 真机。

### 1.2 结构化日志：与 logcat 最大的差异

iOS 用统一日志系统（`os.Logger`），日志是**结构化的**：`subsystem` + `category` + `level`。三个后果必须知道：

1. **`debug` 与 `info` 级别默认不持久化到磁盘**，`log show` 看不到。必须加 `--info --debug`。
2. **`print()` / `NSLog()` 不等价于 `os.Logger`**：`print` 只在 attach 调试器时可见，`log stream` 抓不到；`NSLog` 能抓到但没有 subsystem/category，无法精确过滤。
3. **过滤靠 predicate，不靠 tag**：

```bash
# 实时流（等价于 adb logcat -v threadtime）
xcrun simctl spawn "$SIM_UDID" log stream --level debug \
  --predicate 'subsystem == "com.example.app" AND category == "network"' \
  | tee "$ARTIFACT_DIR/ios-log-$(date -u +%Y%m%dT%H%M%SZ).log"

# 历史（等价于 adb logcat -d）
xcrun simctl spawn "$SIM_UDID" log show --last 10m --info --debug \
  --predicate 'subsystem == "com.example.app"' \
  > "$ARTIFACT_DIR/ios-log-show.log"

# 按进程名过滤（不知道 subsystem 时的兜底）
xcrun simctl spawn "$SIM_UDID" log show --last 5m --info --debug \
  --predicate 'processImagePath CONTAINS "MyApp"'

# 只看错误与故障
xcrun simctl spawn "$SIM_UDID" log show --last 30m \
  --predicate 'subsystem == "com.example.app" AND messageType IN {16, 17}'   # 16=error, 17=fault
```

**如果应用侧还在用 `print`，先把日志改造成 `os.Logger` 再谈 iOS 取证**——否则你在真机上拿不到任何可用日志，缺陷报告的五件套第②件直接缺失。

**真机日志的两条采集通道**（模拟器进程跑在宿主上，宿主 `log` 命令直接可见；真机不行，要走设备侧采集）：

| 通道 | 命令 / 操作 | 定位 |
|---|---|---|
| Console.app | 侧栏选中已配对真机 → Start Streaming → 按 process / subsystem 过滤 | 交互式实时排查；**内容不可归档**，只用于现场定位 |
| `log collect` | `log collect --device-udid "$DEVICE_UDID" --last 30m --output "$ARTIFACT_DIR/device-$(date -u +%Y%m%dT%H%M%SZ).logarchive"` | 从真机拉取统一日志归档（≈ `logcat -d` 落盘），再用 `log show <logarchive> --predicate '...' --style syslog` 解析。**这是 iOS 侧可归档日志证据的标准形态**，缺陷报告第②件用它 |

`log collect` 只能拿到设备已持久化的级别（`debug`/`info` 默认不落盘，见上文三条后果）——事后采集经常缺上下文。真机上无法预判的低频缺陷，优先靠 MetricKit 回调或应用内日志文件导出兜底，并在报告里注明 iOS 侧日志的证据等级（定义见 §2.3）。

崩溃日志（无 `logcat -b crash` 等价物）：

| 途径 | 说明 |
|---|---|
| 模拟器 | `~/Library/Logs/DiagnosticReports/` |
| 真机（设备上） | 设置 → 隐私与安全 → 分析与改进 → 分析数据 |
| 真机（Xcode） | Window → Devices and Simulators → 选设备 → View Device Logs |
| 真机（CLI） | `xcrun devicectl device copy from --device <UDID> ...`（受沙盒限制）或第三方 `libimobiledevice` 的 `idevicecrashreport -e <dir>` |
| 生产环境 | MetricKit（`MXMetricPayload` / `MXCrashDiagnostic` / `MXHangDiagnostic`），需应用侧接入 |

符号化必须有对应构建的 dSYM，否则栈里全是地址。**每次打包必须归档 dSYM**，这是 iOS 取证的前置基础设施。

### 1.3 `xcrun devicectl`（真机，Xcode 15+）

| 命令 | 用途 |
|---|---|
| `xcrun devicectl list devices` | 列出已配对真机（含连接状态） |
| `xcrun devicectl device info details --device <UDID>` | 设备详情：型号、OS 版本、存储、能力 |
| `xcrun devicectl device info processes --device <UDID>` | 进程列表 |
| `xcrun devicectl device install app --device <UDID> <path.app\|.ipa>` | 安装 / 覆盖升级 |
| `xcrun devicectl device uninstall app --device <UDID> <bundleid>` | 卸载 |
| `xcrun devicectl device process launch --device <UDID> <bundleid>` | 启动；`--console` 接控制台；`--start-stopped` 启动即暂停等调试器 |
| `xcrun devicectl device process signal --device <UDID> --signal SIGKILL --pid <pid>` | 杀进程（**近似**后台被杀，但仍非真实内存回收） |
| `xcrun devicectl device copy screenshot --device <UDID> <out.png>` | 截图 |
| `xcrun devicectl device copy from\|to --device <UDID> ...` | 文件传输（限支持文件共享的应用沙盒） |
| `xcrun devicectl manage pair --device <UDID>` | 配对 |

Xcode 14 及以下或 CI 环境常用的第三方开源工具（`libimobiledevice` 系列）：

```bash
idevice_id -l                                    # 列出 UDID
ideviceinfo -u <UDID> -k ProductVersion          # iOS 版本
ideviceinfo -u <UDID> -k ProductType             # 机型代号
ideviceinstaller -u <UDID> -i app.ipa            # 安装
ideviceinstaller -u <UDID> -U <bundleid>         # 卸载
idevicescreenshot -u <UDID> shot.png             # 截图
idevicesyslog -u <UDID> -m "MyApp"               # 系统日志流
idevicecrashreport -e <dir>                      # 导出崩溃报告
```

### 1.4 Instruments / `xctrace`

```bash
xcrun xctrace list devices                       # 含模拟器与真机
xcrun xctrace list templates                     # 列出可用模板

# 录制（--time-limit 或 --attach/--launch 二选一）
xcrun xctrace record --template 'Time Profiler' --device <UDID> \
  --launch "$BUNDLE_ID" --time-limit 30s --output "$ARTIFACT_DIR/timeprofiler.trace"

xcrun xctrace record --template 'Hangs' --device <UDID> \
  --attach <pid> --output "$ARTIFACT_DIR/hangs.trace"

xcrun xctrace record --template 'Allocations' --device <UDID> \
  --launch "$BUNDLE_ID" --output "$ARTIFACT_DIR/alloc.trace"

# 导出为可解析的 XML（CI 里做自动判定）
xcrun xctrace export --input "$ARTIFACT_DIR/hangs.trace" --toc
xcrun xctrace export --input "$ARTIFACT_DIR/hangs.trace" \
  --xpath '/trace-toc/run[@number="1"]/data/table[@schema="hangs"]' \
  --output "$ARTIFACT_DIR/hangs.xml"
```

| 模板 | 缺陷取证用途 |
|---|---|
| `Hangs` | **证明主线程卡死**——iOS 侧最接近 Android ANR traces 的手段 |
| `Time Profiler` | 定位卡顿的调用栈 |
| `Allocations` / `Leaks` | 证明内存泄漏与对象保留环 |
| `Network` | 请求时序、重定向、失败原因 |
| `Energy Log` | 耗电归因（GPS、网络、CPU 唤醒） |
| `App Launch` | 冷启动分段耗时 |
| `Animation Hitches` | 掉帧定位 |
| `os_signpost` | 应用自定义区间的耗时 |

**深入的性能优化与阈值判定转 `csp-mobile-performance`**；本技能只用 Instruments 做**缺陷取证**（证明卡死、证明泄漏、证明请求失败）。

**`.sysdiagnose`：iOS 对应 `adb bugreport` 的系统级取证**

| 项 | 值 |
|---|---|
| 触发（真机） | 同时按住"音量上 + 音量下 + 侧边按钮"约 1 秒，**无任何界面反馈**；键位组合随机型与 iOS 版本有差异，触发前先按当前版本核对按法，误触可能引发截屏或关机滑块 |
| 生成 | 触发后等 1–3 分钟，期间设备明显变卡，不要同时做其他操作（与 bugreport 同理） |
| 取出 | 设备上：设置 → 隐私与安全 → 分析与改进 → 分析数据 → `sysdiagnose_*.tar.gz`，经分享面板导出到 Mac |
| 内容 | 系统日志 logarchive、**spindump（全进程主线程采样——iOS 上最接近 Android `/data/anr/` traces 的产物）**、jetsam（内存回收）事件、powerlog、网络与蓝牙状态快照 |
| 何时必须抓 | 主线程卡死（watchdog `0x8badf00d` 杀进程）、疑似系统级干扰、跨应用交互异常、`xctrace` 复现不了的低频事件 |
| 体积 | 数百 MB。原始件进 `.csp/artifacts/verify/evidence/mobile/<defect-id>/`，报告里只引用解压后的 spindump 与关键日志 |

### 1.5 取控件树：iOS 没有 `uiautomator dump`

| 手段 | 说明 |
|---|---|
| **Accessibility Inspector** | Xcode → Open Developer Tool → Accessibility Inspector。可指向**真机或模拟器**，实时查看元素的 label / identifier / traits / frame / value。手工排查首选，**无 CLI** |
| **XCUITest 的 `debugDescription`** | 在 XCUITest 进程内 `print(XCUIApplication().debugDescription)` 输出完整 accessibility 树。**这是最接近 `uiautomator dump` 的能力，但必须在测试进程内运行** |
| CI 里的"dump 专用用例" | 写一个只做 dump 的 XCUITest 用例，把 `debugDescription` 写到沙盒文件，再用 `simctl get_app_container` 取出。这样就能在脚本里拿到 iOS 控件树 |

```swift
// UITests/DumpTreeTests.swift —— CI 里当作 "iOS 版 uiautomator dump" 用
func testDumpAccessibilityTree() throws {
    let app = XCUIApplication()
    app.launchArguments += ["-UITests", "-UIAccessibilityIsBoldTextEnabled", "NO"]
    app.launch()
    let container = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    let url = container.appendingPathComponent("a11y-tree-\(Date().timeIntervalSince1970).txt")
    try app.debugDescription.write(to: url, atomically: true, encoding: .utf8)
    XCTContext.runActivity(named: "tree written to \(url.path)") { _ in }
}
```

### 1.6 Network Link Conditioner（iOS 的弱网手段）

| 环境 | 安装位置 |
|---|---|
| 模拟器 | Additional Tools for Xcode → Hardware → `Network Link Conditioner.prefPane` → 装到系统设置 |
| 真机 | 设置 → 开发者 → **Network Link Conditioner**（需先用 Xcode 连接过该设备一次才出现） |

预设档位：`3G` / `Edge` / `LTE` / `Very Bad Network` / `100% Loss` / `Custom`。Custom 可分别设上下行的带宽、延迟、丢包率：

| 场景 | Downlink | Uplink |
|---|---|---|
| 弱 4G | 4 Mbps / 150ms / 2% | 1 Mbps / 200ms / 2% |
| 3G | 780 Kbps / 200ms / 5% | 380 Kbps / 250ms / 5% |
| EDGE | 240 Kbps / 400ms / 8% | 200 Kbps / 500ms / 8% |
| 极差 | 128 Kbps / 1000ms / 15% | 64 Kbps / 1200ms / 20% |
| 全丢包（等价断网） | 100% Loss | 100% Loss |

优势：真机内置、无需 root、对**全部流量**生效（含 TCP/UDP/长连接）。劣势：**无法脚本化开关**（无 CLI），只能手工切换 → 弱网用例在 iOS 上必须标注"手工"，且切换动作要写进复现步骤。

### 1.7 iOS 无法用 CLI 构造的项（必须手工或换方案）

| 项 | 状况 | 替代方案 |
|---|---|---|
| 权限"永久拒绝"态（真机） | `simctl privacy` 仅模拟器；真机无 CLI | 手工：设置 → 隐私 → 对应类别 → 关闭；用例标注"手工" |
| 真实后台被杀（内存回收） | 无 CLI 等价 | 低内存真机（2–3GB）实测；或 XCUITest `terminate()` + `launch()` 近似（**不等价，走的是正常退出**） |
| 系统字体缩放 | 无 CLI；`simctl ui` 不含字号 | 模拟器：设置 → 辅助功能 → 显示与文字大小 → 更大字体（手工）<br>XCUITest：`launchArguments += ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityExtraExtraLarge"]` |
| 屏幕分辨率 / 密度 | 不能在既有设备上改 | `simctl create` 建不同机型的模拟器；真机靠设备矩阵覆盖 |
| 来电打断 | 模拟器无来电模拟 | 真机 + 第二台设备真拨 |
| 降级安装 | **iOS 不允许降级** | 只能卸载重装（丢数据）→ 与 Android 的"保留数据降级"是**不同场景**，报告里必须区分 |
| `pm clear` 等价的"保留应用清数据" | 无 | 卸载重装，或模拟器 `erase` |
| 弱网开关脚本化 | Network Link Conditioner 无 CLI | 手工切换；或用宿主网络层做流量整形（对模拟器有效） |

**Dynamic Type 与 Android `font_scale` 的口径差异**：iOS 是离散的 `UIContentSizeCategory`（XS/S/M/L/XL/XXL/XXXL + 5 档 Accessibility 尺寸，共 12 档），Android 是连续的 `font_scale` 浮点数（1.0/1.15/1.3/2.0）。**两端的"大字体"测试不可直接对比**，报告里必须写明用的是哪一档，例如：

| Android `font_scale` | iOS `UIContentSizeCategory` |
|---|---|
| 1.0 | `UICTContentSizeCategoryLarge`（默认） |
| 1.15 | `UICTContentSizeCategoryExtraLarge` |
| 1.3 | `UICTContentSizeCategoryAccessibilityMedium`（进入无障碍档） |
| 2.0 | `UICTContentSizeCategoryAccessibilityExtraExtraExtraLarge` |

---

## 2. Android ↔ iOS 能力差异与"证据等价"

### 2.1 对照表

| 能力 | Android | iOS | 差异补偿 |
|---|---|---|---|
| **控件树 CLI 导出** | `uiautomator dump` → XML，独立命令 | 无独立 CLI；`XCUIApplication.debugDescription` 需在测试进程内；Accessibility Inspector 是图形工具 | 写一个"dump 专用" XCUITest 用例把树落到沙盒文件，再 `simctl get_app_container` 取出（见 §1.5） |
| **系统日志** | `logcat -v threadtime`，默认持久化，V/D/I/W/E/F 六级 | `log stream/show --predicate`，结构化，**debug/info 默认不持久化** | iOS 侧必须用 `os.Logger` 并显式加 `--info --debug`；`print` 抓不到 |
| **崩溃日志** | `logcat -b crash` + `dumpsys activity exit-info` | 无 CLI 等价；设备分析数据 / Xcode Device Logs / MetricKit | 提前开启"共享分析数据"；**每次构建必须归档 dSYM** |
| **ANR / 主线程卡死** | `bugreport`（含 `/data/anr/` traces） | Instruments `Hangs` 模板；生产环境 MetricKit `MXHangDiagnostic`；手工 `.sysdiagnose` 取 spindump | iOS 生产环境能力反而更强（MetricKit），Android 需自建卡顿监控；iOS 测试机上无自动生成的 hang 报告，复现时必须人挂 `xctrace` |
| **内存明细** | `dumpsys meminfo <pkg> -d`：一条命令拿 PSS 分项 + `Objects` 段（Views / Activities / AppContexts 计数——泄漏的直接证据），免 root | 真机无 CLI 等价：xctrace `Allocations` / `Leaks`、Xcode Memory Report、MetricKit `MXMemoryMetric`（只有峰值）。**模拟器例外**：应用是宿主进程，`leaks <pid>` / `vmmap <pid>` / `heap <pid>` 直接可用 | 缺：真机上"一条命令看分项与对象计数"。补偿：泄漏类缺陷先在模拟器用 `leaks`/`vmmap` 复现定位，真机用 Allocations 录 trace，线上趋势靠 MetricKit 埋点，并按 §2.3 标注证据等级 |
| **截图** | `exec-out screencap -p` | `simctl io screenshot` / `devicectl device copy screenshot` / `idevicescreenshot` | 等价 |
| **录屏** | `screenrecord`：**≤180s**、无音频、`FLAG_SECURE` 黑屏 | `simctl io recordVideo`：**无硬时长上限**、文件增长快；真机用 QuickTime | 长流程录屏优先 iOS；Android 分段并在报告里写清各段起止时间 |
| **权限三态构造** | `pm grant/revoke` + `appops`（永久拒绝需手工） | `simctl privacy grant/deny/reset`（**仅模拟器**）；真机全手工 | iOS 真机的永久拒绝用例必须标"手工"；Android 的自动构造脚本不能照搬到 iOS |
| **后台被杀** | `am kill` / `am force-stop` / "不保留活动" / `set-standby-bucket` / `deviceidle force-idle` | 无等价；`simctl terminate` 是干净终止 | iOS 只能靠低内存真机实测；报告里注明"iOS 未覆盖真实内存回收路径" |
| **弱网** | `tc netem`（需 root）/ 代理 / 宿主热点 + tc | **Network Link Conditioner**（真机内置，无需越狱，全流量生效） | iOS 更方便但**无法脚本化**；Android 无 root 时用宿主热点 + tc |
| **断网** | `svc wifi/data disable`、`cmd connectivity airplane-mode enable`（真实生效） | `status_bar override --cellularMode notReachable` **只改图标不改连通性**；真断网需手工开关或 NLC 100% Loss | 严禁用 `status_bar override` 当断网手段 |
| **低电量** | `dumpsys battery set level 15` **会影响系统真实行为** | `status_bar override --batteryLevel 15` **只改视觉**；真实低电量行为需真机放电 | 同上；iOS 省电策略测试必须真机真实放电 |
| **深色模式** | `cmd uimode night yes\|no\|auto` | `simctl ui <UDID> appearance dark\|light\|auto` | 等价，均可脚本化 |
| **字体缩放** | `settings put system font_scale 1.3`（连续浮点） | 无 CLI；12 档离散 `UIContentSizeCategory` | **口径不同，报告里必须写明档位映射**（见 §1.7） |
| **屏幕尺寸/密度** | `wm size` / `wm density` 可在同一台设备上任意改并 `reset` | 只能换模拟器机型或换真机 | Android 一台设备可覆盖多档；iOS 必须多台/多模拟器 |
| **覆盖升级** | `install -r` | `devicectl device install app` / `simctl install`（同 bundle id 即覆盖） | 等价 |
| **降级** | `install -r -d`（需 debuggable） | **不允许**，只能卸载重装 | **两端是不同的测试场景**：Android 是"保留数据降级"，iOS 是"清数据后装旧版"。不能互相替代 |
| **卸载** | `uninstall` / `uninstall -k`（保留数据） | `uninstall`；**无 `-k` 等价**；Keychain 项可能残留 | iOS 的 Keychain 残留是**特有的隐私缺陷点**：卸载重装后读到上一个账号的 token |
| **清数据** | `pm clear` | 无等价 | iOS 用卸载重装或模拟器 `erase` |
| **读应用沙盒** | `run-as`（需 debuggable）或 root | **模拟器可直接读**（`get_app_container`），真机 release 包不可读 | DB schema 验证优先在 iOS 模拟器打通 |
| **推送模拟** | `am broadcast` 仅对自建通道有效；厂商通道需真实下发 | `simctl push <UDID> <bid> payload.json`，**模拟器无需 APNs 证书** | iOS 更强；Android 推送测试依赖真实厂商通道，必须本地真机 + 真实网络 |
| **性能剖析** | Perfetto / simpleperf / `dumpsys gfxinfo` / `dumpsys meminfo` | Instruments / `xctrace` / MetricKit | 转 `csp-mobile-performance` |
| **多形态** | 折叠屏、分屏、自由窗口、平板 | iPad 分屏 / Slide Over / Stage Manager | 两端形态不同，需各自的用例集 |
| **设备指纹四件套** | `getprop ro.build.fingerprint` / `ro.product.model` / `ro.build.version.release` / sdk，加 `dumpsys package` 的 versionName / versionCode，全部单命令可脚本化 | 真机：`xcrun devicectl list devices -j`（UDID / productType 如 `iPhone15,2` / osVersionNumber / build）；模拟器：`xcrun simctl list devices -j` + runtime；应用版本：Info.plist 的 `CFBundleShortVersionString` / `CFBundleVersion` | 缺：真机上没有一键导出**应用版本**的命令。补偿：模拟器用 `simctl get_app_container` + `PlistBuddy -c "Print :CFBundleShortVersionString" <app路径>/Info.plist`；真机用 `ideviceinstaller -l` 或 Xcode Devices 窗口人工记录；CI 把构建号与 dSYM UUID 一并写进指纹文件 |

### 2.2 "证据等价"原则

同一个缺陷在两端都要能取证。当某端无法自动化取证时：

1. 在用例里显式标注 `取证方式 = 手工`，并写出手工步骤与必需的截图/日志项。
2. **不要因为"自动化不了"就不测**——iOS 真机的权限永久拒绝、真实内存回收、真实低电量都属于这一类。
3. 在测试报告里列出**平台覆盖差异表**，明确哪些失效模式只在某端验证过：

```markdown
| 失效模式 | Android | iOS | 说明 |
|---|---|---|---|
| 权限永久拒绝后引导 | 半自动（构造手工，断言自动） | 手工 | iOS 真机无 CLI 构造手段 |
| 真实内存回收后恢复 | ✅ `am kill` | ⚠️ 仅低内存真机实测 | iOS 无等价命令 |
| 低电量省电策略 | ✅ `dumpsys battery set` | ⚠️ 真机真实放电 | iOS `status_bar override` 只改视觉 |
| 保留数据的降级 | ✅ `install -r -d` | ❌ 平台不允许 | iOS 走"清数据后装旧版"，是不同场景 |
| DB migration 验证 | ⚠️ 需 debuggable 包 | ✅ 模拟器直接读沙盒 | iOS 更方便 |
| 弱网全流量整形 | ⚠️ 需 root 或宿主热点 | ✅ Network Link Conditioner | iOS 内置但不可脚本化 |
| 推送模拟 | ❌ 依赖真实厂商通道 | ✅ `simctl push` | Android 推送缺陷必须本地真机 |
```

### 2.3 证据等级：两端能力不对等时的报告纪律

上表的每一处"iOS 缺"，最终都会变成缺陷报告里的证据强度问题。**工程结论：两端证据能力不对等时，缺陷报告必须标注证据等级，不能拿 iOS 的弱证据去支撑和 Android 同等强度的结论。**

| 等级 | 定义 | 例子 |
|---|---|---|
| **A（双源互证）** | 系统级结构化证据 + 独立采集且时间戳可对齐的第二源，共同指向同一事件 | Android：crash 栈 + `-v threadtime` 全量 logcat + 录屏三者对齐；iOS：`.ips` 崩溃报告 + `log collect` 归档按时间对齐 |
| **B（单源系统证据）** | 只有单一系统侧产物，无上下文互证 | 只有崩溃栈没有事发前日志；只有录屏没有日志 |
| **C（人工观察）** | 截图、口头描述、未对齐时间线的复现印象 | "我看到卡了一下" |

三条硬规则：

1. **证据字段按端分别标注等级**（例：`Android=A / iOS=B`），不允许一个等级笼统覆盖两端。
2. **不得用一端的强证据推断另一端的根因**：Android 侧 A 级证据链证明"重复提交源于缺幂等键"，不能直接写成"iOS 同根因"——iOS 侧至少要 B 级独立证据（如抓包显示同键重发）才能下同等结论；拿不到就写"iOS 证据缺口：无 X 采集手段，结论待定"。
3. **iOS 天然到不了 A 级的类别**（真实内存回收、hang 无自动 traces、真机 debug 级日志不持久化）：先用补偿手段升级证据——接入 `os.Logger` + MetricKit、复现时挂 `xctrace`、手工触发 `.sysdiagnose`；补偿后仍不够，按 B/C 级提交并写明缺口，由分派方决定是否接受。弱证据支撑强结论，等于把平台能力缺陷转嫁成误判风险。

---

## 3. 跨端框架：控件树对自动化不友好时怎么办

### 3.1 React Native

| 方面 | 状况 |
|---|---|
| 渲染方式 | **真实原生视图**（UIView / android.view.View），不是自绘 |
| `uiautomator dump` 可用性 | ✅ 通常可用，能看到原生控件树 |
| Accessibility Inspector 可用性 | ✅ 可用 |
| `testID` 的映射 | iOS → `accessibilityIdentifier`（稳定）<br>Android → **随 RN 版本变化**：早期版本落到 `content-desc`（会覆盖无障碍描述，本身是个缺陷），较新版本支持 `resource-id` |
| **必须做的一步** | 在你实际使用的 RN 版本上 `uiautomator dump` 一次，确认 `testID` 到底映射到哪个属性，再决定定位策略。**不要照抄网上教程的假设** |
| 列表虚拟化 | `FlatList` / `SectionList` 只渲染可视区 + 少量缓冲 → dump 拿不到屏外项 |
| 崩溃表现 | JS 层异常在 logcat 里是 `ReactNativeJS` tag；native 层是常规崩溃栈；开发模式有红盒 |
| 开发菜单 | `adb shell input keyevent 82`（MENU） |
| 连本机 Metro | `adb reverse tcp:8081 tcp:8081` |

**虚拟列表的自动化模式**：不要试图一次 dump 全量列表，用"滚动 → dump → 查找 → 命中则点击，否则继续滚动"的循环，并设最大滚动次数上限（例如 20 次）避免死循环：

```bash
find_in_list() {
  local target="$1" max_swipes="${2:-20}" i=0
  while [ "$i" -lt "$max_swipes" ]; do
    adb -s "$DEVICE_SERIAL" shell uiautomator dump /sdcard/ui.xml >/dev/null
    adb -s "$DEVICE_SERIAL" pull /sdcard/ui.xml "$ARTIFACT_DIR/ui.xml" >/dev/null
    if grep -q "$target" "$ARTIFACT_DIR/ui.xml"; then
      echo "FOUND at swipe #$i"; return 0
    fi
    adb -s "$DEVICE_SERIAL" shell input swipe 540 1800 540 600 400
    sleep 1
    i=$((i + 1))
  done
  echo "NOT FOUND after $max_swipes swipes"; return 1
}
```

上面的 `540 1800 → 540 600` 是坐标，**依赖 1080 宽屏**。正确做法是先 `wm size` 读出分辨率再按比例算：

```bash
read W H <<<"$(adb -s "$DEVICE_SERIAL" shell wm size | grep -oE '[0-9]+x[0-9]+' | head -1 | tr 'x' ' ')"
X=$((W / 2)); Y1=$((H * 3 / 4)); Y2=$((H / 4))
adb -s "$DEVICE_SERIAL" shell input swipe "$X" "$Y1" "$X" "$Y2" 400
```

### 3.2 Flutter

| 方面 | 状况 |
|---|---|
| 渲染方式 | **自绘**（Skia / Impeller），整屏是一个 `FlutterView` |
| `uiautomator dump` 结果 | 默认只有**一个** `android.view.View` 节点，内部什么都没有 |
| Accessibility Inspector 结果 | 默认看不到子元素 |
| 根因 | Flutter 的 widget 树与平台 accessibility 树是两套东西，只有显式标注 `Semantics` 的 widget 才会投影到 accessibility 树 |

**解法（按优先级）**

1. **加 `Semantics`**（同时也修好了无障碍，见 `device-matrix-and-interference.md` §2.11）：

```dart
Semantics(
  identifier: 'order.detail.submitButton',   // Flutter 3.19+ 支持 identifier
  label: '提交订单',
  button: true,
  enabled: _canSubmit,
  child: ElevatedButton(onPressed: _submit, child: const Text('提交')),
)

// 纯文本与图标可用语义标签快捷方式
const Icon(Icons.close, semanticLabel: '关闭')
Text('总价 ¥128.00', semanticsLabel: '总价 128 元')   // 读屏友好的表述常与视觉文案不同
ExcludeSemantics(child: DecorativeImage())            // 装饰性内容从语义树排除
MergeSemantics(child: Row(...))                       // 把一组控件合并成一个语义节点
```

2. **开启语义树**：应用内测试用 `SemanticsBinding.instance.ensureSemantics()` 强制开启；**外部工具驱动时（uiautomator dump / Appium / Maestro），Android 侧必须有任意无障碍服务在运行**（打开 TalkBack 或 Accessibility Scanner 即可），Flutter 的 AccessibilityBridge 才会把语义节点投影成虚拟 `AccessibilityNodeInfo`；iOS 侧 XCUITest / Accessibility Inspector 的查询会自动触发投影，无需额外开关。不开的话即使加了 `Semantics`，平台 accessibility 树里也没有节点。

**补完之后控件树长什么样**（验收时对照）：

```bash
# Android：从一个大节点 → 每个语义节点一行；label 落在 content-desc
adb -s "$DEVICE_SERIAL" exec-out uiautomator dump --compressed /dev/tty 2>/dev/null \
  | grep -o 'content-desc="[^"]*"' | head
```

```xml
<!-- 补 Semantics 前：整屏只有这一个节点，内部什么都看不到 -->
<node class="android.view.SurfaceView" package="com.example.app" bounds="[0,0][1080,2400]" />
<!-- 补 Semantics 后（无障碍服务开启状态下 dump） -->
<node class="android.view.View" package="com.example.app" content-desc="提交订单" clickable="true" bounds="[72,1980][1008,2124]" />
<node class="android.view.View" package="com.example.app" content-desc="总价 128 元" bounds="[72,1880][600,1940]" />
```

```text
// iOS：XCUITest debugDescription 中对应出现
Button, {{36.0, 890.0}, {402.0, 56.0}}, identifier: 'order.detail.submitButton', label: '提交订单'
```

> `identifier` 在 iOS 侧稳定映射为 `accessibilityIdentifier`；Android 侧的可见性随 Flutter 版本而异——用上面的 dump 命令在项目实际版本上验证一次再决定定位策略（与 §3.1 里 RN `testID` 的验证纪律相同）。

3. **加 `Key` 并用框架自带 driver**（比走平台 accessibility 更精确）：

```dart
ElevatedButton(
  key: const Key('order.detail.submitButton'),
  onPressed: _submit,
  child: const Text('提交'),
)
```

```dart
// integration_test/app_test.dart
integration_testWidgetsFlutterBinding.ensureInitialized();

testWidgets('提交订单', (tester) async {
  app.main();
  await tester.pumpAndSettle();
  await tester.tap(find.byValueKey('order.detail.submitButton'));
  await tester.pumpAndSettle();
  expect(find.text('提交成功'), findsOneWidget);
});
```

```bash
# 在真机上跑（-d 传 adb devices 里的序列号）
flutter test integration_test/app_test.dart -d "$DEVICE_SERIAL"
flutter drive --driver=test_driver/integration_test.dart \
  --target=integration_test/app_test.dart -d "$DEVICE_SERIAL"
```

4. **平台视图（PlatformView）**：嵌入的原生 WebView、地图、视频播放器是**真实原生视图**，`uiautomator dump` 能看到，与自绘部分混在同一棵树里。定位策略要区分：原生部分用 `resource-id`，Flutter 部分用 `Key` + driver。

5. **日志**：`adb -s "$DEVICE_SERIAL" logcat -s flutter`；Dart 异常 tag 是 `E/flutter`。

### 3.3 四级降级阶梯（控件树不可用时）

| 级别 | 手段 | 稳定性 | 何时用 |
|---|---|---|---|
| **1** | **补语义标签**：`testID`（RN）/ `Semantics` + `Key`（Flutter）/ `accessibilityIdentifier`（iOS 原生）/ `resource-id` + `content-desc`（Android 原生） | ★★★★★ | **默认选择**。一次性投入，同时修好无障碍，两端 ID 可统一 |
| **2** | **深链直达目标页**：`am start -a android.intent.action.VIEW -d "<deeplink>"` / `xcrun simctl openurl <UDID> "<url>"` | ★★★★ | 目标页有深链时。能绕开不稳定的列表滚动、Tab 切换、登录流程 |
| **3** | **框架自带 driver**：Detox（RN）/ `integration_test`（Flutter）/ Maestro（accessibility 层 YAML） | ★★★★ | 自绘框架且已加 Key；比平台 accessibility 更精确、更稳定 |
| **4** | **图像/OCR 定位 + 绝对坐标** | ★ | **最后兜底**。必须在用例里标注 `# 脆弱：依赖 <分辨率>@<密度>，换机型需重算`，并限制在 1–2 台固定设备上执行 |

**关键判断**：第 4 级不是"自动化方案"，是**债务**。如果超过 **5%** 的用例走到第 4 级，说明产品代码的可测试性投入不足——正确动作是回去补第 1 级，而不是继续堆坐标脚本。坐标脚本的维护成本随设备矩阵规模线性增长，而语义标签是一次性的。

**执行顺序判据——先补标识符，再谈自动化**：

1. **先 dump 定性**（Android `uiautomator dump`；iOS Accessibility Inspector 或 §1.5 的 dump 专用 XCUITest 用例）：树里**没有节点** = 自绘且语义树未开 → 先解决"开启语义"（§3.2 第 2 条）；**有节点没标识** = 产品代码缺 `testID` / `Semantics` / `resource-id` → 补代码，一次性 PR；**有标识但定位仍不稳** = 命名或层级治理问题 → 按 §3.4 规范收敛。
2. 标识符补齐、关键路径控件在 dump 里 100% 可寻址之后，**才进入 driver 选型**（§3.6）。顺序不能反：driver 解决的是"等待与同步"，解决不了"定位不到"。
3. 验收标准：新增自动化用例零坐标定位；存量第 4 级用例占比触到上面的 5% 红线时，回产品代码补第 1 级，而不是继续堆脚本。

### 3.4 跨端统一定位符命名规范

两端共用一套 ID，测试用例可跨端复用，缺陷报告里的元素引用也一致：

```
<screen>.<region>.<component>[.<state>]

order.detail.submitButton
order.detail.submitButton.disabled
order.list.item.title
home.tab.cart
home.tab.cart.badge
login.form.phoneInput
login.form.phoneInput.error
settings.profile.avatar
```

规则：

- 全小驼峰，`.` 分隔层级，不含空格与中文
- `<screen>` 与路由名一致
- 状态后缀只用 `.disabled` / `.selected` / `.error` / `.loading` / `.empty` 五个
- 动态内容（列表项）用 `<component>` + 索引参数，不把索引写进 ID：`order.list.item` + `index=3`，而不是 `order.list.item3`
- ID 一旦发布**不复用不改名**，改名等于让所有自动化用例同时失效

### 3.5 混合应用（native shell + WebView）

| 部分 | 定位通道 | 工具 |
|---|---|---|
| native shell（导航栏、Tab、系统弹窗） | accessibility 树 | `uiautomator` / XCUITest / Appium native context |
| WebView 内的页面 | **DOM** | Playwright / Chrome DevTools 协议 / Appium webview context |

主要复杂点是 **context 切换**：native → webview → native。三条实践：

1. Android 侧开远程调试：`adb -s "$DEVICE_SERIAL" forward tcp:9222 localabstract:chrome_devtools_remote`，之后可用 DevTools 协议直接操作 WebView DOM（转 `csp-browser-testing-with-devtools`）。
2. WebView 内的页面若能在桌面浏览器里独立跑，**优先用 Playwright 在桌面跑**（快 10–50 倍、稳定得多），真机只验证"容器集成"这一层（JSBridge、cookie 同步、UA、深链回跳）。转 `csp-playwright-ui-test` / `csp-h5-visual-testing`。
3. WebView 在 accessibility 树里的表现：Android 上节点 class 是 `android.view.View`，`text` 来自 DOM 文本，`content-desc` 来自 ARIA；**首次 dump 常拿不到 WebView 内部节点**，需先触发一次交互（点击或滚动）让 Chromium 构建虚拟 accessibility 树，再 dump。

### 3.6 工具选型对照

| 工具 | 支持端 | 定位通道 | 适合场景 |
|---|---|---|---|
| Appium | Android + iOS + Web | UiAutomator2 / XCUITest（WebDriverAgent） | 跨端统一、多语言客户端、需要与企业测试平台集成 |
| Maestro | Android + iOS | accessibility 树 + YAML flow | 上手快、flow 可读性高、CI 友好、不需要写代码 |
| Detox | React Native（Android + iOS） | 灰盒，同步 RN 桥 | RN 项目首选，能解决异步导致的 flaky |
| XCUITest | iOS | accessibility | 原生 iOS，官方支持最好 |
| Espresso / UiAutomator | Android | View 树 / accessibility | 原生 Android；Espresso 走 View 树（更快更稳），UiAutomator 走 accessibility（能跨应用） |
| `integration_test` / `flutter_driver` | Flutter | Flutter 内部 Widget 树 + `Key` | Flutter 项目首选，`flutter_driver` 已不推荐新项目使用 |
| Appium flutter driver（appium-flutter-driver） | Flutter（Android + iOS） | 经 Dart VM Service 直连 Flutter 引擎，用 flutter finder 按 `Key` 定位 | 已有 Appium 基础设施要驱动 Flutter 时用；**仅 debug/profile 构建可用**（需要 Dart VM Service 端口），release 包必须退回"原生 driver + semantics 标识"路线 |
| Playwright | Web / WebView 内页面 | DOM | H5 与 WebView 内容 → `csp-playwright-ui-test` |

选型判断：**优先用框架自带的 driver**（Detox / integration_test / Espresso），它们能拿到框架内部状态，天然规避异步等待问题；只有当需要跨端统一或跨应用操作（系统设置、通知栏、其他应用）时才上 Appium/Maestro 这类黑盒工具。**第一个分叉是构建类型**：release 包上 Dart VM Service / Metro 这类框架内部通道全部不可用，只剩 accessibility/semantics 一条路——"要不要测 release 包"直接决定选型上限。**第二个分叉是 flaky 来源**：失败集中在异步等待（动画、网络、帧调度）→ 换灰盒 driver（能等框架内部 idle）；失败集中在定位不到 → 回 §3.3 补标识符，换 driver 无济于事。
