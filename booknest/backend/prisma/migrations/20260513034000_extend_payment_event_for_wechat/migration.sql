ALTER TABLE "payment_events" ADD COLUMN "transaction_id" TEXT;
ALTER TABLE "payment_events" ADD COLUMN "out_trade_no" TEXT;
ALTER TABLE "payment_events" ADD COLUMN "event_type" TEXT;
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_provider_transaction_id_key" UNIQUE ("provider", "transaction_id");
