-- Thêm cột metadata để lưu thông tin phụ (như % cashback đã share, fix back...)
ALTER TABLE "public"."transaction_lines" 
ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Cập nhật lại mẫu config cho các thẻ tín dụng (Thêm trường min_spend)
-- Ví dụ: Thẻ VCB cần tiêu tối thiểu 1tr mới được hoàn tiền
UPDATE "public"."accounts"
SET cashback_config = jsonb_set(cashback_config, '{min_spend}', '1000000')
WHERE type = 'credit_card';