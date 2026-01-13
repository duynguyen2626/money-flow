Prompt cho Antigravity IDE - Operation: UI RESTORE & LOGIC RECOVERY

Role: Bạn là Senior DevOps & Lead Developer. Chúng ta đang gặp sự cố "Regression" nghiêm trọng sau khi merge: UI bị quay về phiên bản cũ (vỡ layout) và logic Refund bị mất.

Mục tiêu (Objective):

Khôi phục UI UnifiedTransactionTable về trạng thái hoàn hảo (như tại commit 47b70d2).

Tìm và mang logic Refund (Request Refund, Cancel Order) từ nhánh cũ PHASE-9.2.1-CASHBACK-PERCENT-ENTRIES-SHEET vào lại codebase hiện tại.

Quy trình thực hiện (Tasks):

Task 1: Thiết lập môi trường an toàn

Hãy chạy các lệnh sau để đảm bảo chúng ta không làm hỏng nhánh chính, và cập nhật đầy đủ danh sách nhánh từ remote:

git fetch --all
git checkout -b fix/ui-restore-and-refund-logic


Task 2: Khôi phục UI (Surgical File Restore)

Vấn đề: File src/components/moneyflow/unified-transaction-table.tsx và các file liên quan đang chứa code cũ (Card layout lỗi).

Hành động: Thay vì sửa tay, hãy checkout đè file từ commit tốt (47b70d2).

Lệnh Git (Agent hãy thực thi):

# Lấy lại file Table chính
git checkout 47b70d2 -- src/components/moneyflow/unified-transaction-table.tsx

# Lấy lại file TableShell (wrapper)
git checkout 47b70d2 -- src/components/app/table/TableShell.tsx

# Lấy lại file CSS transaction columns (nếu có thay đổi width)
git checkout 47b70d2 -- src/components/app/table/transactionColumns.ts


Kết quả mong đợi: Sau bước này, giao diện Table phải quay trở lại dạng Grid gọn gàng, hết lỗi vỡ layout cột Action.

Task 3: "Khai quật" Logic Refund (Logic Recovery)

Vấn đề: User báo cáo mất tính năng "Request Refund" và "Cancel Order 100%". Code này nằm trong branch PHASE-9.2.1-CASHBACK-PERCENT-ENTRIES-SHEET.

Hành động:

Đọc code từ branch đó: Hãy dùng lệnh git show hoặc git checkout tạm thời để xem nội dung file src/actions/transaction-actions.ts và src/components/moneyflow/transaction-table.tsx (hoặc nơi chứa Dropdown Menu) trong nhánh origin/PHASE-9.2.1-CASHBACK-PERCENT-ENTRIES-SHEET.

So sánh & Merge thủ công:

Tìm các Server Action liên quan đến refund, requestRefund, cancelTransaction.

Copy các function đó vào file src/actions/transaction-actions.ts hiện tại.

Cập nhật Menu UI:

Tìm đoạn code hiển thị DropdownMenu (nút 3 chấm/cờ lê) trong file unified-transaction-table.tsx (lúc này đang là bản của commit 47b70d2).

Bổ sung lại các item "Request Refund" và "Cancel Order" vào menu này.

Gắn sự kiện onClick gọi đến các Server Action vừa khôi phục.

Task 4: Kiểm tra lần cuối

Đảm bảo UI là dạng Bảng (Table Grid), các cột thẳng hàng, không có Card bo tròn lỗi.

Đảm bảo Menu Action (...) có đủ các nút Refund.

Hãy bắt đầu bằng Task 1 và Task 2 để user yên tâm về giao diện trước.