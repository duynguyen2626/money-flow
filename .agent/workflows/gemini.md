---
description: Money Flow 3 (Updated Phase 75)
---

PROJECT CONTEXT: Money Flow 3 (Updated Phase 75)

1. Tech Stack

Framework: Next.js 15 (App Router)

Language: TypeScript

Styling: Tailwind CSS, Shadcn UI (Radix Primitive)

Database: Supabase (PostgreSQL)

State/Data Fetching: React Server Components (RSC), Server Actions, Hooks.

Icons: Lucide React, SVG (public folder).

2. Directory Structure

src/app: Page routes, layouts, route handlers (api).

src/actions: Server Actions (mutations, logic phía server).

src/components: UI components (chia thành moneyflow, batch, people, ui...).

src/lib: Utilities, helpers, supabase client/server configurations.

src/services: Business logic layer (tách biệt logic khỏi UI và Actions).

src/types: TypeScript interfaces/types (database.types.ts generated from Supabase).

supabase/migrations: SQL migrations history.

3. Core Features & Business Logic

Transactions: - Quản lý thu chi (Income/Expense/Transfer/Debt).

Single Source of Truth: Bảng transactions là nơi duy nhất lưu trữ data.

Final Price: Cột final_price được tự động tính toán (Amount + Cashback/Discount) qua Database Trigger.

History: Bảng transaction_history lưu snapshot khi edit.

Accounts: - Quản lý tài khoản ngân hàng, ví, tín dụng.

Cashback: Logic tính "Missing for Min Spend" và "Potential Cashback".

People/Debts: - Quản lý nợ theo person_id trong bảng transactions.

Không dùng tài khoản nợ ảo (Legacy).

Services: Quản lý subscriptions (Netflix, Spotify...).

Installments: Trả góp (flag is_installment).

Batch Processing: Import Excel/CSV, mapping ngân hàng.

4. Coding Rules & Conventions

Server Actions: Ưu tiên dùng cho các thao tác ghi (POST/PUT/DELETE).

Service Layer: Logic phức tạp đặt trong src/services.

Type Safety: Luôn import types từ src/types.

UI Components: Shadcn UI (src/components/ui).

5. Recent Schema Context (Crucial)

Transactions: - final_price: Numeric (Calculated via trigger).

person_id: Link tới bảng People (Debt tracking).

Integrity:

Refund Trio: Parent -> Void -> Refund.

Rule: Không được Edit Parent nếu có con (Void/Refund).

6. UI/UX Design System (STRICT - PHASE 75)

Transaction Table:

Column: "Accounts and Debt Managements".

Layout: [Account] (Left) ... [Arrow] (Center) ... [Person] (Right).

Context Aware: Ẩn mũi tên/Source nếu đang xem chi tiết Account/Person đó.

Visuals:

Images/Avatars: BẮT BUỘC dùng rounded-none (Square) cho Icon Shop, Account, Person trong bảng.

Badges: Màu tương phản cao (High Contrast).

Interaction:

Disable click vào dòng (Row). Phải dùng menu ... để Edit/Clone.