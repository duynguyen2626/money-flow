-- Add bank_type column to batches table
ALTER TABLE "public"."batches" 
ADD COLUMN "bank_type" text NOT NULL DEFAULT 'VIB';

-- Add check constraint for allowed bank types (optional but good practice)
ALTER TABLE "public"."batches"
ADD CONSTRAINT "batches_bank_type_check" CHECK ("bank_type" IN ('VIB', 'MBB'));
