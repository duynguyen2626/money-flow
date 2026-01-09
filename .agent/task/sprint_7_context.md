Sprint 7: Cashback & Profit Intelligence Refactor

1. Mục Tiêu (Objectives)

Tái thiết kế trang /cashback thành Profit Dashboard tập trung vào hiệu suất. Loại bỏ hoàn toàn thao tác thủ công (expand/collapse) rườm rà. Mục tiêu là "One glance insight" (Nhìn một cái hiểu ngay tình hình).

2. Logic Nghiệp Vụ (Core Logic)

A. Data Grouping (Logic "Dồn")

Vấn đề: Cashback thường không về ngay tháng tiêu. Ví dụ: Tiêu tháng 1, 2, 3 nhưng tháng 4 ngân hàng mới trả một cục 500k.

Xử lý:

Given (Chi): Tính vào tháng thực tế quẹt thẻ (để biết vốn bỏ ra).

Received (Thu): Tính vào tháng tiền về (Income).

Profit: Received - (Given * est_cost + Fees).

Hệ quả: Có thể tháng 1, 2, 3 profit bị âm (do chỉ chi), tháng 4 profit dương đột biến. Đây là điều bình thường, UI cần thể hiện rõ điều này để user không hoang mang.

B. Phạm Vi Dữ Liệu

Filter: Chỉ lấy Account có type credit hoặc được gán nhãn cashback/volunteer.

Timeframe: View theo năm (12 tháng).

3. Yêu Cầu Giao Diện (Smart UI - No Accordion)

A. Desktop View: "The Matrix"

Hiển thị một bảng lớn (Table) thống kê toàn cảnh.

Rows: Danh sách Accounts.

Columns: Jan | Feb | ... | Dec | Total Profit.

Visual: Sử dụng kỹ thuật Heatmap (như GitHub contribution).

Lãi cao: Xanh đậm.

Lãi thấp: Xanh nhạt.

Lỗ/Phí: Màu đỏ nhạt.

Không có gì: Màu xám nhạt hoặc ẩn.

B. Mobile View: "Card & Drill-down"

Level 1 (List): Danh sách các thẻ. Mỗi thẻ chỉ hiện:

Tên & Logo Ngân hàng.

Big Number: Tổng Profit trong năm (VD: +5.200.000đ).

Một biểu đồ nhỏ (Sparkline) thể hiện trend 12 tháng ngay trên card.

Không dùng Accordion.

Level 2 (Detail): Khi tap vào thẻ -> Mở Sheet (trượt từ dưới lên) hoặc trang con.

Hiển thị danh sách 12 tháng dạng Timeline dọc.

Rõ ràng: Tháng nào chi bao nhiêu, nhận về bao nhiêu.

4. Technical Assets

Data Source: Cần viết SQL function hoặc xử lý JS để transform data từ Transaction log thành dạng Matrix: { accountId: { jan: 100, feb: -20, ... total: 80 } }.