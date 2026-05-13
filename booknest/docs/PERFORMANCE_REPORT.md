# Performance Report

## Baseline vs Optimized

| 指标 | 优化前 | 优化后 | 变化 | 说明 |
|---|---:|---:|---|---|
| 主包体积 (页面) | 196K | 100K | -49% | 分包迁移 |
| 总包体积 | 588K | 608K | +3.4% | 分包框架开销 |
| 主包页面数 | 8 | 4 | -50% | books/orders/admin 拆出 |
| 分包数 | 0 | 3 | | books/orders/admin |
| 首页预加载 | 无 | books | | preloadRule |
| BookCard | 普通组件 | React.memo + compileMode | | 减少重渲染 |
| 搜索输入 | 即时触发 | debounce 300ms | | 减少请求 |
| 图片 | 原图 | OSS 缩略图 + lazyLoad | | 减少带宽 |
| Mock 数据 | 1.5K 在主包 | 已删除 | | 主包瘦身 |
| Prerender | 无 | 首页 | | 减少白屏 |

## Package Breakdown (优化后)

| 文件 | 大小 | 说明 |
|---|---:|---|
| **主包** | | |
| taro.js | 132K | Taro 运行时 (不变) |
| app.js | 108K | 公共代码 (不变) |
| base.wxml | 60K | Taro 模板 (不变) |
| vendors.js | 36K | 第三方依赖 (不变) |
| pages/ | 100K | 4 个主包页面 |
| **分包** | | |
| sub/books/ | 56K | detail + form |
| sub/orders/ | 28K | result |
| sub/admin/ | 28K | content-security |

## Optimization Actions

| 动作 | 收益 | 风险 | 成本 |
|---|---|---|---|
| 分包拆分 | 架构清晰，后续增长可控 | 路由路径变更 | 低 |
| React.memo | 长列表减少无效渲染 | 几乎无 | 低 |
| compileMode | 长列表 item 渲染优化 | 增加少量包体积 | 低 |
| debounce | 搜索减少 API 请求 | 300ms 延迟 | 低 |
| 缩略图 | 减少图片带宽 | OSS 参数依赖 | 低 |
| lazyLoad | 减少首屏图片加载 | 几乎无 | 低 |
| preloadRule | 分包提前加载 | 占用带宽 | 低 |
| Prerender | 首页骨架秒出 | 增加构建时间 | 中 |
| 删除 mock | 主包瘦身 | 无 | 低 |

## Findings

1. 当前 608K 总体积远低于 2MB 限制，分包主要是架构治理
2. taro.js + app.js 占 240K (39%)，Taro 框架基础开销无法显著减小
3. 分包后主包页面从 8 个减少到 4 个，首屏只需加载核心入口
4. Prerender 实验成功，首页预渲染骨架可用
5. CompileMode 已在 BookCard 启用，后续可观察长列表性能
