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
- **Transactions:** Quản lý thu chi, hỗ trợ batch import, duplicate check.
- **Accounts:** Quản lý tài khoản ngân hàng, ví tiền, tín dụng.
- **People/Debts:** Quản lý nợ nần, chia tiền nhóm (logic "chia đều", "ai trả").
- **Services:** Quản lý đăng ký định kỳ (subscriptions) như Netflix, Spotify.
- **Installments:** Quản lý trả góp (tự động tách giao dịch gốc thành các kỳ hạn).
- **Cashback:** Theo dõi tiền hoàn lại từ thẻ tín dụng/chi tiêu.
- **Batch Processing:** Import số lượng lớn từ Excel/CSV, mapping ngân hàng tự động.

## 4. Coding Rules & Conventions
- **Server Actions:** Ưu tiên dùng Server Actions cho các thao tác ghi (POST/PUT/DELETE) thay vì Route Handlers.
- **Service Layer:** Logic phức tạp phải đặt trong `src/services`, Actions chỉ gọi Services.
- **Type Safety:** Luôn import types từ `src/types` hoặc `database.types.ts`. Không dùng `any`.
- **UI Components:** Sử dụng Shadcn UI components có sẵn trong `src/components/ui`.
- **Database Access:**
  - Dùng `src/lib/supabase/server.ts` cho Server Components/Actions.
  - Dùng `src/lib/supabase/client.ts` cho Client Components (hạn chế).
- **Naming:** Kebab-case cho tên file, PascalCase cho tên Component.

## 5. Recent Schema Context (Crucial)
- **Batches:** Bảng `batches` và `batch_items` dùng cho import giao dịch.
- **Installments:** Bảng `installments` liên kết với `transaction_lines`.
- **Bank Mappings:** Bảng `bank_mappings` để map keywords từ SMS/Bank app sang categories.
- **Webhook Links:** Bảng `sheet_webhook_links` để sync với Google Sheets.

