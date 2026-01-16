# Handover: Sheet Sync Final Logic (Round 7)

## Final Updates (`integrations/google-sheets/people-sync/Code.js`)

### 1. Header Update (v5.1)
-   Đã cập nhật header file Code.js lên version 5.1 để confirm code mới nhất.
-   Timestamp: 2026-01-16 16:30 ICT.

### 2. Bank Info Format
-   **FIXED**: Sử dụng `TEXT(N5;"0")` để hiển thị số nguyên thô (không có separator).
-   Ví dụ: `... 16525128` thay vì `... 16.525.128`.

### 3. Final Price (J) Logic
-   Code logic hiện tại:
    ```javascript
    sheet.getRange("J2:J").clearContent(); // Clear cũ
    sheet.getRange("J2").setFormula('=ARRAYFORMULA(IF(F2:F="";"";F2:F-I2:I))');
    ```
-   Logic: `Amount (F) - Back (I)`.
-   Vì `Amount` cho giao dịch **In** là số **Âm** -> Kết quả J sẽ là **Âm**.
-   Nếu trên Sheet vẫn thấy Dương, khả năng là do cache hoặc chưa sync lại sau khi deploy mới.

## Check List Deployment
1.  Chạy lại lệnh update:
    ```bash
    npm run sheet:people
    ```
2.  **QUAN TRỌNG**: Vào Web App -> Chạy Sync lại cho People đó.
3.  Kiểm tra Sheet:
    -   Header script (nếu mở script editor) phải là v5.1.
    -   Bank Info: Số tiền không có chấm phẩy.
    -   Final Price: Giao dịch In (màu xanh) phải có giá trị Âm.
