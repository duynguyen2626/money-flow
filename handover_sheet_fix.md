# Handover: Sheet Sync Final Adjustments (Round 4)

## Sheet Sync (`integrations/google-sheets/people-sync/Code.js`) Updates

### 1. Layout & Colors
-   **Structure**:
    -   Row 2: In (Gross) - **Dark Green**. Value is **Negative**.
    -   Row 3: Out (Gross) - **Dark Red**. Value is **Positive**.
    -   Row 4: Total Back - **Blue**. Value is **Positive**.
    -   Row 5: Remains - **Below Total Back**. Background: Light Red.
    -   Row 6: Bank Info - **Below Remains**. Background: Light Grey.
-   **Remains Formula**: `=N3+N2-N4` (Out + In - Back).
    -   Example: Out 100, In -90, Back 5. Result = 100 + (-90) - 5 = 5.

### 2. Formulas & Data
-   **In (Gross)**: Logic đã sửa để hiển thị giá trị **Âm** (Negative) trong cột Amount (F) và bảng Summary.
-   **Bank Info**: Sử dụng công thức động tham chiếu sheet `BankInfo` và giá trị Remains hiện tại.
    -   Formula: `=BankInfo!A2 & " " & BankInfo!B2 & " " & BankInfo!C2 & " " & TEXT(N5;"#,##0")`
    -   Lưu ý: Dùng `TEXT(N5;"#,##0")` để format số Remains cho đẹp trong chuỗi text.

### 3. Stability
-   Vẫn giữ logic `Clear L:N` đầu hàm sync để chống ghost rows.
-   Đã verify lại logic insert row không làm vỡ bảng Summary (do bảng Summary luôn được vẽ lại sau cùng).

## Deployment
**BẮT BUỘC** chạy lệnh update script:

```bash
npm run sheet:people
```

## Verification
1.  **Sync**: Chạy sync 1 người.
2.  **Check Table**:
    -   Cột Amount: Transaction "In" phải số âm.
    -   Row data: Nền trắng.
3.  **Check Summary**:
    -   Thứ tự: In -> Out -> Back -> Remains -> Bank.
    -   Màu sắc: In (Xanh đậm), Out (Đỏ đậm), Back (Xanh dương).
    -   Remains: Tính đúng (Out - In - Back).
    -   Bank Info: Hiển thị đúng text ngân hàng kèm số tiền Remains ở cuối.
