-- AlterTable
ALTER TABLE "books" ADD COLUMN     "last_read_at" DATE,
ADD COLUMN     "reading_progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_reading_minutes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "reading_sessions" (
    "id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,

    CONSTRAINT "reading_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_reading_summaries" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_minutes" INTEGER NOT NULL DEFAULT 0,
    "streak_days" INTEGER NOT NULL DEFAULT 0,
    "goal_met" BOOLEAN NOT NULL DEFAULT false,
    "book_count" INTEGER NOT NULL DEFAULT 0,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,

    CONSTRAINT "daily_reading_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_goals" (
    "id" TEXT NOT NULL,
    "daily_goal_minutes" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,

    CONSTRAINT "reading_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reading_sessions_user_id_created_at_idx" ON "reading_sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "reading_sessions_workspace_id_created_at_idx" ON "reading_sessions"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "daily_reading_summaries_workspace_id_date_idx" ON "daily_reading_summaries"("workspace_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_reading_summaries_user_id_workspace_id_date_key" ON "daily_reading_summaries"("user_id", "workspace_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "reading_goals_user_id_workspace_id_key" ON "reading_goals"("user_id", "workspace_id");

-- AddForeignKey
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reading_summaries" ADD CONSTRAINT "daily_reading_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reading_summaries" ADD CONSTRAINT "daily_reading_summaries_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_goals" ADD CONSTRAINT "reading_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_goals" ADD CONSTRAINT "reading_goals_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
