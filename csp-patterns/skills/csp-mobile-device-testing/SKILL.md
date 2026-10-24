---
name: csp-mobile-device-testing
description: "Real-device functional testing and automation for Android and iOS: ADB diagnostics (logcat / dumpsys / uiautomator), interference testing (permissions, background kill, rotation), weak/offline network simulation. iOS equivalents via simctl, devicectl, Instruments."
version: "1.0.0"
layer: 3
category: patterns
phase: verify
domain: testing
scope: testing
role: specialist
tools: [Read, Write, Edit, Bash, Glob, Grep]
triggers:
  - "真机测试"
  - "设备矩阵"
  - "机型适配"
  - "adb"
  - "logcat"
  - "dumpsys"
  - "uiautomator"
  - "截图取证"
  - "录屏取证"
  - "bugreport"
  - "弱网测试"
  - "断网测试"
  - "离线测试"
  - "权限弹窗"
  - "后台被杀"
  - "屏幕旋转"
  - "深色模式"
  - "字体缩放"
  - "低电量"
  - "覆盖安装"
  - "升级测试"
  - "降级测试"
  - "数据迁移"
  - "schema 兼容"
  - "simctl"
  - "devicectl"
  - "Instruments"
  - "mobile device testing"
related_skills:
  - csp-mobile-performance
  - csp-h5-visual-testing
  - csp-e2e-testing
  - csp-playwright-ui-test
  - csp-cross-platform-strategy
  - csp-browser-testing-with-devtools
anti_rationalizations:
  "在模拟器上过了就行": "模拟器覆盖不到厂商 ROM 的后台管控、真实射频弱网、真实 GPU 与传感器；至少要有一台最低配真机和一台主流厂商 ROM 真机"
  "缺陷复现不了，先记个偶现": "偶现 = 未取证。必须给出复现率 x/y 与设备指纹，取不到就写明取不到，不要写'偶现'了事"
  "截图太麻烦，口头描述一下现象": "缺陷报告五件套缺一即打回：复现步骤 / 时间戳对齐的日志 / 截图或录屏 / 设备指纹 / 应用版本"
  "设备太多，挑几台测测": "设备矩阵必须由真实用户占比数据裁剪，不是凭手头有什么机器；没有占比数据就先补埋点，别拍脑袋"
  "覆盖安装没问题，重装也一样": "覆盖升级、降级、卸载重装走的是完全不同的数据迁移路径；schema 兼容只能在覆盖升级路径上暴露"
  "弱网就是关掉 WiFi": "断网 ≠ 弱网。高延迟、丢包、限带宽、切网、离线队列、重复提交幂等是六种不同场景，必须分别构造"
  "权限拒绝一次就够了": "首次弹窗 / 拒绝 / 永久拒绝是三态，永久拒绝后必须引导去系统设置页，死循环弹窗是最常见的实现缺陷"
  "控件定位不到就用坐标点": "坐标在换分辨率、换密度、弹系统窗后全部失效；先补 testID / resource-id / semanticLabel，坐标只作最后兜底并标注脆弱"
---

# Mobile Device Testing — 真机功能测试与设备自动化

在真实设备上**复现、定位、取证**移动端功能缺陷。管的是"这台机器上到底发生了什么"，不管"怎么让它更快"。

## 0. 边界：本技能不管什么

| 问题 | 归属 |
|---|---|
| 启动耗时、内存、列表滚动掉帧、包体积、电量优化 | `csp-mobile-performance` |
| H5 页面批量截图走查、深浅色对比、视觉回归 | `csp-h5-visual-testing` |
| Web 端 E2E 自动化框架选型与 flaky 治理 | `csp-e2e-testing` / `csp-playwright-ui-test` |
| WebView 内的页面调试（Chrome DevTools 协议） | `csp-browser-testing-with-devtools` |
| RN / Flutter / Native / KMP 的技术选型与代码共享策略 | `csp-cross-platform-strategy` |
| 用例本身怎么枚举（等价类、边界值、判定表、pairwise） | `csp-test-case-design` |
| **真机上怎么连、怎么操作、怎么取证、测哪些机型、测哪些系统干扰** | **本技能** |

## 1. 决策路由：症状 / 任务 → 第一手命令 → 读哪个 reference

| 当前情况 | 第一手动作 | 详细步骤在 |
|---|---|---|
| `adb devices` 为空 / 设备 offline / 多台设备命令打错机器 | 检查 USB 调试与授权，用 `-s <serial>` 或 `ANDROID_SERIAL` 锁定 | `references/adb-command-reference.md` §1 |
| 崩溃、ANR、闪退，需要日志与完整系统状态 | `logcat -b crash -d` + `bugreport` | `references/adb-command-reference.md` §2、§6 |
| 怀疑内存泄漏、卡顿、被系统限制 | `dumpsys meminfo/package/deviceidle/battery` | `references/adb-command-reference.md` §3 |
| 自动化找不到控件、拿不到定位符 | `uiautomator dump` 取控件树，对照 accessibility tree 属性 | `references/adb-command-reference.md` §4 |
| 需要脚本化点击/输入/滑动/改系统设置 | `input tap/swipe/text/keyevent` + `settings put` | `references/adb-command-reference.md` §5 |
| 缺陷报告要附证据 | `exec-out screencap -p` / `screenrecord` + 设备指纹四件套 | `references/adb-command-reference.md` §6 |
| 缺陷只在某台机型复现 / 要定机型范围 | 建可填设备矩阵，用真实用户占比裁剪到累计 80% | `references/device-matrix-and-interference.md` §1 |
| 权限弹窗、后台被杀、来电通知、低电量、旋转、深色、字体缩放、切后台恢复 | 系统级干扰测试清单（每项给命令 + 预期 + 常见缺陷） | `references/device-matrix-and-interference.md` §2 |
| 弱网、断网、切网、离线队列、重复提交幂等 | `tc netem` / 代理 / `svc data disable` | `references/network-install-upgrade.md` §1 |
| 覆盖升级后崩溃、数据丢失、降级失败 | 安装升级矩阵 + DB schema 兼容验证 | `references/network-install-upgrade.md` §2 |
| iOS 侧要做等价取证 | `xcrun simctl` / `xcrun devicectl` / `xcrun xctrace` | `references/ios-and-cross-platform.md` §1 |
| Android 与 iOS 取证能力对不上，需要保证证据等价 | 能力差异对照表 + 补偿手段 | `references/ios-and-cross-platform.md` §2 |
| RN / Flutter 的控件树里只有一个大节点 | 补 `testID` / `Semantics`，改用框架自带 driver | `references/ios-and-cross-platform.md` §3 |

## 2. 快速开始：锁定设备 + 采集指纹

所有命令统一用环境变量，禁止硬编码序列号、包名、路径。

```bash
export DEVICE_SERIAL="${DEVICE_SERIAL:-$(adb devices | awk 'NR==2 && $2=="device"{print $1}')}"
export APP_PKG="${APP_PKG:?需要设置 APP_PKG，例如 com.example.app}"
export ARTIFACT_DIR="${ARTIFACT_DIR:-docs/analysis/device-evidence}"
mkdir -p "$ARTIFACT_DIR"

# 1. 确认设备在线（多台时必看）
adb devices -l

# 2. 设备指纹四件套 —— 在任何清理动作之前落盘
{
  echo "fingerprint : $(adb -s "$DEVICE_SERIAL" shell getprop ro.build.fingerprint)"
  echo "model       : $(adb -s "$DEVICE_SERIAL" shell getprop ro.product.model)"
  echo "android_ver : $(adb -s "$DEVICE_SERIAL" shell getprop ro.build.version.release)"
  echo "sdk         : $(adb -s "$DEVICE_SERIAL" shell getprop ro.build.version.sdk)"
  echo "rom         : $(adb -s "$DEVICE_SERIAL" shell getprop ro.build.display.id)"
  echo "abi         : $(adb -s "$DEVICE_SERIAL" shell getprop ro.product.cpu.abi)"
  echo "screen      : $(adb -s "$DEVICE_SERIAL" shell wm size) / $(adb -s "$DEVICE_SERIAL" shell wm density)"
} | tee "$ARTIFACT_DIR/device-fingerprint.txt"

# 3. 应用版本（pm clear / 卸载后就拿不到了，务必先采）
adb -s "$DEVICE_SERIAL" shell dumpsys package "$APP_PKG" \
  | grep -E 'versionName|versionCode|firstInstallTime|lastUpdateTime' \
  | tee -a "$ARTIFACT_DIR/device-fingerprint.txt"

# 4. 起一条后台日志流（贯穿整个复现过程）
adb -s "$DEVICE_SERIAL" logcat -c
adb -s "$DEVICE_SERIAL" logcat -v threadtime > "$ARTIFACT_DIR/logcat-$(date -u +%Y%m%dT%H%M%SZ).log" &
LOGCAT_PID=$!

# 5. 复现操作 …

# 6. 收尾取证
kill "$LOGCAT_PID"
adb -s "$DEVICE_SERIAL" exec-out screencap -p > "$ARTIFACT_DIR/shot-$(date -u +%H%M%S).png"
```

**顺序不可调换**：指纹与应用版本必须在 `pm clear` / 卸载重装 / 降级之前采集，否则缺陷报告里的"发生环境"就变成猜测。

## 3. 取证铁律

| # | 规则 |
|---|---|
| 1 | **无五件套不报缺陷**。缺任一项，报告直接打回，不进入分派流程 |
| 2 | 日志必须用 `-v threadtime`（含日期+时间+线程），否则无法与录屏对齐 |
| 3 | 截图/录屏文件名带 UTC 时间戳，报告里写明录屏起止时间与关键帧秒数 |
| 4 | 不写"偶现"。写 **复现率 `x/y`**（例如 3/10），并列出成功与失败时的设备状态差异 |
| 5 | 复现过程中对设备做过的任何环境变更（改字体缩放、关 WiFi、`pm clear`、`wm density`）必须逐条记录，并在取证结束后 `reset` 回默认 |
| 6 | 一台设备上复现的缺陷，必须在设备矩阵里至少一台**不同厂商 ROM** 的设备上验证是否同样复现，报告里写明"仅 X 复现"还是"全部复现" |

**缺陷报告五件套**

| 件 | 内容 | 采集命令 |
|---|---|---|
| ① 复现步骤 | 编号步骤 + 每步等待时长 + 复现率 `x/y` | 人工 |
| ② 时间戳对齐日志 | `logcat -v threadtime` 全量 + `-b crash` 崩溃缓冲 + 关键行摘录 | `adb logcat` |
| ③ 视觉证据 | 截图（现象帧 + 对照帧）或录屏（含操作过程） | `exec-out screencap -p` / `screenrecord` |
| ④ 设备指纹 | fingerprint / model / android_ver / sdk / rom / abi / 屏幕尺寸与密度 | `getprop` + `wm size` + `wm density` |
| ⑤ 应用版本与安装路径 | versionName / versionCode / 全新安装还是覆盖升级 | `dumpsys package` |

报告模板写到 `docs/analysis/defects/DEFECT-<编号>.md`。

## 4. 设备矩阵速览

完整可填矩阵表、占比裁剪算法、云真机能力边界见 `references/device-matrix-and-interference.md` §1。

**选型六维度**：OS 版本分布 / 屏幕尺寸与密度 / 芯片档位 / 内存档位 / 厂商定制 ROM / 语言与时区。

**裁剪规则**（不是穷举）：按真实用户占比降序累加，**累计到 80% 停止**。无论占比如何，以下七类必须各留一台：

1. 最低支持 OS 版本　2. 最高 OS 版本　3. 占比第一的机型　4. 最小屏（< 5.0"）　5. 最大屏（> 6.7" 或折叠/平板）　6. 最低内存档　7. 每个主要厂商 ROM 各一家

**规模基准**：冒烟 3 台 / 核心回归 8–12 台 / 大版本全量 20–25 台。超出 25 台通常说明矩阵没做归约（把强相关维度当独立维度了）。

## 5. 系统级干扰测试速览

每项的触发命令、预期断言、常见缺陷见 `references/device-matrix-and-interference.md` §2。

| 干扰项 | 一句话预期 | 最常漏的断言 |
|---|---|---|
| 权限三态（首次 / 拒绝 / 永久拒绝） | 永久拒绝后引导去系统设置页，不再弹窗 | "引导去设置页"这一步 |
| 后台被杀（`am force-stop` / `am kill` / 不保留活动） | 恢复后状态完整，不重新登录、不丢草稿 | 进程重建（而非仅 Activity 重建）后的状态 |
| 来电与通知打断 | 打断结束后回到原界面原状态，媒体/录音/通话正确恢复 | 打断**期间**的长任务是否被中断且未重试 |
| 低电量（15% / 5% / 省电模式） | 降频降级策略生效，核心功能可用 | 省电模式下后台任务与推送 |
| 屏幕旋转 | 状态保留、不重复请求、不重复提交 | 旋转瞬间正在进行的网络请求 |
| 深色模式 | 全部界面对比度达标，含 WebView 与图片 | WebView 内容与第三方 SDK 界面 |
| 系统字体缩放（1.0 / 1.15 / 1.3 / 2.0） | 无截断、无溢出、无错位 | 固定高度的按钮与表格行 |
| 切后台恢复（HOME → 等 5 分钟 → 回来） | 不白屏、不重新登录、滚动位置保留 | 长时后台后 token 过期与静默续期 |
| 分屏 / 多窗口 / 画中画 | 布局自适应，生命周期正确处理 | `onPause` 后仍在前台可见时的行为 |
| 飞行模式切换 / 时区切换 / 系统时间跳变 | 不崩溃，时间相关逻辑用服务器时间兜底 | 本地时间被用于 token 有效期判断 |

## 6. 弱网与安装升级速览

| 场景 | 构造手段 | 必须断言 |
|---|---|---|
| 高延迟（RTT 800ms ± 200ms） | `tc netem delay` / 代理 throttle | loading 态出现、超时上限 ≤ 30s、不重复提交 |
| 丢包 10% | `tc netem loss 10%` | 重试有上限（≤ 3 次）、指数退避、不雪崩 |
| 限带宽 128kbps | `tc netem rate` / 代理 | 图片渐进或占位、列表不卡死 |
| 切网（WiFi → 蜂窝） | `svc wifi disable` | 长连接重连、请求不丢、不重复计费 |
| 完全离线提交 | `svc data disable` + `svc wifi disable` | 离线队列落盘、恢复后按序发送、幂等键去重 |
| 弱网连点 3 次 | 代理延迟 + 手工连点 | DB 中只产生 1 条记录 |
| 全新安装 | `adb install -r -d -g` | 首启引导、权限申请顺序、默认配置 |
| 覆盖升级 | `adb install -r` | DB schema migration 成功、登录态保留、草稿保留、推送 token 重新注册 |
| 跨版本升级（v1 → v3） | 依次 install | 多级 migration 链路，不允许跳级丢字段 |
| 降级 | `adb install -r -d` | 新字段不导致旧代码解析失败；或明确拒绝降级并给出可读提示 |
| 卸载重装 | `adb uninstall` → `install` | 外部存储残留是否清理、账号是否可重新绑定 |
| 清除数据 | `pm clear` | 等价于全新安装，但保留 APK；不应崩溃 |

命令细节、tc 语法、schema 兼容验证步骤见 `references/network-install-upgrade.md`。

## Key Principles

1. **先锁设备再操作**：多设备环境下每条 `adb` 命令都带 `-s "$DEVICE_SERIAL"`，或导出 `ANDROID_SERIAL`。不带 `-s` 的命令在第二台设备接入的那一刻起就是不可预测的。
2. **指纹先于清理**：`getprop` 四件套与 `dumpsys package` 版本信息必须在 `pm clear` / 卸载 / 降级之前落盘，之后就拿不到了。
3. **五件套齐全且复现率可行动才算缺陷**：复现步骤 + 时间戳对齐日志 + 视觉证据 + 设备指纹 + 应用版本，少一件就打回不进分派；不写"偶现"，写复现率 `x/y`——3/10 与 1/500 是完全不同的缺陷，处置优先级差两个档。
4. **设备矩阵由数据裁剪，不由手头设备决定**：占比降序累加到 80% 停止，再补七类必留机型。没有占比数据就先补埋点。
5. **干扰测试的断言重心在"恢复后"和"打断期间"**：绝大多数实现能让界面恢复正常，却在打断期间丢了请求、重复了提交、泄漏了状态。
6. **控件树不可用时先改产品代码，不是先用坐标**：补 `testID` / `resource-id` / `Semantics` 是一次性投入；坐标定位是永久性的脆弱债务。
7. **取证结束必须复位环境**：`wm size reset`、`wm density reset`、`settings put system font_scale 1.0`、`cmd uimode night auto`、`dumpsys battery reset`、`svc wifi enable`。留一台被改坏的设备给下一个人是最常见的团队协作事故。

## Anti-Patterns

| 反模式 | 为什么错 | 正确做法 |
|---|---|---|
| 只在模拟器上验证就放行 | 模拟器覆盖不到厂商 ROM 的后台管控、真实射频弱网、真实 GPU 驱动与传感器行为 | 至少一台最低配真机 + 一台主流厂商 ROM 真机进入核心矩阵 |
| `adb` 命令不带 `-s` | 接入第二台设备后命令报 `more than one device` 或打到错误设备，取证张冠李戴 | 全部命令带 `-s "$DEVICE_SERIAL"`，或 `export ANDROID_SERIAL=...` |
| 视觉证据采集全用默认参数 | `shell screencap` + `pull` 两次往返慢，且 `shell` 在某些平台做 CRLF 转换导致 PNG 损坏；`screenrecord` 默认上限 180 秒、默认码率 20Mbps，超时静默截断、高码率丢帧，文件还可能几个 GB | 截图用 `adb exec-out screencap -p > x.png`（单次流式、不换行转换）；录屏显式 `--time-limit`（≤180）、`--bit-rate 8000000`，必要时 `--size 720x1280` |
| 缺陷报告写"偶现，无法复现" | 不可行动的缺陷等于没有缺陷；开发无法定位也无法验证修复 | 写复现率 `x/y` + 每次复现的设备状态差异 + 完整五件套 |
| `pm clear` 之后才想起采应用版本 | `versionName` / `lastUpdateTime` 已被抹掉，报告里的"发生版本"变成猜测 | 把指纹与版本采集放进脚本第一步，在任何清理动作之前 |
| 设备矩阵按"我们办公室有什么机器"来定 | 与真实用户分布脱节，覆盖了 0.1% 用户的机型却漏了 15% 用户的主力机型 | 从埋点/崩溃平台/商店后台拉机型分布，占比降序累加到 80% |
| 权限测试只测"允许" | 拒绝与永久拒绝才是缺陷高发区；永久拒绝后死循环弹窗是最常见实现错误 | 三态全测，且断言永久拒绝后跳转系统设置页的深链是否正确 |
| 用 `am force-stop` 模拟"后台被杀" | `force-stop` 连服务与广播一起停，比真实系统回收激进得多，测不出真实的进程重建路径 | 三个层次都测：`am kill`（仅缓存进程）、开发者选项"不保留活动"（Activity 重建）、`am force-stop`（完全停止） |
| 把 `svc wifi disable` 当弱网测试 | 断网是二值状态，弱网是连续谱；两者暴露的缺陷完全不同（前者测离线队列，后者测超时与重试） | 分别构造：高延迟 / 丢包 / 限带宽 / 切网 / 断网五类场景 |
| 把 `uiautomator dump` 当完整控件树用，定位不到就 `input tap x y` 打坐标 | dump 只是 accessibility tree 的 XML 快照，会丢不可见节点、WebView 内部节点与自绘控件（Flutter/RN 常只暴露一个大节点）；而坐标在换分辨率、换密度、弹系统窗、RTL 语言后全部失效，失败时还看不出原因 | 先理解映射关系（`text`/`content-desc`/`resource-id` 来自 `AccessibilityNodeInfo`），自绘框架改用框架自带 driver + 语义标签；补 `resource-id` / `testID` / `Semantics`，坐标只作最后兜底并在用例里标注"脆弱：依赖 1080×2400 @480dpi" |
| 升级只用最新版测，出问题就拿 `install -d` 降级绕过 | 真实用户从任意历史版本升上来，多级 migration 链路的中间版本最容易崩；而 `install -d` 会掩盖 migration 缺陷，问题延后到用户真实升级时爆发 | 至少覆盖 v(n−1)→v(n)、v(n−2)→v(n)、v(n−3)→v(n) 三条升级路径；降级是**独立测试项**而非修复手段，升级失败必须按缺陷处理 |
| 取证完不复位设备 | `wm density` / `font_scale` / 深色模式 / 电池状态被改过，下一个人复现不出来 | 每个取证脚本末尾固定一段 reset（见 Key Principles 7） |

## 7. 产物路径

| 产物 | 路径 |
|---|---|
| 设备矩阵（含占比与裁剪结论） | `docs/analysis/device-matrix-<app>.md` |
| 缺陷报告（五件套齐全） | `docs/analysis/defects/DEFECT-<编号>.md` |
| 干扰测试执行记录 | `docs/analysis/interference-test-<version>.md` |
| 升级兼容验证记录 | `docs/analysis/upgrade-matrix-<from>-to-<to>.md` |
| 原始证据（截图 / 录屏 / logcat / bugreport） | `.csp/artifacts/verify/evidence/mobile/<defect-id>/` |
| 自动化脚本 | 项目既有测试目录（不新建顶层目录） |

原始证据是二进制与大文件，进 `.csp/artifacts/`；分析与报告是给人读的 Markdown，进 `docs/analysis/`。**两者都不许散落到仓库根目录。**

## 交付前自检

```bash
# 1. 设备已复位（下面每条都应输出默认值）
adb -s "$DEVICE_SERIAL" shell wm size            # 期望含 "Physical size"，无 "Override size"
adb -s "$DEVICE_SERIAL" shell wm density         # 期望无 "Override density"
adb -s "$DEVICE_SERIAL" shell settings get system font_scale       # 期望 1.0
adb -s "$DEVICE_SERIAL" shell cmd uimode night                     # 期望 auto 或原值
adb -s "$DEVICE_SERIAL" shell dumpsys battery | grep -i level      # 与真实电量一致（未 set 过）
adb -s "$DEVICE_SERIAL" shell svc wifi enable && adb -s "$DEVICE_SERIAL" shell svc data enable

# 2. 五件套齐全性检查
for f in device-fingerprint.txt logcat-*.log shot-*.png; do
  ls "$ARTIFACT_DIR"/$f >/dev/null 2>&1 || echo "MISSING: $f"
done

# 3. 报告里没有"偶现"这类不可行动表述
grep -rn "偶现\|无法复现\| sometimes" docs/analysis/defects/ && echo "FAIL: 必须写复现率 x/y"

# 4. 报告里没有硬编码序列号 / 包名 / 本机绝对路径
grep -rnE "[0-9A-Z]{8}:[0-9]{4}|/Users/|/home/[a-z]+/" docs/analysis/device-matrix-*.md \
  && echo "FAIL: 用 \$DEVICE_SERIAL / \$APP_PKG / 相对路径"
```
