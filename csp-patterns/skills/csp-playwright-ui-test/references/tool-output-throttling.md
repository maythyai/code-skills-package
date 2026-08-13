# 工具输出限流

playwright-cli 的快照、网络日志、控制台输出可能非常大。直接把全量输出灌进上下文会挤占注意力、拖慢迭代，甚至触发上下文溢出。本文档给出一组限流规则，**默认遵守**。

## 总原则

1. **先过滤，后进上下文**：能用 `--raw` + `grep` 过滤的，绝不全量读取。
2. **先落盘，再摘录**：大输出先重定向到文件，再从文件里摘录与用例相关的片段。
3. **先局部，后整页**：快照优先指定元素或限制深度，不做无差别整页快照。

## DOM 快照限流

```bash
# 只快照目标区域（大页面首选）
playwright-cli snapshot "#result-panel"

# 限制深度，先看结构再按需深入
playwright-cli snapshot --depth=4
playwright-cli snapshot e34            # 对感兴趣的节点再展开

# 落盘后 diff，避免在上下文里肉眼比对整页
playwright-cli --raw snapshot > before.yml
playwright-cli click e5
playwright-cli --raw snapshot > after.yml
diff before.yml after.yml
```

规则：

- 页面元素 > 200 时禁止整页 `snapshot` 直接进上下文，必须区域化或 `--depth`。
- 连续两次快照对比用 `diff`，只把差异行作为证据。

## 网络请求限流

```bash
# 按接口路径过滤
playwright-cli --raw network | grep -i "api/order"

# 只看错误状态码
playwright-cli --raw network | grep -E " (4|5)[0-9]{2} "

# 落盘后再分析
playwright-cli --raw network > net.log
grep -c "api/" net.log                 # 先计数，判断量级
```

规则：

- 全量 `network` 输出仅用于第一次概览；后续一律加过滤条件。
- 静态资源（`.js/.css/.png/.woff` 等）默认从证据中排除，除非用例与资源加载相关。

## 控制台限流

```bash
playwright-cli console error           # 只看 error（判定失败的首选）
playwright-cli console warning         # 单独看 warning
playwright-cli console | tail -20      # 只看最近 20 条
```

规则：

- 判定阶段优先 `console error`；`console`（全量）只在需要还原现场时使用。
- 重复出现的同一 error 只记录首条 + 出现次数。

## 其他输出

```bash
# --raw 去掉页面状态/生成代码/快照段落，只留结果值
playwright-cli --raw eval "JSON.stringify(performance.timing)"
playwright-cli --raw cookie-get session_id

# 结构化 JSON，便于程序化处理
playwright-cli list --json
```

- `eval` 返回大对象时，先在表达式里 `JSON.stringify` + 字段裁剪，再落盘。
- 截图本身不占上下文文本，但报告里成对引用时要控制数量（每个失败 ≤ 2 张关键截图）。

## 触发限流的信号

出现以下情况，说明输出已经失控，必须立即切换到落盘 + 过滤模式：

- 单次命令输出超过 ~200 行
- 连续两次快照刷屏且看不出差异
- 网络日志里静态资源占大多数
- 上下文开始遗忘前面的用例结论
