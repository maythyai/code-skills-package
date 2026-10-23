# 设备矩阵设计与系统级干扰测试

## 1. 设备矩阵设计

### 1.1 选型六维度

机型代号从 `adb shell getprop ro.product.model` 取真实值填入；下表用占位代号，ROM 家族按**后台管控激进度**分类而不绑定具体厂商。

| 维度 | 档位划分 | 为什么重要（对应的真实缺陷类别） |
|---|---|---|
| **OS 版本** | ① 最低支持版 ② 最低+1 ③ 占比最高的两个主流版 ④ 最新版 | 权限模型逐版变化：运行时权限、"仅使用时"位置、一次性权限、二次拒绝即永久拒绝、长期未用自动重置、通知权限运行时化、大致位置、预测性返回。存储模型：分区存储强制化。后台模型：后台服务限制、后台启动 Activity 限制。每跨一个大版本都可能出现"代码没改但行为变了"的缺陷 |
| **屏幕尺寸 / 密度** | 尺寸：小屏 < 5.0" / 标准 6.1–6.5" / 大屏 > 6.7" / 折叠展开态 / 平板<br>密度：`mdpi 160` / `hdpi 240` / `xhdpi 320` / `xxhdpi 480` / `xxxhdpi 640` | 文案截断与换行、图片资源档位选择错误（模糊或过大）、`dp`/`sp` 换算、刘海与手势导航区的 window inset、底部按钮被系统栏遮挡 |
| **芯片档位** | 旗舰 / 中端 / 入门。**按 CPU 核心数 + 主频 + GPU 代次界定，不看营销名** | 启动耗时与动画掉帧、native 崩溃（`armeabi-v7a` vs `arm64-v8a` ABI 缺失）、系统 WebView 版本差异导致的渲染与 JS 兼容问题 |
| **内存档位** | 2–3 GB（低） / 4–6 GB（中） / 8 GB+（高） | 后台被杀频率、Bitmap OOM、图片缓存策略、多任务恢复成功率、大型列表滑动时的内存抖动 |
| **ROM 家族** | A 近原生（后台管控宽松）<br>B 激进省电（默认冻结后台、通知可能延迟或静默）<br>C 自研生态（可能缺 Google 服务，推送走厂商通道，安装来源校验更严）<br>D 多形态（折叠屏 / 平板 / 悬停模式） | 后台任务与推送不达、通知被拦截、权限弹窗被 ROM 定制成不同的交互（导致"永久拒绝"路径不同）、自启动管理、字体渲染差异、安装时的额外安全确认弹窗 |
| **语言与时区** | 主语言 + 一个长文本语言（词形较长）+ 一个 RTL 语言 + 至少两个跨时区 | 文案截断、RTL 镜像（箭头/进度条/滑动方向）、日期与数字格式、"今天"的判定、时区变更后的时间显示 |

### 1.2 可填矩阵表模板

写到 `docs/analysis/device-matrix-<app>.md`。

```markdown
# 设备矩阵：<app> <version>

| 项 | 值 |
|---|---|
| 数据来源 | 应用内埋点（去重设备数）/ 崩溃平台机型分布 / 商店后台，取最近 30 天 |
| 采样窗口 | YYYY-MM-DD ~ YYYY-MM-DD |
| 总去重设备数 | N |
| 覆盖机型种类 | M |
| 矩阵版本 | v3（上次更新 YYYY-MM-DD） |

| # | 机型代号<br>(`ro.product.model`) | ROM<br>家族 | OS<br>版本 | API | 屏幕<br>尺寸 | 分辨率 | 密度 | 芯片<br>档位 | 内存 | 语言<br>/时区 | 用户<br>占比% | 累计<br>占比% | 入选<br>层级 | 入选理由 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
```

### 1.3 填好的样例（含裁剪结论）

| # | 机型代号 | ROM | OS | API | 尺寸 | 分辨率 | 密度 | 芯片 | 内存 | 语言/时区 | 占比% | 累计% | 层级 | 入选理由 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | M-01 | A | 14 | 34 | 6.4" | 1080×2340 | xxhdpi | 中端 | 8GB | zh / UTC+8 | 14.2 | 14.2 | **冒烟+核心** | 占比第一 |
| 2 | M-02 | B | 13 | 33 | 6.5" | 1080×2400 | xxhdpi | 中端 | 6GB | zh / UTC+8 | 11.8 | 26.0 | **核心** | 激进省电 ROM 代表 |
| 3 | M-03 | B | 12 | 31 | 6.1" | 720×1600 | xhdpi | 入门 | 4GB | zh / UTC+8 | 9.4 | 35.4 | **核心** | 低配 + 主流 OS |
| 4 | M-04 | A | 15 | 35 | 6.7" | 1440×3120 | xxxhdpi | 旗舰 | 12GB | zh / UTC+8 | 8.1 | 43.5 | **冒烟+核心** | 最高 OS 版本（必留②） |
| 5 | M-05 | C | 13 | 33 | 6.6" | 1080×2408 | xxhdpi | 中端 | 8GB | zh / UTC+8 | 6.7 | 50.2 | **核心** | 自研生态 ROM（推送通道不同） |
| 6 | M-06 | B | 11 | 30 | 6.2" | 720×1600 | xhdpi | 入门 | 3GB | zh / UTC+8 | 5.9 | 56.1 | **核心** | 最低内存档（必留⑥） |
| 7 | M-07 | D | 14 | 34 | 7.6" 折叠 | 1812×2176 | xxhdpi | 旗舰 | 12GB | zh / UTC+8 | 4.3 | 60.4 | **核心** | 多形态（必留⑤） |
| 8 | M-08 | A | 10 | 29 | 5.8" | 1080×2280 | xxhdpi | 中端 | 4GB | zh / UTC+8 | 3.8 | 64.2 | **冒烟+核心** | 最低支持 OS（必留①） |
| 9 | M-09 | C | 12 | 32 | 6.5" | 1080×2400 | xxhdpi | 中端 | 4GB | zh / UTC+8 | 3.1 | 67.3 | 核心 | 累计 70% 内 |
| 10 | M-10 | A | 12 | 31 | **4.7"** | 720×1280 | hdpi | 入门 | 3GB | en / UTC+0 | 2.6 | 69.9 | 核心 | 最小屏（必留④）+ 长文本语言 |
| 11 | M-11 | B | 14 | 34 | 6.8" | 1440×3088 | xxxhdpi | 旗舰 | 8GB | ar / UTC+3 | 2.2 | 72.1 | 扩展 | RTL 语言 |
| 12 | M-12 | D | 13 | 33 | 11" 平板 | 1600×2560 | xhdpi | 旗舰 | 8GB | en / UTC−5 | 1.9 | 74.0 | 扩展 | 平板 + 跨时区 |
| 13–17 | M-13…M-17 | 混合 | 11–14 | — | — | — | — | — | — | 各 1.2–1.8 | 1.2–1.8 | 80.2 | 扩展 | 补足累计 80% |
| 18–59 | 其余 42 型 | — | — | — | — | — | — | — | — | 各 < 1.2 | 19.8 | 100.0 | ❌ 不入矩阵 | 单型占比过低，边际收益不足 |

**裁剪结论**：核心矩阵 10 台（累计 69.9% + 必留七类补差），扩展矩阵 17 台（累计 80.2%），冒烟集 3 台（M-01 最高占比 / M-04 最高 OS / M-08 最低 OS）。其余 42 型不进矩阵。

### 1.4 裁剪算法（可执行步骤）

```
输入：最近 30 天机型分布（去重设备数 → 占比），按占比降序
输出：冒烟集 / 核心矩阵 / 扩展矩阵

1. 累计占比达到 70% 的机型 → 全部进入"核心候选"
2. 检查必留七类，缺的补进核心候选（即使占比 < 1%）：
     ① 最低支持 OS 版本      ② 最高 OS 版本        ③ 占比第一的机型
     ④ 最小屏（< 5.0"）      ⑤ 最大屏 / 折叠 / 平板  ⑥ 最低内存档
     ⑦ 每个出现过的 ROM 家族各一家（A/B/C/D）
3. 若核心候选 > 12 台，按 (ROM家族, OS大版本, 内存档) 三元组归约，
   每组只保留占比最高的一台
4. 核心矩阵 = 归约后的集合（目标 8–12 台）
5. 扩展矩阵 = 累计占比 70% → 85% 追加的机型（总数目标 20–25 台）
6. 冒烟集 = 核心矩阵中占比最高的 3 台；
   若这 3 台未覆盖最低 OS 与最高 OS，则替换第 3 台为满足该条件的机型
```

**为什么是 70% / 85% 而不是 100%**：机型分布是长尾的。上例中前 10 型占 69.9%，前 17 型占 80.2%，剩下 42 型合计只占 19.8%——把这 42 型全测一遍需要 42 台设备和 42 份执行时间，换来的边际缺陷发现率极低。长尾机型的问题**绝大多数能在同 ROM 家族 + 同 OS 大版本的代表机型上复现**。

**为什么必须补必留七类**：占比数据只反映"多少人在用"，不反映"有多少种不同的失败模式"。最低 OS 版本可能只占 0.5% 用户，但它承载了 100% 的"旧权限模型"失败模式；RTL 语言可能只占 1%，但布局镜像缺陷在该群体里是 100% 必现。**占比裁剪负责效率，必留七类负责失效模式覆盖，两者缺一不可。**

### 1.5 三档矩阵的用途

| 层级 | 台数 | 执行时机 | 内容 |
|---|---|---|---|
| 冒烟集 | 3 | 每次构建 | 核心流程走通 + 启动不崩 + 登录可用 |
| 核心矩阵 | 8–12 | 每次合入主干 / 每个迭代 | 全量功能用例 + 全部系统级干扰测试 |
| 扩展矩阵 | 20–25 | 大版本发布前 | 核心矩阵内容 + 长尾兼容性铺开 + 多语言 |

超出 25 台通常意味着矩阵没做归约——把强相关维度（OS 版本 × ROM 家族 × 芯片档位）当成了独立维度。

### 1.6 本地真机 vs 云真机的能力边界

| 能力 | 本地真机 | 云真机 | 结论 |
|---|---|---|---|
| 摄像头 / 扫码 / AR | ✅ | ⚠️ 虚拟图片注入，无真实光学 | 扫码类必须本地 |
| NFC / 蓝牙 / 传感器（陀螺仪、气压计） | ✅ | ❌ 多数平台不支持 | 必须本地 |
| 真实推送（厂商通道） | ✅ | ❌ 设备共享 + ROM 冻结导致不达 | **推送类缺陷必须本地验证** |
| 长时间后台保活（> 30 min） | ✅ | ❌ 会话时长限制，断连即回收 | 后台被杀 / Doze 类无法在云上可靠执行 |
| 真实射频切网（WiFi ↔ 蜂窝） | ✅ | ❌ 无真实 SIM | 云上的"弱网"是流量整形，不是射频切换 |
| 模拟弱网（延迟/丢包/限速） | ⚠️ `tc netem` 需 root，否则用代理 | ✅ 多数平台有弱网面板 | 云上更方便，但参数需自己核对 |
| `adb shell` 全权限 / root | ⚠️ 取决于自有设备 | ⚠️ 部分平台限制 shell 权限 | `tc`、`appops`、`settings put global` 需确认权限 |
| 系统设置修改（字体缩放 / 深色 / 分辨率） | ✅ | ⚠️ 部分平台锁定 | 干扰测试前先验证能不能改 |
| `bugreport` 导出 | ✅ | ⚠️ 部分平台不提供下载 | ANR 排查需确认 |
| 并行度 | 低（受设备数限制） | 高（数十台同时） | 大矩阵回归用云 |
| 证据留存 | 自己管理 | 平台可能自动录屏，保留期有限 | 关键缺陷要立即下载 |

**分工原则**：干扰类、推送类、后台类、真实弱网类、传感器类 → **本地真机**；兼容性铺开、多机型并行回归、长尾覆盖 → **云真机**。

### 1.7 矩阵维护规则

| 触发条件 | 动作 |
|---|---|
| 每季度 | 用最新 30 天占比数据重算裁剪，更新矩阵版本号 |
| 新 OS 大版本正式发布 | 2 周内加入一台该版本设备（先作为"最高 OS"必留项），观察 3 个月后再决定是否升为核心 |
| 新 OS Beta / 开发者预览 | 加入扩展矩阵，只跑冒烟集，专门收集兼容性问题 |
| 某机型占比跌破 1% 且不属于必留七类 | 移出矩阵，记录移除日期 |
| 某 ROM 家族出现集中缺陷（≥3 个同族缺陷） | 该家族在核心矩阵中加一台不同 OS 版本的机型 |
| 崩溃平台报出某机型崩溃率显著高于均值 | 无论占比多低，临时加入核心矩阵直到问题关闭 |
| 应用 `minSdkVersion` 提升 | 重新确定"最低支持 OS"必留项，移除低于新下限的设备 |

---

## 2. 系统级干扰测试

每项统一给：**构造命令 → 预期断言 → 常见缺陷 → 用例ID 前缀**。所有命令假设已导出 `$DEVICE_SERIAL` 与 `$APP_PKG`。

### 2.1 权限三态（首次 / 拒绝 / 永久拒绝）

**构造**

| 目标状态 | 命令 |
|---|---|
| 首次（未决定，会弹窗） | `adb -s "$DEVICE_SERIAL" shell pm revoke "$APP_PKG" android.permission.CAMERA`；部分 ROM 需 `pm clear` 或重装才回到未决定态 |
| 已允许 | `adb -s "$DEVICE_SERIAL" shell pm grant "$APP_PKG" android.permission.CAMERA` |
| 已拒绝（一次） | 手工点"拒绝"，或 `pm revoke` |
| **永久拒绝**（不再弹窗） | **无法用单条命令构造**：手工连续拒绝两次（Android 11+ 第二次拒绝即等同"不再询问"），或到系统设置里手动关闭该权限 |
| 后台位置等特殊 op | `adb -s "$DEVICE_SERIAL" shell appops set "$APP_PKG" ACCESS_BACKGROUND_LOCATION deny` |
| 禁后台运行 | `adb -s "$DEVICE_SERIAL" shell cmd appops set "$APP_PKG" RUN_IN_BACKGROUND deny` |
| 全部权限复位 | `adb -s "$DEVICE_SERIAL" shell pm reset-permissions`（**会重置设备上所有应用**，共享机慎用） |
| 状态核对 | `adb -s "$DEVICE_SERIAL" shell dumpsys package "$APP_PKG" \| grep -A2 'runtime permissions'`<br>`adb -s "$DEVICE_SERIAL" shell dumpsys appops "$APP_PKG"` |

弹窗是否真的出现，用焦点窗口判定，不要靠肉眼看：

```bash
adb -s "$DEVICE_SERIAL" shell dumpsys window | grep -E 'mCurrentFocus|mFocusedApp'
# 权限弹窗出现时 mCurrentFocus 会指向权限控制器窗口，而非应用窗口
```

**OS 版本行为差异（必须有对应版本的设备才测得到）**

| OS 版本 | 变化 | 对应用的影响 |
|---|---|---|
| 6.0 | 引入运行时权限 | 安装时不再一次性授权 |
| 8.0 | 后台服务与广播限制 | 保活策略失效 |
| 10 | 位置增加"仅在使用中允许"；分区存储 | 后台定位需额外申请；外部存储访问方式改变 |
| 11 | 一次性权限（"仅本次允许"）；**连续两次拒绝 = 永久拒绝**；长期未使用自动重置权限 | 授权状态可能在用户无操作的情况下被系统收回 |
| 12 | 全局麦克风/摄像头/位置开关；位置可选"大致位置" | 权限已授予但系统级开关关闭时，API 返回降级结果而非报错 |
| 13 | `POST_NOTIFICATIONS` 变为运行时权限 | 未申请则通知**静默丢失**，无任何报错 |
| 14 | 每次权限请求需向用户说明用途；照片选择器细化 | 请求前的说明 UI 成为必需项 |

**预期断言**

| 状态 | 断言 |
|---|---|
| 首次 | 弹窗出现（焦点窗口验证）；弹窗文案说明了用途；用户可选择"仅本次"（OS 11+） |
| 允许 | 目标功能可用；`dumpsys package` 中 `granted=true` |
| 拒绝（一次） | 功能**降级而非崩溃**；给出可读解释与重试入口；下次进入该功能仍会弹窗 |
| **永久拒绝** | **不再弹窗**；界面提供"去设置开启"入口；点击后 `am start -a android.settings.APPLICATION_DETAILS_SETTINGS -d package:$APP_PKG` 落到**本应用详情页**（不是设置首页）；从设置页返回后应用能检测到授权状态变化并立即恢复功能，**无需重启** |
| 系统自动重置（OS 11+） | 应用不缓存"已授权"结论；每次使用前重新检查 `checkSelfPermission` |
| 系统级开关关闭（OS 12+） | 权限已授予但全局摄像头开关关闭时，给出明确提示而非黑屏 |

**常见缺陷**

| 缺陷 | 表现 |
|---|---|
| 死循环弹窗 | 永久拒绝后每次进入功能都弹自定义对话框，用户无法关闭流程 |
| 引导深链落错页面 | "去设置"跳到系统设置首页，用户找不到目标权限 |
| 缓存授权状态 | 应用在启动时读一次权限并缓存，系统自动重置后仍以为已授权，调用即崩 |
| 拒绝后核心流程完全不可用 | 没有降级路径（例如拒绝相机后应提供"从相册选择"） |
| Android 13 通知静默丢失 | 未申请 `POST_NOTIFICATIONS`，业务依赖通知的流程断掉且无报错 |
| 权限请求时机过早 | 冷启动就连续请求 5 个权限，用户全部拒绝；应在用户触发对应功能时请求 |
| 返回后状态未刷新 | 从设置页返回应用，界面仍显示"未授权"，需杀进程重进 |

**用例矩阵**：`权限 × 三态 × 功能` 三维，用 pairwise 压缩（见 `csp-test-case-design`）。用例ID 前缀 `TC-PERM-`。

---

### 2.2 后台被杀与进程重建

**三个层次必须分别测**（走的是完全不同的代码路径）

| 层次 | 构造命令 | 杀什么 | 恢复路径 | 真实对应 |
|---|---|---|---|---|
| L1 缓存进程回收 | `adb -s "$DEVICE_SERIAL" shell am kill "$APP_PKG"`（应用须在后台） | 仅后台缓存进程 | Application 重建 + Activity 从 `savedInstanceState` 恢复 | 系统内存回收（**最常见**） |
| L2 Activity 销毁 | 开发者选项 → "不保留活动" 打开，然后切后台 | 每个离开前台的 Activity | Activity 重建，进程仍在 | 低内存设备 |
| L3 完全停止 | `adb -s "$DEVICE_SERIAL" shell am force-stop "$APP_PKG"` | 进程 + 服务 + 广播 + Alarm | 完全冷启动 | 用户手动"强行停止" / ROM 一键清理 |
| L4 ROM 冻结近似 | `adb -s "$DEVICE_SERIAL" shell am set-standby-bucket "$APP_PKG" rare`<br>`adb -s "$DEVICE_SERIAL" shell cmd appops set "$APP_PKG" RUN_IN_BACKGROUND deny` | 不杀，但限制后台活动与网络 | 无恢复，任务被推迟 | 激进省电 ROM（家族 B/C） |
| L5 Doze | `adb -s "$DEVICE_SERIAL" shell cmd deviceidle force-idle` | 不杀，但延迟网络与 Alarm | `cmd deviceidle unforce` 后补做 | 长时间息屏 |

配合内存压力构造 L1 的真实场景：`am kill` 只在应用处于 cached 状态时生效，前台调用无效。先 `input keyevent 3`（HOME）再 `am kill`。

被杀原因的权威来源：

```bash
adb -s "$DEVICE_SERIAL" shell dumpsys activity exit-info "$APP_PKG"
# reason: CRASH | ANR | SIGNALED | LOW_MEMORY | EXCESSIVE_RESOURCE_USAGE
#       | USER_REQUESTED | USER_STOPPED | DEPENDENCY_DIED | INITIALIZATION_FAILURE
adb -s "$DEVICE_SERIAL" logcat -b events -d | grep -E 'am_kill|am_proc_died|am_low_memory'
```

**预期断言**

| 断言项 | 说明 |
|---|---|
| Application 重建后 SDK 重新初始化 | 埋点、日志上报、推送注册、崩溃采集都要重新 init；**推送 token 必须重新上报服务端** |
| 表单内容保留 | 从 `savedInstanceState` / 持久化草稿恢复；未保存的输入不能丢 |
| 滚动位置与 Tab 选中保留 | 列表回到原位置，Tab 停在原页 |
| 播放/计时/录音进度保留或明确重置 | 不能出现"进度条继续走但内容从头播" |
| 不重新登录 | token 从持久化存储读取，不是只在内存里 |
| 进行中的写操作不重复执行 | 恢复后不重放已提交的请求（幂等键） |
| 静态单例不持有已销毁 Context | 否则恢复即崩 |
| `savedInstanceState` 不超限 | 过大会触发 `TransactionTooLargeException`（Binder ~1MB 限制） |

**常见缺陷**

| 缺陷 | 表现 |
|---|---|
| 静态单例持有 Activity Context | 恢复后 `WindowManager$BadTokenException` 或内存泄漏 |
| 只在 `onCreate` 里初始化 SDK，未考虑进程重建 | 恢复后埋点全丢、推送不达 |
| 恢复后重放网络请求 | 重复下单 / 重复发消息 |
| 推送 token 未重新注册 | 后台被杀后永久收不到推送，直到下次冷启动 |
| `savedInstanceState` 塞了整个列表数据 | `TransactionTooLargeException`，旋转或被杀后必崩 |
| 依赖 `onDestroy` 做清理 | 进程被杀时 `onDestroy` **不会被调用**，清理逻辑必须放在可恢复的持久化里 |

用例ID 前缀 `TC-BGKILL-`。

---

### 2.3 来电与通知打断

**构造**

| 手段 | 命令 | 真实度 | 说明 |
|---|---|---|---|
| 第二台设备真拨 | 人工 | ★★★★★ | **唯一能测真实来电中断的方式**；需要一张可用 SIM |
| 通知打断 | `adb -s "$DEVICE_SERIAL" shell cmd notification post -S bigtext -t "系统更新" interrupt_test "点击查看详情"` | ★★★★ | Android 10+；测通知遮挡与点击跳转 |
| 展开通知栏遮挡 | `adb -s "$DEVICE_SERIAL" shell cmd statusbar expand-notifications` | ★★★ | 测底部操作区被遮挡 |
| 拨号界面 | `adb -s "$DEVICE_SERIAL" shell input keyevent 5` 或 `am start -a android.intent.action.CALL -d tel:<测试号码>` | ★★ | **只打开拨号盘，不等价于来电**；能测 Activity 切换但不能测音频焦点抢占 |
| 语音助手 | `adb -s "$DEVICE_SERIAL" shell input keyevent 231` | ★★ | 全屏覆盖打断 |
| 闹钟 / 全屏提醒 | 系统时钟应用设置 1 分钟后的闹钟 | ★★★★ | 测全屏 Activity 打断 |

> 纯 adb 无法可靠模拟真实来电（需要射频层与电话服务配合）。`input keyevent 5` 常被误当成"模拟来电"——它只是按下拨号键。**来电打断测试必须准备第二台设备**，这一条要写进测试环境准备清单。

**预期断言**

| 场景 | 断言 |
|---|---|
| 音频/视频播放中来电 | 音频焦点被抢占后暂停；通话结束后按策略恢复或保持暂停（需产品明确）；不出现两个音源同时播放 |
| 录音中来电 | 录音正确中断并保存已录部分，或明确提示丢失；不产生损坏文件 |
| 视频通话中来电 | 有明确的接受/拒绝 UI，不静默失败 |
| 长任务进行中被打断 | 任务不被静默丢弃；恢复后可见进度或明确的失败提示 |
| 表单填写中被通知打断 | 展开通知栏再收起，表单内容不丢 |
| 全屏关键操作（支付、导航）被通知遮挡 | 关键操作区不被遮挡，或通知不弹出（全屏 intent 优先级） |
| 游戏/地图中打断 | 回到应用后渲染正常，不黑屏不卡死 |

**常见缺陷**

| 缺陷 | 表现 |
|---|---|
| 音频焦点未释放 | 通话时应用仍在后台播放声音 |
| 音频焦点未恢复 | 通话结束后应用永久静音，需杀进程 |
| 打断后计时器继续走 | 限时操作（验证码倒计时、抢购）在打断期间耗尽，回来直接失败 |
| 来电后 WebView 白屏 | Surface 被回收后未重建 |
| 通知栏遮挡底部按钮 | 展开通知栏时"提交"按钮不可点且无法收起 |
| 打断期间的推送/长连接断开后不重连 | 回到应用后消息不再更新 |

用例ID 前缀 `TC-INTERRUPT-`。

---

### 2.4 低电量与省电模式

**构造**

```bash
# 模拟电量 15%、放电状态、未充电
adb -s "$DEVICE_SERIAL" shell dumpsys battery set level 15
adb -s "$DEVICE_SERIAL" shell dumpsys battery set status 3     # 3 = 放电
adb -s "$DEVICE_SERIAL" shell dumpsys battery set plugged 0
adb -s "$DEVICE_SERIAL" shell dumpsys battery                  # 核对

# 省电模式
adb -s "$DEVICE_SERIAL" shell settings put global low_power 1

# Doze（息屏省电深化）
adb -s "$DEVICE_SERIAL" shell input keyevent 223               # 熄屏
adb -s "$DEVICE_SERIAL" shell cmd deviceidle force-idle
adb -s "$DEVICE_SERIAL" shell dumpsys deviceidle | grep -E 'mLightIdleState|mDeepIdleState'

# 应用待机分组
adb -s "$DEVICE_SERIAL" shell am set-standby-bucket "$APP_PKG" rare

# 电池优化白名单（对照组）
adb -s "$DEVICE_SERIAL" shell cmd deviceidle whitelist +"$APP_PKG"
```

档位建议：`15%`（触发系统低电量提示）、`5%`（触发强省电）、`1%`（极端）。每档都要在**充电**与**放电**两种 `status` 下各测一次——部分省电策略只在放电时生效。

**预期断言**

| 断言项 | 说明 |
|---|---|
| 低电量提示下核心功能可用 | 不因系统弹窗阻断主流程 |
| 省电模式降级策略生效 | 降低刷新频率、暂停预加载、减少埋点上报频次、关闭非必要动画 |
| Doze 下网络与 Alarm 被推迟 | 应用不崩溃；`unforce` 后能补做积压任务且不重复执行 |
| Standby Bucket 为 `rare` 时 | 后台同步停止但不丢数据；用户主动打开应用后立即恢复 |
| 电量/状态恢复后策略回退 | `dumpsys battery reset` + `low_power 0` 后行为回到正常档 |
| 温度字段合理 | `dumpsys battery` 的 `temperature`（单位 0.1℃）；> 400（40℃）时部分 ROM 会限频 |

**常见缺陷**

| 缺陷 | 表现 |
|---|---|
| 低电量下仍全速轮询 | 耗电投诉，应用被系统标记为高耗电 |
| Doze 下 Alarm 被推迟后任务永久丢失 | 用了 `setExact` 但未处理延迟触发的补偿 |
| 省电模式下推送完全收不到且无兜底 | 缺少"打开应用时主动拉取"的补偿路径 |
| `dumpsys battery set` 后忘记 reset | **污染同一台设备上后续所有测试**——这是测试环境事故，不是产品缺陷 |
| 温度限频导致的性能问题被误判为代码缺陷 | 未记录 `temperature`，同一用例在冷机与热机上结果不同 |

用例ID 前缀 `TC-BATTERY-`。

---

### 2.5 屏幕旋转

**构造**

```bash
# 关自动旋转 + 固定方向（0=0° 1=90° 2=180° 3=270°）
adb -s "$DEVICE_SERIAL" shell settings put system accelerometer_rotation 0
adb -s "$DEVICE_SERIAL" shell settings put system user_rotation 1

# 恢复自动旋转
adb -s "$DEVICE_SERIAL" shell settings put system accelerometer_rotation 1

# 查当前旋转
adb -s "$DEVICE_SERIAL" shell dumpsys window displays | grep -E 'mCurrentRotation|init='
```

自动旋转开启时物理转动设备，能额外测到传感器路径与"旋转锁定按钮"行为；`user_rotation` 方式测不到传感器。两种都要覆盖。

**预期断言**

| 断言项 | 说明 |
|---|---|
| 状态保留 | 表单内容、滚动位置、Tab 选中、播放进度、展开/折叠态 |
| 不重复请求 | 旋转触发 Activity 重建，**不能重新发起已完成的网络请求** |
| 不重复提交 | 进行中的写操作有幂等保护 |
| 横屏布局无截断 | 长文案、表格、表单在横向可用宽度下正确重排 |
| 底部操作区不被系统栏遮挡 | 手势导航与三键导航两种模式各测一次 |
| 视频全屏切换正确 | 内联播放器 ↔ 全屏的双向切换，进度连续 |
| 不触发 `TransactionTooLargeException` | `savedInstanceState` 过大时旋转必崩 |
| 键盘高度变化被处理 | 声明了 `configChanges="orientation"` 但未处理 `screenSize`/`keyboardHidden` 时会出问题 |

**常见缺陷**

| 缺陷 | 表现 |
|---|---|
| 旋转即丢失已填表单 | 未使用 `ViewModel` / `onSaveInstanceState` |
| 旋转触发重复下单 | `onCreate` 里无条件发起提交请求 |
| 横屏下底部按钮被导航栏遮挡 | 未处理 window inset |
| 旋转后图片/视频方向错误 | EXIF orientation 未处理 |
| 折叠屏内外屏切换后布局错乱 | 尺寸变化远大于普通旋转，走的是同一重建路径但幅度更大 |
| 锁定竖屏的页面在横屏设备上不居中 | `screenOrientation="portrait"` 与大屏适配冲突 |

用例ID 前缀 `TC-ROTATE-`。

---

### 2.6 深色模式

**构造**

```bash
adb -s "$DEVICE_SERIAL" shell cmd uimode night yes     # 强制深色
adb -s "$DEVICE_SERIAL" shell cmd uimode night no      # 强制浅色
adb -s "$DEVICE_SERIAL" shell cmd uimode night auto    # 跟随系统（复位用）
adb -s "$DEVICE_SERIAL" shell cmd uimode night          # 查当前值

# 定时深色（按时间自动切换）需通过系统设置界面手工配置
adb -s "$DEVICE_SERIAL" shell am start -a android.settings.DISPLAY_SETTINGS
```

**预期断言**

| 断言项 | 阈值 / 说明 |
|---|---|
| 正文文字对比度 | ≥ **4.5:1**（WCAG AA 正文）；≥ **3:1**（≥ 18pt 或 14pt 粗体） |
| 图标有深色版本 | 不是简单反色或加白色描边 |
| WebView 内容 | 明确选择"跟随"或"排除"，不能一半深一半浅 |
| 第三方 SDK 界面 | 登录、支付、客服、地图 SDK 的界面在深色下可读；**这是最常见的漏测区** |
| 图片与头像 | 深色背景下不刺眼、不出现白色硬边 |
| 阴影与层级 | 深色下阴影几乎不可见，需用描边或背景色差异表达层级 |
| 切换即时生效 | `auto` 模式下从亮环境进入暗环境，**无需重启应用**即刷新 |
| 启动页 / Splash | 有深色版本，否则冷启动会闪一次白屏 |
| 截图取证 | 深浅两套各一份，文件名带模式后缀 |

**常见缺陷**

| 缺陷 | 表现 |
|---|---|
| 只改了自家页面 | 第三方 SDK 仍是浅色，形成割裂 |
| 硬编码颜色值 | 深色下出现白底白字或黑底黑字 |
| `auto` 模式不响应运行时切换 | 需要杀进程重进才生效 |
| Splash 只有浅色 | 冷启动闪白 |
| 深色下用阴影表达层级 | 完全看不出层级，卡片边界消失 |
| 图表/数据可视化配色未适配 | 深色下多条曲线颜色无法区分 |

用例ID 前缀 `TC-DARK-`。配合 `csp-h5-visual-testing` 做 H5 页面的批量深浅色截图对比。

---

### 2.7 系统字体缩放

**构造**

```bash
for scale in 1.0 1.15 1.3 2.0; do
  adb -s "$DEVICE_SERIAL" shell settings put system font_scale "$scale"
  echo "== font_scale=$scale"
  # 截图取证整个关键流程
done
adb -s "$DEVICE_SERIAL" shell settings put system font_scale 1.0     # 复位
adb -s "$DEVICE_SERIAL" shell settings get system font_scale          # 核对
```

档位：`1.0`（默认）/ `1.15` / `1.3`（大）/ `2.0`（超大，部分 ROM 上限为 `1.45` 或提供"超大字体"独立开关）。先 `settings get system font_scale` 读出设备支持的实际档位。

**预期断言**

| 断言项 | 说明 |
|---|---|
| 无文字截断 | 或截断时有省略号且提供查看完整内容的途径（长按、详情页、tooltip） |
| 无重叠 | 文字不与图标、相邻控件重叠 |
| 固定高度控件不被裁切 | 按钮、Tab、输入框、列表行高 |
| 表格与列表不错位 | 表头与数据列对齐 |
| 滚动容器可滚到底 | 超大字体下内容高度增加，最后一项必须可达 |
| 弹窗不超出屏幕 | 确认/取消按钮在 2.0 缩放下仍在可视区内且可点 |
| 使用 `sp` 的文字正确缩放 | 使用 `dp` 的文字不缩放——这是缺陷还是设计需产品确认，但必须记录在案 |

**常见缺陷**

| 缺陷 | 表现 |
|---|---|
| 固定 `48dp` 高度按钮文字溢出 | 2.0 缩放下文字被垂直裁切一半 |
| TabLayout 标签截断到无法区分 | "设置"与"设定"都显示为"设…" |
| 底部导航栏图标与文字重叠 | |
| 弹窗按钮跑出屏幕 | 用户无法完成确认操作，流程死锁 |
| 列表最后一项被底部栏永久遮挡 | 内容可达性缺陷 |
| WebView 内容不跟随系统字体缩放 | 混合界面字号不一致 |

用例ID 前缀 `TC-FONT-`。

---

### 2.8 切后台恢复

**构造**

```bash
# 切后台
adb -s "$DEVICE_SERIAL" shell input keyevent 3                  # HOME

# 等待不同时长（三档必测）
sleep 300        # 5 分钟
sleep 1800       # 30 分钟
sleep 7200       # 2 小时（通常配合 am kill 或 deviceidle 才有意义）

# 回来（两种方式，行为不同）
adb -s "$DEVICE_SERIAL" shell input keyevent 187                # 最近任务，手动选择
adb -s "$DEVICE_SERIAL" shell monkey -p "$APP_PKG" -c android.intent.category.LAUNCHER 1   # 从桌面图标

# 叠加内存压力：切后台后杀缓存进程再回来
adb -s "$DEVICE_SERIAL" shell input keyevent 3
sleep 10
adb -s "$DEVICE_SERIAL" shell am kill "$APP_PKG"
adb -s "$DEVICE_SERIAL" shell monkey -p "$APP_PKG" -c android.intent.category.LAUNCHER 1
```

**预期断言**

| 断言项 | 说明 |
|---|---|
| 不白屏 | 回来即有内容，不需要杀进程重进 |
| 不重新登录 | token 静默续期；长时后台后 token 过期时的处理是"静默刷新"而非"踢到登录页" |
| 滚动位置与 Tab 保留 | |
| 进行中请求不重复 | 幂等键保护 |
| 长时后台后数据刷新 | 5 分钟回来可能用缓存，30 分钟/2 小时回来应触发静默刷新，且刷新期间不显示过期数据当最新数据 |
| 剪贴板读取提示 | Android 12+ 读取剪贴板会弹系统提示，确认是否打断流程 |
| 深链/推送点击回来 | 从通知点进应用时落到正确页面，而不是首页 |
| 息屏后亮屏 | `keyevent 223` 熄屏 → `keyevent 224` 亮屏，锁屏状态下需解锁，解锁后应用状态正确 |

**常见缺陷**

| 缺陷 | 表现 |
|---|---|
| 后台 30 分钟后回来白屏 | WebView 渲染进程被回收未重建 |
| token 过期直接踢登录且丢失草稿 | 静默刷新失败后未保留现场 |
| 回来后用缓存数据当最新数据 | 余额、库存、状态显示过期值且无刷新入口 |
| 长连接断开后不重连 | 消息不再更新，需下拉刷新 |
| 从通知点进落到首页 | 深链 intent 未处理，或 `launchMode` 配置导致 intent 丢失 |

用例ID 前缀 `TC-RESUME-`。

---

### 2.9 分屏 / 多窗口 / 画中画 / 折叠

**构造**

```bash
adb -s "$DEVICE_SERIAL" shell input keyevent 187        # 打开最近任务，长按应用卡片选"分屏"
adb -s "$DEVICE_SERIAL" shell am start --windowingMode 3 -n "$APP_PKG/.MainActivity"   # 部分版本支持自由窗口
adb -s "$DEVICE_SERIAL" shell dumpsys window displays | grep -E 'mCurrentFocus|Display #'
adb -s "$DEVICE_SERIAL" shell dumpsys activity activities | grep -iE 'multi.?window|split'
```

折叠屏内外屏切换、悬停模式（半折）无法用 adb 构造，**必须用真实折叠设备**（矩阵必留项⑤）。

**预期断言**

| 断言项 | 说明 |
|---|---|
| `onMultiWindowModeChanged` 正确处理 | 进入/退出分屏不崩溃，布局重排 |
| 窄宽度下布局可用 | 分屏时应用宽度可能只有 ~360dp 甚至更小 |
| 视频画中画 | 进入 PiP 后播放继续、控制可用；返回全屏时进度连续 |
| 折叠屏内外屏切换 | 状态保留（表单、滚动、播放）；分辨率与密度大幅变化不导致布局崩坏 |
| 悬停模式 | 上半屏内容 + 下半屏控制的分工正确 |
| 分屏下两个应用同时活跃 | 音频焦点、剪贴板、深链的处理 |
| 平板大屏 | 是否使用双栏布局；拉伸模式下不被强制放大 |

**常见缺陷**：分屏下按全屏尺寸布局导致元素超出可视区；内外屏切换后 Activity 重建丢状态；PiP 返回全屏时播放器状态错乱；折叠屏悬停模式下键盘遮挡下半屏内容。

用例ID 前缀 `TC-MULTIWIN-`。

---

### 2.10 系统时间 / 时区 / 语言切换

**构造**

```bash
# 关闭自动时间后手工修改（无 root 时只能通过设置界面）
adb -s "$DEVICE_SERIAL" shell settings put global auto_time 0
adb -s "$DEVICE_SERIAL" shell settings put global auto_time_zone 0
adb -s "$DEVICE_SERIAL" shell am start -a android.settings.DATE_SETTINGS      # 手工改时间与时区

# 语言与区域
adb -s "$DEVICE_SERIAL" shell am start -a android.settings.LOCALE_SETTINGS    # 手工切换
adb -s "$DEVICE_SERIAL" shell getprop persist.sys.locale                       # 读当前 locale
adb -s "$DEVICE_SERIAL" shell getprop persist.sys.timezone                     # 读当前时区

# 复位
adb -s "$DEVICE_SERIAL" shell settings put global auto_time 1
adb -s "$DEVICE_SERIAL" shell settings put global auto_time_zone 1
```

**预期断言**

| 断言项 | 说明 |
|---|---|
| 时间相关逻辑用服务器时间兜底 | token 有效期、限时活动、优惠券过期、"今天"的判定都不能只信本地时间 |
| 用户把系统时间调到过去 | 不能因此获得额外的限时权益，也不能导致已购内容显示为过期 |
| 用户把系统时间调到未来 | 不能导致 token 立即失效或内容全部过期 |
| 时区变更后日期显示正确 | 跨日边界的记录（23:59 提交，次日 00:01 查看）显示一致 |
| 语言切换后不崩溃、不残留混合语言 | 缓存的文案必须失效；动态下发的文案需重新拉取 |
| RTL 语言下布局镜像 | 箭头方向、进度条方向、滑动方向、返回手势侧、列表对齐 |
| 数字与日期格式本地化 | 千分位、小数点符号、日历系统 |

**常见缺陷**

| 缺陷 | 表现 |
|---|---|
| 用本地时间做 token 有效期判断 | 用户改系统时间即可绕过限时限制，或误判为已过期 |
| 证书校验依赖本地时间 | 系统时间错误导致 TLS 握手失败（`CertPathValidatorException`），错误提示却是"网络异常" |
| RTL 下图标方向未镜像 | 返回箭头指向错误方向 |
| 语言切换后混合语言 | 部分页面缓存了旧语言文案 |
| 日期解析用了默认 locale | `SimpleDateFormat` 未指定 locale，在某些区域设置下解析失败 |

用例ID 前缀 `TC-LOCALE-`。

---

### 2.11 无障碍（TalkBack）与外接输入

**构造**

```bash
adb -s "$DEVICE_SERIAL" shell settings put secure enabled_accessibility_services \
  com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService
adb -s "$DEVICE_SERIAL" shell settings put secure accessibility_enabled 1

# 关闭
adb -s "$DEVICE_SERIAL" shell settings put secure accessibility_enabled 0
adb -s "$DEVICE_SERIAL" shell settings get secure enabled_accessibility_services

# 外接键盘导航
adb -s "$DEVICE_SERIAL" shell input keyevent 61         # TAB 移动焦点
adb -s "$DEVICE_SERIAL" shell input keyevent 66         # ENTER 激活
```

**预期断言**

| 断言项 | 阈值 / 说明 |
|---|---|
| 所有可交互元素有可读标签 | `content-desc` 非空；TalkBack 不播报"未加标签" |
| 焦点顺序合理 | 按视觉阅读顺序，不跳来跳去 |
| 动态内容有播报 | 加载完成、错误提示、Toast 使用 live region |
| 触摸目标尺寸 | ≥ **48dp × 48dp** |
| 弹窗出现时焦点转移 | 焦点移到弹窗内第一个元素；背景内容不可被聚焦 |
| 手势不与 TalkBack 冲突 | 应用的自定义滑动手势在 TalkBack 开启时仍可达 |
| 键盘导航 | TAB 顺序合理，焦点可见，ENTER 可激活 |

**常见缺陷**：图标按钮无 `content-desc`；自定义 View 未实现 `ExploreByTouchHelper`；弹窗出现时焦点仍在背景；加载中无播报导致用户以为卡死；触摸目标 < 48dp。

用例ID 前缀 `TC-A11Y-`。

---

### 2.12 干扰测试执行矩阵

| 干扰项 | 需本地真机 | 可自动化 | 建议执行频率 | 用例ID 前缀 |
|---|---|---|---|---|
| 权限三态 | ⚠️ 部分（永久拒绝需手工） | 部分（`pm grant/revoke` 可，弹窗交互难） | 每迭代 | `TC-PERM-` |
| 后台被杀 L1–L3 | ✅ | ✅（纯 adb 可） | 每迭代 | `TC-BGKILL-` |
| 后台被杀 L4–L5（ROM 冻结/Doze） | ✅ | ✅ | 每迭代 | `TC-BGKILL-` |
| 来电打断 | ✅（需第二台设备 + SIM） | ❌ | 大版本 | `TC-INTERRUPT-` |
| 通知打断 | ✅ | ✅ | 每迭代 | `TC-INTERRUPT-` |
| 低电量与省电 | ⚠️（模拟值不等于真实耗电） | ✅ | 每迭代 | `TC-BATTERY-` |
| Doze | ✅（需真实息屏等待） | ✅ | 大版本 | `TC-BATTERY-` |
| 屏幕旋转 | ✅ | ✅ | 每迭代 | `TC-ROTATE-` |
| 深色模式 | ✅ | ✅ | 每迭代 | `TC-DARK-` |
| 字体缩放 | ✅ | ✅ | 每迭代 | `TC-FONT-` |
| 切后台恢复（5min / 30min / 2h） | ✅（云真机会话超时） | ✅ | 每迭代 | `TC-RESUME-` |
| 分屏 / 多窗口 | ✅ | ⚠️ | 大版本 | `TC-MULTIWIN-` |
| 折叠屏内外屏 / 悬停 | ✅（必须真机） | ❌ | 大版本 | `TC-MULTIWIN-` |
| 时间 / 时区 / 语言切换 | ✅ | ⚠️（多数需手工进设置） | 大版本 | `TC-LOCALE-` |
| 无障碍 TalkBack | ✅ | ⚠️ | 大版本 | `TC-A11Y-` |

执行记录写到 `docs/analysis/interference-test-<version>.md`，每条记录包含：干扰项 / 设备矩阵行号 / 构造命令 / 预期 / 实际 / 证据路径 / 结论。
