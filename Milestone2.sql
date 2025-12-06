-- ============================================================================
-- MILESTONE 2: SIMPLE LEDGER SCHEMA
-- Context: Switch from Double-Entry to Single-Entry for stability and debugging.
-- ============================================================================

BEGIN;

-- 1. XÓA BẢNG CŨ (DANGER ZONE)
DROP TABLE IF EXISTS "public"."transaction_lines" CASCADE; -- Xóa bảng lines phức tạp
DROP TABLE IF EXISTS "public"."transactions" CASCADE;
DROP TABLE IF EXISTS "public"."batch_items" CASCADE;
DROP TABLE IF EXISTS "public"."batches" CASCADE;

-- 2. TẠO BẢNG TRANSACTIONS MỚI (ALL-IN-ONE)
CREATE TABLE "public"."transactions" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "occurred_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Core Info
    "amount" NUMERIC(15, 2) NOT NULL, -- Số tiền (Âm: Chi/Chuyển đi, Dương: Thu/Nhận)
    "type" TEXT NOT NULL, -- 'expense', 'income', 'transfer'
    "note" TEXT,
    
    -- Links
    "account_id" UUID REFERENCES "public"."accounts"("id") ON DELETE CASCADE, -- Tài khoản chính (Nguồn)
    "target_account_id" UUID REFERENCES "public"."accounts"("id"), -- Tài khoản đích (Nếu là Transfer)
    "category_id" UUID REFERENCES "public"."categories"("id"),
    "person_id" UUID REFERENCES "public"."profiles"("id"), -- Nếu liên quan đến nợ
    "shop_id" UUID REFERENCES "public"."shops"("id"),
    
    -- Advanced Tracking
    "tag" TEXT, -- Cycle Tag (NOV25)
    "linked_transaction_id" UUID, -- Dùng cho Refund link về gốc
    
    -- Metadata (JSON) cho các thứ linh tinh (Slot, Batch ID, etc)
    "metadata" JSONB DEFAULT '{}'::jsonb
);

-- 3. TẠO VIEW TÍNH SỐ DƯ (Thay cho Trigger phức tạp)
-- View này tự động tính In/Out/Balance cho Account từ bảng Transactions
CREATE OR REPLACE VIEW "public"."view_account_stats" AS
SELECT 
    a.id as account_id,
    a.name,
    -- Tổng tiền vào: Income OR Transfer In (là dòng Transfer mà target = account này)
    COALESCE((SELECT SUM(amount) FROM transactions WHERE account_id = a.id AND amount > 0), 0) +
    COALESCE((SELECT SUM(ABS(amount)) FROM transactions WHERE target_account_id = a.id), 0) 
    as total_in,
    
    -- Tổng tiền ra: Expense OR Transfer Out
    COALESCE((SELECT SUM(amount) FROM transactions WHERE account_id = a.id AND amount < 0), 0)
    as total_out
FROM "public"."accounts" a;

COMM