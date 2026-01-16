# Handover: Sheet Sync Final Logic (Round 6)

## Final Updates (`integrations/google-sheets/people-sync/Code.js`)

### 1. Bank Info Format
-   **Requirement**: "số nguyên không chấm phẩy" (Raw Integer).
-   **Implementation**: `TEXT(N5;"0")`.
    -   Output Example: `TPBank 0000 NGUYEN VAN A 16525128`.

### 2. Final Price (J) Fix
-   **Issue**: Cột J vẫn hiển thị số dương cho giao dịch "In" (do công thức cũ nhân -1).
-   **Fix**:
    -   Force Clear cột J trước khi set formula mới.
    -   Formula: `=ARRAYFORMULA(IF(F2:F="";"";F2:F-I2:I))`.
    -   Vì F (Amount) đã là số âm (cho In), nên J sẽ tự động âm theo.

### 3. Header Info
-   Đã cập nhật Header version `5.0 (FORMULA REFACTOR)` theo yêu cầu.

## Validated Logic Flow
1.  **Transaction In**: Input dương -> Amount (F) lưu **Âm** (Negative). -> Final Price (J) = F - I = **Âm**. -> Summary In (Row 2) = SumIfs(In) = **Âm**.
2.  **Transaction Out**: Input dương -> Amount (F) lưu **Dương**. -> Final Price (J) = F - I = **Dương**. -> Summary Out (Row 3) = SumIfs(Out) = **Dương**.
3.  **Remains**: Sum(J) = Net Debt.
    -   User nợ mình (Out nhiều): Dương.
    -   Mình nợ user (In nhiều): Âm.

## Deployment
Chạy lại lệnh update:

```bash
npm run sheet:people
```
