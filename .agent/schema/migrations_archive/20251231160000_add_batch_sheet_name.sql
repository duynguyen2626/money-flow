-- Add sheet_name column to batches table
ALTER TABLE "public"."batches" 
ADD COLUMN IF NOT EXISTS "sheet_name" text;
