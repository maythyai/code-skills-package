# UI 组件参考库

生成 HTML 原型时可直接复用的组件代码片段。按场景分类。

---

## 1. 导航类

### 1.1 顶部导航栏（移动端）
```html
<div class="navbar">
  <span class="material-icons">arrow_back</span>
  <span class="navbar-title">页面标题</span>
  <span class="material-icons">more_horiz</span>
</div>
<style>
.navbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: #fff;
  border-bottom: 1px solid #f0f0f0;
}
.navbar-title { font-size: 17px; font-weight: 600; }
</style>
```

### 1.2 底部 Tab 栏（移动端）
```html
<div class="tab-bar">
  <div class="tab-item active">
    <span class="material-icons">home</span><span>首页</span>
  </div>
  <div class="tab-item">
    <span class="material-icons">list_alt</span><span>记录</span>
  </div>
  <div class="tab-item">
    <span class="material-icons">person</span><span>我的</span>
  </div>
</div>
<style>
.tab-bar {
  display: flex; justify-content: space-around; align-items: center;
  padding: 8px 0; background: #fff;
  border-top: 1px solid #f0f0f0;
  position: fixed; bottom: 0; left: 0; right: 0;
}
.tab-item {
  display: flex; flex-direction: column; align-items: center;
  font-size: 11px; color: #999; gap: 2px; cursor: pointer;
}
.tab-item.active { color: var(--theme-color, #1677FF); }
.tab-item .material-icons { font-size: 24px; }
</style>
```

---

## 2. 信息展示类

### 2.1 用户信息卡片
```html
<div class="user-card">
  <div class="avatar"><span class="material-icons">person</span></div>
  <div class="user-info">
    <div class="user-name">用户姓名</div>
    <div class="user-id">ID: 1234567890</div>
  </div>
  <span class="material-icons" style="color:#ccc">chevron_right</span>
</div>
<style>
.user-card {
  display: flex; align-items: center; gap: 12px;
  padding: 16px; background: #fff; border-radius: 12px;
}
.avatar {
  width: 48px; height: 48px; border-radius: 50%;
  background: linear-gradient(135deg, var(--theme-color, #1677FF), #69b4ff);
  display: flex; align-items: center; justify-content: center;
  color: #fff;
}
.user-name { font-size: 16px; font-weight: 600; }
.user-id { font-size: 13px; color: #999; margin-top: 4px; }
</style>
```

### 2.2 统计数字卡片
```html
<div class="stat-cards">
  <div class="stat-card">
    <div class="stat-value">128</div>
    <div class="stat-label">申请总数</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">96</div>
    <div class="stat-label">已通过</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">32</div>
    <div class="stat-label">审核中</div>
  </div>
</div>
<style>
.stat-cards { display: flex; gap: 12px; }
.stat-card {
  flex: 1; padding: 16px; background: #fff; border-radius: 12px;
  text-align: center;
}
.stat-value { font-size: 24px; font-weight: 700; color: var(--theme-color, #1677FF); }
.stat-label { font-size: 12px; color: #999; margin-top: 4px; }
</style>
```

### 2.3 列表项（带图标）
```html
<div class="list-item">
  <div class="list-icon"><span class="material-icons">description</span></div>
  <div class="list-content">
    <div class="list-title">列表标题</div>
    <div class="list-desc">描述文本，最多两行显示</div>
  </div>
  <span class="material-icons" style="color:#ccc">chevron_right</span>
</div>
<style>
.list-item {
  display: flex; align-items: center; gap: 12px;
  padding: 16px; background: #fff;
  border-bottom: 1px solid #f5f5f5; cursor: pointer;
}
.list-icon {
  width: 40px; height: 40px; border-radius: 10px;
  background: #f0f5ff; display: flex; align-items: center; justify-content: center;
  color: var(--theme-color, #1677FF);
}
.list-title { font-size: 15px; font-weight: 500; }
.list-desc { font-size: 13px; color: #999; margin-top: 4px; }
</style>
```

---

## 3. 流程与进度类

### 3.1 步骤进度条（水平）
```html
<div class="steps">
  <div class="step done">
    <div class="step-dot">✓</div>
    <div class="step-label">步骤一</div>
  </div>
  <div class="step-line done"></div>
  <div class="step active">
    <div class="step-dot">2</div>
    <div class="step-label">步骤二</div>
  </div>
  <div class="step-line"></div>
  <div class="step">
    <div class="step-dot">3</div>
    <div class="step-label">步骤三</div>
  </div>
</div>
<style>
.steps { display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
.step { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.step-dot {
  width: 28px; height: 28px; border-radius: 50%;
  background: #e8e8e8; color: #999;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 600;
}
.step.done .step-dot { background: var(--theme-color, #1677FF); color: #fff; }
.step.active .step-dot { background: var(--theme-color, #1677FF); color: #fff; box-shadow: 0 0 0 4px rgba(22,119,255,0.2); }
.step-line { flex: 1; height: 2px; background: #e8e8e8; margin: 0 8px; margin-bottom: 24px; }
.step-line.done { background: var(--theme-color, #1677FF); }
.step-label { font-size: 12px; color: #999; }
.step.done .step-label, .step.active .step-label { color: #333; }
</style>
```

### 3.2 时间线（垂直）
```html
<div class="timeline">
  <div class="timeline-item">
    <div class="timeline-dot done"></div>
    <div class="timeline-content">
      <div class="timeline-title">审核通过</div>
      <div class="timeline-time">2026-03-19 10:30</div>
    </div>
  </div>
  <div class="timeline-item">
    <div class="timeline-dot active"></div>
    <div class="timeline-content">
      <div class="timeline-title">资金发放中</div>
      <div class="timeline-time">2026-03-19 14:00</div>
    </div>
  </div>
</div>
<style>
.timeline { padding: 16px; }
.timeline-item {
  display: flex; gap: 12px; padding-bottom: 24px;
  position: relative;
}
.timeline-item::before {
  content: ''; position: absolute; left: 5px; top: 16px;
  width: 2px; height: calc(100% - 8px); background: #e8e8e8;
}
.timeline-item:last-child::before { display: none; }
.timeline-dot {
  width: 12px; height: 12px; border-radius: 50%;
  background: #e8e8e8; flex-shrink: 0; margin-top: 4px; z-index: 1;
}
.timeline-dot.done { background: var(--theme-color, #1677FF); }
.timeline-dot.active { background: var(--theme-color, #1677FF); box-shadow: 0 0 0 4px rgba(22,119,255,0.2); }
.timeline-title { font-size: 15px; font-weight: 500; }
.timeline-time { font-size: 12px; color: #999; margin-top: 4px; }
</style>
```

---

## 4. 操作类

### 4.1 主按钮
```html
<button class="btn-primary">立即申请</button>
<style>
.btn-primary {
  width: 100%; padding: 14px 0; border: none; border-radius: 8px;
  background: var(--theme-color, #1677FF); color: #fff;
  font-size: 16px; font-weight: 600; cursor: pointer;
  transition: opacity 0.2s;
}
.btn-primary:hover { opacity: 0.85; }
.btn-primary:disabled { background: #ccc; cursor: not-allowed; }
</style>
```

### 4.2 项目申请卡片（含按钮）
```html
<div class="project-card">
  <div class="project-icon"><span class="material-icons">favorite</span></div>
  <div class="project-info">
    <div class="project-name">疾病救助</div>
    <div class="project-desc">为困难员工提供大病医疗援助</div>
  </div>
  <button class="btn-sm">立即申请</button>
</div>
<style>
.project-card {
  display: flex; align-items: center; gap: 12px;
  padding: 16px; background: #fff; border-radius: 12px;
}
.project-icon {
  width: 44px; height: 44px; border-radius: 12px;
  background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
  display: flex; align-items: center; justify-content: center;
  color: #fff;
}
.project-name { font-size: 15px; font-weight: 600; }
.project-desc { font-size: 12px; color: #999; margin-top: 4px; }
.project-info { flex: 1; }
.btn-sm {
  padding: 8px 16px; border: none; border-radius: 20px;
  background: var(--theme-color, #1677FF); color: #fff;
  font-size: 13px; cursor: pointer; white-space: nowrap;
}
</style>
```

---

## 5. 表单类

### 5.1 输入框
```html
<div class="form-group">
  <label class="form-label">姓名</label>
  <input class="form-input" type="text" placeholder="请输入姓名">
</div>
<style>
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; }
.form-input {
  width: 100%; padding: 12px; border: 1px solid #e8e8e8; border-radius: 8px;
  font-size: 15px; outline: none; box-sizing: border-box;
  transition: border-color 0.2s;
}
.form-input:focus { border-color: var(--theme-color, #1677FF); }
</style>
```

### 5.2 选择器
```html
<div class="form-group">
  <label class="form-label">项目类型</label>
  <select class="form-select">
    <option value="">请选择</option>
    <option>疾病救助</option>
    <option>助学计划</option>
  </select>
</div>
<style>
.form-select {
  width: 100%; padding: 12px; border: 1px solid #e8e8e8; border-radius: 8px;
  font-size: 15px; outline: none; background: #fff;
  appearance: none; box-sizing: border-box;
  background-image: url("data:image/svg+xml,...");
  background-repeat: no-repeat; background-position: right 12px center;
}
</style>
```

---

## 6. 状态类

### 6.1 空状态
```html
<div class="empty-state">
  <span class="material-icons" style="font-size:64px;color:#ddd">inbox</span>
  <div class="empty-title">暂无数据</div>
  <div class="empty-desc">还没有相关记录</div>
</div>
<style>
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  padding: 60px 16px; color: #999;
}
.empty-title { font-size: 16px; font-weight: 500; margin-top: 16px; color: #666; }
.empty-desc { font-size: 13px; margin-top: 8px; }
</style>
```

### 6.2 骨架屏（Loading）
```html
<div class="skeleton-card">
  <div class="skeleton skeleton-avatar"></div>
  <div style="flex:1">
    <div class="skeleton skeleton-title"></div>
    <div class="skeleton skeleton-text"></div>
  </div>
</div>
<style>
.skeleton-card { display: flex; gap: 12px; padding: 16px; }
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite; border-radius: 4px;
}
.skeleton-avatar { width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0; }
.skeleton-title { height: 16px; width: 40%; margin-bottom: 12px; }
.skeleton-text { height: 14px; width: 70%; }
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
</style>
```

### 6.3 Toast 提示
```html
<script>
function showToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
    padding:'12px 24px', background:'rgba(0,0,0,0.7)', color:'#fff',
    borderRadius:'8px', fontSize:'14px', zIndex:'9999',
    transition:'opacity 0.3s'
  });
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2000);
}
</script>
```
