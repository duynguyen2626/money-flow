Prompt Cho Agent: Thực Thi Sprint 7 - Cashback Matrix UI

Role: Senior Frontend Engineer & Data Viz Expert.
Context: User phàn nàn UI cũ phải expand/collapse quá cực. Cần giải pháp xem dữ liệu nhanh, trực quan.

Nhiệm vụ: Xây dựng Dashboard Cashback mới với tư duy "Matrix View".

Bước 1: Data Transformation (src/lib/cashback-matrix.ts)

Viết hàm xử lý dữ liệu (chạy trên Server hoặc Client):

Input: List transactions của năm.

Process:

Tạo map 12 tháng cho từng Account.

Tính In (Cashback/Reward), Out (Spend), Fee.

Tính Net = In - Fee (hoặc công thức phức tạp hơn nếu có).

Output: Array các objects:

type CashbackMatrixRow = {
  account: Account;
  months: { [key: number]: { in: number, out: number, profit: number } }; // 1-12
  totalProfit: number;
  bestMonth: number;
}


Bước 2: Desktop UI - The Matrix Table

Tạo component CashbackMatrixTable (chỉ hiện trên md:block):

Sử dụng Table shadcn.

Cột đầu tiên sticky left: Tên Account + Logo.

Các cột tháng: Chỉ hiện số Profit.

Nếu Profit > 0: Text xanh, background xanh nhạt.

Nếu Profit < 0: Text đỏ.

Nếu Profit == 0: Text mờ.

Cột cuối: Total Profit (Bold, size lớn hơn).

Bước 3: Mobile UI - Smart Cards

Tạo component CashbackMobileList (chỉ hiện trên md:hidden):

Render list các Account dưới dạng Card gọn gàng.

Content Card:

Header: Logo + Tên Account.

Body:

Hiển thị Total Profit thật to.

Hiển thị dòng text phụ: "Tháng tốt nhất: T12 (+500k)".

Interaction:

Tap vào Card -> Mở Sheet (Slide-over) hiển thị chi tiết:

Header Sheet: Tổng kết Account.

Body Sheet: List 12 dòng (Tháng 1 -> 12). Dòng nào có dữ liệu thì highlight. Dòng nào trống thì làm mờ hoặc ẩn.

Bước 4: Refactor Page (src/app/cashback/page.tsx)

Tích hợp cả 2 view trên.

Sử dụng Tab hoặc Toggle để filter: "Credit Cards" vs "Volunteer Accounts".

Giữ logic chọn Năm (Year Picker).

Lưu ý:

Đừng xóa logic tính toán cũ, hãy move nó vào src/lib/legacy-cashback.ts nếu cần tham khảo, nhưng code mới phải sạch.

Ưu tiên dùng CSS Grid cho Matrix Table để align cột cho chuẩn.

Hãy bắt đầu bằng việc định nghĩa type và function transform dữ liệu trước.