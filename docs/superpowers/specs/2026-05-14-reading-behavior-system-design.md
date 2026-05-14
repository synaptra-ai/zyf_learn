# Phase 1: Reading Behavior System Design

## Overview

Upgrade BookNest mini-program from "book management tool" to "reading habits + growth product". Phase 1 focuses on the reading behavior system — the foundation for all subsequent phases (recommendations, growth, social).

## Scope

- Reading progress tracking (0-100%)
- Reading time recording with manual timer
- Daily streak system
- Daily reading goal
- Full-stack implementation (backend API + frontend UI)
- Integrated into existing homepage

## Data Model

### Book Model Extensions

Add to existing `Book` model:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| readingProgress | Int | 0 | 0-100 percent |
| lastReadAt | DateTime? (@db.Date) | null | Most recent reading date |
| totalReadingMinutes | Int | 0 | Cumulative reading time |

### New Models

#### ReadingSession

Records a single reading session (timer start → stop).

| Field | Type | Description |
|-------|------|-------------|
| id | String (@id) | cuid |
| userId | String | FK → User |
| bookId | String | FK → Book |
| workspaceId | String | FK → Workspace |
| startTime | DateTime | Session start |
| endTime | DateTime | Session end |
| durationMinutes | Int | Calculated duration |
| note | String? | Optional session note |
| createdAt | DateTime | Record creation time |

Relations: User, Book, Workspace

#### DailyReadingSummary

One record per user per day. Upserted on each session creation.

| Field | Type | Description |
|-------|------|-------------|
| id | String (@id) | cuid |
| userId | String | FK → User |
| workspaceId | String | FK → Workspace |
| date | DateTime (@db.Date) | Which day |
| totalMinutes | Int | Total reading minutes that day |
| streakDays | Int | Consecutive reading days as of this date |
| goalMet | Boolean | Whether daily goal was met |
| bookCount | Int | Number of distinct books read that day |

Unique constraint: `@@unique([userId, workspaceId, date])`

#### ReadingGoal

User's daily reading target, one per workspace.

| Field | Type | Description |
|-------|------|-------------|
| id | String (@id) | cuid |
| userId | String | FK → User |
| workspaceId | String | FK → Workspace |
| dailyGoalMinutes | Int | Default 30 |
| isActive | Boolean | Default true |

Unique constraint: `@@unique([userId, workspaceId])`

## API Endpoints

All endpoints use existing `/api/v1` prefix, JWT auth, and Workspace context.

### Reading Sessions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/reading-sessions` | Create session (called when timer stops) |
| GET | `/api/v1/reading-sessions?date=YYYY-MM-DD` | List sessions for a specific day |
| GET | `/api/v1/reading-sessions/timeline?days=7` | Aggregated timeline for last N days |

### Reading Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/reading/daily?date=YYYY-MM-DD` | Single day summary |
| GET | `/api/v1/reading/summary` | Homepage card data (today + streak + goal + recent 7 days) |

### Reading Goal

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/reading/goal` | Get current goal |
| PUT | `/api/v1/reading/goal` | Update goal (dailyGoalMinutes) |

### Book Progress

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/v1/books/:id/progress` | Update reading progress (0-100) |

### GET /reading/summary Response Shape

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "todayMinutes": 18,
    "dailyGoal": 30,
    "goalMet": false,
    "streakDays": 5,
    "recentDays": [
      { "date": "2026-05-14", "minutes": 18, "goalMet": false },
      { "date": "2026-05-13", "minutes": 32, "goalMet": true }
    ],
    "currentBookId": null,
    "currentBookTitle": null
  }
}
```

## Backend Architecture

### File Structure

Follows existing conventions (Controller → Service → Prisma):

```
backend/src/
├── controllers/reading.controller.ts
├── services/reading.service.ts
├── routes/reading.ts
├── schemas/reading.schema.ts
```

### Core Logic: createSession

1. Calculate `durationMinutes` from `endTime - startTime`
2. Write `ReadingSession` record
3. Update `Book.readingProgress`, `Book.lastReadAt`, `Book.totalReadingMinutes`
4. Upsert `DailyReadingSummary` for today:
   - `totalMinutes` += new session's `durationMinutes`
   - `bookCount` = count distinct bookIds from today's sessions
   - Recalculate `streakDays`:
     - Query yesterday's summary
     - If yesterday exists → `streakDays = yesterday.streakDays + 1`
     - If yesterday missing → `streakDays = 1`
   - `goalMet = totalMinutes >= user.dailyGoalMinutes`

### Streak Rules

- Any reading session on a day counts as a "check-in"
- Streak resets to 1 if the previous day has no summary
- Streak continues across days within the same workspace

### Auth & Permissions

- All reading endpoints require JWT authentication (`authenticate` middleware)
- All reading endpoints require Workspace context (`resolveWorkspace` middleware)
- Reading goals are scoped per workspace

## Frontend Architecture

### Homepage Changes (pages/index/index)

Current: Greeting → Quote → Book list
New: Greeting + Date → **Reading Card** → Book list

Reading card displays:
- Today's reading time vs daily goal
- Current streak (🔥 N days)
- "Start Reading" button → opens timer

### Timer Interaction

1. User taps "Start Reading"
2. Half-screen popup shows book selector (from current bookshelf)
3. Timer starts counting (mm:ss display)
4. User taps "End Reading" → calls `POST /reading-sessions`
5. User can adjust reading progress (0-100%) before saving
6. Homepage card refreshes with new data

### Timeline Page (sub/reading/pages/timeline/index)

New subpackage page, accessible from reading card:

- Weekly overview bar (Mon-Sun, color-coded by goal met)
- Chronological timeline of all reading sessions
- Grouped by date with per-day totals

### New Frontend Files

```
services/reading.ts           — API calls for reading endpoints
components/ReadingCard/       — Today's reading summary card
components/ReadingTimer/      — Timer half-screen popup
components/ReadingTimeline/   — Timeline entry component
```

Follow existing patterns:
- Services use `request.ts` adapter
- Components use SCSS + rpx units
- Data fetching via useState + useEffect (not React Query, per project convention)
- Pages registered in app.config.ts subpackages

### Timer State

Timer state lives in component local state (not a global store):
- `isTimerRunning`, `startTime`, `selectedBookId`, `elapsedSeconds`
- On app background (Taro `useDidHide`): persist current timer start to component state
- On app foreground (`useDidShow`): resume elapsed time calculation
- If user kills app during timer, session is lost (acceptable for Phase 1)

## Out of Scope (Deferred to Later Phases)

- Recommendation system (Phase 2)
- Growth/achievement/badge system (Phase 3)
- Social features (Phase 4)
- Content operations (Phase 5)
- AI assistant, reading reports, export, enhanced visualization (Phase 6)
- Timer persistence across app kills
- Reading reminders/notifications
