# Hướng dẫn Workflow Hạch toán & Quy tắc Cashback (Advanced)

Tài liệu này giải thích chi tiết cách hệ thống xử lý các quy tắc Cashback nâng cao và các chỉ số mới trong bảng Tài khoản.

---

## 🚀 1. Luồng xử lý Cashback (3-Tier Priority)

Khi bạn nhập một giao dịch, hệ thống sẽ tự động tính toán số tiền hoàn lại dựa trên thứ tự ưu tiên từ cao xuống thấp:

1.  **Ưu tiên 1: Category Rule (Danh mục Đặc biệt)**
    *   Hệ thống kiểm tra xem danh mục giao dịch (VD: Siêu thị, Bảo hiểm, Ăn uống) có được cấu hình tỷ lệ riêng không.
    *   *Ví dụ:* VPBank StepUp hoàn 6% cho Mua sắm Online. Nếu bạn chọn đúng danh mục Mua sắm mã MCC online, tỷ lệ 6% sẽ được áp dụng ngay.

2.  **Ưu tiên 2: Level Default (Hạn mức Chi tiêu)**
    *   Một số thẻ (như VPBank Lady) yêu cầu tổng chi tiêu đạt mốc mới được nâng tỷ lệ hoàn.
    *   *Ví dụ:* Chi tiêu dưới 15 triệu hoàn 7.5% cho Siêu thị. Nếu trên 15 triệu sẽ được nâng lên 15%.
    *   Hệ thống sẽ dựa vào `spent_amount` của kỳ sao kê hiện tại để quyết định Level.

3.  **Ưu tiên 3: Program Default (Tỷ lệ Cơ bản)**
    *   Nếu giao dịch không thuộc danh mục đặc biệt, hệ thống sẽ áp dụng tỷ lệ hoàn cơ bản của thẻ (thường từ 0.1% - 0.3%).

---

## 📊 2. Giải thích các chỉ số Nâng cao (Account Table)

Trong giao diện `Accounts V2`, các chỉ số này giúp bạn quản lý tài chính thông minh hơn:

### **Coverage (Hệ số Bao phủ)**
*   **Ý nghĩa:** Đây là tổng hạn mức tín dụng của "Người khác" (vợ/chồng, người thân) mà bạn đang cầm/quản lý so với số nợ thực tế họ đang nợ.
*   **Mục tiêu:** Giúp bạn biết mình đang "gánh" hộ bao nhiêu nợ và hạn mức còn lại để dự phòng cho gia đình là bao nhiêu.

### **Intelligence Legend (Mã màu thông minh)**
Hệ thống tự động tô màu các con số dựa trên độ lớn của số tiền để bạn nhận diện rủi ro ngay lập tức:
*   🔴 **Đỏ (Nguy cấp):** Số dư > 100,000,000 VND. Cần ưu tiên xử lý hoặc đảo nợ ngay.
*   🟠 **Cam (Cần chú ý):** Số dư từ 50,000,000 - 100,000,000 VND. Đang trong vùng theo dõi chặt chẽ.
*   🟢 **Xanh (An toàn):** Số dư < 50,000,000 VND. Vùng an toàn, hoạt động bình thường.

### **Qualified & Needs Action**
*   **Qualified (Đạt chuẩn):** Thẻ đã chi tiêu đủ mức tối thiểu để **Miễn phí thường niên (Waiver)** hoặc nhận Cashback tối đa.
*   **Needs Action (Cần chi tiêu):** Thẻ chưa đạt mốc chi tiêu. Bạn cần quẹt thêm để tránh bị mất phí hoặc mất quyền lợi.

---

## 🛠️ 3. Mẫu cấu hình (JSON Sample) cho Agent

Nếu bạn muốn Agent (AI) cài đặt giúp, hãy copy mẫu này:

### **VPBank Diamond (10% Ăn uống & Giáo dục)**
```json
{
  "program": {
    "defaultRate": 0.003,
    "maxBudget": 1000000,
    "levels": [{
      "name": "Tiêu chuẩn",
      "minTotalSpend": 0,
      "rules": [
        { "categoryIds": ["ID_AN_UONG"], "rate": 0.1, "maxReward": 1000000 },
        { "categoryIds": ["ID_GIAO_DUC"], "rate": 0.1, "maxReward": 1000000 }
      ]
    }]
  }
}
```

### **VPBank Lady (Bậc thang chi tiêu 15M)**
```json
{
  "program": {
    "defaultRate": 0.001,
    "maxBudget": 600000,
    "levels": [
      {
        "name": "Dưới 15 Triệu",
        "minTotalSpend": 0,
        "rules": [{ "categoryIds": ["ID_SIEU_THI"], "rate": 0.075, "maxReward": 300000 }]
      },
      {
        "name": "Trên 15 Triệu",
        "minTotalSpend": 15000000,
        "rules": [{ "categoryIds": ["ID_SIEU_THI"], "rate": 0.15, "maxReward": 600000 }]
      }
    ]
  }
}
```
