# Phase 3: Growth & Achievement System Design

## Overview

Add an achievement/badge system that rewards reading milestones with social sharing. Achievements auto-unlock based on existing reading behavior data and display in the "我的" page.

## Scope

- Achievement definitions (6 categories, ~18 badges)
- Auto-unlock on reading milestones
- Achievement display in "我的" page
- Share achievement card to WeChat friends
- Backend API for achievements

## Out of Scope

- Points/level system
- Leaderboards
- Achievement notifications (push)
- Custom achievement creation

## Achievement Definitions

### Reading Streaks
| ID | Name | Condition |
|----|------|-----------|
| streak_3 | 三日成习 | streakDays >= 3 |
| streak_7 | 坚持一周 | streakDays >= 7 |
| streak_14 | 两周不辍 | streakDays >= 14 |
| streak_30 | 月度读者 | streakDays >= 30 |

### Books Finished
| ID | Name | Condition |
|----|------|-----------|
| finish_1 | 初读之喜 | FINISHED books >= 1 |
| finish_5 | 小有所成 | FINISHED books >= 5 |
| finish_10 | 十卷书生 | FINISHED books >= 10 |
| finish_25 | 博览群书 | FINISHED books >= 25 |

### Total Reading Time
| ID | Name | Condition |
|----|------|-----------|
| hours_10 | 十小时旅人 | totalMinutes >= 600 |
| hours_50 | 五十小时探险 | totalMinutes >= 3000 |
| hours_100 | 百小时书虫 | totalMinutes >= 6000 |

### Review Master
| ID | Name | Condition |
|----|------|-----------|
| review_3 | 初涉书评 | Reviews >= 3 |
| review_10 | 评书达人 | Reviews >= 10 |

### Goal Achievement
| ID | Name | Condition |
|----|------|-----------|
| goal_7 | 七日达标 | goalMet count >= 7 |
| goal_30 | 月度全勤 | goalMet count >= 30 |

### Collection
| ID | Name | Condition |
|----|------|-----------|
| collect_20 | 小小书架 | Books >= 20 |
| collect_50 | 满架书香 | Books >= 50 |

## Data Model

### Achievement Template (seeded, not a DB table)

Defined in code as a constant array. Each achievement has: id, name, description, icon (emoji), category, condition function.

### UserAchievement (new table)

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| achievementId | String | Achievement template ID |
| unlockedAt | DateTime | When unlocked |
| userId | String | FK to User |
| workspaceId | String | FK to Workspace |

Unique constraint on (userId, workspaceId, achievementId).

## API Design

### `GET /api/v1/achievements`

Returns all achievement templates with user's unlock status.

**Response:**
```json
{
  "code": 0,
  "data": {
    "achievements": [
      {
        "id": "streak_3",
        "name": "三日成习",
        "description": "连续阅读3天",
        "icon": "🔥",
        "category": "streak",
        "unlocked": true,
        "unlockedAt": "2026-05-14T10:00:00Z",
        "progress": { "current": 7, "target": 3 }
      }
    ],
    "stats": {
      "unlocked": 5,
      "total": 18
    }
  }
}
```

### `POST /api/v1/achievements/check`

Checks all achievements against current user data, unlocks any new ones. Called after reading session completion, book finish, review creation, etc.

**Response:**
```json
{
  "code": 0,
  "data": {
    "newlyUnlocked": [
      { "id": "streak_7", "name": "坚持一周", "icon": "🔥" }
    ]
  }
}
```

## Frontend Design

### Modified Files

| File | Change |
|------|--------|
| `pages/me/index.tsx` | Add achievement section with badge grid + share button |
| `pages/me/index.scss` | Achievement section styles |

### No New Files

The achievement display is integrated into the existing "我的" page. Achievement templates are defined in backend service, not frontend.

### "我的" Page Achievement Section

Added below the user profile header:
- Progress bar: "已解锁 5/18"
- 3-row badge grid showing all achievements (unlocked = colorful, locked = gray)
- Tap unlocked badge → share card to WeChat

### Share Card

Uses `useShareAppMessage` to share an achievement. The shared card shows the badge icon + name + description + "在BookNest解锁了新成就" text.

## Backend File Structure

| File | Responsibility |
|------|---------------|
| `services/achievement.service.ts` | Achievement definitions + unlock logic + query |
| `controllers/achievement.controller.ts` | 2 route handlers |
| `routes/achievement.routes.ts` | Route registration |
| `schemas/achievement.schema.ts` | Response schemas |

## Auto-Check Triggers

The `POST /achievements/check` endpoint should be called by:
- After `createReadingSession` in reading.service.ts
- After `updateProgress` (book might reach 100%) in reading.service.ts
- After review creation in book routes
- After book creation

Rather than coupling these, the frontend calls `/achievements/check` after relevant actions.
