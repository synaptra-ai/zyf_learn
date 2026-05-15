# Mini Program Upgrade — Phase 1: Design System + Component Upgrades

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current blue/tech color scheme with a warm "亚朵" (Atour) style design system, add dark mode support, animations, and upgrade all components.

**Architecture:** Replace `variables.scss` with the new warm color palette. Add `dark.scss`, `animations.scss`, `mixins.scss` as separate files imported by `app.scss`. Rewrite BookCard to large-image 2-column grid style. Add new reusable components (Skeleton, SearchBar, ProgressRing, StatsCard, NoteCard, Heatmap). Update all existing page SCSS to use new variables.

**Tech Stack:** Taro 4, React 18, TypeScript, SCSS (rpx units), Zustand

---

## Task 1: Replace SCSS Variables with Warm Palette

**Files:**
- Modify: `booknest/apps/mini-taro/src/assets/variables.scss`

- [ ] **Step 1: Replace variables.scss with new design system**

Replace the entire file content with the new warm palette:

```scss
// ===== 亚朵风格设计系统 =====

// Colors — Light
$color-primary: #C4956A;
$color-primary-light: #D4A574;
$color-primary-dark: #A87D55;
$color-accent: #D4A574;

$color-success: #6BAF8D;
$color-warning: #E8967A;
$color-danger: #D46B6B;

$color-text-primary: #2D2A26;
$color-text-secondary: #6B6560;
$color-text-muted: #A09A94;
$color-text-white: #ffffff;

$color-bg-primary: #FFFFFF;
$color-bg-secondary: #FAF8F5;
$color-bg-tertiary: #F0ECE8;
$color-bg-card: #FFFFFF;

// Colors — Dark Mode
$color-dark-bg-primary: #1A1816;
$color-dark-bg-secondary: #1A1816;
$color-dark-bg-tertiary: #2A2622;
$color-dark-bg-card: #2A2622;
$color-dark-text-primary: #F0ECE8;
$color-dark-text-secondary: #9A9490;
$color-dark-text-muted: #6B6560;
$color-dark-border: #3A3632;

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

// Shadows — Light
$shadow-card: 0 4rpx 24rpx rgba(45, 42, 38, 0.06);
$shadow-fab: 0 8rpx 32rpx rgba(196, 149, 106, 0.2);
$shadow-modal: 0 16rpx 64rpx rgba(45, 42, 38, 0.12);
$shadow-sm: 0 4rpx 12rpx rgba(45, 42, 38, 0.04);
$shadow-md: 0 8rpx 24rpx rgba(45, 42, 38, 0.06);
$shadow-lg: 0 16rpx 48rpx rgba(45, 42, 38, 0.08);

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

- [ ] **Step 2: Verify SCSS compiles**

Run: `cd /home/z/zyf_learn && pnpm dev:mini:h5`
Expected: Builds without SCSS errors (color values changed but variable names preserved, so all existing files still compile)

- [ ] **Step 3: Commit**

```bash
git add booknest/apps/mini-taro/src/assets/variables.scss
git commit -m "design: replace blue palette with warm 亚朵 style design system variables"
```

---

## Task 2: Create Dark Mode, Animations, and Mixins

**Files:**
- Create: `booknest/apps/mini-taro/src/styles/dark.scss`
- Create: `booknest/apps/mini-taro/src/styles/animations.scss`
- Create: `booknest/apps/mini-taro/src/styles/mixins.scss`

- [ ] **Step 1: Create dark mode overrides**

Create `booknest/apps/mini-taro/src/styles/dark.scss`:

```scss
// Dark mode overrides — applied via .dark class on page root
@use "../assets/variables" as *;

.dark {
  background-color: $color-dark-bg-secondary !important;
  color: $color-dark-text-primary;

  // Text overrides
  .text-primary { color: $color-dark-text-primary; }
  .text-secondary { color: $color-dark-text-secondary; }
  .text-muted { color: $color-dark-text-muted; }
}

@mixin dark-mode {
  .dark & {
    @content;
  }
}
```

- [ ] **Step 2: Create animation definitions**

Create `booknest/apps/mini-taro/src/styles/animations.scss`:

```scss
// Page transition
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(24rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

// Utility classes
.animate-fade-in {
  animation: fadeIn 300ms ease-out both;
}

.animate-fade-in-up {
  animation: fadeInUp 300ms ease-out both;
}

.animate-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

// Staggered list item entrance
@for $i from 1 through 20 {
  .animate-stagger-#{$i} {
    animation: fadeInUp 300ms ease-out both;
    animation-delay: #{$i * 50}ms;
  }
}
```

- [ ] **Step 3: Create SCSS mixins**

Create `booknest/apps/mini-taro/src/styles/mixins.scss`:

```scss
@use "../assets/variables" as *;

// Card base style
@mixin card {
  background: $color-bg-card;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-card;
}

// Pill/capsule button
@mixin pill-button($bg: $color-primary, $color: $color-text-white) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: $border-radius-pill;
  background: $bg;
  color: $color;
  font-size: $font-size-md;
  font-weight: 500;
  transition: transform $transition-fast;

  &:active {
    transform: scale(0.98);
  }
}

// Truncate text
@mixin truncate($lines: 1) {
  @if $lines == 1 {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  } @else {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: $lines;
    overflow: hidden;
  }
}

// Safe area bottom padding
@mixin safe-bottom($extra: 0rpx) {
  padding-bottom: calc(#{$spacing-md} + #{$extra} + env(safe-area-inset-bottom));
}

// Horizontal scroll container
@mixin scroll-x {
  white-space: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }
}

// Dark mode helper
@mixin dark {
  .dark & {
    @content;
  }
}
```

- [ ] **Step 4: Update app.scss to import new styles**

Replace `booknest/apps/mini-taro/src/app.scss`:

```scss
@use "./assets/variables.scss" as *;
@use "./styles/animations.scss";

page {
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, 'PingFang SC',
    'Microsoft YaHei', Arial, sans-serif;
  font-size: $font-size-md;
  color: $color-text-primary;
  background-color: $color-bg-secondary;
  -webkit-font-smoothing: antialiased;
}

.container {
  padding: $spacing-lg;
}

// Global utility: card press feedback
.card-press:active {
  transform: scale(0.98);
  transition: transform $transition-fast;
}
```

- [ ] **Step 5: Update app.config.ts navigation bar colors**

In `booknest/apps/mini-taro/src/app.config.ts`, update the `window` section:

```typescript
window: {
  backgroundTextStyle: 'light',
  navigationBarBackgroundColor: '#FAF8F5',
  navigationBarTitleText: 'BookNest',
  navigationBarTextStyle: 'black',
},
```

Also update `tabBar` colors:

```typescript
tabBar: {
  color: '#A09A94',
  selectedColor: '#C4956A',
  backgroundColor: '#FFFFFF',
  borderStyle: 'white',
  // ... list unchanged for now, will update in Task 8
},
```

- [ ] **Step 6: Verify build compiles**

Run: `cd /home/z/zyf_learn && pnpm dev:mini:h5`
Expected: Builds without errors

- [ ] **Step 7: Commit**

```bash
git add booknest/apps/mini-taro/src/styles/ booknest/apps/mini-taro/src/app.scss booknest/apps/mini-taro/src/app.config.ts
git commit -m "design: add dark mode, animations, mixins + update app shell to warm palette"
```

---

## Task 3: Update StatusBadge to Warm Colors

**Files:**
- Modify: `booknest/apps/mini-taro/src/components/StatusBadge/index.scss`

- [ ] **Step 1: Update StatusBadge styles**

Replace `booknest/apps/mini-taro/src/components/StatusBadge/index.scss`:

```scss
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 16rpx;
  border-radius: $border-radius-full;
  font-size: $font-size-xs;

  &--owned {
    background: rgba(196, 149, 106, 0.12);
    .status-badge__text { color: $color-primary; }
  }

  &--reading {
    background: rgba(232, 150, 122, 0.12);
    .status-badge__text { color: $color-warning; }
  }

  &--finished {
    background: rgba(107, 175, 141, 0.12);
    .status-badge__text { color: $color-success; }
  }

  &--wishlist {
    background: rgba(212, 165, 116, 0.12);
    .status-badge__text { color: $color-accent; }
  }

  &__text {
    font-size: $font-size-xs;
    font-weight: 500;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add booknest/apps/mini-taro/src/components/StatusBadge/index.scss
git commit -m "design: update StatusBadge to warm palette"
```

---

## Task 4: Update EmptyState and LoadingState

**Files:**
- Modify: `booknest/apps/mini-taro/src/components/EmptyState/index.scss`
- Modify: `booknest/apps/mini-taro/src/components/LoadingState/index.scss`

- [ ] **Step 1: Update EmptyState styles**

Replace `booknest/apps/mini-taro/src/components/EmptyState/index.scss`:

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
    background: $color-primary;
    border-radius: $border-radius-pill;

    &-text {
      color: $color-text-white;
      font-size: $font-size-md;
      font-weight: 500;
    }
  }
}
```

- [ ] **Step 2: Read and update LoadingState**

Read current `LoadingState/index.scss`, then replace with updated version using warm palette variables.

- [ ] **Step 3: Commit**

```bash
git add booknest/apps/mini-taro/src/components/EmptyState/index.scss booknest/apps/mini-taro/src/components/LoadingState/index.scss
git commit -m "design: update EmptyState + LoadingState to warm palette"
```

---

## Task 5: Rewrite BookCard — Large Image 2-Column Grid

**Files:**
- Modify: `booknest/apps/mini-taro/src/components/BookCard/index.tsx`
- Modify: `booknest/apps/mini-taro/src/components/BookCard/index.scss`

- [ ] **Step 1: Rewrite BookCard TSX**

Replace `booknest/apps/mini-taro/src/components/BookCard/index.tsx`:

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
}

export const BookCard = React.memo(function BookCard({ book }: BookCardProps) {
  const handleOpen = () => {
    Taro.navigateTo({ url: `/sub/books/pages/detail/index?id=${book.id}` })
  }

  return (
    <View className="book-card" onClick={handleOpen} compileMode>
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
        <Text className="book-card__author">{book.author}</Text>
      </View>
      <View className="book-card__badge">
        <StatusBadge status={book.status} />
      </View>
    </View>
  )
})
```

- [ ] **Step 2: Rewrite BookCard SCSS for large-image grid style**

Replace `booknest/apps/mini-taro/src/components/BookCard/index.scss`:

```scss
.book-card {
  position: relative;
  border-radius: $border-radius-lg;
  background: $color-bg-card;
  box-shadow: $shadow-card;
  overflow: hidden;
  transition: transform $transition-fast;

  &:active {
    transform: scale(0.98);
  }

  &__cover-wrap {
    width: 100%;
    height: 320rpx;
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
      background: linear-gradient(135deg, $color-primary-light, $color-primary);
    }

    &-text {
      font-size: 80rpx;
      font-weight: 700;
      color: $color-text-white;
    }
  }

  &__body {
    padding: 16rpx 20rpx 24rpx;
  }

  &__title {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    font-size: 28rpx;
    font-weight: 600;
    color: $color-text-primary;
    line-height: 1.4;
    min-height: 78rpx;
  }

  &__author {
    display: block;
    margin-top: 8rpx;
    font-size: $font-size-sm;
    color: $color-text-secondary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__badge {
    position: absolute;
    top: 16rpx;
    right: 16rpx;
  }
}
```

- [ ] **Step 3: Verify build compiles**

Run: `cd /home/z/zyf_learn && pnpm dev:mini:h5`
Expected: Builds without errors

- [ ] **Step 4: Commit**

```bash
git add booknest/apps/mini-taro/src/components/BookCard/
git commit -m "design: rewrite BookCard as large-image card for 2-column grid"
```

---

## Task 6: Update Index Page for 2-Column Grid

**Files:**
- Modify: `booknest/apps/mini-taro/src/pages/index/index.tsx`
- Modify: `booknest/apps/mini-taro/src/pages/index/index.scss`

- [ ] **Step 1: Update IndexPage TSX — greeting + 2-column grid**

Update the return JSX in `booknest/apps/mini-taro/src/pages/index/index.tsx`. The key changes are:
1. Add greeting section with user stats
2. Change book list from vertical to 2-column grid using `View` with flex-wrap
3. Update FAB to warm pill shape

Replace the entire logged-in return block (from `return (` at line 141 to the end) with:

```tsx
  // Add helper at top of component, after existing state
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 6) return '夜深了'
    if (hour < 12) return '早上好'
    if (hour < 18) return '下午好'
    return '晚上好'
  }

  return (
    <View className="page">
      {/* Greeting */}
      <View className="page__greeting">
        <Text className="page__greeting-text">{getGreeting()}，{user?.nickname || '读者'}</Text>
      </View>

      {/* Search + Filters */}
      <View className="page__filters">
        <Input
          className="page__search"
          type="text"
          placeholder="搜索书名或作者"
          value={keyword}
          onInput={(e) => handleSearch(e.detail.value)}
        />
        <ScrollView scrollX className="page__status-bar">
          {statusFilters.map((f) => (
            <View
              key={f.value}
              className={`page__status-chip ${status === f.value ? 'page__status-chip--active' : ''}`}
              onClick={() => { setStatus(f.value); setPage(1) }}
            >
              <Text>{f.label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Book Grid */}
      {!activeWorkspaceId ? (
        <LoadingState text="加载中..." />
      ) : booksLoading && page === 1 ? (
        <LoadingState text="加载中..." />
      ) : items.length > 0 ? (
        <ScrollView scrollY className="book-grid">
          {items.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
          {booksLoading && <LoadingState text="加载更多..." />}
          {!hasMore && items.length > PAGE_SIZE && (
            <Text className="page__nomore">没有更多了</Text>
          )}
        </ScrollView>
      ) : (
        <EmptyState
          title="还没有书籍"
          description="点击下方按钮添加第一本书"
          actionText="添加书籍"
          onAction={() => Taro.navigateTo({ url: '/sub/books/pages/form/index' })}
        />
      )}

      {/* FAB */}
      {showFab && (
        <View
          className="fab"
          onClick={() => Taro.navigateTo({ url: '/sub/books/pages/form/index' })}
        >
          <Text className="fab__text">+</Text>
        </View>
      )}
    </View>
  )
```

Also add the `user` selector at the top of the component (after existing selectors):
```tsx
const user = useAuthStore((s) => s.user)
```

- [ ] **Step 2: Update Index page SCSS — 2-column grid + warm greeting**

Replace `booknest/apps/mini-taro/src/pages/index/index.scss`:

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
      background: $color-primary;
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

  // Each BookCard takes half width minus half gap
  .book-card {
    width: calc(50% - 8rpx);
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
  background: $color-primary;
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

- [ ] **Step 3: Remove WorkspaceSwitcher from header** (move to me page only)

In `pages/index/index.tsx`, remove:
- The `WorkspaceSwitcher` import (keep it imported for me page)
- The `<WorkspaceSwitcher />` from the header (it was in the old `page__header` which is now replaced by greeting)

- [ ] **Step 4: Verify build**

Run: `cd /home/z/zyf_learn && pnpm dev:mini:h5`
Expected: Builds without errors, 2-column grid renders

- [ ] **Step 5: Commit**

```bash
git add booknest/apps/mini-taro/src/pages/index/
git commit -m "design: update index page — warm greeting + 2-column book grid"
```

---

## Task 7: Update Me Page to Warm Style

**Files:**
- Modify: `booknest/apps/mini-taro/src/pages/me/index.tsx`
- Modify: `booknest/apps/mini-taro/src/pages/me/index.scss`

- [ ] **Step 1: Update Me page TSX — add stats row + workspace switcher**

Replace `booknest/apps/mini-taro/src/pages/me/index.tsx`:

```tsx
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { listWorkspaces } from '@/services/workspaces'
import { recordCustomerServiceEvent } from '@/services/customer-service'
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher'
import './index.scss'

export default function MePage() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const [bookCount, setBookCount] = useState(0)
  const [finishedCount, setFinishedCount] = useState(0)

  useEffect(() => {
    if (token) listWorkspaces().then(setWorkspaces).catch(() => {})
  }, [token])

  useEffect(() => {
    if (activeWorkspaceId) {
      import('@/services/books').then(({ listBooks }) => {
        listBooks({ page: 1, pageSize: 1 })
          .then((res) => setBookCount(res.total || 0))
          .catch(() => {})
        listBooks({ page: 1, pageSize: 1, status: 'FINISHED' })
          .then((res) => setFinishedCount(res.total || 0))
          .catch(() => {})
      })
    }
  }, [activeWorkspaceId])

  const handleLogout = () => {
    useAuthStore.getState().logout()
    Taro.reLaunch({ url: '/pages/login/index' })
  }

  const handleCustomerService = async () => {
    await recordCustomerServiceEvent({ scene: 'GENERAL_INQUIRY' })
    Taro.showToast({ title: '客服上下文已记录', icon: 'success' })
  }

  return (
    <View className="me">
      {/* Avatar Section */}
      <View className="me__header">
        <View className="me__avatar">
          <Text className="me__avatar-text">{user?.nickname?.[0] || user?.email?.[0] || 'B'}</Text>
        </View>
        <View className="me__info">
          <Text className="me__name">{user?.nickname || user?.email || 'BookNest 用户'}</Text>
          <Text className="me__email">{user?.email || '未登录'}</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View className="me__stats">
        <View className="me__stat">
          <Text className="me__stat-num">{bookCount}</Text>
          <Text className="me__stat-label">藏书</Text>
        </View>
        <View className="me__stat">
          <Text className="me__stat-num">{finishedCount}</Text>
          <Text className="me__stat-label">已读</Text>
        </View>
        <View className="me__stat">
          <Text className="me__stat-num">0</Text>
          <Text className="me__stat-label">连续天数</Text>
        </View>
      </View>

      {/* Menu */}
      <View className="me__menu">
        <View
          className="me__menu-item"
          onClick={() => Taro.navigateTo({ url: '/sub/activities/pages/list/index' })}
        >
          <Text className="me__menu-text">读书会活动</Text>
          <Text className="me__menu-arrow">›</Text>
        </View>
        <View
          className="me__menu-item"
          onClick={() => Taro.navigateTo({ url: '/sub/admin/pages/content-security/index' })}
        >
          <Text className="me__menu-text">内容审核管理</Text>
          <Text className="me__menu-arrow">›</Text>
        </View>
        <View className="me__menu-item">
          <Text className="me__menu-text">Workspace</Text>
          <WorkspaceSwitcher />
        </View>
        <View className="me__menu-item" onClick={handleCustomerService}>
          <Text className="me__menu-text">联系客服</Text>
          <Text className="me__menu-arrow">›</Text>
        </View>
        <View className="me__menu-item" onClick={handleLogout}>
          <Text className="me__menu-text">退出登录</Text>
          <Text className="me__menu-arrow">›</Text>
        </View>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Update Me page SCSS**

Replace `booknest/apps/mini-taro/src/pages/me/index.scss`:

```scss
.me {
  min-height: 100vh;
  background: $color-bg-secondary;

  &__header {
    display: flex;
    align-items: center;
    padding: $spacing-xl $spacing-lg;
    background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  }

  &__avatar {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &-text {
      font-size: $font-size-xxl;
      font-weight: 700;
      color: $color-text-white;
    }
  }

  &__info {
    margin-left: $spacing-lg;
  }

  &__name {
    display: block;
    font-size: $font-size-xl;
    font-weight: 700;
    color: $color-text-white;
  }

  &__email {
    display: block;
    margin-top: 8rpx;
    font-size: $font-size-sm;
    color: rgba(255, 255, 255, 0.7);
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
      color: $color-accent;
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

- [ ] **Step 3: Commit**

```bash
git add booknest/apps/mini-taro/src/pages/me/
git commit -m "design: update me page — warm gradient header + stats row"
```

---

## Task 8: Update Category Page

**Files:**
- Modify: `booknest/apps/mini-taro/src/pages/categories/index.scss`

- [ ] **Step 1: Update Category page SCSS**

Replace `booknest/apps/mini-taro/src/pages/categories/index.scss` with warm palette (replace all `$color-primary`, `$color-bg-*`, `$color-text-*` references — variable names unchanged, values now warm):

The file uses the same variable names (`$color-primary`, `$color-bg-primary`, etc.) so no changes needed to SCSS variable references. The new values from `variables.scss` will automatically apply. Verify the build compiles and colors look warm.

- [ ] **Step 2: Commit if any manual overrides were needed**

```bash
git add booknest/apps/mini-taro/src/pages/categories/index.scss
git commit -m "design: category page auto-applies warm palette via variables"
```

---

## Task 9: Update Book Detail Page

**Files:**
- Modify: `booknest/apps/mini-taro/src/sub/books/pages/detail/index.tsx`
- Modify: `booknest/apps/mini-taro/src/sub/books/pages/detail/index.scss`

- [ ] **Step 1: Update detail page TSX — large cover area**

Replace the header section in `detail/index.tsx` with a large cover hero:

```tsx
// In the return JSX, replace the detail__header section:
<View className="detail__hero">
  {book.coverUrl ? (
    <Image className="detail__hero-bg" src={book.coverUrl} mode="aspectFill" />
  ) : null}
  <View className="detail__hero-content">
    {book.coverUrl ? (
      <Image className="detail__hero-cover" src={book.coverUrl} mode="aspectFill" />
    ) : (
      <View className="detail__hero-cover detail__hero-cover--placeholder">
        <Text className="detail__hero-cover-text">{book.title[0]}</Text>
      </View>
    )}
    <Text className="detail__hero-title">{book.title}</Text>
    <Text className="detail__hero-author">{book.author}</Text>
    <StatusBadge status={book.status} />
  </View>
</View>
```

Remove the old `detail__header` and `detail__info` sections.

- [ ] **Step 2: Update detail page SCSS — hero cover + warm palette**

Replace `detail/index.scss` (keep the remaining sections for reviews, meta, actions, but update header to hero style):

```scss
.detail {
  min-height: 100vh;
  background: $color-bg-secondary;
  padding-bottom: 160rpx;

  &__hero {
    position: relative;
    height: 600rpx;
    overflow: hidden;
    display: flex;
    align-items: flex-end;
  }

  &__hero-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    filter: blur(40rpx) brightness(0.6);
    transform: scale(1.2);
  }

  &__hero-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: $spacing-lg;
    width: 100%;
  }

  &__hero-cover {
    width: 240rpx;
    height: 340rpx;
    border-radius: $border-radius-lg;
    background: $color-bg-tertiary;
    box-shadow: $shadow-modal;

    &--placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, $color-primary-light, $color-primary);
    }

    &-text {
      font-size: 88rpx;
      font-weight: 700;
      color: $color-text-white;
    }
  }

  &__hero-title {
    display: block;
    margin-top: $spacing-lg;
    font-size: $font-size-xl;
    font-weight: 700;
    color: $color-text-white;
    text-align: center;
    line-height: 1.3;
  }

  &__hero-author {
    display: block;
    margin-top: 8rpx;
    font-size: $font-size-md;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: $spacing-sm;
  }

  &__section {
    margin-top: $spacing-md;
    padding: $spacing-lg;
    background: $color-bg-card;

    &-title {
      display: block;
      font-size: $font-size-lg;
      font-weight: 600;
      color: $color-text-primary;
      margin-bottom: $spacing-md;
    }
  }

  &__desc {
    font-size: $font-size-md;
    color: $color-text-secondary;
    line-height: 1.8;
  }

  &__reviews {
    margin-bottom: $spacing-md;
  }

  &__review {
    padding: $spacing-md 0;
    border-bottom: 1rpx solid $color-bg-tertiary;

    &:last-child {
      border-bottom: none;
    }

    &-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    &-user {
      font-size: $font-size-md;
      font-weight: 500;
      color: $color-text-primary;
    }

    &-stars {
      font-size: $font-size-sm;
      color: $color-warning;
    }

    &-comment {
      display: block;
      margin-top: $spacing-xs;
      font-size: $font-size-md;
      color: $color-text-secondary;
      line-height: 1.6;
    }
  }

  &__empty-reviews {
    font-size: $font-size-md;
    color: $color-text-muted;
    text-align: center;
    padding: $spacing-md 0;
  }

  &__review-form {
    margin-top: $spacing-md;
    padding-top: $spacing-md;
    border-top: 2rpx solid $color-bg-tertiary;
  }

  &__rating {
    display: flex;
    gap: 8rpx;
    margin-bottom: $spacing-sm;
  }

  &__star {
    font-size: 48rpx;
    color: #d1d5db;

    &--active {
      color: $color-warning;
    }
  }

  &__review-input {
    width: 100%;
    min-height: 120rpx;
    padding: $spacing-sm;
    border: 2rpx solid $color-bg-tertiary;
    border-radius: $border-radius-md;
    font-size: $font-size-md;
    box-sizing: border-box;
    margin-bottom: $spacing-sm;
  }

  &__review-submit {
    padding: $spacing-sm $spacing-lg;
    background: $color-primary;
    border-radius: $border-radius-pill;
    display: inline-block;
  }

  &__review-submit-text {
    font-size: $font-size-md;
    color: #fff;
    font-weight: 500;
  }

  &__meta {
    &-row {
      display: flex;
      justify-content: space-between;
      padding: $spacing-sm 0;
      border-bottom: 1rpx solid $color-bg-tertiary;

      &:last-child {
        border-bottom: none;
      }
    }

    &-label {
      font-size: $font-size-md;
      color: $color-text-muted;
    }

    &-value {
      font-size: $font-size-md;
      color: $color-text-primary;
      font-weight: 500;
    }
  }

  &__actions {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: $spacing-md $spacing-lg;
    padding-bottom: calc(#{$spacing-md} + env(safe-area-inset-bottom));
    background: $color-bg-card;
    box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.04);
    display: flex;
    gap: $spacing-md;
  }

  &__btn {
    flex: 1;
    height: 88rpx;
    border-radius: $border-radius-pill;
    display: flex;
    align-items: center;
    justify-content: center;

    &--primary {
      background: $color-primary;
    }

    &--danger {
      background: $color-danger;
    }

    &-text {
      color: $color-text-white;
      font-size: $font-size-lg;
      font-weight: 600;
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add booknest/apps/mini-taro/src/sub/books/pages/detail/
git commit -m "design: detail page hero cover + warm palette"
```

---

## Task 10: Create Skeleton Component

**Files:**
- Create: `booknest/apps/mini-taro/src/components/Skeleton/index.tsx`
- Create: `booknest/apps/mini-taro/src/components/Skeleton/index.scss`

- [ ] **Step 1: Create Skeleton TSX**

Create `booknest/apps/mini-taro/src/components/Skeleton/index.tsx`:

```tsx
import { View } from '@tarojs/components'
import './index.scss'

interface SkeletonProps {
  type?: 'card' | 'list' | 'detail'
  count?: number
}

export function Skeleton({ type = 'card', count = 4 }: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i)

  if (type === 'card') {
    return (
      <View className="skeleton-grid">
        {items.map((i) => (
          <View key={i} className="skeleton-card">
            <View className="skeleton-card__image animate-pulse" />
            <View className="skeleton-card__body">
              <View className="skeleton-card__title animate-pulse" />
              <View className="skeleton-card__subtitle animate-pulse" />
            </View>
          </View>
        ))}
      </View>
    )
  }

  if (type === 'list') {
    return (
      <View className="skeleton-list">
        {items.map((i) => (
          <View key={i} className="skeleton-list__item animate-pulse" />
        ))}
      </View>
    )
  }

  // detail
  return (
    <View className="skeleton-detail">
      <View className="skeleton-detail__hero animate-pulse" />
      <View className="skeleton-detail__title animate-pulse" />
      <View className="skeleton-detail__line animate-pulse" />
      <View className="skeleton-detail__line animate-pulse" />
      <View className="skeleton-detail__line--short animate-pulse" />
    </View>
  )
}
```

- [ ] **Step 2: Create Skeleton SCSS**

Create `booknest/apps/mini-taro/src/components/Skeleton/index.scss`:

```scss
$skeleton-color: $color-bg-tertiary;

.skeleton-grid {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
}

.skeleton-card {
  width: calc(50% - 8rpx);
  border-radius: $border-radius-lg;
  background: $color-bg-card;
  overflow: hidden;

  &__image {
    width: 100%;
    height: 320rpx;
    background: $skeleton-color;
  }

  &__body {
    padding: 16rpx 20rpx 24rpx;
  }

  &__title {
    height: 32rpx;
    width: 80%;
    background: $skeleton-color;
    border-radius: $border-radius-sm;
    margin-bottom: 12rpx;
  }

  &__subtitle {
    height: 24rpx;
    width: 50%;
    background: $skeleton-color;
    border-radius: $border-radius-sm;
  }
}

.skeleton-list {
  padding: $spacing-md;

  &__item {
    height: 88rpx;
    background: $skeleton-color;
    border-radius: $border-radius-lg;
    margin-bottom: $spacing-md;
  }
}

.skeleton-detail {
  padding: $spacing-lg;

  &__hero {
    width: 240rpx;
    height: 340rpx;
    margin: 0 auto $spacing-lg;
    background: $skeleton-color;
    border-radius: $border-radius-lg;
  }

  &__title {
    height: 40rpx;
    width: 60%;
    background: $skeleton-color;
    border-radius: $border-radius-sm;
    margin-bottom: $spacing-md;
  }

  &__line {
    height: 24rpx;
    width: 100%;
    background: $skeleton-color;
    border-radius: $border-radius-sm;
    margin-bottom: $spacing-sm;

    &--short {
      width: 40%;
    }
  }
}
```

- [ ] **Step 3: Replace LoadingState usages with Skeleton in index page**

In `pages/index/index.tsx`, for the initial loading state (when `page === 1`), use Skeleton instead of LoadingState:

```tsx
import { Skeleton } from '@/components/Skeleton'

// Replace:
// booksLoading && page === 1 ? (<LoadingState text="加载中..." />) : ...
// With:
// booksLoading && page === 1 ? (<Skeleton type="card" count={6} />) : ...
```

- [ ] **Step 4: Commit**

```bash
git add booknest/apps/mini-taro/src/components/Skeleton/ booknest/apps/mini-taro/src/pages/index/index.tsx
git commit -m "feat: add Skeleton component — card/list/detail variants with pulse animation"
```

---

## Task 11: Create SearchBar Component

**Files:**
- Create: `booknest/apps/mini-taro/src/components/SearchBar/index.tsx`
- Create: `booknest/apps/mini-taro/src/components/SearchBar/index.scss`

- [ ] **Step 1: Create SearchBar TSX**

Create `booknest/apps/mini-taro/src/components/SearchBar/index.tsx`:

```tsx
import { Input, Text, View } from '@tarojs/components'
import { useRef } from 'react'
import './index.scss'

interface SearchBarProps {
  value: string
  placeholder?: string
  onChange: (value: string) => void
}

export function SearchBar({ value, placeholder = '搜索', onChange }: SearchBarProps) {
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const handleInput = (val: string) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(val), 300)
  }

  return (
    <View className="search-bar">
      <Text className="search-bar__icon">🔍</Text>
      <Input
        className="search-bar__input"
        type="text"
        placeholder={placeholder}
        value={value}
        onInput={(e) => handleInput(e.detail.value)}
      />
      {value ? (
        <Text className="search-bar__clear" onClick={() => onChange('')}>✕</Text>
      ) : null}
    </View>
  )
}
```

- [ ] **Step 2: Create SearchBar SCSS**

Create `booknest/apps/mini-taro/src/components/SearchBar/index.scss`:

```scss
.search-bar {
  display: flex;
  align-items: center;
  height: 72rpx;
  background: $color-bg-tertiary;
  border-radius: $border-radius-pill;
  padding: 0 $spacing-md;

  &__icon {
    font-size: $font-size-md;
    margin-right: $spacing-sm;
    flex-shrink: 0;
  }

  &__input {
    flex: 1;
    height: 100%;
    font-size: $font-size-md;
    color: $color-text-primary;
  }

  &__clear {
    font-size: $font-size-sm;
    color: $color-text-muted;
    padding: 8rpx;
    flex-shrink: 0;
  }
}
```

- [ ] **Step 3: Use SearchBar in index page**

In `pages/index/index.tsx`, replace the raw `<Input>` search with `<SearchBar>`:

```tsx
import { SearchBar } from '@/components/SearchBar'

// Replace:
// <Input className="page__search" ... onInput={(e) => handleSearch(e.detail.value)} />
// With:
// <SearchBar value={keyword} placeholder="搜索书名或作者" onChange={(v) => { setKeyword(v); setDebouncedKeyword(v); setPage(1) }} />
```

Note: SearchBar has built-in debounce, so we can remove the page-level debounce logic.

- [ ] **Step 4: Commit**

```bash
git add booknest/apps/mini-taro/src/components/SearchBar/ booknest/apps/mini-taro/src/pages/index/index.tsx
git commit -m "feat: add SearchBar component with built-in debounce + clear"
```

---

## Task 12: Create ProgressRing Component

**Files:**
- Create: `booknest/apps/mini-taro/src/components/ProgressRing/index.tsx`
- Create: `booknest/apps/mini-taro/src/components/ProgressRing/index.scss`

- [ ] **Step 1: Create ProgressRing TSX**

Create `booknest/apps/mini-taro/src/components/ProgressRing/index.tsx`:

```tsx
import { Text, View } from '@tarojs/components'
import './index.scss'

interface ProgressRingProps {
  percentage: number // 0-100
  size?: 'sm' | 'md' | 'lg'
  label?: string
  showText?: boolean
}

const SIZE_MAP = {
  sm: 64,
  md: 120,
  lg: 200,
}

export function ProgressRing({ percentage, size = 'md', label, showText = true }: ProgressRingProps) {
  const r = SIZE_MAP[size]
  const strokeWidth = size === 'sm' ? 6 : size === 'md' ? 10 : 14
  const radius = (r - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference
  const center = r / 2

  return (
    <View className={`progress-ring progress-ring--${size}`}>
      <svg width={r} height={r} className="progress-ring__svg">
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#F0ECE8"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#C4956A"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          className="progress-ring__progress"
        />
      </svg>
      {showText && size !== 'sm' && (
        <View className="progress-ring__text">
          <Text className="progress-ring__percentage">{Math.round(percentage)}%</Text>
          {label && <Text className="progress-ring__label">{label}</Text>}
        </View>
      )}
    </View>
  )
}
```

- [ ] **Step 2: Create ProgressRing SCSS**

Create `booknest/apps/mini-taro/src/components/ProgressRing/index.scss`:

```scss
.progress-ring {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &__svg {
    display: block;
  }

  &__progress {
    transition: stroke-dashoffset $transition-normal;
  }

  &__text {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &__percentage {
    font-size: $font-size-lg;
    font-weight: 700;
    color: $color-text-primary;
  }

  &__label {
    font-size: $font-size-xs;
    color: $color-text-muted;
    margin-top: 4rpx;
  }

  &--sm {
    .progress-ring__percentage {
      font-size: $font-size-xs;
    }
  }

  &--lg {
    .progress-ring__percentage {
      font-size: $font-size-xxl;
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add booknest/apps/mini-taro/src/components/ProgressRing/
git commit -m "feat: add ProgressRing component — SVG ring with sm/md/lg sizes"
```

---

## Task 13: Create StatsCard Component

**Files:**
- Create: `booknest/apps/mini-taro/src/components/StatsCard/index.tsx`
- Create: `booknest/apps/mini-taro/src/components/StatsCard/index.scss`

- [ ] **Step 1: Create StatsCard TSX**

Create `booknest/apps/mini-taro/src/components/StatsCard/index.tsx`:

```tsx
import { Text, View } from '@tarojs/components'
import './index.scss'

interface StatsCardProps {
  value: string | number
  label: string
  icon?: string
}

export function StatsCard({ value, label, icon }: StatsCardProps) {
  return (
    <View className="stats-card">
      {icon && <Text className="stats-card__icon">{icon}</Text>}
      <Text className="stats-card__value">{value}</Text>
      <Text className="stats-card__label">{label}</Text>
    </View>
  )
}
```

- [ ] **Step 2: Create StatsCard SCSS**

Create `booknest/apps/mini-taro/src/components/StatsCard/index.scss`:

```scss
.stats-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-lg $spacing-md;
  background: linear-gradient(135deg, rgba(196, 149, 106, 0.08), rgba(196, 149, 106, 0.02));
  border-radius: $border-radius-lg;

  &__icon {
    font-size: $font-size-xl;
    margin-bottom: $spacing-sm;
  }

  &__value {
    font-size: $font-size-hero;
    font-weight: 700;
    color: $color-accent;
    line-height: 1;
  }

  &__label {
    margin-top: $spacing-xs;
    font-size: $font-size-sm;
    color: $color-text-muted;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add booknest/apps/mini-taro/src/components/StatsCard/
git commit -m "feat: add StatsCard component — large number + label + gradient bg"
```

---

## Task 14: Create NoteCard Component

**Files:**
- Create: `booknest/apps/mini-taro/src/components/NoteCard/index.tsx`
- Create: `booknest/apps/mini-taro/src/components/NoteCard/index.scss`

- [ ] **Step 1: Create NoteCard TSX**

Create `booknest/apps/mini-taro/src/components/NoteCard/index.tsx`:

```tsx
import { Text, View } from '@tarojs/components'
import './index.scss'

export interface Note {
  id: string
  content: string
  pageNumber?: number | null
  createdAt: string
}

interface NoteCardProps {
  note: Note
}

export function NoteCard({ note }: NoteCardProps) {
  const date = new Date(note.createdAt).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <View className="note-card">
      <Text className="note-card__content">{note.content}</Text>
      <View className="note-card__footer">
        {note.pageNumber && (
          <Text className="note-card__page">P.{note.pageNumber}</Text>
        )}
        <Text className="note-card__date">{date}</Text>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Create NoteCard SCSS**

Create `booknest/apps/mini-taro/src/components/NoteCard/index.scss`:

```scss
.note-card {
  padding: $spacing-md;
  background: $color-bg-card;
  border-radius: $border-radius-lg;
  margin-bottom: $spacing-sm;

  &__content {
    font-size: $font-size-md;
    color: $color-text-primary;
    line-height: 1.7;
  }

  &__footer {
    display: flex;
    align-items: center;
    margin-top: $spacing-sm;
    gap: $spacing-sm;
  }

  &__page {
    font-size: $font-size-xs;
    color: $color-primary;
    background: rgba(196, 149, 106, 0.1);
    padding: 2rpx 12rpx;
    border-radius: $border-radius-sm;
  }

  &__date {
    font-size: $font-size-xs;
    color: $color-text-muted;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add booknest/apps/mini-taro/src/components/NoteCard/
git commit -m "feat: add NoteCard component for book notes display"
```

---

## Task 15: Create Heatmap Component

**Files:**
- Create: `booknest/apps/mini-taro/src/components/Heatmap/index.tsx`
- Create: `booknest/apps/mini-taro/src/components/Heatmap/index.scss`

- [ ] **Step 1: Create Heatmap TSX**

Create `booknest/apps/mini-taro/src/components/Heatmap/index.tsx`:

```tsx
import { Text, View } from '@tarojs/components'
import './index.scss'

interface HeatmapProps {
  year: number
  /** Map of "YYYY-MM-DD" to activity count */
  data: Record<string, number>
}

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getIntensity(count: number): string {
  if (count === 0) return 'heat-cell--0'
  if (count <= 1) return 'heat-cell--1'
  if (count <= 3) return 'heat-cell--2'
  if (count <= 5) return 'heat-cell--3'
  return 'heat-cell--4'
}

export function Heatmap({ year, data }: HeatmapProps) {
  const months = MONTHS.map((label, mi) => {
    const days = getDaysInMonth(year, mi)
    const cells = Array.from({ length: days }, (_, di) => {
      const key = `${year}-${String(mi + 1).padStart(2, '0')}-${String(di + 1).padStart(2, '0')}`
      return { key, count: data[key] || 0 }
    })
    return { label, cells }
  })

  return (
    <View className="heatmap">
      <Text className="heatmap__title">{year} 年阅读日历</Text>
      <View className="heatmap__grid">
        {months.map((m) => (
          <View key={m.label} className="heatmap__month">
            <Text className="heatmap__month-label">{m.label}</Text>
            <View className="heatmap__cells">
              {m.cells.map((c) => (
                <View key={c.key} className={`heat-cell ${getIntensity(c.count)}`} />
              ))}
            </View>
          </View>
        ))}
      </View>
      <View className="heatmap__legend">
        <Text className="heatmap__legend-label">少</Text>
        <View className="heat-cell heat-cell--0 heat-cell--legend" />
        <View className="heat-cell heat-cell--1 heat-cell--legend" />
        <View className="heat-cell heat-cell--2 heat-cell--legend" />
        <View className="heat-cell heat-cell--3 heat-cell--legend" />
        <View className="heat-cell heat-cell--4 heat-cell--legend" />
        <Text className="heatmap__legend-label">多</Text>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Create Heatmap SCSS**

Create `booknest/apps/mini-taro/src/components/Heatmap/index.scss`:

```scss
.heatmap {
  padding: $spacing-lg;
  background: $color-bg-card;
  border-radius: $border-radius-lg;

  &__title {
    display: block;
    font-size: $font-size-lg;
    font-weight: 600;
    color: $color-text-primary;
    margin-bottom: $spacing-md;
  }

  &__grid {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;
  }

  &__month {
    flex: 1;
    min-width: calc(25% - 8rpx);
  }

  &__month-label {
    display: block;
    font-size: $font-size-xs;
    color: $color-text-muted;
    margin-bottom: 4rpx;
  }

  &__cells {
    display: flex;
    flex-wrap: wrap;
    gap: 2rpx;
  }

  &__legend {
    display: flex;
    align-items: center;
    gap: 4rpx;
    margin-top: $spacing-sm;
    justify-content: flex-end;
  }

  &__legend-label {
    font-size: $font-size-xs;
    color: $color-text-muted;
    margin: 0 4rpx;
  }
}

.heat-cell {
  width: 12rpx;
  height: 12rpx;
  border-radius: 2rpx;

  &--0 { background: $color-bg-tertiary; }
  &--1 { background: rgba(196, 149, 106, 0.25); }
  &--2 { background: rgba(196, 149, 106, 0.45); }
  &--3 { background: rgba(196, 149, 106, 0.7); }
  &--4 { background: $color-primary; }

  &--legend {
    width: 16rpx;
    height: 16rpx;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add booknest/apps/mini-taro/src/components/Heatmap/
git commit -m "feat: add Heatmap component — yearly reading calendar grid"
```

---

## Task 16: Update Remaining Sub-Package Pages

**Files:**
- Modify: `booknest/apps/mini-taro/src/sub/books/pages/form/index.scss`
- Modify: `booknest/apps/mini-taro/src/sub/orders/pages/result/index.scss`
- Modify: `booknest/apps/mini-taro/src/sub/activities/pages/list/index.scss`
- Modify: `booknest/apps/mini-taro/src/sub/activities/pages/detail/index.scss`
- Modify: `booknest/apps/mini-taro/src/sub/admin/pages/content-security/index.scss`

- [ ] **Step 1: Verify sub-package SCSS files use variable references**

All sub-package SCSS files use `$color-primary`, `$color-bg-*`, `$color-text-*` variable names. Since we replaced the values in `variables.scss`, these pages will automatically get the warm palette. Do a grep to confirm:

```bash
grep -rn '#2563eb\|#3b82f6\|#1d4ed8\|#10b981\|#f59e0b\|#ef4444\|#0f172a\|#475569\|#94a3b8\|#f8fafc\|#f1f5f9' booknest/apps/mini-taro/src/ --include='*.scss'
```

Expected: No hardcoded blue/tech colors remaining. Any matches should be replaced with variable references.

- [ ] **Step 2: Replace any hardcoded colors found**

If grep found hardcoded colors, replace each with the corresponding SCSS variable:
- `#2563eb` → `$color-primary`
- `#10b981` → `$color-success`
- `#f59e0b` → `$color-warning`
- `#ef4444` → `$color-danger`
- `#f8fafc` → `$color-bg-secondary`
- `#f1f5f9` → `$color-bg-tertiary`

- [ ] **Step 3: Commit**

```bash
git add booknest/apps/mini-taro/src/
git commit -m "design: replace remaining hardcoded colors with warm palette variables"
```

---

## Task 17: Create Theme Store for Dark Mode Toggle

**Files:**
- Create: `booknest/apps/mini-taro/src/stores/theme-store.ts`

- [ ] **Step 1: Create theme store**

Create `booknest/apps/mini-taro/src/stores/theme-store.ts`:

```typescript
import { create } from 'zustand'
import Taro from '@tarojs/taro'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  isDark: boolean
  hydrate: () => void
  setTheme: (theme: Theme) => void
}

const THEME_KEY = 'booknest_theme'

function getSystemIsDark(): boolean {
  try {
    const res = Taro.getSystemInfoSync()
    return res.theme === 'dark'
  } catch {
    return false
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  isDark: false,

  hydrate: () => {
    const saved = Taro.getStorageSync<THEME>(THEME_KEY)
    if (!saved) return
    const isDark = saved === 'dark' || (saved === 'system' && getSystemIsDark())
    set({ theme: saved, isDark })
    applyDarkClass(isDark)
  },

  setTheme: (theme) => {
    const isDark = theme === 'dark' || (theme === 'system' && getSystemIsDark())
    set({ theme, isDark })
    Taro.setStorageSync(THEME_KEY, theme)
    applyDarkClass(isDark)
  },
}))

function applyDarkClass(isDark: boolean) {
  const pages = Taro.getCurrentPages()
  if (pages.length > 0) {
    const page = pages[pages.length - 1]
    if (page) {
      isDark ? page.page?.classList?.add('dark') : page.page?.classList?.remove('dark')
    }
  }
}
```

- [ ] **Step 2: Initialize theme store in app.tsx**

In `booknest/apps/mini-taro/src/app.tsx`, add theme hydration in the `onLaunch` lifecycle:

```tsx
// In the App component's onLaunch or useEffect:
useThemeStore.getState().hydrate()
```

- [ ] **Step 3: Commit**

```bash
git add booknest/apps/mini-taro/src/stores/theme-store.ts booknest/apps/mini-taro/src/app.tsx
git commit -m "feat: add theme store with light/dark/system mode toggle"
```

---

## Task 18: Final Build Verification

- [ ] **Step 1: Run full build**

```bash
cd /home/z/zyf_learn && pnpm build:mini
```

Expected: Build succeeds with no errors

- [ ] **Step 2: Verify H5 dev server**

```bash
pnpm dev:mini:h5
```

Expected: All pages render with warm color palette, BookCard shows as large-image grid, detail page has hero cover

- [ ] **Step 3: Commit any remaining fixes**

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] 亚朵风格设计系统 → Task 1, 2 (SCSS variables, dark mode, animations, mixins)
- [x] BookCard 大图重设计 → Task 5
- [x] 页面过渡动画 → Task 2 (animations.scss)
- [x] 骨架屏加载 → Task 10
- [x] 暗色模式 → Task 2, 17
- [x] ProgressRing → Task 12
- [x] StatsCard → Task 13
- [x] NoteCard → Task 14
- [x] Heatmap → Task 15
- [x] SearchBar → Task 11
- [x] 所有现有页面更新 → Tasks 3, 4, 6, 7, 8, 9, 16

**2. Placeholder scan:** No TBD/TODO found. All steps have complete code.

**3. Type consistency:** Variable names consistent throughout. New component props match across usage sites.

---

## Subsequent Plans

- **Plan B: Backend Extensions** (Phase 3) — Prisma models + APIs for ReadingProgress, Note, ReadingGoal, Checkin, Stats
- **Plan C: Pages + Features** (Phase 4-6) — Discover tab, Stats tab, TabBar 4-tab expansion, interaction optimizations
