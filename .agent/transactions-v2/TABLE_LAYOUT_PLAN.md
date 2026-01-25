# Kế hoạch layout bảng Transactions V2

## Mục tiêu
- Bảng gọn, rõ nghĩa, không loãng cột; ưu tiên nhìn được flow tiền và trạng thái.
- Badges thẳng hàng một hàng, chiều cao/chiều rộng thống nhất.
- Amount hiển thị công thức để lý giải Final (net).
- Đáp ứng bulk actions, phân trang với URL phản ánh page.

## Cột & thứ tự đề xuất
1) Date
2) Description / Notes (2 dòng, chứa tags phụ nếu cần)
3) Flow: `Accounts ➜ People`
   - Label gợi ý: "Flow (Account ➜ Party)" để bao quát transfer (A ➜ B) và cases không có people.
   - Nội dung: Account nguồn/đích, People (nếu có), Cashback flag, Cycle badge, Tag debt cùng hàng.
4) Category
5) Type
   - Badges có icon; nền cùng độ rộng (min-w cố định) để các badge dài ngắn khác nhau vẫn bằng nhau.
   - Có thể đặt Type trước Flow nếu muốn phân nhóm, nhưng giữ sau Category sẽ dễ quét: [Category][Type][Flow].
6) Status
7) Amount (Original)
8) Amount (Final / Net)
9) Actions

## Chi tiết hiển thị theo cột
- Date: hiển thị dd MMM, cycle badge ("25.10 - 24.11") có thể đặt ở cột Flow để gom badge cùng hàng (xem phần Flow).
- Description/Notes: 2 dòng, truncate; icon copy ID ở đây; tags chức năng (Bulk Paid, Refund, Split flow) đặt cuối dòng thứ hai, cùng hàng, không rớt dòng.
- Flow (Account ➜ Party):
  - Hàng ngang: `[Account A] ➜ [Account B hoặc Party]`.
  - Badge hàng ngang kế bên: Cycle badge, Cashback flag (nếu account có flag), Tag debt. Tất cả badge có cùng chiều cao và min-width.
  - Ảnh account/people: giữ nguyên ratio, cùng height, không bo tròn.
- Category: tên + có thể kèm icon category (vuông, không bo góc ảnh nếu có).
- Type: badge có icon (income/expense/transfer/lend/repay/cashback); nền min-width bằng nhau.
- Status: pill màu (Active=emerald, Pending=amber, Void=slate).
- Amount Original & Final:
  - Căn phải, cùng hàng.
  - Hover mini popover hiển thị công thức: ví dụ `2,000 - cashback 1% (20) - adjust 200 = 1,780`.
  - Có thể thêm badges nhỏ trong ô Final: `-1% cb`, `-200 adj`, hoặc hiển thị line phụ nhỏ mô tả.
- Actions:
  - Hai action nhanh: Edit, Clone (luôn hiện icon). Menu mở rộng (ellipsis) cho Void/Refund/Split.
  - Hàng này không tràn; giữ min-width cố định.

## Badges & kích thước
- Badge nền có min-width cố định (ví dụ 64px), height 24px, text center; icon bên trái, text trung tâm.
- Một hàng duy nhất cho tất cả badge trong cell; nếu nhiều, dùng wrap ngang với gap nhỏ nhưng vẫn một hàng (scroll-x nhẹ nếu tràn trên mobile).

## Cashback flag & Cycle
- Để tránh loãng cột, gom Cashback flag vào cột Flow cùng Cycle badge và Tag debt.
- Khi không có Cashback: vẫn giữ Cycle/Tag để ô không trống; thứ tự: Cycle | Cashback | Debt tag.

## Pagination & footer
- Không load toàn bộ: dùng pagination, mỗi page phản ánh trên URL (?page=2).
- Footer: hiển thị tổng rows page hiện tại, tổng selected (nếu có), điều khiển page (Prev/Next, page size selector nếu cần).

## Bulk actions
- Checkbox hàng đầu (header) + từng dòng.
- Khi có chọn: thanh bulk xuất hiện/đổi nền header: hiển thị "X selected", nút Void, (tuỳ) Refund, Split, Clone hàng loạt; nút Clear selection.
- Nhớ lại V1: hiển thị tổng rows được chọn, và disable nút nếu trạng thái không hợp lệ.

## Ảnh & icon
- Ảnh không bo tròn, không crop; set height cố định, width auto, container giữ height bằng nhau.
- Badge icon bắt buộc có ở Type; thống nhất kích cỡ.

## Mobile
- Card 2 dòng: dòng 1 = Date + Amount (Original/Final xếp dọc phải); dòng 2 = Description + Flow (Account ➜ Party) + badges nhỏ.
- Action sheet mở khi bấm (row không clickable cho điều hướng).

## Rủi ro & lưu ý
- Cần tránh nested button trong dropdowns (đã log). Khi dựng table, kiểm tra lại triggers.
- Bảo đảm align badge một hàng; nếu số badge nhiều, cho phép horizontal scroll nhỏ thay vì wrap xuống dòng.
