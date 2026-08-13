# CR 评审经验陷阱速查

## 代码层面陷阱

| 模式 | 风险 | 建议 |
|------|------|------|
| 全局 Bean 替换（如 HttpMessageConverters） | 影响所有接口 | 用 WebMvcConfigurer + 路径匹配收窄 |
| `calculateXxx` 返回值未做 `Math.max(0, v)` | 负值穿透到展示层 | 加兜底保护 |
| 日志文案与 if 条件方向相反 | 误导线上排查 | 日志主语须与代码判断方向一致 |
| 在 Converter/Filter 层读取 RequestContext | 非 HTTP 上下文下行为隐蔽 | 加 null 保护 + 注释说明意图 |
| `startsWith` 路径匹配 | 未来相似路径被误匹配 | 确认无冲突或改用精确匹配 |
| 去掉 HTML 转义（如 BrowserCompatible） | XSS 风险 | 确认数据源无用户可控内容 |
| 无条件计算变量但仅在条件分支使用 | 无意义开销 | 移入条件分支内 |
| 修改公共 DTO / VO 的字段 | 消费方未感知导致线上问题 | 排查所有调用方，评估兼容性 |

## 浏览器操作陷阱

| 模式 | 风险 | 建议 |
|------|------|------|
| 点击展开/折叠按钮（class 含 collapsed/fold/expand） | toggle 行为折叠已展开 diff | 只点文件名 `<a>` 链接切换视图 |
| 尝试 /changes 或 /repository/compare API | 均 302 跳 SSO | 仅用 /merge_request/{id} 取元数据 |
| querySelectorAll 匹配到 SVG 后访问 className.substring() | SVGAnimatedString 无 substring | 加 `typeof el.className === 'string'` 守卫 |
| ant-select 版本选择器通过 javascript_tool 点击 | 下拉选项不渲染 | 走 push_records API 获取版本 |
| get_page_text 返回 "Page bridge not available" | content script 未注入 | 关闭 tab 重建，重试 1 次 |
| Fusion Design (.next-tree-node-label) 文件树 | `<a>` 选择器找不到 | 兼容两种选择器；1 次不切换立即降级 Git |

## 工具使用陷阱

| 模式 | 风险 | 建议 |
|------|------|------|
| 用 `findstr "A\|B"` 搜代码 | findstr 不支持 `\|` OR | 代码搜索一律用 Grep（ripgrep） |
| 网络不通时反复重试浏览器/curl/git fetch/SSH | 全部超时浪费 | 首次失败后探测，不通立即停止 |
| 多版本 CR 直接拉全量分支 diff | 用户可能只需增量 | 检测 push 数量，询问全量/增量 |

## 用例生成陷阱

| 模式 | 风险 | 建议 |
|------|------|------|
| 用例名写成标签式短语 | 缺前提/行为/预期，用户返工 | 「前提：[场景]-[行为]，[预期]」完整叙事句 |
| 仅从 diff 看一条调用路径 | 遗漏其他入口验证 | grep callers 建所有入口维度 |
| 按枚举值逐条列举 | 无组合验证，冗余 | 数据状态组合优先 |
| 用代码枚举名做用例名称 | 测试人员无法理解 | 业务操作语言命名 |
