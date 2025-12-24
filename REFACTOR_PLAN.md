Kế hoạch Refactor & Fix Bug Money Flow 3

🚨 Phase 1: Fix Build & Lint Errors (Ưu tiên cao nhất - Blocker)

Hiện tại PR không thể deploy do lỗi TypeScript và Build. Cần xử lý ngay các file sau:

src/app/api/batch/stats/route.ts:

Lỗi: Type 'null' is not assignable to type 'string'.

Giải pháp: Kiểm tra null check cho item.name hoặc các trường string khác trước khi xử lý.

src/components/moneyflow/cashback-transaction-table.tsx:

Lỗi: Property 'category' does not exist on type 'Transaction'.

Giải pháp: Kiểm tra lại type Transaction. Có thể cần join bảng categories hoặc update interface Transaction để optional field category.

src/lib/cashback-policy.ts:

Lỗi: Các lỗi liên quan đến type checking logic cashback.

Giải pháp: Standardize các type trả về của hàm tính toán cashback.

📱 Phase 2: Mobile UI & Responsive (Critical UX)

Các lỗi hiển thị trên Mobile ảnh hưởng trực tiếp đến trải nghiệm người dùng.

Modal Add/Edit bị vỡ layout (Hình 3):

Vấn đề: Đang hiển thị 2 cột trên mobile gây chật chội, vỡ form.

Giải pháp: Refactor TransactionForm (hoặc component tương ứng) sử dụng responsive grid:

Mobile: grid-cols-1

Desktop: grid-cols-2

Table Transaction vỡ khi scroll ngang (Hình 2):

Vấn đề: Khi scroll ngang, cột Date/Checkbox bị trôi mất, khó theo dõi dòng nào đang chọn.

Giải pháp:

Áp dụng sticky left-0 và z-index phù hợp cho cột đầu tiên (Checkbox + Date).

Đảm bảo container của table có overflow-x-auto và w-full.

🖥️ Phase 3: Desktop UI & Layout Polish

Tinh chỉnh giao diện desktop theo feedback.

Header không Sticky:

Vấn đề: Scroll xuống mất header.

Giải pháp: Thêm class sticky top-0 z-50 và background mờ (blur) hoặc solid cho component Header trong AppLayout.

Kích thước ảnh Credit Card (Left) lệch với People Image (Right):

Vấn đề: 2 ảnh không cân xứng.

Giải pháp: Trong AccountDetailsView (hoặc component chứa card), set fixed height hoặc aspect ratio đồng bộ cho cả 2 khối ảnh này để chúng luôn cao bằng nhau.

Dư thừa Search Section:

Vấn đề: Đã có nút "Filter and search" nhưng vẫn hiện dropdown "All Types...".

Giải pháp: Trong SmartFilterBar hoặc trang cha, ẩn các input search/filter cũ khi ở màn hình nhỏ hoặc nếu đã tích hợp vào nút Filter chung (kiểm tra điều kiện render).

🧠 Phase 4: Logic & Behavior Improvements

Modal Close Behavior:

Vấn đề: Đóng modal hỏi confirm ngay cả khi chưa nhập gì.

Giải pháp:

Refactor logic useUnsavedChanges hoặc hàm handleClose trong Dialog.

So sánh form.getValues() với defaultValues. Nếu giống nhau (pristine) -> Cho đóng ngay lập tức không cần confirm dialog.

📝 Next Steps (Actionable Prompts)

Sau khi bạn duyệt plan này, tôi sẽ cung cấp các prompt (hoặc trực tiếp code) theo thứ tự:

Fix Build Errors (Prompt fix TS).

Fix Mobile Layout (Prompt refactor CSS/Tailwind).

Fix Logic Modal (Prompt update React Hook/State).