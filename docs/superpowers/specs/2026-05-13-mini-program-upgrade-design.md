# BookNest 小程序全面升级设计文档

> 日期：2026-05-13
> 范围：UI 视觉升级 + 阅读统计 + 社交分享 + 用户体验优化
> 风格参考：亚朵小程序（现代简约 + 人文温暖）

## 设计理念

温暖、人文、阅读感。以亚朵酒店小程序为视觉参考，打造一个有温度的读书应用。

## 一、设计系统

### 色板

| 用途 | 色值 | 说明 |
|------|------|------|
| 主色 | `#C4956A` | 暖棕/琥珀色，温暖有质感 |
| 背景 | `#FAF8F5` | 奶白色，比纯白暖 |
| 卡片 | `#FFFFFF` | 纯白，悬浮在暖色背景上 |
| 文字主 | `#2D2A26` | 深棕黑 |
| 文字副 | `#6B6560` | 中灰棕 |
| 文字辅 | `#A09A94` | 浅灰棕 |
| 成功 | `#6BAF8D` | 柔和绿 |
| 警告 | `#E8967A` | 柔和橙 |
| 危险 | `#D46B6B` | 柔和红 |
| 强调 | `#D4A574` | 金棕色，高亮/标签/数字 |

### 暗色模式

| 用途 | 色值 | 说明 |
|------|------|------|
| 背景 | `#1A1816` | 深棕黑 |
| 卡片 | `#2A2622` | 深棕 |
| 文字主 | `#F0ECE8` | 暖白 |
| 文字副 | `#9A9490` | 灰棕 |

### 形状

| 元素 | 圆角 | 说明 |
|------|------|------|
| 卡片 | `24rpx` | 柔和圆润 |
| 按钮 | `48rpx` | 胶囊形 |
| 输入框 | `16rpx` | 微圆角 |
| 大图片 | `20rpx` | 圆润图片 |

### 阴影

| 元素 | 值 | 说明 |
|------|------|------|
| 卡片 | `0 4rpx 24rpx rgba(45, 42, 38, 0.06)` | 柔和轻浮 |
| 悬浮按钮 | `0 8rpx 32rpx rgba(196, 149, 106, 0.2)` | 主色晕染 |
| 弹窗 | `0 16rpx 64rpx rgba(45, 42, 38, 0.12)` | 层次分明 |

### 动画

| 场景 | 效果 | 时长 |
|------|------|------|
| 页面过渡 | fade-slide | `300ms ease-out` |
| 卡片点击 | `scale(0.98)` 微缩 | `150ms` |
| 图片加载 | `opacity 0→1` 渐显 | `400ms` |
| 列表项进入 | stagger fade-in | 每项 `50ms` 延迟 |
| 下拉刷新 | 旋转 + 弹回 | 弹性曲线 |

## 二、组件体系

### BookCard（大图风格）

- 封面图占卡片 60% 高度，`20rpx` 圆角
- 底部白色区域：书名（加粗 `28rpx`）、作者（灰棕 `24rpx`）
- 右下角状态小标签（胶囊形，对应状态色）
- 长按 → 操作菜单（编辑/删除/改状态）
- 点击缩放反馈 `scale(0.98)`

### StatsCard（统计卡片）

- 大号数字 (`48rpx` 加粗) + 标签 (`24rpx` 灰棕)
- 微妙渐变背景（主色到白色）
- 右侧可选图标或迷你图表

### ProgressRing（环形进度条）

- SVG/Canvas 环形，主色填充
- 中间显示百分比数字
- 尺寸可配置：小 (`64rpx`) / 中 (`120rpx`) / 大 (`200rpx`)

### TabBar（4 Tab）

- 书架、发现、统计、我的
- 线性图标，选中态主色填充
- 未读/待处理用小红点标记

### 骨架屏组件

- 脉冲闪烁动画
- 按组件类型预设形状（卡片/列表/详情）
- 使用背景色 `#F0ECE8`（暖灰）

## 三、页面设计

### 1. 书架首页（书架 Tab）

**布局（从上到下）：**

1. 顶部问候区：`下午好，读者` + 简短统计条 `你已读 23 本书 · 本月 +3`
2. 搜索栏：胶囊形，居中，占满宽度减 padding
3. 筛选条：横向滑动状态标签（胶囊形，选中态填充主色）
4. 书籍网格：2 列，大图 BookCard，间距 `16rpx`
5. FAB：右下角主色胶囊按钮 `+`

**交互：**
- 下拉刷新
- 触底加载更多
- 长按卡片 → 操作菜单
- 左滑卡片 → 快捷状态切换

### 2. 发现页（新增 Tab）

**布局：**

1. **阅读打卡卡片**：大卡片，显示连续打卡天数 + 今日打卡按钮 + 日历迷你图
2. **推荐书籍**：横滑大图轮播，自动播放
3. **热门书单**：横滑小卡片，显示封面+标题+阅读人数
4. **好友动态**：简短卡片流（头像+昵称+读了什么+笔记摘要）

**数据来源：**
- 打卡：Checkin API
- 推荐：基于用户阅读偏好的简单推荐算法（同分类高分书）
- 热门：全站阅读量排名
- 动态：关注用户的最近读书活动（初期可用 mock 数据）

### 3. 统计页（新增 Tab）

**布局：**

1. **月度概览卡片**：本月读完 X 本 / 目标 Y 本，环形进度条
2. **书籍状态分布**：环形图（在购/在读/已读/想读）
3. **分类阅读统计**：横向柱状图，每个分类一本书的数量
4. **阅读日历热力图**：12 个月 x 当月天数网格，颜色深浅表示阅读活跃度
5. **年度总结区**：总藏书、总已读、最长连续、最爱分类

**图表方案：** 使用 Canvas 自绘（Taro Canvas 2D），不引入重型图表库，控制包体积。

### 4. 我的页（我的 Tab）

**布局：**

1. **头像区**：大头像 + 昵称 + 个性签名/阅读标语
2. **数据卡片行**：3 个等宽小卡片 `23本藏书` `12本已读` `15天连续`
3. **功能列表**：
   - 阅读目标
   - 读书笔记
   - 我的分享
   - Workspace 切换
   - 暗色模式开关
   - 退出登录

### 5. 书籍详情页

**布局：**

1. **顶部大封面区**（占屏幕 40%）：
   - 封面居中展示
   - 背景取封面主色模糊化
   - 书名 + 作者叠加在底部
2. **信息区**：分类标签、ISBN、页数、出版日期
3. **阅读进度条**：横向进度条 + 百分比 + 更新按钮
4. **笔记区**：显示已有笔记列表 + 添加笔记按钮
5. **评分 + 评论**：星级评分 + 评论列表
6. **相关推荐**：底部横滑小卡片

### 6. 分类页

**布局：**
- 网格布局（3 列）
- 每个分类：圆角方形图标（带颜色标识）+ 名称 + 书籍数量
- 右上角添加按钮

## 四、功能清单

### UI 视觉升级（5 项）

| # | 功能 | 实现方案 |
|---|------|---------|
| 1 | 亚朵风格设计系统 | SCSS variables 全局变量文件，所有组件统一引用 |
| 2 | BookCard 大图重设计 | 新 BookCard 组件，2 列网格布局 |
| 3 | 页面过渡动画 | Taro 页面配置 + CSS transition |
| 4 | 骨架屏加载 | Skeleton 组件 + 各页面 loading 态 |
| 5 | 暗色模式 | SCSS dark theme + 系统跟随 + 手动切换 |

### 阅读统计/数据可视化（4 项）

| # | 功能 | 实现方案 |
|---|------|---------|
| 6 | 阅读统计仪表盘 | 新统计页 + Canvas 图表自绘 |
| 7 | 阅读进度追踪 | ReadingProgress 模型 + 进度条组件 |
| 8 | 阅读日历热力图 | Canvas 网格绘制 + 打卡数据聚合 |
| 9 | 阅读目标 + 打卡 | ReadingGoal 模型 + Checkin 模型 + 每日提醒 |

### 社交/分享功能（3 项）

| # | 功能 | 实现方案 |
|---|------|---------|
| 10 | 微信分享增强 | onShareAppMessage 自定义分享卡片 + Canvas 生成分享图 |
| 11 | 读书笔记 | Note 模型 + 笔记列表 + 添加/编辑表单 |
| 12 | 阅读打卡动态 | Checkin 成功后生成动态卡片，发现页展示 |

### 用户体验优化（4 项）

| # | 功能 | 实现方案 |
|---|------|---------|
| 13 | 搜索增强 | 搜索历史 localStorage + 热门搜索 + 模糊匹配 |
| 14 | 骨架屏 + 离线缓存 | Taro.setStorage 缓存已读书籍 + 骨架屏展示 |
| 15 | 手势操作 | Taro MovableView 左滑删除 + 长按多选 |
| 16 | 表单体验优化 | 分步表单 + 实时校验 + 草稿自动保存 |

## 五、后端 API 新增

### 阅读进度

```
GET    /api/v1/books/:id/progress     — 获取阅读进度
PUT    /api/v1/books/:id/progress     — 更新阅读进度 { percentage }
```

### 读书笔记

```
POST   /api/v1/notes                  — 创建笔记 { bookId, content, images[], pageNumber }
GET    /api/v1/books/:id/notes        — 获取书籍笔记列表
PUT    /api/v1/notes/:id              — 更新笔记
DELETE /api/v1/notes/:id              — 删除笔记
```

### 统计

```
GET    /api/v1/stats/dashboard        — 仪表盘数据（状态分布、分类统计、月度汇总）
GET    /api/v1/stats/heatmap          — 日历热力图数据 { year }
```

### 阅读目标

```
GET    /api/v1/stats/goals            — 获取当前目标
POST   /api/v1/stats/goals            — 创建目标 { type, year, month, targetCount }
PUT    /api/v1/stats/goals/:id        — 更新目标
```

### 打卡

```
POST   /api/v1/checkins               — 打卡 { bookId? }
GET    /api/v1/checkins/streak        — 获取连续打卡天数
GET    /api/v1/checkins/history       — 打卡历史 { month }
```

### 推荐

```
GET    /api/v1/books/recommended      — 推荐书籍（基于阅读偏好）
GET    /api/v1/books/popular          — 热门书籍排行
```

## 六、数据模型新增

### ReadingProgress

```prisma
model ReadingProgress {
  id         String   @id @default(cuid())
  userId     String   @map("user_id")
  bookId     String   @map("book_id")
  percentage Int      @default(0)    // 0-100
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt     @map("updated_at")

  user User @relation(fields: [userId], references: [id])
  book Book @relation(fields: [bookId], references: [id])

  @@unique([userId, bookId])
  @@map("reading_progress")
}
```

### Note

```prisma
model Note {
  id         String   @id @default(cuid())
  userId     String   @map("user_id")
  bookId     String   @map("book_id")
  content    String   // 笔记内容
  images     String[] // 图片 URL 数组
  pageNumber Int?     @map("page_number")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt     @map("updated_at")

  user User @relation(fields: [userId], references: [id])
  book Book @relation(fields: [bookId], references: [id])

  @@map("notes")
}
```

### ReadingGoal

```prisma
model ReadingGoal {
  id           String   @id @default(cuid())
  userId       String   @map("user_id")
  type         String   // "YEARLY" | "MONTHLY"
  year         Int
  month        Int?     // 仅 MONTHLY
  targetCount  Int      @map("target_count")
  currentCount Int      @default(0) @map("current_count")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt     @map("updated_at")

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, type, year, month])
  @@map("reading_goals")
}
```

### Checkin

```prisma
model Checkin {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  bookId    String?  @map("book_id")
  date      DateTime // 打卡日期
  createdAt DateTime @default(now()) @map("created_at")

  user User  @relation(fields: [userId], references: [id])
  book Book? @relation(fields: [bookId], references: [id])

  @@unique([userId, date])
  @@map("checkins")
}
```

## 七、文件结构变化

### 新增文件

```
booknest/apps/mini-taro/src/
├── styles/
│   ├── variables.scss          # 设计系统变量（色板/间距/圆角/阴影）
│   ├── dark.scss               # 暗色模式覆盖
│   ├── animations.scss         # 全局动画定义
│   └── mixins.scss             # 常用 SCSS mixins
├── components/
│   ├── BookCard/               # 大图风格重写
│   ├── StatsCard/              # 统计卡片
│   ├── ProgressRing/           # 环形进度条
│   ├── Skeleton/               # 骨架屏
│   ├── Heatmap/                # 日历热力图
│   ├── NoteCard/               # 笔记卡片
│   └── SearchBar/              # 增强搜索栏
├── pages/
│   ├── discover/               # 发现页（新 Tab）
│   └── stats/                  # 统计页（新 Tab）
├── services/
│   ├── notes.ts                # 笔记 API
│   ├── stats.ts                # 统计 API
│   ├── checkin.ts              # 打卡 API
│   └── goals.ts                # 目标 API
├── hooks/
│   ├── use-notes.ts            # 笔记 hooks
│   ├── use-stats.ts            # 统计 hooks
│   ├── use-checkin.ts          # 打卡 hooks
│   ├── use-reading-progress.ts # 阅读进度 hooks
│   └── use-search.ts           # 搜索增强 hooks
└── stores/
    └── theme-store.ts          # 主题/暗色模式 store

booknest/backend/src/
├── controllers/
│   ├── note.controller.ts
│   ├── stats.controller.ts
│   └── checkin.controller.ts
├── services/
│   ├── note.service.ts
│   ├── stats.service.ts
│   └── checkin.service.ts
├── routes/
│   ├── note.routes.ts
│   ├── stats.routes.ts
│   └── checkin.routes.ts
└── schemas/
    ├── note.schema.ts
    ├── stats.schema.ts
    └── checkin.schema.ts
```

### 修改文件

- `mini-taro/src/app.config.ts` — 新增 Tab 页面路由
- `mini-taro/src/app.scss` — 引入全局设计系统
- 所有现有页面 `.scss` — 替换为新色板
- `mini-taro/src/components/BookCard/` — 大图重写
- `backend/prisma/schema.prisma` — 新增 4 个模型
- `backend/src/routes/index.ts` — 注册新路由

## 八、实施顺序

1. **Phase 1：设计系统** — SCSS variables + 暗色模式 + 动画系统
2. **Phase 2：组件升级** — BookCard 重写 + 骨架屏 + SearchBar + ProgressRing
3. **Phase 3：后端扩展** — Prisma migration + 新 API（进度/笔记/统计/打卡）
4. **Phase 4：页面改造** — 书架首页 + 分类页 + 我的页 + 详情页
5. **Phase 5：新页面** — 发现页 + 统计页
6. **Phase 6：交互优化** — 手势操作 + 表单优化 + 离线缓存 + 分享增强
