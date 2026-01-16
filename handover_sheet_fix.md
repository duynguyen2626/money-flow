# Handover: Sheet Sync Final Fix (Round 8)

## Issue Analysis
-   User report: Cột J (Final Price) vẫn hiển thị số Dương dù Cột F (Amount) là Âm.
-   Nguyên nhân: Có thể do Google Sheet cache công thức cũ hoặc quá trình clear content chưa triệt để, hoặc script chưa thực sự update formula string mới.

## Fix Applied (`integrations/google-sheets/people-sync/Code.js`)
-   **Force J Formula Update**: Thay đổi string formula thành `=ARRAYFORMULA(IF(F2:F="";""; F2:F - I2:I ))` (thêm spaces) để đảm bảo Sheet nhận diện đây là công thức mới.
-   **Aggressive Clear**: Thêm `clearDataValidations()` cạnh `clearContent()` cho cột J.

## Verification Steps
1.  Chạy lệnh update:
    ```bash
    npm run sheet:people
    ```
2.  **BẮT BUỘC**: Vào Web App -> **Chạy Sync lại** (Action: Sync Transactions).
    -   Việc deploy script KHÔNG tự động sửa sheet cũ. Script chỉ chạy khi có request Sync từ App.
3.  Kiểm tra lại cột J.
    -   Click vào ô **J2**, công thức phải là: `=ARRAYFORMULA(IF(F2:F="";""; F2:F - I2:I ))`.
    -   Nếu `F` âm -> `J` phải âm.
4.  Nếu vẫn sai: Vui lòng check xem ô J2 có bị `Override` bằng tay không (xóa hết cột J đi để script điền lại).
