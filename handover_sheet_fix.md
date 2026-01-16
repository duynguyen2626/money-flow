# Handover: Sheet Sync Cosmetic Fix (Round 11)

## Issue
-   User report: "sửa dòng bank cho không xuống hàng được không".
-   Hiện tại: `setWrap(true)` khiến text bị xuống dòng nếu quá dài.

## Fix Applied (`integrations/google-sheets/people-sync/Code.js`)
-   Đổi thành `.setWrap(false)` cho ô Bank Info (L6:N6).
-   Kết quả: Text sẽ hiển thị trên 1 dòng duy nhất.

## Final Status
-   **Logic**: Đã xác nhận đúng (In/Out/Remains/J Formula).
-   **Formatting**: Đã fix Grey Rows, Summary Position.
-   **Cosmetic**: Đã tắt Text Wrap cho Bank Info.

## Action
Chạy lệnh update cuối cùng:
```bash
npm run sheet:people
```
