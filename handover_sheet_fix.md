# Handover: Sheet Push Script Update

## Improvements
-   **Auto-Deploy for Single Selection**:
    -   Đã sửa script `push-sheet.mjs` để khi chọn push lẻ (chọn số 1, 2, 3...) thì hệ thống **cũng tự động chạy lệnh deploy** tương tự như khi push ALL.
    -   Việc này giúp tránh tình trạng push code lên nhưng quên deploy khiến Apps Script không nhận code mới.

## Verification
1.  Chạy lệnh: `npm run sheet:people`
2.  Chọn deploy cho **1 người cụ thể** (ví dụ chọn 2 - LAM).
3.  Kết quả mong đợi:
    -   Console báo `PUSHED`.
    -   Console báo tiếp `🚀 Auto-deploying to ...`.
    -   Console báo `✨ Deployed Successfully!`.

**Code.js Status**:
-   Logic In (Negative), Out (Positive), Remains, Bank Info Dynamic đều đã được verify trong code.
