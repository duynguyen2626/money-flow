# Handover: Sheet Sync Final Fixes (Round 3)

## Critical Fixes for Sheet Sync (`Code.js`)

### 1. "Ghost Rows" & Duplicate Summary Table Fix
-   **Root Cause**: Lệnh `insertRows` (khi thêm giao dịch mới) đẩy toàn bộ cột L:N xuống dưới, tạo ra các dòng trống có border cũ (ghost rows) và nhân bản bảng Summary.
-   **Solution**: Đã thêm logic **Clear sạch cột L:N** ngay đầu hàm `handleSyncTransactions`, **TRƯỚC** khi bất kỳ lệnh `insertRows` nào được thực thi. Điều này đảm bảo bảng Summary luôn được vẽ lại từ đầu ở đúng vị trí cố định (L1:N6) mà không bị ảnh hưởng bởi việc thêm dòng data.

### 2. Remains Formula Update
-   **Logic**: Chuyển sang công thức Gross đơn giản dễ hiểu theo yêu cầu:
    `Remains = In (Gross) - Out (Gross) + Total Back`.
    (Công thức Excel: `=N2-N3+N4`).
-   **In/Out**: Vẫn hiển thị Amount (Gross, chưa trừ cashback) để user dễ đối chiếu.

### 3. ArrayFormulas Restored
-   Đã verify và giữ nguyên `ensureArrayFormulas` cho cột I và J.
-   **Lưu ý**: Cột J (Final Price) dùng logic:
    -   Nếu là **Out**: `Amount - Cashback`. (Dương = Chi tiêu).
    -   Nếu là **In**: `(Amount - Cashback) * -1`. (Âm = Trả nợ/Thu nhập).
    -   Đây là logic mặc định của sheet hiện tại.

### 4. Background White
-   Đảm bảo các dòng data có background màu trắng (`#FFFFFF`) để không bị xám như Header.

## Deployment
**BẮT BUỘC** chạy lệnh sau để push code mới lên Google Script:

```bash
npm run sheet:people
```

## Verification Steps
1.  Mở Google Sheet của 1 person.
2.  Chạy Sync lại data.
3.  Kiểm tra:
    -   Không còn các dòng trống có border (ghost rows) phía trên bảng Summary.
    -   Bảng Summary nằm gọn ở góc phải trên cùng.
    -   Dòng Remains có công thức `=N2-N3+N4` (hoặc tương tự) dễ hiểu.
    -   Cột I, J có công thức mảng tự động tràn xuống dưới.
