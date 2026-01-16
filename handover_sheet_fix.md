# Handover: Sheet Sync Macros (Round 5)

## New Features (`integrations/google-sheets/people-sync/Code.js`)

### 1. Copy Macros
-   **Menu**: Đã thêm menu `📊 Money Flow` trên thanh công cụ của Google Sheet.
-   **Items**:
    -   `📋 Copy Bank Info`: Mở popup chứa chuỗi Bank Info (kèm số Remains) để user bấm Ctrl+C.
    -   `💰 Copy Remains`: Mở popup chứa số Remains (formatted).
-   **Usage**: Chỉ cần mở Sheet người dùng -> Chọn Menu -> Copy.

### 2. Logic Check
-   **Insert/Delete Rows**: Code đã có cơ chế `clearContent` + `clearFormat` + `breakApart` vùng L:N trước khi insert row. Điều này đảm bảo khi row được insert và đẩy các ô cũ xuống, chúng sẽ là **ô trắng trơn**, không để lại "ghost border" hay rác. Bảng Summary mới sẽ luôn được vẽ đè lên vị trí L1:N6 chuẩn.

## Deployment
**BẮT BUỘC** chạy lệnh update script:

```bash
npm run sheet:people
```

## Verification
1.  **Sync**: Chạy sync.
2.  **Open Sheet**:
    -   Reload trang Sheet để thấy Menu `📊 Money Flow` xuất hiện bên cạnh Help.
    -   Test nút "Copy Bank Info".
    -   Kiểm tra format bảng Summary lần cuối.
