# Phase 4: Social Features Design

## Overview

Add three social features: reading report share card, activity feed (读书圈), and review likes.

## Scope

1. **阅读报告分享卡片** — Generate a reading summary card (monthly stats + achievements), shareable to WeChat
2. **读书圈动态流** — Activity feed showing workspace members' reading activities
3. **书评点赞** — Like/unlike reviews with like count

## Out of Scope

- Direct messaging
- Friend system outside workspace
- Comments on activities
- Notification for social events

## Feature 1: Reading Report Share Card

### API: `GET /api/v1/social/report`

Returns reading stats for share card:

```json
{
  "code": 0,
  "data": {
    "user": { "nickname": "微信用户" },
    "booksFinished": 6,
    "totalMinutes": 387,
    "streakDays": 2,
    "achievements": 5,
    "topCategory": "历史",
    "period": "2026年5月"
  }
}
```

Logic: Aggregate from existing Book, ReadingSession, DailyReadingSummary, UserAchievement data for current month.

### Frontend: Me page share button

Add "分享阅读报告" button in me page. Uses `Taro.showShareAppMessage` or `Taro.canvasToTempFilePath` to generate a share image.

Simple approach: Use `useShareAppMessage` with text summary (no canvas image generation to keep scope small).

## Feature 2: Activity Feed (读书圈)

### New Table: ActivityFeedItem

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| type | String | Enum: BOOK_FINISHED, ACHIEVEMENT_UNLOCKED, REVIEW_POSTED, GOAL_MET |
| content | String | JSON payload with type-specific data |
| userId | String | FK to User (who did the action) |
| workspaceId | String | FK to Workspace |
| createdAt | DateTime | When the activity happened |

Unique constraint: none (multiple activities per user per day).
Index on (workspaceId, createdAt) for feed query.

### API: `GET /api/v1/social/feed?page=1&pageSize=20`

Returns workspace activity feed:

```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "xxx",
        "type": "BOOK_FINISHED",
        "content": { "bookTitle": "国富论", "bookAuthor": "亚当·斯密" },
        "user": { "nickname": "测试用户" },
        "createdAt": "2026-05-15T10:00:00Z"
      }
    ],
    "total": 30,
    "page": 1,
    "pageSize": 20
  }
}
```

### API: `POST /api/v1/social/feed` (internal trigger)

Not a direct API. Feed items are created by backend service when:
- Book status changes to FINISHED
- Achievement is unlocked (in achievement.service.ts)
- Review is created
- Daily goal is met

### Frontend: Discover page feed section

Add a "读书圈" section at the bottom of the discover page showing recent activities.

## Feature 3: Review Likes

### New Table: ReviewLike

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String | FK to User |
| reviewId | String | FK to Review |
| createdAt | DateTime | When liked |

Unique constraint: (userId, reviewId).

### API: `POST /api/v1/reviews/:reviewId/like`

Toggle like (if already liked, unlike). Returns updated like count.

```json
{ "code": 0, "data": { "liked": true, "likeCount": 5 } }
```

### API: `GET /api/v1/reviews/:reviewId/like-status`

Returns whether current user liked this review and total count.

### Frontend: Book detail page review section

Add a heart icon + like count next to each review. Tap to toggle like.

## Backend File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `services/social.service.ts` | Report generation + feed creation/query |
| `controllers/social.controller.ts` | Social route handlers |
| `routes/social.routes.ts` | Social route registration |
| `services/review-like.service.ts` | Like toggle + status |
| `controllers/review-like.controller.ts` | Like route handlers |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add ActivityFeedItem + ReviewLike models |
| `routes/index.ts` | Mount social + review-like routes |
| `services/achievement.service.ts` | Create feed item on unlock |
| `services/reading.service.ts` | Create feed item on session complete |
| `services/book.service.ts` | Create feed item on status change to FINISHED |

## Frontend File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `services/social.ts` | Social API calls (report, feed) |
| `services/review-like.ts` | Like API calls |

### Modified Files

| File | Change |
|------|--------|
| `pages/me/index.tsx` | Add "分享阅读报告" button with share |
| `pages/discover/index.tsx` | Add "读书圈" feed section at bottom |
| `sub/books/pages/detail/index.tsx` | Add like button to reviews |
