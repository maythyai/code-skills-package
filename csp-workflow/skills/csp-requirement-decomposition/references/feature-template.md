# Feature 拆解模板与示例

## 完整 Feature YAML 模板

```yaml
feature:
  id: "F-{DOMAIN}-{SEQ}"
  name: ""
  domain: ""
  
  # === 用户视角 ===
  user_story: "As a [role], I want [action], so that [value]"
  acceptance_criteria:
    - "Given [context], when [action], then [result]"
    - "Given [context], when [action], then [result]"
  
  # === 边界 ===
  scope:
    includes: []
    excludes: []
  
  # === 前端 ===
  frontend:
    pages:
      - name: ""
        route: ""
        layout: ""
    components: []
    interactions: []
    states: [loading, empty, error, success]
  
  # === 后端 ===
  backend:
    endpoints:
      - method: GET
        path: "/api/v1/xxx"
        description: ""
    business_logic: []
    integrations: []
    async_tasks: []
  
  # === 数据 ===
  data_entities:
    - name: ""
      key_fields: []
  data_operations: []
  
  # === 技术维度 ===
  tech_dimensions:
    needs_database: true
    needs_cache: false
    needs_queue: false
    needs_ai: false
    needs_vector_store: false
    needs_realtime: false
    needs_file_storage: false
    needs_search: false
    needs_scheduler: false
    needs_notification: false
  
  # === NFR ===
  nfr:
    performance: ""
    security: ""
    scalability: ""
  
  # === 管理 ===
  priority: P0  # P0/P1/P2/P3
  complexity: M  # S/M/L/XL
  depends_on: []
  risks: []
  assumptions: []
```

## 示例：电商系统拆解

### 域划分
```
电商系统
├── 域 A: 用户与认证
├── 域 B: 商品管理
├── 域 C: 订单与支付
├── 域 D: 搜索与推荐
└── 域 E: 运营与数据
```

### Feature 示例

```yaml
feature:
  id: "F-C-1"
  name: "订单创建与支付"
  domain: "订单与支付"
  
  user_story: "As a buyer, I want to place an order and pay securely, so that I can receive my products"
  acceptance_criteria:
    - "Given a cart with items, when user clicks checkout, then order is created with status 'pending_payment'"
    - "Given a pending order, when payment succeeds, then order status changes to 'paid' and inventory is decremented"
    - "Given a pending order, when payment fails, then order remains pending and user sees error with retry option"
  
  scope:
    includes: [订单创建, 支付集成, 库存扣减, 订单状态机]
    excludes: [退款, 物流追踪, 发票]
  
  frontend:
    pages:
      - name: 结算页
        route: /checkout
        layout: CheckoutLayout
      - name: 支付结果页
        route: /payment/result
        layout: MinimalLayout
    components: [OrderSummary, PaymentMethodSelector, AddressForm, CountdownTimer]
    interactions:
      - "选择支付方式 → 展示对应支付表单"
      - "确认支付 → loading → 跳转结果页"
  
  backend:
    endpoints:
      - method: POST
        path: /api/v1/orders
        description: 创建订单
      - method: POST
        path: /api/v1/orders/:id/pay
        description: 发起支付
      - method: POST
        path: /api/v1/webhooks/payment
        description: 支付回调(公开)
    business_logic:
      - "库存预占 → 创建订单 → 发起支付 → 确认/释放"
      - "订单超时未支付自动取消(30min)"
    async_tasks:
      - "支付超时检测(定时扫描)"
      - "支付成功后发送确认通知"
  
  data_entities:
    - name: orders
      key_fields: [id, user_id, status, total_amount, payment_method, paid_at]
    - name: order_items
      key_fields: [id, order_id, product_id, quantity, unit_price]
  
  tech_dimensions:
    needs_database: true
    needs_cache: true       # 库存缓存
    needs_queue: true       # 异步通知、超时检测
    needs_ai: false
    needs_vector_store: false
    needs_realtime: false
    needs_file_storage: false
    needs_search: false
    needs_scheduler: true   # 超时取消
    needs_notification: true
  
  nfr:
    performance: "订单创建 < 500ms, 支付回调处理 < 1s"
    security: "支付金额服务端计算, webhook 签名验证, 幂等处理"
    scalability: "支持 1000 并发下单"
  
  priority: P0
  complexity: L
  depends_on: ["F-A-1", "F-B-1"]
  risks:
    - "支付网关集成复杂度高于预期"
    - "并发库存扣减可能超卖"
  assumptions:
    - "使用第三方支付网关(Stripe/支付宝)"
    - "单币种(CNY)"
```

## 拆解质量检查清单

- [ ] 每个 Feature 有明确的 user_story
- [ ] 验收标准是 falsifiable 的（可验证真假）
- [ ] scope 的 includes/excludes 无歧义
- [ ] 前后端边界清晰（哪些是前端做，哪些是后端做）
- [ ] 技术维度标记完整（不遗漏 queue/ai/search 等）
- [ ] 依赖关系无环
- [ ] 优先级分配合理（P0 不超过总数 40%）
- [ ] 隐藏需求已检查（认证、错误处理、分页等）
