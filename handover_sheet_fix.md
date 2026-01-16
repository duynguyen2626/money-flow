# Handover: Sheet Sync Final Logic (Round 5)

## Final Updates (`integrations/google-sheets/people-sync/Code.js`)

### 1. Remains & Layout
-   **Remains (Row 5)**: Đặt ở dòng 5 (giữa Total Back và Bank Info).
    -   Formula: `=SUM(J2:J)`.
    -   Lý do: Cột J (Final Price) giờ đã tính theo dấu (Amount - Back).
        -   In (Âm) - Back (0) = Âm.
        -   Out (Dương) - Back (Dương) = Dương (Net Cost).
        -   Sum(J) = Tổng thu chi thực tế (Net Debt).
-   **Bank Info (Row 6)**: Đặt ở dòng 6 (cuối cùng).
    -   Formula: `=BankInfo!A2 & " " & BankInfo!B2 & " " & BankInfo!C2 & " " & TEXT(N5;"#,##0")`.
    -   Tự động hiển thị số tiền Remains (N5) ở cuối chuỗi thông tin ngân hàng.

### 2. Formulas
-   **In (Gross)**: Amount hiển thị số **Âm**.
-   **Out (Gross)**: Amount hiển thị số **Dương**.
-   **Final Price (J)**: `=F - I`. (Amount - Total Back). Đơn giản hóa logic mảng.

### 3. Stability
-   **Ghost Rows**: Vẫn giữ logic Clear L:N trước khi insert để tránh lỗi duplicate bảng summary.

## Check List Deployment
1.  Chạy lại lệnh update: `'npm run sheet:people'`.
2.  Chạy Sync lại data trên web app.
3.  Check kết quả trên Sheet:
    -   Row 5: Remains. Row 6: Bank Info (kèm số tiền).
    -   Cột Amount: In là số âm.
    -   Cột Final Price: In là số âm.
    -   Bảng Summary: In màu xanh đậm, Out màu đỏ đậm, Back màu xanh biển.
