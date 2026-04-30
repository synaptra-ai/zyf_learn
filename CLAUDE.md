# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BookNest is a full-stack book collection management app, structured as a 3-day progressive learning project. The detailed task guides in `tasks/` are the source of truth for what to build each day.

- **Day 1** (`tasks/day1-frontend.md`): Frontend UI with React + TypeScript + Tailwind CSS + Zustand, data in localStorage
- **Day 2** (`tasks/day2-backend.md`): RESTful API with Express + Prisma + PostgreSQL, JWT auth, Controller-Service layered architecture
- **Day 3** (`tasks/day3-integration.md`): Full-stack integration — replace localStorage with real API via Axios + TanStack React Query, Docker Compose deployment

## Development Commands

### Frontend (`booknest/frontend/`)

```bash
npm run dev       # Start dev server on port 4001 (needs vite.config.ts server.port)
npm run build     # Type-check (tsc -b) then build (vite build)
npm run lint      # ESLint
```

Testing uses Vitest — run with `npx vitest` or `npx vitest run path/to/test.tsx`.

### Backend (`booknest/backend/`, planned for Day 2)

```bash
npm run dev           # Start dev server on port 4000
npx prisma migrate dev   # Run DB migrations
npm run prisma:seed      # Seed test data
npm test             # Jest + Supertest
```

### Docker

PostgreSQL runs in Docker on host port 5433 → container port 5432:
```bash
docker run -d --name booknest-pg \
  -e POSTGRES_USER=booknest -e POSTGRES_PASSWORD=booknest123 \
  -e POSTGRES_DB=booknest -p 5433:5432 postgres:16-alpine
```

## Architecture

```
Data flow: UI → React Query Hooks → Axios Client → Express API → PostgreSQL

Frontend:
  Component (UI) → Page (route) → Hook (data) → API Client (HTTP)
  State: Zustand stores (useAuthStore, useThemeStore) + React Query cache

Backend:
  Route → Controller (request handling) → Service (business logic) → Prisma (DB access)
```

## Key Conventions

- Frontend source: `booknest/frontend/src/` with subdirs `components/ui/`, `components/book/`, `pages/`, `stores/`, `hooks/`, `lib/`, `mocks/`, `types/`
- Backend source: `booknest/backend/src/` with subdirs `controllers/`, `services/`, `routes/`, `middleware/`, `lib/`, `utils/`
- Prisma schema: `booknest/backend/prisma/schema.prisma`
- TypeScript strict mode enabled (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)
- API prefix: `/api/v1/`
- Test account: `test@booknest.com` / `password123`

## Data Model

```
User 1→N Book, User 1→N Category, User 1→N Review
Book 1→N Review, Category 1→N Book
```

## Tech Stack by Day

| Day | Stack |
|-----|-------|
| 1 | React 19 / TypeScript 6 / Vite 8 / Tailwind CSS 3 / Zustand / React Hook Form / Zod / React Router v6 / Lucide React / Vitest |
| 2 | Express 4 / TypeScript / Prisma 5 / PostgreSQL 16 / JWT / bcrypt / express-validator / Jest / Supertest |
| 3 | Axios / TanStack React Query 5 / MSW 2 / Docker Compose |

## Current State

Frontend scaffolded with Vite defaults. Task guides in `tasks/` are ready — work through them in order (Day 1 → Day 2 → Day 3).
