# Diff 提取策略

> 文中 `{CR_API_BASE}` 指代码托管平台的 API 根地址（如 `https://code.example.com`），可用环境变量 `CR_API_BASE` 提供；`{CR_BASE}` 为平台站点根地址。

## 第一层：Git 直连（最快）

1. 从 CR 页面提取仓库名、源分支、目标分支
2. 本地有仓库时执行 `git fetch origin`：
   - `git diff 目标分支...源分支 --name-only` 获取精确文件路径
   - `git diff 目标分支...源分支 --stat` 变更概览
   - `git diff 目标分支...源分支 -- 文件路径` 具体 diff
3. 无本地仓库：尝试 `git clone --depth 1 --branch 源分支`
4. 成功后跳过后续层

> ⚠️ 禁止凭 CR 页面显示猜路径，测试文件常在 `{module}/src/test/java/` 下而非顶层 `test/`

## 第二层：API 获取元数据

> **已知限制**：`/changes`、`/repository/compare` 端点均 302 跳 SSO，**禁止尝试**。

1. 从 URL 解析 projectId 和 crId
2. navigate 到 CR 页面，`javascript_tool` 执行 `平台页面的 token 提取接口（按平台实现而定）` 提取 token
3. REST API 仅获取元数据：
   ```bash
   curl -s -H "Private-Token: {token}" \
     "{CR_API_BASE}/api/v4/projects/{projectId}/merge_request/{crId}"
   ```
4. 直接进入第三层提取 diff

## 第三层：浏览器提取（核心路径）

### 浏览器工具参数速查

| 工具 | 参数 | 说明 |
|------|------|------|
| `tabs_create_mcp` | 无参数 | 返回 `{tabId}` |
| `navigate` | `{tabId, url}` | 两个都必填 |
| `javascript_tool` | `{tabId, text}` | 参数名是 **text** |
| `get_page_text` | `{tabId}` | 提取页面文本 |

### 提取流程

1. `tabs_create_mcp` → tabId
2. `navigate(tabId, CR_URL?tab=changes)` → 等待加载
3. **错误处理**：
   - navigate 返回 about:blank / chrome-error → `curl --max-time 5 "{CR_BASE}"` 探测
   - 返回 000/超时 → 网络不通，停止所有操作，告知用户
   - 返回 200/302 → 关闭 tab 重建，仅重试 1 次
   - get_page_text 返回 "Page bridge not available" → content script 未注入，关闭重建，重试 1 次
4. `javascript_tool(tabId, "平台页面的 token 提取接口（按平台实现而定）")` → token
5. 第一次 `get_page_text(tabId)` → 默认第一个文件 diff + 完整文件列表
6. 点击文件名切换 diff：
   ```javascript
   (function(){
     var el = document.querySelector('a[title="TargetFile.java"]')
       || (function(){
         var labels = document.querySelectorAll('.next-tree-node-label');
         for(var i=0; i<labels.length; i++){
           if(labels[i].textContent.indexOf('TargetFile.java')>-1) return labels[i];
         }
         return null;
       })();
     if(el){el.click(); return 'clicked';} return 'not found';
   })()
   ```
7. 点击后 `get_page_text`，内容未变化 → 放弃浏览器，走 Git
8. 重复直到所有关键文件 diff 获取完成

### 禁止操作

- ❌ 点击展开/折叠按钮（toggle 行为会折叠已展开 diff）
- ❌ 尝试 /changes 或 /repository/compare API（均 302）
- ❌ 操作 ant-select 版本选择器（下拉选项不渲染）
- ❌ 使用 `findstr` 或 `find` 搜索代码内容（用 Grep/ripgrep）

### SVG className 问题

querySelectorAll 可能匹配到 SVG 元素，`el.className` 是 SVGAnimatedString，无 substring 方法：
```javascript
if (typeof el.className === 'string') { /* safe to use */ }
```

## 第四层：逐文件 URL 导航

CR 页面支持 `?file={blobHash}` 参数定位指定文件 diff：
- 从文件列表链接提取 hash
- 拼接 URL → navigate → get_page_text
- 适用于文件数 > 5 且点击不稳定

## 增量评审（多版本 CR）

### 检测条件

- 用户提及"版本N""增量""最新推送"
- 页面出现"推送"+"Base 版本"+"最新版本"
- commits > 20 或 files > 30

### 流程

1. 询问用户：全量 vs 增量
2. push_records API 获取版本列表：
   ```bash
   curl -s -H "Private-Token: {token}" \
     "{CR_API_BASE}/api/v4/projects/{projectId}/merge_request/{crId}/push_records?page=1&per_page=50"
   ```
3. 定位 base commit（"版本26" → `data[25].head_revision`，0-indexed）
4. `git diff {base_head}..{latest_head}` 取增量 diff
5. 成功后跳过 Step 1 全量提取
