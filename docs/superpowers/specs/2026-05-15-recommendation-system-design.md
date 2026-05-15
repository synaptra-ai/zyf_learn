# Phase 2: Recommendation System Design

## Overview

Add a rule-based recommendation system to the BookNest mini-program, helping users discover what to read next from their own bookshelf. Three surfaces: homepage recommendations, dedicated discover tab, and book detail related recommendations.

## Scope

- Homepage "为你推荐" section — horizontal scroll cards, 3-5 books
- "发现" tab — new TabBar tab with multi-section discover page
- Book detail "相关推荐" — related books at bottom of detail page
- Rule-based scoring algorithm using existing data (no new tables)
- Redis caching for recommendation results (5 min TTL)

## Out of Scope

- External book recommendations (only bookshelf books)
- Collaborative filtering / ML-based recommendations
- User ratings integration
- Cross-workspace recommendations

## Architecture

```
TabBar: [书架] [分类] [发现] [我的]
                      ↑ new tab

Homepage  → "为你推荐" horizontal cards (3-5 books)
Discover  → multi-section: continue reading / for you / category picks
Detail    → "相关推荐" bottom section (2-3 books same category/author)
```

### Recommendation Scoring

Weighted scoring from 5 signals, applied to user's bookshelf books:

| Signal | Weight | Data Source |
|--------|--------|-------------|
| Category preference | 30% | Distribution of categories across user's read books |
| Recent activity | 25% | Reading sessions in last 7 days |
| Progress continuation | 20% | Books with readingProgress 50-90% |
| Wishlist unread | 15% | Books in WISHLIST status |
| Random factor | 10% | Math.random() to break monotony |

Score = sum(signal_weight * signal_score) for each book, return top N sorted descending.

### Category Preference Calculation

1. Count books per category across all user's books (any status)
2. Weight FINISHED books 2x, READING 1.5x, others 1x
3. Normalize to 0-1 range per category
4. Each book gets its category's preference score

### Recent Activity Signal

1. Sum durationMinutes from ReadingSession in last 7 days, grouped by bookId
2. Normalize to 0-1 range
3. Books with recent sessions get higher scores

### Progress Continuation Signal

- Books with readingProgress 50-90%: score = 1.0
- Books with readingProgress 30-50%: score = 0.7
- Books with readingProgress 90-99%: score = 0.5
- Books with readingProgress 0% or 100%: score = 0

### Wishlist Unread Signal

- WISHLIST status: score = 1.0
- OWNED status: score = 0.5
- READING/FINISHED: score = 0

### No New Database Tables

All data sourced from existing models: Book, ReadingSession, Category, Review.

## API Design

All endpoints require JWT authentication and workspace context.

### `GET /api/v1/recommendations`

Homepage recommendations — top 5 books.

**Response:**
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [Book]
  }
}
```

**Logic:** Compute weighted score for all user's books in workspace, cache result in Redis for 5 minutes, return top 5.

### `GET /api/v1/recommendations/discover`

Discover page — multi-section aggregated data.

**Response:**
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "continueReading": [Book],
    "forYou": [Book],
    "categoryPicks": [
      {
        "category": Category,
        "books": [Book]
      }
    ]
  }
}
```

**Logic:**
- `continueReading`: Books with status READING and progress > 0, sorted by lastReadAt, max 3
- `forYou`: Same scoring as homepage, max 6, exclude books already in continueReading
- `categoryPicks`: Top 2 categories by preference, each with up to 4 books not yet in other sections

### `GET /api/v1/recommendations/similar/:bookId`

Book detail related recommendations.

**Response:**
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [Book]
  }
}
```

**Logic:** Find books in same category, same author gets 1.5x boost, exclude current book, max 3 results.

## Frontend Design

### New Files

```
services/recommendation.ts           — 3 API calls
components/RecommendSection/index.tsx — reusable horizontal scroll recommendation section
components/RecommendSection/index.scss
sub/discover/pages/index/index.tsx   — discover page
sub/discover/pages/index/index.scss
```

### Modified Files

```
app.config.ts                        — Add discover tab to TabBar + register sub/discover subpackage
pages/index/index.tsx                — Insert "为你推荐" section
sub/books/pages/detail/index.tsx     — Add "相关推荐" at bottom
custom-tab-bar/index.tsx             — Add 4th tab
```

### TabBar Change

```
Old: [书架] [分类] [我的]          — 3 tabs
New: [书架] [分类] [发现] [我的]   — 4 tabs
```

New "发现" tab uses compass icon, positioned between 分类 and 我的.

### Homepage "为你推荐" Section

Inserted between reading card and book grid:
- Title row: "🎯 为你推荐"
- Horizontal scrolling cards showing cover + title + progress bar
- Tap navigates to book detail

### Discover Page Layout

Three sections top to bottom:
- **继续阅读** — horizontal cards showing progress %, tap to continue reading
- **你可能喜欢** — horizontal cards, comprehensive recommendations
- **分类精选** — one section per preferred category, vertical list

### Detail Page "相关推荐"

Fixed section at bottom:
- Title: "相关推荐"
- 2-3 small horizontal cards showing cover + title

## Backend File Structure

```
services/recommendation.service.ts   — Scoring engine + Redis caching
controllers/recommendation.controller.ts — 3 route handlers with Zod validation
routes/recommendation.routes.ts      — Route registration
schemas/recommendation.schema.ts     — Response Zod schemas
```

## Redis Caching Strategy

- Homepage recommendations: `rec:home:{userId}:{workspaceId}` — TTL 300s
- Discover page: `rec:discover:{userId}:{workspaceId}` — TTL 300s
- Similar books: `rec:similar:{bookId}:{workspaceId}` — TTL 600s (less personal, cache longer)
- Cache invalidated on: book create/update/delete, reading session create
