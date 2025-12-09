PROJECT CONTEXT: MONEY FLOW 3

1. Tech Stack Overview

Framework: Next.js 15 (App Router)

Language: TypeScript

State/Data: React Server Components (RSC) mặc định, Server Actions cho mutations.

Database: Supabase (PostgreSQL) với Row Level Security (RLS).

Styling: Tailwind CSS, Shadcn UI, Lucide React icons.

Form Handling: react-hook-form + zod.

2. Architecture Patterns (Code Flow)

Luồng dữ liệu trong dự án tuân thủ nghiêm ngặt theo mô hình 3 lớp để đảm bảo Separation of Concerns:

UI Layer (src/app & src/components)

Chỉ chứa logic hiển thị.

Gọi Server Actions để thay đổi dữ liệu.

Gọi Data Fetching trực tiếp từ src/lib/supabase/server (trong RSC) hoặc qua Services.

Quy tắc UI: Avatar hình vuông (rounded-none), bảng Transaction gộp cột Account/People.

Action Layer (src/actions)

Đóng vai trò Controller/API Gateway.

Xác thực quyền (Auth), validate input (Zod).

KHÔNG chứa logic nghiệp vụ phức tạp.

Gọi xuống Service Layer để xử lý.

Trả về { success: boolean, data?: any, error?: string }.

Service Layer (src/services)

Chứa toàn bộ Business Logic (Core Brain).

Ví dụ: Logic chia tiền installments, logic import batch, logic tính toán cashback.

Tương tác trực tiếp với Database.

Các Service quan trọng:

transaction.service.ts: Xử lý CRUD giao dịch.

batch.service.ts: Xử lý logic import Excel, duplicate check.

installment.service.ts: Tự động tách giao dịch trả góp.

people.service.ts & debt.service.ts: Quản lý nợ.

3. Key Features Analysis

Batch Import: Tính năng mạnh mẽ cho phép import hàng loạt từ Excel, có cơ chế mapping ngân hàng và check trùng lặp (dựa trên amount, date, details).

Installments (Trả góp): Logic phức tạp giúp chia nhỏ một giao dịch lớn thành các transaction_lines hoặc các giao dịch con theo kỳ hạn.

Sheet Sync: Có tích hợp Webhook để sync dữ liệu từ Google Sheets (dựa trên webhook-link.service.ts).

Cashback Tracking: Theo dõi tiến độ chi tiêu thẻ tín dụng để đạt cashback (Logic trong cashback.service.ts).