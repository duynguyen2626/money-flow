# HƯỚNG DẪN ONBOARDING CHO AGENT MỚI
## Money Flow 3 - Dự Án Quản Lý Tài Chính Cá Nhân

---

## 📋 BƯỚC 1: ĐỌC HIỂU CÁC FILE QUAN TRỌNG (Thứ tự ưu tiên)

### Giai đoạn 1: Tổng Quan Dự Án (30 phút)
```
1. README.md                              ← Trạng thái dự án, kiến trúc chung
2. .cursorrules                           ← Coding standards & quy tắc
3. copilot-instructions.md                ← Hướng dẫn chi tiết cho Copilot
```

### Giai đoạn 2: Business Logic Quan Trọng (45 phút)
```
1. .agent/CASHBACK_GUIDE_VI.md            ← Quy tắc cashback 3 tầng
2. .agent/README.md                       ← Transaction architecture
3. src/PHASE_6_WALKTHROUGH.md             ← Các phase đã hoàn thành
```

### Giai đoạn 3: Hiểu Code Structure (30 phút)
```
1. .agent/schema/full_schema_from_migrations.sql  ← Database schema
2. src/types/moneyflow.types.ts           ← TypeScript types
3. src/services/transaction.service.ts    ← Business logic
```

### Giai đoạn 4: Task Hiện Tại (nếu có) (15-30 phút)
```
1. .agent/HANDOVER_FINAL_SUMMARY.md       ← Tổng kết session trước
2. .agent/PROJECT_COMPLETION_CHECKLIST.md ← Checklist & tiến độ
3. .agent/TRANSACTION_TABLE_QUICKSTART.md ← Nếu làm UI redesign
```

**Tổng thời gian:** ~2 giờ = đủ để hiểu rõ dự án

---

## 🏗️ CẤU TRÚC DỰ ÁN CĂN BẢN

### Kiến Trúc 3 Tầng
```
src/app/**/page.tsx (Server Component)
    ↓ Gọi
src/services/*.service.ts (Business Logic)
    ↓ Kết hợp
src/actions/*.actions.ts (Server Actions - Mutations)
    ↓ Đi xuống
Database (Supabase PostgreSQL + RLS)
```

### Thư Mục Chính
```
src/
├── app/                      # Next.js App Router (RSC by default)
├── actions/                  # Server Actions (mutations)
├── services/                 # Business logic & queries
├── components/               # React components
│   ├── moneyflow/           # Transaction table & UI chính
│   ├── cashback/            # Cashback policy & previews
│   └── ui/                  # Shadcn UI primitives
├── types/                    # TypeScript types
├── lib/                      # Utilities
│   └── supabase/            # Database clients
└── constants/               # Constants & configs

.agent/                       # Tài liệu & hướng dẫn
├── schema/                  # Database schema & migrations
└── [documentation files]    # Hướng dẫn chi tiết
```

---

## 💡 KHÁI NIỆM CHÍNH CẦN BIẾT

### 1. **Transaction (Giao Dịch) = Dữ liệu lõi**
- Tất cả dữ liệu tài chính bắt nguồn từ `transactions` table
- Không có table riêng cho "Debt Accounts" - Debt được tính từ transactions
- Mỗi transaction có:
  - `transaction_date`, `amount`, `details`
  - `person_id` (ai đó nợ)
  - `status` (pending, voided, refunded)
  - `transaction_lines` (chi tiết từng dòng)

### 2. **Server Components (RSC) là mặc định**
- Fetch dữ liệu ở server, pass props xuống client
- Chỉ dùng `'use client'` khi cần hooks (useState, useEffect, etc)
- Pattern:
  ```typescript
  // Server Component
  const data = await getTransactions()  // Server fetch
  return <ClientComponent data={data} />
  ```

### 3. **Service Layer cho Business Logic**
- `transaction.service.ts` - Tạo/edit/void transaction
- `cashback.service.ts` - Quy tắc cashback 3 tầng
- `batch.service.ts` - Import hàng loạt & dedup
- `debt.service.ts` - Tính nợ từ transactions
- `account.service.ts` - Số dư tài khoản

### 4. **Cashback 3 Tầng (Quan trọng!)**
**Thứ tự ưu tiên:** Category Rule → Level Default → Program Default
```typescript
// Logic giải quyết:
if (spent < minSpendTarget) {
  return program.defaultCashback  // Không đủ target
}

const level = findLevelByMinSpend(spent)
const categoryRule = findCategoryRule(level)

if (categoryRule) {
  return categoryRule.cashback  // Tìm thấy
} else {
  return program.defaultCashback  // Không thấy → dùng program default
}
```

### 5. **Data Access Pattern**
```typescript
// ✅ Server Component / Server Action
const client = createClient()  // từ src/lib/supabase/server.ts
const data = await client.from('transactions').select('id,amount')

// ✅ Client Component
const client = createClient()  // từ src/lib/supabase/client.ts
const data = await client.from('accounts').select('*')

// ❌ KHÔNG PHAI
select('*')  // Ghi rõ columns cần lấy
```

### 6. **Refund Chain (Chuỗi hoàn tiền)**
```
Parent Transaction
    ↓
Void (ghi dấu voided)
    ↓
Refund (tạo transaction hoàn tiền)

⚠️ QUY TẮC:
- Không được edit/void parent nếu đã có children
- Phải xóa children trước, rồi mới edit parent
- Refund account ID là hằng số
```

---

## 🔧 CÔNG NGHỆ & STACK

| Phần | Công Nghệ |
|------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS 4 + Shadcn UI |
| **Database** | Supabase PostgreSQL + RLS |
| **State Management** | React Server Components (không Redux) |
| **Form** | react-hook-form + zod |
| **Testing** | vitest + testing-library |

---

## 🚀 BẮT ĐẦU LÀM VIỆC

### 1. Clone & Setup
```bash
cd "/Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3"
git status  # Xem trạng thái hiện tại
```

### 2. Chạy Dev Server
```bash
pnpm install      # Cài dependencies
pnpm dev          # Start dev server (http://localhost:3000)
```

### 3. Kiểm tra Build
```bash
pnpm build        # Verify build hoạt động
pnpm lint         # Check code style (PHẢI PASS trước commit)
```

### 4. Tạo Feature Branch
```bash
git checkout -b feat/your-feature-name
# Làm việc của bạn
git add .
git commit -m "feat: mô tả ngắn gọn"
```

---

## 📌 QUY TẮC CODE QUAN TRỌNG

### ✅ DO (Làm đúng)
- ✅ Explicit columns trong `.select()` thay vì `select('*')`
- ✅ Dùng Service layer cho business logic phức tạp
- ✅ Dùng Server Actions cho mutations (update, delete)
- ✅ Revalidate path sau mutations: `revalidatePath('/path')`
- ✅ TypeScript types cho mọi function (không `any`)
- ✅ Test responsive design ở 3 breakpoints (375px, 768px, 1200px)
- ✅ Document design decisions & rationale
- ✅ Run `pnpm lint` trước khi push

### ❌ DON'T (Không làm)
- ❌ Import toàn bộ `*` từ Supabase
- ❌ Logic business ở React component
- ❌ `useEffect` với dependencies không đầy đủ
- ❌ Early returns trước hooks (đặt guard logic sau hooks)
- ❌ Hardcode values - dùng constants
- ❌ Commit code không qua linting
- ❌ Bỏ qua RLS rules ở database
- ❌ Hiện `console.log` ở production paths

---

## 📂 TÌMKIẾM THÔNG TIN NHANH

| Cần tìm | Đi tới |
|---------|--------|
| Cấu trúc database | `.agent/schema/full_schema_from_migrations.sql` |
| Transaction types | `src/types/moneyflow.types.ts` |
| Cashback logic | `src/services/cashback/` + `.agent/CASHBACK_GUIDE_VI.md` |
| UI components | `src/components/ui/` + `src/components/moneyflow/` |
| Transaction table | `src/components/moneyflow/unified-transaction-table.tsx` |
| API patterns | `src/actions/*.actions.ts` (tất cả follow cùng pattern) |
| Supabase setup | `src/lib/supabase/` |
| Constants | `src/constants/` + `.cursorrules` section 3 |
| Integration | `integrations/google-sheets/` |

---

## 🎓 CÁC PHASE ĐÃ HOÀN THÀNH

| Phase | Trạng Thái | Ghi Chú |
|-------|-----------|--------|
| Phase 1-3 | ✅ Complete | Cơ bản quản lý giao dịch |
| Phase 4 | ✅ Complete | Cashback & policies |
| Phase 5 | ✅ Complete | Split bills & debts |
| Phase 6 | 🔄 In Progress | Refactoring & tối ưu |
| Phase 7 | ⏳ Pending | Transaction Table UI Redesign |

Chi tiết xem: `src/PHASE_6_WALKTHROUGH.md`

---

## 📊 TASK HIỆN TẠI (Nếu có)

Nếu bạn đang làm task cụ thể, hãy đọc trong thứ tự này:

1. **Tổng kết:** `.agent/HANDOVER_FINAL_SUMMARY.md`
2. **Checklist:** `.agent/PROJECT_COMPLETION_CHECKLIST.md`
3. **Task-specific docs:**
   - UI Redesign? → `.agent/TRANSACTION_TABLE_QUICKSTART.md`
   - Cashback? → `.agent/CASHBACK_GUIDE_VI.md`
   - Debug? → Xem logs ở `.agent/logs/`

---

## ⚠️ NHỮNG ĐIỀU CẦN LƯU Ý

### Transaction Integrity (Rất quan trọng!)
- Transactions là single source of truth
- Không được edit amount sau khi tạo (phải refund)
- Void chain: Parent → Void → Refund
- Batch imports phải dedup trên (date + amount + details)

### UI/UX Rules
- **Avatars:** Square `rounded-none`, size `w-8 h-8` hoặc `w-10 h-10`
- **Transaction Table:** "Account ➜ People" merged column
- **Cycle badges:** Hiển thị range (e.g. "25.10 - 24.11")
- **Responsive:** Test 375px, 768px, 1200px
- **Mobile-first:** Design cho mobile trước, rồi scale up

### Performance
- Limit transactions fetch (default 1000 gần nhất)
- Index database queries cho pagination
- Lazy load cashback previews
- Optimize images (cách dùng Shadcn image optimization)

---

## 📞 CẦN GIÚP?

### Lỗi thường gặp
| Lỗi | Giải pháp |
|-----|---------|
| RLS policy error | Check Supabase policy, verify user_id context |
| Type error (Transaction) | Import từ `src/types/moneyflow.types.ts` |
| Cashback calculation sai | Xem `.agent/CASHBACK_GUIDE_VI.md` section "Cycle Accuracy" |
| Build fails | Chạy `pnpm lint`, fix errors |
| Database schema? | `.agent/schema/full_schema_from_migrations.sql` |

### Dokumentasi
- **Tiếng Anh:** README.md, .cursorrules
- **Tiếng Việt:** Tất cả `.agent/*_VI.md` files
- **Code examples:** Xem `src/actions/*.actions.ts` (pattern examples)

---

## ✅ CHECKLIST TRƯỚC KHI BẮTĐẦU TASK

- [ ] Đã read README.md
- [ ] Hiểu được Server Components vs Client Components
- [ ] Biết quy tắc 3 tầng của cashback
- [ ] Biết refund chain: Parent → Void → Refund
- [ ] Biết pattern Server Action (try/catch + revalidatePath)
- [ ] Biết cách access database (select columns, không select *)
- [ ] Hiểu transaction type structure
- [ ] Biết UI quy tắc (avatar shape, responsive design)
- [ ] Biết phải run `pnpm lint` trước commit
- [ ] Biết tìm kiếm info ở đâu

---

## 🎯 NEXT STEPS

1. ✅ **Ngay bây giờ:** Đọc danh sách file trên (2 giờ)
2. ✅ **Sau khi đọc:** Chạy `pnpm dev` + explore UI
3. ✅ **Trước task:** Đọc task-specific documentation
4. ✅ **Khi làm:** Refer lại quy tắc & patterns
5. ✅ **Trước push:** Run `pnpm lint` + `pnpm build`

---

## 📚 TÀI LIỆU THAM KHẢO CHÍNH

```
.agent/                                    # Tất cả docs ở đây
├── CASHBACK_GUIDE_VI.md                  # Cashback logic (TiếngViệt)
├── README.md                             # Transaction architecture
├── schema/full_schema_from_migrations.sql # Database schema
├── HANDOVER_*.md                         # Task-specific handover
└── TRANSACTION_TABLE_*.md                # UI redesign docs (nếu làm)

src/
├── PHASE_6_WALKTHROUGH.md                # Các phase hoàn thành
├── .cursorrules                          # Coding standards
└── [code files]                          # Actual implementation

.github/
└── copilot-instructions.md               # Copilot guidelines
```

---

## 💪 LỜI CUỐI

Dự án này có **quy tắc rõ ràng** và **tài liệu chi tiết**. 

Khi bạn gặp câu hỏi:
1. Tìm ở tài liệu trước (99% câu trả lời đã có)
2. Xem code examples ở `src/actions/`
3. Check `.cursorrules` section 3-6

**Hãy dành 2 giờ để đọc tài liệu.** Nó sẽ tiết kiệm 10+ giờ debugging sau!

---

**Created:** January 25, 2026  
**Purpose:** Onboarding agent mới vào dự án Money Flow 3  
**Thời gian đọc:** ~2 giờ  
**Cần hỏi gì?** Check `.agent/` folder hoặc file documentation liên quan
