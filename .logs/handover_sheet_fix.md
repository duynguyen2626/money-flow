# Handover: Sheet Sync Formatting (Round 13)

## Issue
-   User report 1: Font nút Sheet bị lỗi số 0 gạch chéo (do dùng `font-mono`).
-   User report 2: Cột F, I, J trên Sheet chưa có format dấu chấm phân cách hàng nghìn.

## Fix Applied
1.  **UI (`src/components/people/manage-sheet-button.tsx`)**:
    -   Đổi `font-mono` -> `font-bold` (Sans serif mặc định).
2.  **Sheet Script (`integrations/google-sheets/people-sync/Code.js`)**:
    -   Thêm `setNumberFormat('#,##0')` cho các cột:
        -   Column F (Amount)
        -   Column I (Σ Back)
        -   Column J (Final Price)

## Verification
1.  Check UI nút Sheet: Số 0 tròn trịa, đậm.
2.  Chạy `npm run sheet:people` -> Sync lại Sheet.
3.  Check Sheet: Các cột tiền (F, I, J) hiển thị dạng `1.234.567` (hoặc `,` tùy locale sheet) thay vì số thô.
