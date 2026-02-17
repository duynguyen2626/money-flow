# Prompt cho Agent mới (Phase 4: Accounts UI Refactor)

Chào Agent, bạn đang tiếp nhận dự án **Money Flow 3** ở giai đoạn **Phase 4: Accounts Page UI Refactor**. Đây là một dự án quản lý tài chính cá nhân viết bằng **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, và **Supabase**.

Trước khi bắt đầu bất kỳ task nào, bạn **BẮT BUỘC** phải đọc và hiểu kỹ các file sau đây để nắm context:

## 1. Đọc Documents Cần Thiết
Hãy sử dụng tool `view_file` để đọc nội dung các file này:

1.  **`.agent/handover.md`**: Tổng quan về những gì đã hoàn thành ở Phase 3 và checklist chi tiết cho Phase 4. Đây là tài liệu quan trọng nhất.
2.  **`.agent/task/task.md`**: Checklist tiến độ hiện tại.
3.  **`.agent/workflows/plan.md`**: Kế hoạch UI/UX chi tiết cho Accounts Page, bao gồm feedback của user về Image Rendering, Sorting và Filter Tabs.
4.  **`.agent/rules/gravityrules.md`**: Các quy tắc coding (Gravity Rules) phải tuân thủ nghiêm ngặt (đặc biệt là Image Rendering Rules và Build Checks).
5.  **`README.md`**: Tổng quan Tech Stack và cấu trúc project.
6.  **DB Schema**: Kiểm tra folder `supabase/migrations/` để hiểu cấu trúc bảng (đặc biệt là bảng `accounts`, `batches`, `transactions`). Migration mới nhất là `20260115_add_batch_refactor_fields.sql`.

## 2. Nhiệm Vụ Của Bạn (Phase 4)
Mục tiêu chính là refactor giao diện trang Accounts (`/accounts`) để hiện đại hơn và sửa các lỗi hiển thị.

### Các Task Cụ Thể (Chi tiết trong `.agent/handover.md`):
1.  **Redesign Filter Tabs**:
    *   Thứ tự mới: Credit → Account → Savings → Debt Accounts (đổi tên từ Others) → All.
    *   Tab "All" sẽ chuyển sang dạng Table View thay vì Card View.
2.  **Redesign Account Card**:
    *   **Image Rendering (QUAN TRỌNG)**: Sửa lỗi ảnh bị xoay (remove class `rotate`), đảm bảo aspect ratio, không border tròn cho ảnh thẻ ngân hàng.
    *   **Layout**: Chia 3 phần Header (Màu sắc theo loại) - Body (Thông tin chính + Ảnh) - Footer (Actions).
    *   **Actions**: Các nút Quick Actions (Income, Expense, Transfer...) phải gọn gàng.
3.  **Behavior & Sorting**:
    *   **Sorting**: Ưu tiên Due Date (cần trả gấp) -> Spend Need.
    *   **Click**: Chỉ click vào mũi tên mới mở chi tiết, click vào card body không làm gì (hoặc user confirm lại sau).

## 3. Lưu Ý Quan Trọng
*   **KHÔNG ĐƯỢC PHÁ VỠ** logic Linked Accounts (Family Cluster, Secured Accounts) đã có sẵn. Hãy đọc kỹ section `Linked Accounts Behavior` trong `handover.md`.
*   **Vercel Build**: Đảm bảo `npm run build` luôn pass trước khi commit. Tôi đã nới lỏng rule lint trong `next.config.ts`, nhưng code mới vẫn nên sạch sẽ nhất có thể.
*   **Batch UI**: Phase 3 vừa xong, nếu thấy code liên quan đến Batch/Installments, hãy cẩn thận đừng làm hỏng logic cũ.

Chúc may mắn! Hãy bắt đầu bằng việc đọc `.agent/handover.md`.
