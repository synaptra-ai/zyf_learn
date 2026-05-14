# BookNest Mini — 冷白极简 UI 重设计

> 风格方向：亚朵式"自然闲寂" + 冷白极简（纯白底 + 黑灰文字 + 暖棕仅作点缀）

## 1. 设计令牌

### 色彩

```scss
// 点缀色（克制使用：按钮、高亮标签、FAB）
$color-primary: #8B7355;
$color-primary-light: #A89580;
$color-primary-dark: #6B5A42;

// 语义色（降低饱和度）
$color-success: #6B9F7D;
$color-warning: #D4956A;
$color-danger: #C45C5C;

// 文字 — 纯灰阶
$color-text-primary: #1A1A1A;
$color-text-secondary: #666666;
$color-text-muted: #999999;
$color-text-white: #FFFFFF;

// 背景 — 纯白体系
$color-bg-primary: #FFFFFF;
$color-bg-secondary: #F7F7F7;
$color-bg-tertiary: #EEEEEE;
$color-bg-card: #FFFFFF;

// 暗色模式（保持，微调灰阶）
$color-dark-bg-primary: #121212;
$color-dark-bg-secondary: #1A1A1A;
$color-dark-bg-tertiary: #2A2A2A;
$color-dark-bg-card: #1E1E1E;
$color-dark-text-primary: #F0F0F0;
$color-dark-text-secondary: #999999;
$color-dark-text-muted: #666666;
$color-dark-border: #2A2A2A;
```

### 阴影

```scss
$shadow-card: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
$shadow-fab: 0 4rpx 24rpx rgba(0, 0, 0, 0.08);
$shadow-sm: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
$shadow-md: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
$shadow-lg: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
```

### TabBar

```typescript
tabBar: {
  color: '#999999',
  selectedColor: '#1A1A1A',
  backgroundColor: '#FFFFFF',
  borderStyle: 'white',
  list: [
    { pagePath: 'pages/index/index', text: '书架' },
    { pagePath: 'pages/categories/index', text: '分类' },
    { pagePath: 'pages/me/index', text: '我的' },
  ],
}
```

### 导航栏

```typescript
window: {
  navigationBarBackgroundColor: '#FFFFFF',
  navigationBarTitleText: 'BookNest',
  navigationBarTextStyle: 'black',
}
```

## 2. 首页 — 混合布局

### 结构

- 顶部：问候语（纯白背景，大标题）
- 搜索栏：浅灰圆角输入框
- 筛选条：药丸状 chips（灰底，选中态用近黑色）
- 推荐区：前 2 本书用大卡片（2 列布局）
- 书架区：后续书籍用三列紧凑网格

### 大卡片（推荐区）

```
宽度: calc(50% - 8rpx)
封面高度: 380rpx
圆角: 16rpx
阴影: $shadow-card
内容: 封面 + 书名(2行) + 作者 + 状态标签(右上角)
```

### 三列网格卡片

```
宽度: calc(33.33% - 12rpx)
封面高度: 260rpx
圆角: 12rpx
无阴影，用 1rpx 浅灰边框
内容: 封面 + 书名(1行省略) + 小号状态标签
```

### FAB

- 纯黑圆形 (#1A1A1A)，白色加号
- 位置: fixed, right 32rpx, bottom 180rpx
- 大小: 112rpx × 112rpx

### 涉及文件

- `src/assets/variables.scss` — 令牌替换
- `src/pages/index/index.tsx` — 混合布局逻辑
- `src/pages/index/index.scss` — 样式更新
- `src/components/BookCard/index.tsx` — 支持 featured/grid 两种模式
- `src/components/BookCard/index.scss` — 两种样式
- `src/app.config.ts` — TabBar 配色

## 3. 分类页

### 设计

- 顶栏：纯白背景，黑色标题，右侧 WorkspaceSwitcher
- 添加按钮：文字链接风格（"添加分类"），无边框无底色，仅文字 + 号
- 表单：白底卡片，浅灰输入框，无阴影
- 列表：白底行 + 1rpx 浅灰分割线，去掉卡片阴影和圆角
- 每行：色点 + 分类名 + 数量 + 右箭头

### 涉及文件

- `src/pages/categories/index.tsx` — 添加按钮样式调整
- `src/pages/categories/index.scss` — 列表行样式、按钮样式

## 4. 我的页

### 设计

- 头像区：白底（无渐变），浅灰圆形头像，近黑名字，灰色邮箱
- 统计卡：白底 + 极轻阴影，数字用近黑色（#1A1A1A），标签用中灰
- 菜单：白底列表，1rpx 浅灰分割线，右侧灰色箭头 "›"
- 退出登录：红色文字

### 涉及文件

- `src/pages/me/index.tsx` — 无结构变化
- `src/pages/me/index.scss` — 去渐变、换色

## 5. 登录页

### 设计

- 背景：纯白
- 标题 "BookNest"：近黑 (#1A1A1A)，font-weight 800，56rpx
- 副标题：中灰 (#999999)
- 输入框：浅灰底 (#F7F7F7)，2rpx #EEEEEE 边框
- 邮箱登录按钮：纯黑实心 (#1A1A1A)，白字，圆角 16rpx，高 88rpx
- 微信登录按钮：白底 + 2rpx #1A1A1A 描边，黑字

### 涉及文件

- `src/pages/login/index.tsx` — 微信按钮加 className 描边样式
- `src/pages/login/index.scss` — 换色

## 6. 通用组件更新

### BookCard

新增 `variant` prop:
- `featured`：大卡片，380rpx 封面，书名 2 行，用于首页推荐区
- `grid`：小卡片，260rpx 封面，书名 1 行省略，用于三列网格

### StatusBadge

- 背景色改为极浅灰版本（语义色 10% opacity）
- 文字色改为对应语义色加深

### 涉及文件

- `src/components/BookCard/index.tsx`
- `src/components/BookCard/index.scss`
- `src/components/StatusBadge/index.scss`

## 7. 实现步骤

1. 替换 `variables.scss` 令牌
2. 更新 `app.config.ts` TabBar 配色
3. 改 BookCard 支持 featured/grid 变体
4. 改首页：混合布局 + 搜索 + chips 换色
5. 改分类页：列表行 + 添加按钮
6. 改我的页：去渐变 + 统计卡换色
7. 改登录页：标题 + 按钮换色
8. H5 + WeApp 双端验证
