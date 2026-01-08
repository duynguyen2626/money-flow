Prompt Cho Agent: Thực Thi Sprint 6 - People UI Redesign

Role: Senior Frontend Engineer & UI/UX Specialist.
Context: Dự án Money Flow 3 (Next.js, Tailwind, Supabase). Chúng ta đang move sang Sprint 6.

Nhiệm vụ chính:
Viết lại UI cho trang People và People Details dựa trên yêu cầu mới. Giữ nguyên toàn bộ Logic/Data fetching, chỉ thay đổi JSX và CSS styling.

Phần 1: Cài đặt Global Navigation Indicator (Ưu tiên cao)

Vấn đề: Click link trên Vercel không thấy phản hồi.

Hãy cài đặt thư viện nextjs-toploader (hoặc tương tự).

Thêm nó vào src/app/layout.tsx để đảm bảo khi user click chuyển trang, một thanh progress bar mỏng, tinh tế sẽ chạy trên đầu trang.

Phần 2: Redesign People List (src/components/people/person-card.tsx)

Thiết kế lại PersonCard để gọn gàng hơn (Compact Mode):

Layout: Dùng Card của shadcn. Padding nhỏ (p-3 hoặc p-4).

Header: Avatar + Tên người (Bold) + Tổng nợ hiện tại (Màu xanh/đỏ tùy âm dương).

Metadata Row: Tạo một dòng duy nhất bên dưới tên chứa các badges:

[Tháng-Năm] (Ví dụ: 12-2025)

[Số tiền] (Ví dụ: 67k)

[+3] (Số lượng bills - nếu có)

Dùng Badge variant secondary hoặc outline, size nhỏ.

Action Row (Bottom/Right):

Thay thế các nút "Lend", "Repay" to đùng bằng Icon Buttons (Hình vuông, size="icon", variant="ghost" hoặc outline).

Thêm icon con mắt (Eye từ lucide-react) để điều hướng vào trang chi tiết.

Sắp xếp: [Lend Icon] [Repay Icon] [Eye Icon].

Phần 3: Redesign People Details (src/app/people/[id]/page.tsx & components con)

Tái cấu trúc giao diện chi tiết người dùng:

Header:

Làm gọn lại. Chỉ giữ nút Re-sync (Icon + Text nhỏ), +1 Paid (Badge clickable hoặc nút nhỏ).

Ẩn bớt các nút Quick Debt, Fix Old Data nếu không cần thiết, hoặc đưa vào Menu ... (Dropdown).

Debt Cycle List (Thay thế Accordion):

Không dùng Accordion (Expand/Collapse) nữa.

Chuyển sang dạng "Selectable List" (Danh sách chọn).

Hiển thị danh sách các kỳ nợ dưới dạng các Cards nhỏ hoặc List Items.

Khi user click vào một Item -> Item đó chuyển sang trạng thái Selected/Active (Highlight border hoặc Background).

Chỉ khi Active: Mới hiện ra 2 nút Quick Lend và Quick Repay ngay trong item đó (hoặc toolbar dính kèm item).

Hiển thị loading spinner (Loader2 animate-spin) ngay tại item khi đang fetch data chi tiết của kỳ đó.

Tối ưu không gian:

Loại bỏ các khoảng trắng thừa thãi.

Đảm bảo nhìn trên Mobile hiển thị được nhiều kỳ nợ nhất có thể mà không cần scroll quá nhiều.

Yêu cầu kỹ thuật:

Sử dụng lucide-react cho icons (Eye, HandCoins, Banknote, RefreshCcw, etc.).

Đảm bảo Responsive (Mobile First).

Quan trọng: Không được xóa bất kỳ logic tính toán nợ, logic đồng bộ sheet hay server actions nào. Chỉ wrap chúng vào UI mới.

Hãy bắt đầu thực hiện Phần 1 và Phần 2 trước. Sau đó show code để review rồi mới làm tiếp Phần 3.