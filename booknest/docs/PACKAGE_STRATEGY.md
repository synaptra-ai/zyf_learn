# Package Strategy

## Goals

- 主包只保留启动必需能力（入口页 + 登录 + 分类 + 我的）
- 书籍、订单、Admin 分业务分包
- 支付和内容安全不污染主包
- 所有分包跳转路径可维护

## Package Map

| Package | Pages | Why |
|---|---|---|
| main | index/login/me/categories | 启动入口 |
| sub/books | detail/form | 高频但非启动必需 |
| sub/orders | result | 支付链路 |
| sub/admin | content-security | 管理能力，仅管理员使用 |

## Preload Strategy

| 当前页面 | 预加载 | 原因 |
|---|---|---|
| 首页 | sub/books | 用户大概率点击详情 |
| 我的页 | sub/admin | 管理员使用 |

## Budgets

| Package | Budget | Current | Status |
|---|---:|---:|---|
| main | <= 1.5MB | ~448K | OK |
| sub/books | <= 1.5MB | 56K | OK |
| sub/orders | <= 1.5MB | 28K | OK |
| sub/admin | <= 1.5MB | 28K | OK |
| **总计** | <= 20MB | ~608K | OK |

## Route Map

| From | To | Path |
|---|---|---|
| 首页 | 书籍详情 | `/sub/books/pages/detail/index?id=xxx` |
| 首页 | 添加书籍 | `/sub/books/pages/form/index` |
| 书籍详情 | 编辑书籍 | `/sub/books/pages/form/index?id=xxx` |
| 书籍表单 | 书籍详情 | `/sub/books/pages/detail/index?id=xxx` |
| 我的页 | 内容审核 | `/sub/admin/pages/content-security/index` |

## Subpackage Rules

1. 分包页面不能引用主包组件以外的文件（跨包引用会合并到主包）
2. 分包可以引用主包的 stores、services、utils（公共代码在 app.js）
3. 分包之间不能互相引用
4. 新页面优先放到对应分包，主包只放 TabBar 页面和登录
