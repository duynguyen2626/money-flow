# PROJECT CONTEXT: Money Flow 3

## 1. Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Shadcn UI (Radix Primitive)
- **Database:** Supabase (PostgreSQL)
- **State/Data Fetching:** React Server Components (RSC), Server Actions, Hooks.
- **Icons:** Lucide React, SVG (public folder).

## 2. Directory Structure
- `src/app`: Page routes, layouts, route handlers (api).
- `src/actions`: Server Actions (mutations, logic phía server).
- `src/components`: UI components (chia thành `moneyflow`, `batch`, `people`, `ui`...).
- `src/lib`: Utilities, helpers, supabase client/server configurations.
- `src/services`: Business logic layer (tách biệt logic khỏi UI và Actions).
- `src/types`: TypeScript interfaces/types (database.types.ts generated from Supabase).
- `supabase/migrations`: SQL migrations history.

## 3. Core Features & Business Logic
- **Transactions:** - Quản lý thu chi (Income/Expense/Transfer/Debt).
  - **Excel Mode:** Chế độ xem phân tích, hỗ trợ Drag-to-Select để tính tổng nhanh.
  - **Clone:** Tính năng nhân bản giao dịch nhanh.
- **Accounts:** - Quản lý tài khoản ngân hàng, ví tiền, tín dụng.
  - **Cashback Logic:** Hiển thị trạng thái "Need to Spend" và "Potential Cashback" nếu chưa đạt min spend.
- **People/Debts:** - Quản lý nợ nần theo người (`person_id`).
  - **UI:** Layout dạng Card (Expand/Collapse), Tab phân loại (All/Linked/Unlinked).
- **Services:** Quản lý đăng ký định kỳ (subscriptions) như Netflix, Spotify.
- **Installments:** Quản lý trả góp (tự động tách giao dịch gốc thành các kỳ hạn).
- **Batch Processing:** Import số lượng lớn từ Excel/CSV, mapping ngân hàng tự động.

## 4. Coding Rules & Conventions
- **Server Actions:** Ưu tiên dùng Server Actions cho các thao tác ghi (POST/PUT/DELETE).
- **Service Layer:** Logic phức tạp đặt trong `src/services` (AccountService, TransactionService, CashbackService, etc.).
- **Type Safety:** Luôn import types từ `src/types`.
- **UI Components:** Shadcn UI (`src/components/ui`).

## 5. Recent Schema Context (Crucial)
- **Transactions (Single Table):** Bảng chính lưu trữ mọi giao dịch. Cột `person_id` dùng để track nợ.
- **Transaction History:** Bảng `transaction_history` lưu snapshot JSON trước khi edit (Feature: View History).
- **Installments:** Bảng `installments` quản lý kỳ hạn trả góp.
- **Batches:** Bảng `batches` và `batch_items` dùng cho import.
- **Bank Mappings:** Bảng `bank_mappings` map keywords SMS sang category.
- **Sheet Webhook Links:** Sync data với Google Sheets.

## 6. Recent Integrity & UI Logic (Phase 71-74)
- **Integrity Rule:** - Chặn Edit/Void giao dịch Parent nếu đã có Void/Refund linked.
  - Chặn Edit giao dịch Void/Refund trực tiếp.
- **UI Standards:**
  - **Transaction Table:** Gộp cột Accounts & People. Layout: `[Account Img] Name ➜ [Person Img] Name`.
  - **Visual:** Tất cả Avatar/Thumbnail trong bảng phải là **Square (`rounded-none`)**.
  - **Interaction:** Row click bị disable. Phải dùng Action Menu (`...`) để sửa.
