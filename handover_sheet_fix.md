# Handover: Sheet Sync Robustness Fix (Round 9)

## Issue Analysis
-   User report: "Sync (xóa sheet cũ) Không thấy tạo lại".
-   Nguyên nhân dự đoán: Trường hợp payload không có `cycleTag` và `rows` rỗng (hoặc lỗi), code cũ dẫn đến `cycleTag = null` -> `insertSheet(null)` có thể gây lỗi hoặc tạo sheet không đúng tên, dẫn đến các bước sau bị fail.

## Fix Applied (`integrations/google-sheets/people-sync/Code.js`)
-   **Default CycleTag**: Nếu không tìm thấy `cycleTag` từ payload hoặc rows, tự động lấy `Current Date` (YYYY-MM).
-   **Explicit Sheet Check**: Thêm kiểm tra `if (!sheet) throw Error` để báo lỗi rõ ràng nếu không tạo được sheet.

## Verification Steps
1.  Chạy lệnh update:
    ```bash
    npm run sheet:people
    ```
2.  Vào Web App -> Sync lại.
    -   Nếu sheet cũ đã bị xóa, script sẽ tạo sheet mới với tên `YYYY-MM` (tháng hiện tại hoặc tháng của transaction).
3.  Kiểm tra trang tính xem đã hiện chưa.
