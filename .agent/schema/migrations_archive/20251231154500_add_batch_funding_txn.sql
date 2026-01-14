-- Add funding_transaction_id column to batches table if it doesn't exist
ALTER TABLE "public"."batches" 
ADD COLUMN IF NOT EXISTS "funding_transaction_id" uuid REFERENCES "public"."transactions"("id") ON DELETE SET NULL;
