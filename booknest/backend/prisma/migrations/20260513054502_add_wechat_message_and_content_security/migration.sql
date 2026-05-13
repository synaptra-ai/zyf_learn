-- CreateTable
CREATE TABLE "subscription_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "template_id" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "raw_result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_security_checks" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "user_id" TEXT,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "content_type" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'WECHAT',
    "raw_result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_security_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_service_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "scene" TEXT NOT NULL,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_service_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_records_user_id_template_id_scene_idx" ON "subscription_records"("user_id", "template_id", "scene");

-- CreateIndex
CREATE INDEX "content_security_checks_target_type_target_id_idx" ON "content_security_checks"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "content_security_checks_status_idx" ON "content_security_checks"("status");

-- CreateIndex
CREATE INDEX "customer_service_events_user_id_scene_idx" ON "customer_service_events"("user_id", "scene");
