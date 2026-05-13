-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "wechat_bound_at" SET DATA TYPE TIMESTAMP(3);
