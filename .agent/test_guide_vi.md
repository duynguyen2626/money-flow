# Hướng Dẫn Verify & Test (Sprint 5.2)

Tài liệu hướng dẫn verify các tính năng đã hoàn thành và note lại phần đang dở (V2).

## 1. Google Sheet Sync (Đã hoàn thành)
**Mục tiêu:** Verify tính năng sync người dùng và bank info.

1.  **Chạy lệnh Sync:**
    *   Mở terminal tại root.
    *   Chạy `npm run sheet:people`.
    *   Check output: "Pushed to ALL 4 profiles... Deployed Successfully".
2.  **Verify trên Sheet:**
    *   Mở Google Sheet của bất kỳ người nào (link trong DB hoặc hỏi User).
    *   Check tab `BankInfo` (nếu có) hoặc header row (5-6) của các sheet tháng.
    *   **Logic đúng:**
        *   Row 5 (Remains): Tổng tiền còn lại (đã trừ đi Total Back).
        *   Row 6 (Bank Info): Format `BankName STK NAME Amount`. Số tiền phải khớp với Row 5.
        *   Cột J (Final Price): Tính đúng công thức `Amount - FixedBack - PercentBack`. Column F là số âm nếu là "In".

## 2. Transaction V1 (Hiện tại)
**Mục tiêu:** Verify tính năng thêm mới giao dịch vẫn hoạt động ổn định.

1.  **Truy cập:** `http://localhost:3000/transactions`.
2.  **Verify:**
    *   Bấm nút **Add Transaction** (Góc phải trên).
    *   Modal cũ (V1) hiện lên.
    *   Điền thử 1 transaction -> Save.
    *   Check list transaction cập nhật.

## 3. Transaction Slide V2 (PAUSED)
**Trạng thái:** Tạm dừng do vấn đề layout UI phức tạp.
**URL:** `http://localhost:3000/txn/add-v2`

*   Hiện tại page này chỉ hiện thông báo "Coming Soon / Paused".
*   **TODO cho Next Agent:**
    *   Redesign lại `LendingTab`.
    *   Giải quyết vấn đề layout: DatePicker vs Cycle Tag gộp/tách.
    *   Integrate lại vào `UnifiedTransactionsPage` khi hoàn thiện.

## 4. Kiểm tra Database Schema
Check `database/SCHEMA.md` để nắm cấu trúc mới nhất (đã update batch settings, bank info fields).
