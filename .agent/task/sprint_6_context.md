Sprint 6: People UI Revamp & UX Polish

1. Mục Tiêu (Objectives)

Tập trung tối ưu hóa trải nghiệm người dùng (UX) và giao diện (UI) cho phân hệ People và Debt Management. Chuyển đổi từ giao diện nặng nề (nhiều nút, accordion) sang giao diện "Vibe", gọn gàng, tinh tế và tối ưu cho Mobile. Đồng thời khắc phục vấn đề phản hồi chậm (lack of feedback) khi navigate giữa các trang.

2. Phạm Vi Công Việc (Scope)

A. People List Page (/people)

Vấn đề: Card hiện tại quá to, thừa khoảng trắng, nhiều text button gây rối mắt.

Giải pháp: Redesign theo phong cách Compact Card.

Thông tin (Date, Balance, Count) gom gọn thành 1 dòng badges.

Actions (Lend, Repay, View Details): Chuyển thành Icon Buttons hình vuông, không text.

Visual: Tăng mật độ hiển thị nhưng vẫn giữ độ thoáng (breathing room) bằng spacing hợp lý.

B. People Details Page (/people/[id])

Vấn đề:

Sử dụng Accordion/Collapse cho các kỳ nợ (Debt Cycles) gây cảm giác cũ kỹ và rối.

Quá nhiều nút thao tác (Global actions + Item actions) xuất hiện cùng lúc gây "loãng" (cognitive load cao).

Giải pháp:

Master-Detail / Active State Logic: Bỏ Accordion. Hiển thị danh sách các kỳ nợ sạch sẽ. Khi click vào một kỳ -> Set trạng thái active (loading indicator nếu cần) -> Hiển thị chi tiết và Actions (Lend/Repay) tương ứng cho kỳ đó.

Header Actions: Giữ lại Re-sync (quan trọng), +1 Paid. Ẩn/Bỏ các nút thừa hoặc gom nhóm thông minh.

Logic: Tuyệt đối giữ nguyên logic tính toán nợ, logic split-bill, và các server actions hiện tại. Chỉ thay đổi lớp View (Presentation Layer).

C. Global UX

Vấn đề: Trên môi trường Production (Vercel), việc navigate giữa các trang (Server Components) không có chỉ báo, người dùng không biết hệ thống đang chạy.

Giải pháp: Tích hợp nextjs-toploader hoặc Global Progress Bar để hiển thị trạng thái chuyển trang/loading ngay lập tức.

3. Design Guidelines (Vibe Code)

Shape: Ưu tiên nút hình vuông (aspect-square) cho actions phụ, Bo góc mềm mại (rounded-xl hoặc rounded-2xl) cho Card.

Typography: Sử dụng font size nhỏ hơn cho metadata (text-xs, text-muted-foreground). Số tiền nổi bật nhưng tinh tế.

Feedback: Mọi tương tác click (chọn kỳ nợ, toggle) đều phải có Visual Feedback (loading spinner nhỏ, opacity change, hoặc border highlight).

4. Tài Liệu Tham Khảo (References)

User Mockups: Pic4 (List View), Hình 3 & 5 (Details View mới).

Existing Codebase: src/components/people/*.