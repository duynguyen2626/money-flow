# PocketBase Migration Handover (2026-03-06)

> **Tiếp theo từ:** `docs/MIGRATION_HANDOVER_2026-03-05.md`
> **Branch:** `agent/pb-migration-20260305-accounts-cashback-pb`

---

## 1) Tóm tắt tiến độ session này

### Hoàn thành
- Phase 5: Transactions **dual-write** (SB → PB secondary write)
- **Backfill script** `/api/migrate/backfill` để re-run old data
- **Read cut-over** hầu hết các pages (từ Supabase → PocketBase)

### Đang bị blocked
- `getPocketBaseShops` vẫn trả về PocketBase `400` — root cause **chưa xác định rõ**
- Các pages liên quan `getPersonWithSubs` / `getTransactionsByPeople` vẫn đọc từ Supabase

---

## 2) Phase 5 — Transactions Dual-Write

### Các file đã thay đổi

#### `src/actions/transaction-actions.ts` (primary call site)
Fire-and-forget PB writes trong 3 actions:
- `createTransaction` → `void createPocketBaseTransaction(txn.id, {...})` sau khi SB insert thành công
- `updateTransaction` → `void updatePocketBaseTransaction(id, {...})`
- `voidTransactionAction` → `void voidPocketBaseTransaction(id)`

##### Quan trọng — trường loại bỏ:
- **`slug`**: KHÔNG có trong PB `transactions` schema → bỏ
- **`linked_transaction_id`**: KHÔNG có trong PB `transactions` schema → bỏ
- **`metadata.source_id`**: cách PB lưu SB UUID — dùng khi reverse-lookup (`mapTransaction` line ~108: `id: record.metadata?.source_id || record.id`)

#### `src/services/pocketbase/account-details.service.ts`
Added (cuối file, sau line ~988):
```typescript
// Phase 5 writes:
createPocketBaseTransaction(supabaseId, data)   // POST với merged metadata.source_id
updatePocketBaseTransaction(supabaseId, data)   // PATCH chỉ các field có giá trị
voidPocketBaseTransaction(supabaseId)           // PATCH { status: 'void' }

// Phase 5 global read:
getPocketBaseUnifiedTransactions({ limit, includeVoided })
// - no account filter, sort: '-occurred_at', expand all FKs
// - mapTransaction(item, '') — account_id lấy từ expandedAccount?.slug
```

#### `src/services/transaction.service.ts`
Cũng có PB writes (back-compat), nhưng call site thực tế là `transaction-actions.ts`

---

## 3) Backfill Script

**File:** `src/app/api/migrate/backfill/route.ts`

**Endpoint:** `GET /api/migrate/backfill?collection=accounts|transactions|all`

### Logic
- `upsertPB(collection, pbId, body)`: PATCH first → nếu `[404]` thì POST (idempotent)
- `backfillAccounts()`: 2-pass
  - Pass 1: tạo accounts không có FK refs (tránh circular parent_account_id)
  - Pass 2: PATCH FK fields (`parent_account_id`, `secured_by_account_id`, `holder_person_id`)
  - Convert `ewallet` → `e_wallet` cho PB schema
- `backfillTransactions()`: paginate by 500, parallel batches of 10
  - Merge `source_id: txn.id` vào `metadata`
  - Map tất cả FK sang PB ID

### Khi nào cần chạy
- Khi thấy `account_id = N/A` trong PB transactions (old records bị broken FK)
- Re-run an toàn nhiều lần (PATCH-first strategy)

---

## 4) Read Cut-Over — Trạng thái Các Pages

### ✅ Đã switch sang PocketBase

| Page | Functions replaced |
|------|--------------------|
| `src/app/page.tsx` (dashboard) | getAccounts, getCategories, getPeople, getShops |
| `src/app/transactions/page.tsx` | getAccounts, getCategories, getPeople, getShops, **getPocketBaseUnifiedTransactions** (new) |
| `src/app/accounts/page.tsx` | *(đã xong từ session trước)* |
| `src/app/accounts/[id]/page.tsx` | *(đã xong từ session trước)* |
| `src/app/people/page.tsx` | getPeople, getAccounts, getCategories, getShops |
| `src/app/people/[id]/page.tsx` | getAccounts, getCategories, getPeople, getShops |
| `src/app/people/[id]/details/page.tsx` | getAccounts, getCategories, getPeople, getShops |
| `src/app/debt/page.tsx` | getAccounts, getCategories, getPeople, getShops |
| `src/app/shops/page.tsx` | getShops, getCategories (xóa inline Supabase fn) |
| `src/app/services/page.tsx` | getPeople |
| `src/app/services/[id]/page.tsx` | getPeople |
| `src/app/txn/v2/page.tsx` | getAccounts, getCategories, getPeople, getShops |
| `src/app/refunds/page.tsx` | getAccounts, getCategories, getPeople, getShops, **loadPocketBaseTransactionsForAccount** |
| `src/app/batch/detail/[id]/page.tsx` | getAccounts |
| `src/app/batch/mbb/page.tsx` | getAccounts (cả static import + dynamic import trong generateMetadata) |
| `src/app/batch/vib/page.tsx` | getAccounts (cả static import + dynamic import trong generateMetadata) |

### ⚠️ Còn một phần trên Supabase (có lý do)

| Page | Còn lại trên SB | Lý do |
|------|-----------------|-------|
| `src/app/people/[id]/page.tsx` | `getPersonWithSubs`, `getUnifiedTransactions`, `getTransactionsByPeople` | `getPersonWithSubs` lấy `balance`, `memberships`, `is_group`, `group_parent_id` — các field này không có trong PB people schema |
| `src/app/people/[id]/details/page.tsx` | same as above | same |
| `src/app/api/refunds/pending/route.ts` | `getPendingRefunds` | complex SB-specific join |

---

## 5) BUG ĐANG BLOCKS — PocketBase 400 trên collection reads

### Triệu chứng
```
PocketBase request failed [400] /api/collections/shops/records:
{"data":{},"message":"Something went wrong while processing your request.","status":400}
```

Đã xảy ra với: `people` collection, `shops` collection (và có thể `categories`, `accounts`)

### Những gì đã thử

**Attempt 1:** `sort: 'name'` → đổi sang `sort: '-created'` + client-side sort
- Kết quả: **vẫn fail** với `shops` (400 không đổi)
- Có thể hot-reload chưa pick up, hoặc `-created` cũng bị reject trên shops collection

**Hiện trạng code** (`account-details.service.ts`):
```typescript
// getPocketBaseCategories
const records = await listAllRecords('categories', { sort: '-created' })
const items = records.map(mapCategory).sort((a, b) => a.name.localeCompare(b.name))

// getPocketBaseShops
const records = await listAllRecords('shops', { sort: '-created' })
const items = records.map(mapShop).sort((a, b) => a.name.localeCompare(b.name))

// getPocketBaseAccounts
const records = await listAllRecords('accounts', { sort: '-created' })
const mapped = records.map(mapAccount).sort((a, b) => a.name.localeCompare(b.name))

// getPocketBasePeople
const records = await listAllRecords('people', { sort: '-created' })
const items = records.map(mapPerson).sort((a, b) => a.name.localeCompare(b.name))
```

### Nghi vấn root cause

1. **Sort field vẫn bị reject**: PocketBase có thể không cho sort theo field nào đó vì collection rules hoặc missing index. Thử **bỏ hoàn toàn sort parameter** để xem có hết 400 không.

2. **`perPage: 200` quá lớn**: Admin có thể set max perPage thấp hơn cho một số collections. Thử `perPage: 50` hoặc `perPage: 100`.

3. **API Rule trên collection**: `shops` collection trong PB instance có thể có API rule khác (ví dụ: list rule = `""` = nobody, hoặc cần expand field nào đó). Kiểm tra trong PB Admin UI: https://api-db.reiwarden.io.vn/_/ → Collections → Shops → API Rules.

4. **Thử gọi trực tiếp không có params**: Fetch `GET /api/collections/shops/records` với chỉ auth header để xem raw response.

### Suggested fix để thử tiếp

```typescript
// Thử bỏ sort hoàn toàn:
const records = await listAllRecords('shops', {})

// Hoặc thử perPage nhỏ hơn:
const records = await listAllRecords('shops', { perPage: 50 })
```

Nếu cả 2 vẫn 400, vào **PocketBase Admin UI** → Collections → Shops → **API Rules** để kiểm tra List rule.

---

## 6) `sort: 'name'` root cause (tổng quát)

Đây là pattern quan sát được:
- `categories` với `sort: 'name'` → có thể work (chưa confirm fail)
- `people` với `sort: 'name'` → **400** ✓ (đã fix)
- `shops` với `sort: 'name'` → **400** ✓ (đã fix sort, nhưng 400 vẫn còn)
- `accounts` với `sort: 'name'` → status unknown

**Hypothesis**: PocketBase SQLite index cho custom `name` field bị corrupted/missing trên một số collections từ migration script. Field ID `f_name_01` được dùng cho cả `people`, `shops` (không unique across collections) — có thể gây SQLite column conflict khi sort.

Kiểm tra schema.json (`scripts/pocketbase/schema.json`): `id: "f_name_01"` xuất hiện ở nhiều collection → đây có thể là nguyên nhân.

---

## 7) Key Technical Reference

### ID mapping
```typescript
// SB UUID → PB ID (toPocketBaseId in server.ts)
// Truncate to 15 chars from MD5 of UUID

// Reverse: mapTransaction returns SB UUID as id
id: record.metadata?.source_id || record.id
```

### PB Auth (server.ts)
```typescript
// Authenticates as _superusers with env PB credentials
// Token cached in module scope
// Refreshes when expired/missing
```

### listAllRecords
```typescript
// Paginates through ALL pages (perPage: 200 default)
// params spread vào pocketbaseList call
// totalPages = response.totalPages || 1 (safe for skipTotal)
```

### PocketBase instance
- URL: `https://api-db.reiwarden.io.vn`
- Admin UI: `https://api-db.reiwarden.io.vn/_/`
- Env vars: `POCKETBASE_DB_EMAIL`, `POCKETBASE_DB_PASSWORD`

---

## 8) Files còn đang dùng Supabase reads (chưa migrate)

Tìm bằng:
```bash
grep -rn "from '@/services/account.service'\|from '@/services/category.service'\|from '@/services/people.service'\|from '@/services/shop.service'\|from '@/services/transaction.service'" src/app --include="*.tsx" --include="*.ts"
```

Còn lại (intentional):
- `src/app/api/refunds/pending/route.ts` — `getPendingRefunds`
- `src/app/people/[id]/page.tsx` — `getPersonWithSubs`, `getUnifiedTransactions`, `getTransactionsByPeople`
- `src/app/people/[id]/details/page.tsx` — same

---

## 9) Next Steps (ưu tiên)

### P0 — Fix shops/collection 400
1. Kiểm tra PB Admin UI → API Rules cho `shops` collection
2. Thử `listAllRecords('shops', {})` không có params
3. Thử `perPage: 50`
4. Nếu vẫn 400: log raw query params để verify build đã hot-reload

### P1 — Verify toàn bộ pages load
Sau khi fix shops, test các pages:
- `/` dashboard → `[DB:PB] accounts.list`, `categories.list`, `people.list`, `shops.list`
- `/transactions` → `[DB:PB] transactions.unified.list`
- `/accounts` → `[DB:PB] accounts.list`

### P2 — People detail pages
`getPersonWithSubs` cần PB equivalent hoặc giữ nguyên SB.
PB `people` schema hiện chỉ có: `name, role, image_url, is_owner` — thiếu: `balance`, `memberships`, `is_group`, `group_parent_id`.

Options:
- Thêm computed fields vào PB (phức tạp)
- Giữ `getPersonWithSubs` trên SB, chỉ thay transaction reads với PB person filter
- Tạo `getPocketBaseTransactionsByPerson(personId, limit)` dùng filter `person_id='${toPocketBaseId(personId)}'`

### P3 — Categories phase audit
`src/app/categories/page.tsx` — chưa check xem đã dùng PB chưa.

---

## 10) Branch Status

```
Branch: agent/pb-migration-20260305-accounts-cashback-pb
Main:   main
```

Các commits trong session này:
- `feat(migration): add /api/migrate/backfill route for PB data re-sync`
- `fix(migration): fix PB transaction create - use metadata.source_id not slug`
- `fix(migration): add PB write for updateTransaction in transaction-actions.ts`
- `fix(migration): wire PB dual-write to transaction-actions.ts (actual call site)`
- `feat(migration): Phase 5 - add PB dual-write for transactions (create/update/void)`

**Chưa commit trong session này** (working tree dirty):
- `src/services/pocketbase/account-details.service.ts` — sort fix + getPocketBaseUnifiedTransactions
- `src/app/transactions/page.tsx` — PB read cut-over
- `src/app/page.tsx` và nhiều pages khác — PB read cut-over
- `src/app/shops/page.tsx` — removed inline Supabase query
- Tất cả batch/refunds/services/people pages — PB read cut-over
