-- Add display_name column to batches table to distinguish from sheet_name (which is used for Google Script)
ALTER TABLE "public"."batches" 
ADD COLUMN IF NOT EXISTS "display_name" text;
