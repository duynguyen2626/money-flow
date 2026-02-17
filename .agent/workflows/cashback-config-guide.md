# Cashback Card Configuration Guide

This guide provides the standard JSON structures for configuring advanced cashback rules for specific cards like VPBank Diamond and VPBank Lady.

---

## 🇺🇸 Version: Agent Configuration Guide

### 1. Structure Overview
All advanced rules are stored in the `cashback_config` column (or `cb_rules_json` in the new schema) within the `accounts` table. The structure follows the "3-Tier Policy Resolution": **Category Rule > Level Default > Program Default**.

### 2. VPBank Diamond (Standard Example)
- **Base Rate:** 0.3%
- **Special Categories:** 10% for Dining & Education
- **Monthly Cap:** 1,000,000 VND

```json
{
  "program": {
    "defaultRate": 0.003,
    "maxBudget": 1000000,
    "cycleType": "statement_cycle",
    "statementDay": 20,
    "levels": [
      {
        "id": "lvl_diamond_standard",
        "name": "Diamond Standard",
        "minTotalSpend": 0,
        "rules": [
          {
            "id": "rule_dining",
            "categoryIds": ["dining_cat_id_here"],
            "rate": 0.1,
            "maxReward": 1000000
          },
          {
            "id": "rule_education",
            "categoryIds": ["edu_cat_id_here"],
            "rate": 0.1,
            "maxReward": 1000000
          }
        ]
      }
    ]
  }
}
```

### 3. VPBank Lady (Tiered Example)
- **Base Rate:** 0.1%
- **Tier 1 (< 15M):** 7.5% for Supermarket & Health (Cap 300k)
- **Tier 2 (≥ 15M):** 15% for Supermarket & Health (Cap 300k)
- **Overall Cap:** 600,000 VND

```json
{
  "program": {
    "defaultRate": 0.001,
    "maxBudget": 600000,
    "cycleType": "statement_cycle",
    "statementDay": 25,
    "levels": [
      {
        "id": "lady_standard",
        "name": "Standard (<15M)",
        "minTotalSpend": 0,
        "rules": [
          {
            "categoryIds": ["supermarket_id", "health_id"],
            "rate": 0.075,
            "maxReward": 300000
          }
        ]
      },
      {
        "id": "lady_premium",
        "name": "Premium Tier (≥15M)",
        "minTotalSpend": 15000000,
        "rules": [
          {
            "categoryIds": ["supermarket_id", "health_id"],
            "rate": 0.15,
            "maxReward": 600000
          }
        ]
      }
    ]
  }
}
```

---

## 🇻🇳 Phiên bản: Hướng dẫn dành cho Người dùng (Workflow & Rules)

### 1. Quy trình xử lý (Workflow)
Hệ thống tính Cashback hoạt động dựa trên 3 cấp độ ưu tiên:
1. **Category Rule (Luật theo danh mục):** Nếu giao dịch thuộc danh mục được cấu hình đặc biệt (VD: Ăn uống 10%), hệ thống sẽ ưu tiên dùng tỉ lệ này.
2. **Level Default (Mặc định theo hạn mức chi tiêu):** Nếu tổng chi tiêu trong kỳ đạt một mốc nhất định (VD: >= 15 triệu), tỉ lệ hoàn tiền có thể được nâng cấp.
3. **Program Default (Mặc định thẻ):** Nếu không thuộc danh mục đặc biệt nào, hệ thống sẽ dùng tỉ lệ hoàn tiền cơ bản của thẻ (VD: 0.3%).

### 2. Các chỉ số quan trọng trong Account Table (Advanced)
- **Coverage (Bảo phủ):** Hiển thị tổng hạn mức tín dụng của người khác (người thân/gia đình) so với số nợ hiện tại mà bạn đang quản lý giúp họ. Giúp bạn kiểm soát rủi ro nợ hộ.
- **Qualified (Đạt chuẩn):** Thẻ đã chi tiêu đủ mức tối thiểu để được hưởng quyền lợi hoặc miễn phí thường niên.
- **Needs Action (Cần chi tiêu):** Thẻ chưa đạt mức chi tiêu mục tiêu (Min Spend) để nhận Cashback cao nhất hoặc để được miễn phí thường niên.
- **Intelligence Legend:** Bảng chú giải màu sắc cho các con số:
    - **Đỏ:** Số tiền > 100 Triệu (Cần cực kỳ lưu ý).
    - **Cam:** Số tiền 50 - 100 Triệu (Đang trong vùng theo dõi).
    - **Xanh:** Số tiền < 50 Triệu (Vùng an toàn).

### 3. Cách cấu hình Thẻ VPBank phổ biến
**VPBank Diamond:**
- Chọn ngày chốt sao kê là 20.
- Cài đặt danh mục "Ẩm thực" và "Giáo dục" là 10%.
- Cài đặt Max Budget (Hạn mức hoàn tối đa) là 1,000,000 VND.

**VPBank Lady:**
- Chọn ngày chốt sao kê là 25.
- Cài đặt mốc chi tiêu 15 triệu VND để kích hoạt tỉ lệ 15% cho Siêu thị & Y tế.
- Nếu chi tiêu < 15 triệu, tỉ lệ hoàn cho nhóm này là 7.5%.
- Tổng hoàn tối đa là 600,000 VND.
