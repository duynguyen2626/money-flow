CHIẾN LƯỢC FIX BUG TOÀN DIỆN & QUY TRÌNH QA (M2-SP1)

Tài liệu này chứa các quy chuẩn về Git, Prompt Engineering và quy trình kiểm thử bắt buộc để xử lý dứt điểm các lỗi logic trong Money Flow.

1. Git Workflow Convention

Để quản lý code dễ dàng và tránh conflict, hãy áp dụng quy chuẩn đặt tên Branch và Commit như sau:

Tên Branch

Cấu trúc: fix/M2-SP1-{tên-ngắn-gọn-của-bug}

M2: Milestone 2

SP1: Sprint 1

Ví dụ cụ thể cho task này:

fix/M2-SP1-debt-calculation-logic (Sửa lỗi tính nợ sai)

fix/M2-SP1-batch-category-mapping (Sửa lỗi tên category bị sai/cắt ngắn)

Commit Message

Cấu trúc: [M2-SP1] {Loại}: {Mô tả chi tiết}

fix: Sửa lỗi

feat: Tính năng mới (hạn chế dùng trong đợt fix bug này)

refactor: Viết lại code cho gọn

Ví dụ:

[M2-SP1] fix: exclude void transactions from debt calculation in people.service

[M2-SP1] fix: hardcode category id for Online Services in batch.service

2. Engineering Prompts (Dành cho Agent)

Copy từng block prompt dưới đây vào cửa sổ chat với Agent. Hãy đảm bảo Agent đọc hết context trước khi code.

🛠 Prompt 1: Fix lỗi tính nợ ảo (Phantom Debt)

Mục tiêu: Sửa people.service.ts để lọc bỏ các giao dịch đã void.

Nội dung Prompt:

@Context: Project Money Flow, using Next.js 14 and Supabase.
@File: src/services/people.service.ts
@Role: Senior Backend Developer specialized in SQL and Data Integrity.

@Task: 
Fix a CRITICAL logic bug in the `getPersonDetails` or `getPersonDebt` function.
Currently, the debt calculation simply SUMs the `transaction_lines` table. This creates "Phantom Debt" because it includes lines from transactions that have been VOIDED in the parent `transactions` table.

@Requirements:
1. You MUST use Supabase Relational Filtering with `!inner` join.
2. Join `transaction_lines` with `transactions`.
3. Apply a filter to exclude any transaction where `transactions.status` is 'void'.
4. Do NOT change the return data structure (keep UI compatible).

@Logic Reference (Use this exact pattern):
```typescript
const { data } = await supabase
  .from('transaction_lines')
  .select(`
    *,
    transactions!inner ( status ) 
  `)
  .eq('person_id', personId)
  .neq('transactions.status', 'void'); // <--- CRITICAL FIX


@Output:

Rewrite the query logic in src/services/people.service.ts.

Add a comment // [M2-SP1] Fix: Exclude void transactions above the change.


---

### 🛠 Prompt 2: Fix lỗi Category "Categor.." & Mapping sai
**Mục tiêu:** Sửa `batch.service.ts` để map đúng ID cho "Online Services" và tránh tạo category rác.

**Nội dung Prompt:**
```text
@Context: Project Money Flow, Batch Import Feature.
@File: src/services/batch.service.ts
@Role: TypeScript Data Engineer.

@Task:
Fix the transaction categorization logic. Currently, "Online Services" is being distributed incorrectly, resulting in a truncated category name like "Categor.." or creating a new duplicate category instead of using the existing system category.

@Requirements:
1. Locate the function responsible for mapping category names (e.g., `processBatch` or `categorizeTransaction`).
2. IMPLEMENT HARDCODED MAPPING for "Online Services".
   - Target Name: "Online Services"
   - Target ID: "e0000000-0000-0000-0000-000000000088" (Do not query DB for this, use this constant).
3. If the input string contains "Online Services" (case-insensitive), FORCE the use of the above ID.
4. Prevent the creation of fallback categories if the name starts with "Categor..." (this indicates a previous bug).

@Code Logic:
```typescript
// Inside your mapping loop/function
const normalizedName = rawName.toLowerCase();
let categoryId = null;

if (normalizedName.includes('online service')) {
    categoryId = 'e0000000-0000-0000-0000-000000000088'; // Force ID
} else {
    // ... existing logic
}


@Output:

Update src/services/batch.service.ts with strict mapping logic.


---

## 3. Build & Test Protocol (Tránh Vercel Fails)

Trước khi bạn (hoặc Agent) tạo PR hoặc push code, **BẮT BUỘC** phải chạy các lệnh sau dưới local. Nếu bất kỳ bước nào đỏ (fail), **KHÔNG ĐƯỢC PUSH**.

### Bước 1: Type Check (Quan trọng nhất với TypeScript)
Agent thường sửa code nhưng quên sửa Type definition, dẫn đến build fail trên Vercel.
```bash
# Chạy lệnh này để xem có lỗi Type nào không
npm run type-check
# Nếu file package.json chưa có script này, hãy chạy:
npx tsc --noEmit


Bước 2: Linting (Kiểm tra cú pháp)

npm run lint


Nếu có lỗi, yêu cầu Agent: "Fix all lint errors in the files you modified".

Bước 3: Build Production Giả lập

Đây là bài test cuối cùng. Nếu lệnh này chạy xong mà không báo đỏ, 99% deploy Vercel sẽ thành công.

npm run build


Checklist thủ công (Manual Test) sau khi fix:

Test Nợ: * Tạo 1 giao dịch Split Bill với 1 người (ví dụ: Khoa).

Vào trang People -> Khoa: Kiểm tra số nợ (Ví dụ: 50k).

Vào trang Transactions -> Tìm giao dịch đó -> Chọn Void.

Quay lại trang People -> Khoa: Số nợ phải về 0. (Nếu vẫn còn 50k -> Fail).

Test Category:

Import file CSV có dòng "Online Services".

Chạy distribute/process batch.

Kiểm tra kết quả: Category phải hiện đầy đủ "Online Services" và icon đúng (☁️), không phải là "Categor.." hay icon mặc định.

Ghi chú cho Agent: Hãy tuân thủ nghiêm ngặt các hướng dẫn trong phần Prompt. Không tự ý thay đổi UI nếu không được yêu cầu. Ưu tiên độ chính xác của dữ liệu (Data Integrity) lên hàng đầu.


### Hướng dẫn sử dụng file này:

1.  **Tạo Branch:** Mở terminal, gõ: `git checkout -b fix/M2-SP1-debt-and-category`.
2.  **Fix lỗi Nợ:** Copy nội dung **Prompt 1** và dán vào chat với Agent. Chờ Agent sửa code.
3.  **Fix lỗi Category:** Copy nội dung **Prompt 2** và dán vào chat với Agent.
4.  **Kiểm tra:** Mở terminal chạy `npm run build`. Nếu thành công (xanh) -> Commit code. Nếu đỏ -> Paste lỗi vào chat bảo Agent fix tiếp.
5.  **Merge:** Merge branch này vào branch chính (main/develop) theo quy trình của bạn.
