# Web to Mini Migration Map

BookNest Web → 微信小程序迁移对照表。

## 页面迁移

| Web 页面 | 小程序页面 | 优先级 | 迁移策略 | 状态 |
|---|---|---|---|---|
| `/books` (BookList) | `pages/index/index` | P0 | Taro 重写 UI，复用类型和 API | Done |
| `/books/:id` (BookDetail) | `pages/books/detail/index` | P0 | Taro 重写 UI，复用 detail hook | Done |
| `/books/new` + `/books/:id/edit` | `pages/books/form/index` | P0 | 表单重写，校验逻辑复用 | Done |
| `/categories` | `pages/categories/index` | P1 | 移动端简化 | Done |
| `/` (登录后首页) | `pages/index/index` | P0 | 合并到 TabBar 首页 | Done |
| `/login` | `pages/login/index` | P0 | 占位页，Day 13 接入微信登录 | Done |
| `/stats` | `pages/me/index` 内嵌 | P2 | 简化统计放到"我的"页 | Done |
| `/members` | 分包 members | P1 | Day 14 迁移 | Todo |
| `/activities` | 分包 activities | P1 | Day 15 迁移 | Todo |
| `/data-tools` | 分包 data-tools | P2 | Day 16 迁移 | Todo |

## 组件迁移

| Web 组件 | 小程序组件 | 直接复用 | 说明 |
|---|---|---|---|
| BookCard | BookCard | 否 | JSX 结构可参考，DOM 标签全部替换为 Taro 组件 |
| Badge (CVA) | StatusBadge | 否 | 从 CVA variants 改为 className 映射 |
| EmptyState | EmptyState | 部分 | 样式用 rpx 重写 |
| LoadingState (Skeleton) | LoadingState | 部分 | 简化为 CSS spinner，后续可加 Skeleton |
| Button | SafeAreaButton | 否 | 增加底部安全区适配 |
| Modal | Taro.showModal / 自定义 | 否 | 小程序弹层使用平台能力 |
| Toast | Taro.showToast | 否 | 使用平台能力 |
| BookListSkeleton | — | — | 待迁移 |

## 状态迁移

| Web 状态 | 小程序状态 | 说明 |
|---|---|---|
| token (useAuthStore) | auth store | storage adapter 改为 Taro.getStorage |
| activeWorkspaceId | workspace store | 请求头继续带 X-Workspace-Id |
| React Query cache | React Query cache | Day 13 接入 Taro request adapter |
| theme (useThemeStore) | 暂不迁移 | 小程序跟随系统主题 |

## API 迁移

| Web 层 | 小程序层 | 说明 |
|---|---|---|
| Axios + 拦截器 | Taro.request adapter | Day 13 替换 |
| React Query hooks | React Query hooks | query key 设计复用 |
| api-client.ts | services/request.ts | Day 13 新建 |

## 样式迁移

| Web 样式 | 小程序样式 | 说明 |
|---|---|---|
| Tailwind CSS class | rpx + SCSS | 参考设计 token 变量，不强行照搬 |
| px 像素 | rpx (750 设计稿) | Taro pxtransform 自动转换 |
| fixed bottom bar | env(safe-area-inset-bottom) | 需要适配安全区 |
| grid 响应式 | flex 布局 | 小程序不需要响应式断点 |

## 迁移规则

1. **DOM 标签替换**: `div→View`, `span/p→Text`, `img→Image`, `button→Button`, `input→Input`, `textarea→Textarea`
2. **路由替换**: `react-router-dom` → `Taro.navigateTo / navigateBack / switchTab`
3. **平台 API**: `window.localStorage` → `Taro.getStorage / setStorage`
4. **网络请求**: `axios` → `Taro.request`（Day 13）
5. **弹层**: 自定义 Modal/Toast → `Taro.showModal / showToast`
