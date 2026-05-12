-- AlterTable
ALTER TABLE "users" ADD COLUMN "wechat_bound_at" TIMESTAMP,
ADD COLUMN "wechat_open_id" TEXT,
ADD COLUMN "wechat_session_key_hash" TEXT,
ADD COLUMN "wechat_union_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_wechat_open_id_key" ON "users"("wechat_open_id");
