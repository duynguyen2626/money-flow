# Hướng dẫn Sử dụng Split Bill V2

Tính năng **Split Bill** (Chia hóa đơn) giúp bạn dễ dàng phân chia số tiền của một giao dịch (Expense/Debt) cho nhiều người tham gia.

## 1. Kích hoạt
1.  Mở form thêm/sửa giao dịch (Transaction Slide).
2.  Chọn loại giao dịch là **Expense** (Chi tiêu) hoặc **Debt** (Cho vay).
3.  Tìm mục **Split Bill** và bật công tắc (Switch) bên cạnh.

## 2. Thêm người tham gia
*   Nhấn nút **`+ Add Person`** để thêm một dòng mới.
*   Chọn người từ danh sách (Dropdown).
*   Nhập số tiền mà người đó cần trả/chia sẻ.

## 3. Các tính năng tự động tính toán
Hệ thống cung cấp 2 công cụ giúp tính toán nhanh:

### A. Split Equally (Chia đều)
*   **Chức năng**: Chia đều tổng số tiền (Amount) cho tất cả những người đang có trong danh sách.
*   **Cách dùng**: Nhấp vào nút "Split Equally".
*   **Lưu ý**: Nếu chia không hết (số lẻ), người đầu tiên trong danh sách sẽ chịu phần dư.

### B. Distribute Rem. (Phân bổ phần dư)
*   **Chức năng**: Tự động chia số tiền **còn lại** (Remaining) cho những người **chưa được nhập số tiền** (số tiền = 0).
*   **Tình huống sử dụng**: Ví dụ tổng bill là 100k. Bạn biết A trả 30k. Còn lại 70k chia đều cho B và C (mà bạn chưa nhập số).
*   **Cách dùng**: 
    1.  Nhập 30k cho A.
    2.  Thêm B và C vào danh sách (để số tiền là 0).
    3.  Nhấn nút "Distribute Rem.". Hệ thống sẽ lấy 70k chia đôi cho B và C (mỗi người 35k).

## 4. Kiểm tra
*   **Total**: Tổng số tiền đã chia.
*   **Remaining**: Số tiền chưa được chia (hoặc bị chia lỗ).
    *   Màu xanh: Đã chia khớp (Remaining = 0).
    *   Màu cam: Còn thừa tiền (Remaining > 0).
    *   Màu đỏ: Chia quá lố (Remaining < 0).

## 5. Lưu ý quan trọng
*   Nếu bạn tắt Split Bill, dữ liệu người tham gia vẫn được giữ ở giao diện nhưng sẽ không được lưu nếu bạn nhấn Save (trừ khi logic code xử lý đặc biệt).
*   Nên đảm bảo **Remaining = 0** trước khi lưu để dữ liệu chính xác.
