# Handover: Sheet Sync & People Navigation Fixes (Round 2)

## Fixes Implemented

### 1. Google Sheets Sync (`integrations/google-sheets/people-sync/Code.js`)
-   **No Duplication**: Logic `clearContent()` và `breakApart()` đã được cập nhật để xóa sạch toàn bộ cột L:N trước khi vẽ lại bảng Summary, đảm bảo không còn tình trạng bảng cũ bị đẩy xuống dưới (Duplicate).
-   **Format as Table**: Các dòng dữ liệu (Data Rows) giờ được set background màu **TRẮNG (#FFFFFF)** thay vì trong suốt (null), giúp tránh việc bị ám màu xám từ format cũ, làm cho nhìn giống Header.
-   **Total Back & Remains**:
    -   **Total Back**: Đã thêm dòng "Total Back" (tổng cột Σ Back) vào bảng Summary.
    -   **Gross In/Out**: "In" và "Out" giờ tính theo cột Amount (Gross) thay vì Final Price (Net), để tách biệt phần Cashback.
    -   **Remains Position**: D dòng "Remains" đã được tách ra và đặt **nằm dưới** phần thông tin Ngân hàng (Bank Info), đúng như yêu cầu.
-   **Bank Info**: Giữ nguyên logic wrap text và độ rộng cột 450px.

### 2. People UI (`src/app/people/[id]/details/member-detail-view.tsx`)
-   **Sheet Link Button**: Đã thêm nút icon "LayoutDashboard" (biểu tượng Sheet) ngay trên header, cạnh tên người dùng. Click vào sẽ mở link Google Sheet (nếu có trong settings).

## Deployment Instructions

### To Apply Sheet Sync Fixes:
**BẮT BUỘC** phải push code Apps Script mới lên Google Sheet:

```bash
npm run sheet:people
# Hoặc phiên bản specific nếu cần
# npm run sheet:people:1
```

### To Verify:
1.  **Sync**: Chạy sync lại 1 người.
2.  **Check Sheet**:
    -   Bảng Summary phải nằm gọn ở trên cùng (L1:N6). Không có bảng thừa ở dưới.
    -   Dòng data phải nền trắng.
    -   Summary có dòng "Total Back".
    -   Dòng "Remains" nằm dưới Bank Info.
3.  **Check UI**: Vào chi tiết 1 người -> Thấy nút Sheet trên header -> Click mở ra sheet đúng.
