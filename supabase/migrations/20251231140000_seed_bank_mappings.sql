-- Seed common Bank Mappings if not exist
INSERT INTO "public"."bank_mappings" ("bank_code", "bank_name", "short_name", "updated_at") VALUES
('VCB', 'Ngân hàng TMCP Ngoại Thương Việt Nam', 'Vietcombank', NOW()),
('BIDV', 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', 'BIDV', NOW()),
('CTG', 'Ngân hàng TMCP Công Thương Việt Nam', 'VietinBank', NOW()),
('VBA', 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam', 'Agribank', NOW()),
('VPB', 'Ngân hàng TMCP Việt Nam Thịnh Vượng', 'VPBank', NOW()),
('MB', 'Ngân hàng TMCP Quân Đội', 'MBBank', NOW()),
('TCB', 'Ngân hàng TMCP Kỹ Thương Việt Nam', 'Techcombank', NOW()),
('ACB', 'Ngân hàng TMCP Á Châu', 'ACB', NOW()),
('VIB', 'Ngân hàng TMCP Quốc tế Việt Nam', 'VIB', NOW()),
('STB', 'Ngân hàng TMCP Sài Gòn Thương Tín', 'Sacombank', NOW()),
('TPB', 'Ngân hàng TMCP Tiên Phong', 'TPBank', NOW())
ON CONFLICT ("bank_code") DO NOTHING;
