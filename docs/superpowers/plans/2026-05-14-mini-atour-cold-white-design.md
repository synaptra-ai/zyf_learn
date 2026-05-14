# 冷白极简 UI 重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 BookNest 小程序全部页面从暖米色调改为冷白极简风格，首页增加混合布局（推荐大卡 + 三列网格）。

**Architecture:** 方案 A 令牌先行 — 先替换 SCSS 变量文件为冷白色系，然后逐页改造。BookCard 新增 `variant` prop 支持 featured（大卡）和 grid（小卡）两种模式。不引入新组件库，不改变业务逻辑。

**Tech Stack:** Taro 4 + React 18 + SCSS (rpx + variables)

**Spec:** `docs/superpowers/specs/2026-05-14-mini-atour-cold-white-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/assets/variables.scss` | 设计令牌：色彩、阴影全部替换为冷白体系 |
| Modify | `src/app.config.ts` | TabBar 配色 + 导航栏背景色 |
| Modify | `src/components/BookCard/index.tsx` | 新增 `variant` prop (featured/grid) |
| Modify | `src/components/BookCard/index.scss` | 两种卡片尺寸样式 |
| Modify | `src/components/StatusBadge/index.scss` | 背景色调浅，文字色加深 |
| Modify | `src/components/EmptyState/index.scss` | 按钮配色跟随新令牌 |
| Modify | `src/components/LoadingState/index.scss` | spinner 跟随新令牌 |
| Modify | `src/pages/index/index.tsx` | 混合布局：前2本大卡 + 后续三列网格 |
| Modify | `src/pages/index/index.scss` | 搜索/chips/FAB/网格布局换色 |
| Modify | `src/pages/categories/index.tsx` | 添加按钮改为文字链接风格 |
| Modify | `src/pages/categories/index.scss` | 列表行用分割线、去阴影 |
| Modify | `src/pages/me/index.scss` | 去渐变、统计数字换色、菜单分割线 |
| Modify | `src/pages/login/index.tsx` | 微信按钮加 className 支持描边样式 |
| Modify | `src/pages/login/index.scss` | 标题/按钮换色 |

---

### Task 1: 替换设计令牌

**Files:**
- Modify: `booknest/apps/mini-taro/src/assets/variables.scss`

- [ ] **Step 1: 替换 variables.scss 全部内容**

将整个文件替换为冷白色系令牌：

```scss
// ===== 冷白极简设计系统 =====

// Colors — Light (冷白极简)
$color-primary: #8B7355;
$color-primary-light: #A89580;
$color-primary-dark: #6B5A42;
$color-accent: #8B7355;

$color-success: #6B9F7D;
$color-warning: #D4956A;
$color-danger: #C45C5C;

$color-text-primary: #1A1A1A;
$color-text-secondary: #666666;
$color-text-muted: #999999;
$color-text-white: #ffffff;

$color-bg-primary: #FFFFFF;
$color-bg-secondary: #F7F7F7;
$color-bg-tertiary: #EEEEEE;
$color-bg-card: #FFFFFF;

// Colors — Dark Mode
$color-dark-bg-primary: #121212;
$color-dark-bg-secondary: #1A1A1A;
$color-dark-bg-tertiary: #2A2A2A;
$color-dark-bg-card: #1E1E1E;
$color-dark-text-primary: #F0F0F0;
$color-dark-text-secondary: #999999;
$color-dark-text-muted: #666666;
$color-dark-border: #2A2A2A;

// Spacing
$spacing-xs: 8rpx;
$spacing-sm: 16rpx;
$spacing-md: 24rpx;
$spacing-lg: 32rpx;
$spacing-xl: 48rpx;

// Border Radius
$border-radius-sm: 12rpx;
$border-radius-md: 16rpx;
$border-radius-lg: 24rpx;
$border-radius-pill: 48rpx;
$border-radius-full: 9999rpx;

// Shadows — 冷色阴影
$shadow-card: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
$shadow-fab: 0 4rpx 24rpx rgba(0, 0, 0, 0.08);
$shadow-modal: 0 16rpx 64rpx rgba(0, 0, 0, 0.1);
$shadow-sm: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
$shadow-md: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
$shadow-lg: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);

// Font
$font-size-xs: 22rpx;
$font-size-sm: 26rpx;
$font-size-md: 30rpx;
$font-size-lg: 34rpx;
$font-size-xl: 40rpx;
$font-size-xxl: 48rpx;
$font-size-hero: 56rpx;

// Transitions
$transition-fast: 150ms ease-out;
$transition-normal: 300ms ease-out;
$transition-slow: 400ms ease-out;
```

- [ ] **Step 2: 提交令牌替换**

```bash
git add src/assets/variables.scss
git commit -m "style: replace warm palette with cold-white minimalist tokens"
```

---

### Task 2: 更新 TabBar 和导航栏配色

**Files:**
- Modify: `booknest/apps/mini-taro/src/app.config.ts`

- [ ] **Step 1: 更新 app.config.ts 中的 window 和 tabBar 配色**

修改 `window` 对象：
```typescript
window: {
  backgroundTextStyle: 'light',
  navigationBarBackgroundColor: '#FFFFFF',
  navigationBarTitleText: 'BookNest',
  navigationBarTextStyle: 'black',
},
```

修改 `tabBar` 对象：
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
},
```

- [ ] **Step 2: 提交**

```bash
git add src/app.config.ts
git commit -m "style: update TabBar and nav bar to cold-white colors"
```

---

### Task 3: 更新通用组件样式

**Files:**
- Modify: `booknest/apps/mini-taro/src/components/StatusBadge/index.scss`
- Modify: `booknest/apps/mini-taro/src/components/EmptyState/index.scss`
- Modify: `booknest/apps/mini-taro/src/components/LoadingState/index.scss`

- [ ] **Step 1: 更新 StatusBadge/index.scss**

替换全部内容：
```scss
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 16rpx;
  border-radius: $border-radius-full;
  font-size: $font-size-xs;

  &--owned {
    background: rgba(139, 115, 85, 0.08);
    .status-badge__text { color: $color-primary-dark; }
  }

  &--reading {
    background: rgba(212, 149, 106, 0.08);
    .status-badge__text { color: $color-warning; }
  }

  &--finished {
    background: rgba(107, 159, 125, 0.08);
    .status-badge__text { color: $color-success; }
  }

  &--wishlist {
    background: rgba(153, 153, 153, 0.08);
    .status-badge__text { color: $color-text-secondary; }
  }

  &__text {
    font-size: $font-size-xs;
    font-weight: 500;
  }
}
```

- [ ] **Step 2: 更新 EmptyState/index.scss**

替换全部内容：
```scss
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx $spacing-xl;

  &__icon {
    font-size: 96rpx;
    margin-bottom: $spacing-lg;
  }

  &__title {
    font-size: $font-size-lg;
    font-weight: 600;
    color: $color-text-primary;
    margin-bottom: $spacing-sm;
  }

  &__desc {
    font-size: $font-size-sm;
    color: $color-text-muted;
    text-align: center;
    line-height: 1.6;
  }

  &__action {
    margin-top: $spacing-xl;
    padding: $spacing-sm $spacing-xl;
    background: $color-text-primary;
    border-radius: $border-radius-pill;

    &-text {
      color: $color-text-white;
      font-size: $font-size-md;
      font-weight: 500;
    }
  }
}
```

- [ ] **Step 3: 更新 LoadingState/index.scss**

替换全部内容：
```scss
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx $spacing-xl;

  &__spinner {
    width: 64rpx;
    height: 64rpx;
    border: 6rpx solid $color-bg-tertiary;
    border-top-color: $color-text-primary;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: $spacing-md;
  }

  &__text {
    font-size: $font-size-sm;
    color: $color-text-muted;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

- [ ] **Step 4: 提交**

```bash
git add src/components/StatusBadge/index.scss src/components/EmptyState/index.scss src/components/LoadingState/index.scss
git commit -m "style: update StatusBadge/EmptyState/LoadingState to cold-white palette"
```

---

### Task 4: BookCard 支持 featured/grid 变体

**Files:**
- Modify: `booknest/apps/mini-taro/src/components/BookCard/index.tsx`
- Modify: `booknest/apps/mini-taro/src/components/BookCard/index.scss`

- [ ] **Step 1: 更新 BookCard/index.tsx**

替换全部内容。新增 `variant` prop，默认 `'grid'`：

```tsx
import React from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { Book } from '@booknest/domain'
import { StatusBadge } from '@/components/StatusBadge'
import { getCoverThumbUrl } from '@/utils/image'
import './index.scss'

interface BookCardProps {
  book: Book
  variant?: 'featured' | 'grid'
}

export const BookCard = React.memo(function BookCard({ book, variant = 'grid' }: BookCardProps) {
  const handleOpen = () => {
    Taro.navigateTo({ url: `/sub/books/pages/detail/index?id=${book.id}` })
  }

  return (
    <View className={`book-card book-card--${variant}`} onClick={handleOpen} compileMode>
      <View className="book-card__cover-wrap">
        {book.coverUrl ? (
          <Image
            className="book-card__cover"
            src={getCoverThumbUrl(book.coverUrl)}
            mode="aspectFill"
            lazyLoad
          />
        ) : (
          <View className="book-card__cover book-card__cover--placeholder">
            <Text className="book-card__cover-text">{book.title[0]}</Text>
          </View>
        )}
      </View>
      <View className="book-card__body">
        <Text className="book-card__title">{book.title}</Text>
        {variant === 'featured' && (
          <Text className="book-card__author">{book.author}</Text>
        )}
      </View>
      <View className="book-card__badge">
        <StatusBadge status={book.status} />
      </View>
    </View>
  )
})
```

- [ ] **Step 2: 更新 BookCard/index.scss**

替换全部内容，包含 featured 和 grid 两种尺寸：

```scss
.book-card {
  position: relative;
  border-radius: $border-radius-md;
  background: $color-bg-card;
  overflow: hidden;
  transition: transform $transition-fast;

  &:active {
    transform: scale(0.98);
  }

  &__cover-wrap {
    width: 100%;
    overflow: hidden;
  }

  &__cover {
    width: 100%;
    height: 100%;
    border-radius: 0;
    background: $color-bg-tertiary;

    &--placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: $color-bg-tertiary;
    }

    &-text {
      font-weight: 700;
      color: $color-text-muted;
    }
  }

  &__body {
    padding: 12rpx 16rpx 16rpx;
  }

  &__title {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-weight: 600;
    color: $color-text-primary;
    line-height: 1.4;
  }

  &__author {
    display: block;
    margin-top: 4rpx;
    font-size: $font-size-xs;
    color: $color-text-muted;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__badge {
    position: absolute;
    top: 12rpx;
    right: 12rpx;
  }

  // featured: 大卡片
  &--featured {
    box-shadow: $shadow-card;

    .book-card__cover-wrap {
      height: 380rpx;
    }

    .book-card__cover--placeholder .book-card__cover-text {
      font-size: 72rpx;
    }

    .book-card__title {
      -webkit-line-clamp: 2;
      font-size: 28rpx;
      min-height: 78rpx;
    }
  }

  // grid: 三列小卡片
  &--grid {
    border: 1rpx solid $color-bg-tertiary;

    .book-card__cover-wrap {
      height: 260rpx;
    }

    .book-card__cover--placeholder .book-card__cover-text {
      font-size: 48rpx;
    }

    .book-card__title {
      -webkit-line-clamp: 1;
      font-size: 24rpx;
      min-height: auto;
    }
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/BookCard/index.tsx src/components/BookCard/index.scss
git commit -m "feat: add featured/grid variants to BookCard component"
```

---

### Task 5: 首页混合布局 + 样式

**Files:**
- Modify: `booknest/apps/mini-taro/src/pages/index/index.tsx`
- Modify: `booknest/apps/mini-taro/src/pages/index/index.scss`

- [ ] **Step 1: 更新 index.tsx 实现混合布局**

在 `<ScrollView scrollY className="book-grid">` 区域内，前 2 本书渲染为 featured，后续为 grid：

将 `items.map` 部分：
```tsx
{items.map((book) => (
  <BookCard key={book.id} book={book} />
))}
```

替换为：
```tsx
{items.map((book, idx) => (
  <BookCard key={book.id} book={book} variant={idx < 2 ? 'featured' : 'grid'} />
))}
```

其余代码不变。

- [ ] **Step 2: 更新 index.scss**

替换全部内容：

```scss
.page {
  min-height: 100vh;
  background: $color-bg-secondary;
  padding-bottom: 140rpx;

  &__greeting {
    padding: $spacing-xl $spacing-lg $spacing-sm;
    background: $color-bg-primary;
  }

  &__greeting-text {
    font-size: $font-size-xxl;
    font-weight: 700;
    color: $color-text-primary;
  }

  &__filters {
    padding: $spacing-sm $spacing-lg $spacing-md;
    background: $color-bg-primary;
  }

  &__search {
    width: 100%;
    height: 72rpx;
    background: $color-bg-tertiary;
    border-radius: $border-radius-pill;
    padding: 0 $spacing-md;
    font-size: $font-size-md;
    margin-bottom: $spacing-sm;
  }

  &__status-bar {
    white-space: nowrap;
    margin-bottom: $spacing-xs;
  }

  &__status-chip {
    display: inline-block;
    padding: 8rpx 24rpx;
    margin-right: $spacing-sm;
    border-radius: $border-radius-full;
    background: $color-bg-tertiary;
    font-size: $font-size-sm;
    color: $color-text-secondary;
    transition: all $transition-fast;

    &--active {
      background: $color-text-primary;
      color: $color-text-white;
    }
  }

  &__nomore {
    display: block;
    text-align: center;
    padding: $spacing-md;
    font-size: $font-size-sm;
    color: $color-text-muted;
  }
}

.book-grid {
  padding: $spacing-sm $spacing-md;
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
  max-height: calc(100vh - 340rpx);

  // featured cards: 2 columns
  .book-card--featured {
    width: calc(50% - 8rpx);
    flex-shrink: 0;
  }

  // grid cards: 3 columns
  .book-card--grid {
    width: calc(33.33% - 12rpx);
    flex-shrink: 0;
  }
}

.fab {
  position: fixed;
  right: $spacing-lg;
  bottom: 180rpx;
  width: 112rpx;
  height: 112rpx;
  border-radius: $border-radius-pill;
  background: $color-text-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $shadow-fab;
  z-index: 99;

  &__text {
    color: $color-text-white;
    font-size: $font-size-xxl;
    font-weight: 300;
    line-height: 1;
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add src/pages/index/index.tsx src/pages/index/index.scss
git commit -m "feat: homepage mixed layout with featured + grid cards, cold-white style"
```

---

### Task 6: 分类页样式

**Files:**
- Modify: `booknest/apps/mini-taro/src/pages/categories/index.tsx`
- Modify: `booknest/apps/mini-taro/src/pages/categories/index.scss`

- [ ] **Step 1: 更新 categories/index.tsx 添加按钮样式**

将添加按钮部分：
```tsx
<View className="categories__add-btn" onClick={() => setShowForm(!showForm)}>
  <Text className="categories__add-btn-text">{showForm ? '取消' : '+ 添加分类'}</Text>
</View>
```

替换为：
```tsx
<View className="categories__add-btn" onClick={() => setShowForm(!showForm)}>
  <Text className="categories__add-btn-text">{showForm ? '取消' : '+ 添加分类'}</Text>
</View>
```

(文本内容不变，样式通过 SCSS 改变为文字链接风格。)

- [ ] **Step 2: 更新 categories/index.scss**

替换全部内容：

```scss
.categories {
  min-height: 100vh;
  background: $color-bg-secondary;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-lg;
    background: $color-bg-primary;
  }

  &__title {
    font-size: $font-size-xl;
    font-weight: 700;
    color: $color-text-primary;
  }

  &__toolbar {
    display: flex;
    justify-content: flex-end;
    padding: $spacing-sm $spacing-lg;
    background: $color-bg-primary;
    border-bottom: 1rpx solid $color-bg-tertiary;
  }

  &__add-btn {
    padding: 8rpx 0;
    background: transparent;
  }

  &__add-btn-text {
    font-size: $font-size-md;
    color: $color-text-primary;
  }

  &__form {
    margin: $spacing-md $spacing-lg;
    padding: $spacing-lg;
    background: $color-bg-primary;
    border-radius: $border-radius-lg;
    border: 1rpx solid $color-bg-tertiary;
  }

  &__form-input {
    width: 100%;
    padding: $spacing-md;
    border: 1rpx solid $color-bg-tertiary;
    border-radius: $border-radius-md;
    font-size: $font-size-md;
    box-sizing: border-box;
  }

  &__color-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    margin-top: $spacing-md;
  }

  &__color-dot {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    border: 4rpx solid transparent;

    &--active {
      border-color: $color-text-primary;
      transform: scale(1.15);
    }
  }

  &__form-submit {
    margin-top: $spacing-md;
    padding: $spacing-md;
    background: $color-text-primary;
    border-radius: $border-radius-md;
    text-align: center;
  }

  &__form-submit-text {
    font-size: $font-size-md;
    color: $color-text-white;
    font-weight: 600;
  }

  &__list {
    margin: $spacing-md $spacing-lg;
    background: $color-bg-primary;
    border-radius: $border-radius-lg;
    overflow: hidden;
  }

  &__item {
    display: flex;
    align-items: center;
    padding: $spacing-md $spacing-lg;
    border-bottom: 1rpx solid $color-bg-tertiary;

    &:last-child {
      border-bottom: none;
    }

    &-dot {
      width: 24rpx;
      height: 24rpx;
      border-radius: 50%;
      flex-shrink: 0;
    }

    &-info {
      margin-left: $spacing-md;
      flex: 1;
    }

    &-name {
      display: block;
      font-size: $font-size-md;
      font-weight: 500;
      color: $color-text-primary;
    }

    &-count {
      display: block;
      margin-top: 4rpx;
      font-size: $font-size-xs;
      color: $color-text-muted;
    }

    &-delete {
      padding: 8rpx 20rpx;
      margin-left: $spacing-sm;
    }

    &-delete-text {
      font-size: $font-size-sm;
      color: $color-danger;
    }
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add src/pages/categories/index.tsx src/pages/categories/index.scss
git commit -m "style: categories page cold-white redesign with text-link button and flat list"
```

---

### Task 7: 我的页样式

**Files:**
- Modify: `booknest/apps/mini-taro/src/pages/me/index.scss`

- [ ] **Step 1: 更新 me/index.scss**

替换全部内容：

```scss
.me {
  min-height: 100vh;
  background: $color-bg-secondary;

  &__header {
    display: flex;
    align-items: center;
    padding: $spacing-xl $spacing-lg;
    background: $color-bg-primary;
  }

  &__avatar {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    background: $color-bg-tertiary;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &-text {
      font-size: $font-size-xxl;
      font-weight: 700;
      color: $color-text-muted;
    }
  }

  &__info {
    margin-left: $spacing-lg;
  }

  &__name {
    display: block;
    font-size: $font-size-xl;
    font-weight: 700;
    color: $color-text-primary;
  }

  &__email {
    display: block;
    margin-top: 8rpx;
    font-size: $font-size-sm;
    color: $color-text-muted;
  }

  &__stats {
    display: flex;
    padding: $spacing-lg;
    background: $color-bg-card;
    margin: $spacing-md $spacing-md 0;
    border-radius: $border-radius-lg;
    box-shadow: $shadow-card;
    margin-top: -$spacing-md;
    position: relative;
    z-index: 1;
  }

  &__stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;

    &-num {
      font-size: $font-size-xxl;
      font-weight: 700;
      color: $color-text-primary;
    }

    &-label {
      margin-top: 8rpx;
      font-size: $font-size-sm;
      color: $color-text-muted;
    }
  }

  &__menu {
    margin-top: $spacing-md;
    background: $color-bg-card;

    &-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: $spacing-lg;
      border-bottom: 1rpx solid $color-bg-tertiary;

      &:last-child {
        border-bottom: none;
      }
    }

    &-text {
      font-size: $font-size-md;
      color: $color-text-primary;
    }

    &-arrow {
      font-size: $font-size-xl;
      color: $color-text-muted;
    }
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/pages/me/index.scss
git commit -m "style: me page cold-white redesign, remove gradient header"
```

---

### Task 8: 登录页样式

**Files:**
- Modify: `booknest/apps/mini-taro/src/pages/login/index.tsx`
- Modify: `booknest/apps/mini-taro/src/pages/login/index.scss`

- [ ] **Step 1: 更新 login/index.tsx 微信按钮加描边 className**

将微信按钮：
```tsx
<Button
  className="login__wechat-btn"
  type="primary"
  onClick={handleWechatLogin}
  disabled={loading}
>
  微信一键登录
</Button>
```

替换为：
```tsx
<View
  className="login__wechat-btn"
  onClick={handleWechatLogin}
>
  <Text className="login__wechat-btn-text">{loading ? '登录中...' : '微信一键登录'}</Text>
</View>
```

(用 View + Text 替代 Button，避免 Button 默认样式干扰描边效果。)

- [ ] **Step 2: 更新 login/index.scss**

替换全部内容：

```scss
.login {
  min-height: 100vh;
  background: $color-bg-primary;
  padding: $spacing-xl $spacing-lg;

  &__header {
    margin-top: 120rpx;
    margin-bottom: $spacing-xl;
  }

  &__title {
    display: block;
    font-size: 56rpx;
    font-weight: 800;
    color: $color-text-primary;
  }

  &__subtitle {
    display: block;
    margin-top: 12rpx;
    font-size: $font-size-md;
    color: $color-text-muted;
  }

  &__field {
    margin-bottom: $spacing-lg;
  }

  &__label {
    display: block;
    font-size: $font-size-md;
    font-weight: 600;
    color: $color-text-primary;
    margin-bottom: $spacing-sm;
  }

  &__input {
    width: 100%;
    height: 88rpx;
    padding: 0 $spacing-md;
    background: $color-bg-secondary;
    border: 2rpx solid $color-bg-tertiary;
    border-radius: $border-radius-md;
    font-size: $font-size-md;
    box-sizing: border-box;
  }

  &__btn {
    margin-top: $spacing-xl;
    height: 88rpx;
    background: $color-text-primary;
    border-radius: $border-radius-lg;
    display: flex;
    align-items: center;
    justify-content: center;

    &-text {
      color: $color-text-white;
      font-size: $font-size-lg;
      font-weight: 600;
    }
  }

  &__wechat-btn {
    margin-top: $spacing-md;
    height: 88rpx;
    background: $color-bg-primary;
    border: 2rpx solid $color-text-primary;
    border-radius: $border-radius-lg;
    display: flex;
    align-items: center;
    justify-content: center;

    &-text {
      color: $color-text-primary;
      font-size: $font-size-lg;
      font-weight: 500;
    }
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add src/pages/login/index.tsx src/pages/login/index.scss
git commit -m "style: login page cold-white redesign with outlined wechat button"
```

---

### Task 9: 验证构建

**Files:** 无代码变更

- [ ] **Step 1: 构建 H5 版本验证**

```bash
cd /home/z/zyf_learn/booknest/apps/mini-taro && pnpm dev:h5
```

在浏览器打开 http://localhost:10086/ 验证：
- 所有页面背景为纯白/浅灰
- 文字为灰阶（近黑/中灰/浅灰）
- 首页前 2 本书为大卡片，后续为三列网格
- TabBar 选中态为近黑色
- 搜索/chips 无暖色调
- 登录页按钮为黑底/白底描边

- [ ] **Step 2: 构建微信小程序版本验证**

```bash
cd /home/z/zyf_learn/booknest/apps/mini-taro && pnpm dev:weapp
```

在微信开发者工具中导入 `dist/` 目录验证同样效果。

- [ ] **Step 3: 如有问题，修复后追加提交**
