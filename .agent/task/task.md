---
description:  Senior Frontend Engineer & UI/UX Expert
---

ROLE: Senior Frontend Engineer & UI/UX Expert

CONTEXT

Chúng ta đang thực hiện PR fix/people-ui-v2-refactor. Mục tiêu là hoàn thiện trải nghiệm người dùng tại trang chi tiết thành viên (people/[id]) và danh sách giao dịch chi tiết (people/[id]/details), sử dụng bộ component V2. Cần đặc biệt chú ý sửa các lỗi logic về hiển thị nợ và cashback hiện tại.

CRITICAL BUG FIXES & LOGIC

Logic "Paid" (Đã trả):

Hiện tại đang show nhầm cả giao dịch Expense.

Yêu cầu: Chỉ hiển thị các giao dịch mà người đó thực sự trả tiền cho mình (thường là type debt nhưng mang giá trị dương, hoặc giao dịch repayment).

Khi click vào các giao dịch con (được bulk paid từ giao dịch gốc), hệ thống phải trỏ về Transaction gốc và mở Edit Modal (tham chiếu logic cũ trong code details V1).

Logic hiển thị Cashback:

Vấn đề: Danh sách đang hiển thị cả các giao dịch không có cashback.

Yêu cầu: Kiểm tra metadata và các trường cashback_share_percent, cashback_share_fixed. Chỉ hiển thị nếu các giá trị này > 0. (Tham chiếu dữ liệu mẫu: cashback_share_percent: '0.0100' là có cashback).

Timeline Section (Biểu đồ thời gian):

Lọc năm: Nếu đang lọc năm 2026, KHÔNG được hiển thị tháng của năm 2025 (ví dụ Nov 25). Chỉ hiển thị tên tháng (ví dụ: "Feb" thay vì "Feb 25").

Layout: Hiển thị 1 hàng tối đa 6 tháng.

Sắp xếp: Tháng hiện tại nằm ở đầu và giảm dần về trước.

Trạng thái trống: Nếu tháng không có dữ liệu, khi click vào phải hiển thị SVG "No data to show".

Logic Badges "Unpaid (last year)":

Kiểm tra nợ tồn đọng từ năm trước (dựa trên occurred_at trước năm đang filter).

Hiển thị một Badge màu vàng "Unpaid (last year)" phía trước Timeline hiện tại.

Tương tác: Khi click vào badge này, ứng dụng sẽ chuyển filter sang năm trước đó để xem chi tiết.

Cung cấp nút "Back to current year" khi đang xem dữ liệu năm cũ.

TASK OBJECTIVES

Refactor src/app/people/[id]/page.tsx:

Tích hợp Badge "Unpaid (last year)" và logic Timeline mới.

Hiển thị Dashboard tổng quát về nợ (Debt) chuẩn xác.

Refactor src/app/people/[id]/details/page.tsx:

Đảm bảo SimpleTransactionTable lọc đúng loại giao dịch (Paid/Unpaid/Cashback).

Fix lỗi nhảy dữ liệu khi chuyển tab.

UI/UX Enhancement:

Responsive tuyệt đối trên Mobile.

Nhất quán màu sắc: Green (Income/Received), Red (Expense/Spent), Orange (Debt/Unpaid).

Thêm Skeleton Loading khi fetch dữ liệu.

SPECIFIC INSTRUCTIONS FOR AGENT

Kiểm tra kỹ src/hooks/use-person-details.ts để cập nhật logic tính toán nợ theo năm.

Sử dụng Server Actions cho dữ liệu khởi tạo.

Sau khi fix, hãy thực hiện Simulation (giả lập các thao tác) để đảm bảo nút "Back to current year" và logic mở modal transaction gốc hoạt động đúng.

Hãy bắt đầu bằng việc phân tích mã nguồn của DebtTimeline.tsx và use-person-details.ts để đề xuất plan chỉnh sửa trước khi viết code.