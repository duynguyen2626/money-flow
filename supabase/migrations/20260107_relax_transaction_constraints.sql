-- Make account_id nullable to support virtual debt transactions
ALTER TABLE "public"."transactions"
ALTER COLUMN "account_id" DROP NOT NULL;