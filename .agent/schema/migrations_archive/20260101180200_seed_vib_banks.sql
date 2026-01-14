-- Seed VIB-specific bank mappings (all common banks)
-- Format: Code - Name for VIB
INSERT INTO "public"."bank_mappings" (
        "bank_code",
        "bank_name",
        "short_name",
        "bank_type",
        "updated_at"
    )
VALUES (
        'VCB',
        'Ngân hàng TMCP Ngoại Thương Việt Nam',
        'Vietcombank',
        'VIB',
        NOW()
    ),
    (
        'BIDV',
        'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',
        'BIDV',
        'VIB',
        NOW()
    ),
    (
        'CTG',
        'Ngân hàng TMCP Công Thương Việt Nam',
        'VietinBank',
        'VIB',
        NOW()
    ),
    (
        'VBA',
        'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam',
        'Agribank',
        'VIB',
        NOW()
    ),
    (
        'VPB',
        'Ngân hàng TMCP Việt Nam Thịnh Vượng',
        'VPBank',
        'VIB',
        NOW()
    ),
    (
        'MB',
        'Ngân hàng TMCP Quân Đội',
        'MBBank',
        'VIB',
        NOW()
    ),
    (
        'TCB',
        'Ngân hàng TMCP Kỹ Thương Việt Nam',
        'Techcombank',
        'VIB',
        NOW()
    ),
    (
        'ACB',
        'Ngân hàng TMCP Á Châu',
        'ACB',
        'VIB',
        NOW()
    ),
    (
        'VIB',
        'Ngân hàng TMCP Quốc tế Việt Nam',
        'VIB',
        'VIB',
        NOW()
    ),
    (
        'STB',
        'Ngân hàng TMCP Sài Gòn Thương Tín',
        'Sacombank',
        'VIB',
        NOW()
    ),
    (
        'TPB',
        'Ngân hàng TMCP Tiên Phong',
        'TPBank',
        'VIB',
        NOW()
    ),
    (
        'SHB',
        'Ngân hàng TMCP Sài Gòn - Hà Nội',
        'SHB',
        'VIB',
        NOW()
    ),
    (
        'EIB',
        'Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam',
        'Eximbank',
        'VIB',
        NOW()
    ),
    (
        'MSB',
        'Ngân hàng TMCP Hàng Hải Việt Nam',
        'MSB',
        'VIB',
        NOW()
    ),
    (
        'OCB',
        'Ngân hàng TMCP Phương Đông',
        'OCB',
        'VIB',
        NOW()
    ),
    (
        'SEA',
        'Ngân hàng TMCP Đông Nam Á',
        'SeABank',
        'VIB',
        NOW()
    ),
    (
        'NAB',
        'Ngân hàng TMCP Nam Á',
        'NamABank',
        'VIB',
        NOW()
    ),
    (
        'VAB',
        'Ngân hàng TMCP Việt Á',
        'VietABank',
        'VIB',
        NOW()
    ),
    (
        'PGB',
        'Ngân hàng TMCP Xăng dầu Petrolimex',
        'PGBank',
        'VIB',
        NOW()
    ),
    (
        'BAB',
        'Ngân hàng TMCP Bắc Á',
        'BacABank',
        'VIB',
        NOW()
    ) ON CONFLICT ("bank_code", "bank_type") DO
UPDATE
SET "bank_name" = EXCLUDED."bank_name",
    "short_name" = EXCLUDED."short_name",
    "updated_at" = NOW();