-- Seed MBB-specific bank mappings
-- Format: Name (Code) for MBB
INSERT INTO "public"."bank_mappings" (
        "bank_code",
        "bank_name",
        "short_name",
        "bank_type",
        "updated_at"
    )
VALUES (
        'VBA',
        'Nông nghiệp và Phát triển nông thôn',
        'Agribank',
        'MBB',
        NOW()
    ),
    (
        'VCB',
        'Ngoại thương Việt Nam',
        'Vietcombank',
        'MBB',
        NOW()
    ),
    (
        'BIDV',
        'Đầu tư và phát triển',
        'BIDV',
        'MBB',
        NOW()
    ),
    (
        'CTG',
        'Công Thương Việt Nam',
        'VietinBank',
        'MBB',
        NOW()
    ),
    (
        'VPB',
        'Việt Nam Thịnh Vượng',
        'VPBank',
        'MBB',
        NOW()
    ),
    ('VIB', 'Quốc tế', 'VIB', 'MBB', NOW()),
    (
        'EIB',
        'Xuất nhập khẩu',
        'Eximbank',
        'MBB',
        NOW()
    ),
    ('SHB', 'Sài Gòn Hà Nội', 'SHB', 'MBB', NOW()),
    ('TPB', 'Tiên Phong', 'TPBank', 'MBB', NOW()) ON CONFLICT ("bank_code", "bank_type") DO
UPDATE
SET "bank_name" = EXCLUDED."bank_name",
    "short_name" = EXCLUDED."short_name",
    "updated_at" = NOW();