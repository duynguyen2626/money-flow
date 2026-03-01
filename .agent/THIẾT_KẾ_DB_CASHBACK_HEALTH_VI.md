# 🏗️ Thiết Kế Lại DB - Cashback Health System

**Ngày:** 1 Tháng 3, 2026  
**Tình Trạng:** 📋 Phân Tích Chi Tiết  
**Ngôn Ngữ:** Tiếng Việt

---

## 📌 Vấn Đề Hiện Tại

### Tại Sao Mọi Thứ = 0?

**Sự Không Nhất Quán:**
```
Giao dịch ngày 26 Feb 2026 được lưu:
├─ persisted_cycle_tag = "2026-02" (ISO date format)
│  ↑ Có nghĩa: Chu kỳ statement kết thúc tháng 2
│
└─ Nhưng statementDay = 27 có nghĩa:
   ├─ Bắt đầu: 27 JAN 2026
   ├─ Kết thúc: 26 FEB 2026
   └─ Người dùng nhìn: "27.01 - 26.02"
   
Khi query stats trên trang ngày 1 Mar 2026:
├─ Hệ thống tính từ ngày hôm nay (1 Mar)
├─ Suy ra cycle tag = "2026-03" ❌ SAI!
├─ Query: WHERE persisted_cycle_tag = "2026-03"
└─ Kết quả: 0 giao dịch → Tất cả stats = 0 💥
```

### Root Cause
- `persisted_cycle_tag` lưu ISO date nhưng ý nghĩa là statement cycle
- Cột tên gọi gây nhầm lẫn (persistent? derived?)
- Không có ranh giới chu kỳ rõ ràng (start_date, end_date)
- Người gọi hàm không truyền cycle tag đúng → tự tính sai

---

## 🗄️ Thiết Kế DB Mới

### Vấn Đề Hiện Tại với 3 Bảng

#### 1. Bảng `transactions`
```sql
-- HIỆN TẠI (Confusing)
CREATE TABLE transactions (
  id UUID,
  occurred_at TIMESTAMP,
  account_id UUID,
  amount DECIMAL,
  persisted_cycle_tag TEXT,  ❌ Tên gây nhầm lẫn
  tag TEXT,                  ❌ Dư thừa (legacy)
  ...
);
```

**Vấn Đề:**
- Tên cột không rõ: "persisted" có nghĩa gì? Được tính từ đâu?
- Hai cột tag (`persisted_cycle_tag` + `tag`) làm gì? Nếu xóa một cái thì sao?
- Không có cách biết chu kỳ chính xác là khi nào

#### 2. Bảng `cashback_cycles`
```sql
-- HIỆN TẠI
CREATE TABLE cashback_cycles (
  id UUID,
  account_id UUID,
  cycle_tag TEXT,           ❌ Tên gây confuse
  spent_amount DECIMAL,
  real_awarded DECIMAL,
  virtual_profit DECIMAL,
  max_budget DECIMAL,
  ...
  -- ❌ THIẾU: cycle_start_at, cycle_end_at
);
```

**Vấn Đề:**
- Không biết cycle này chạy từ ngày nào đến ngày nào
- Phải reverse-engineer từ `cycle_tag` để tính ra boundaries
- Nếu format `cycle_tag` thay đổi, tất cả query sẽ sai

#### 3. Bảng `accounts`
```sql
-- HIỆN TẠI
CREATE TABLE accounts (
  id UUID,
  cashback_config JSONB,    -- Chứa { statementDay, cycleType, ... }
  ...
  -- ❌ THIẾU: current_cycle_tag
  -- ❌ THIẾU: current_cycle_start_at
  -- ❌ THIẾU: current_cycle_end_at
);
```

**Vấn Đề:**
- Không có "cache" của chu kỳ hiện tại
- Mỗi lần query stats phải tính lại từ đầu
- Dễ tính sai nếu hôm nay là ngày đặc biệt

---

## ✨ Thiết Kế DB Mới (Giải Pháp)

### Lựa Chọn 1: Giữ 3 Bảng Hiện Tại, Thêm Cột + Rename (✅ KHUYẾN CÁO)

**Lý do chọn:**
- Không break existing data
- Dễ migrate (non-breaking)
- Có thể rollback nếu cần

#### Bước 1: Thêm Cột Mới vào `transactions`

```sql
-- Thêm cột mới (không xóa cũ ngay)
ALTER TABLE transactions 
  ADD COLUMN statement_cycle_tag TEXT DEFAULT NULL;

-- Backfill từ persisted_cycle_tag (tạm bản sao)
UPDATE transactions 
SET statement_cycle_tag = persisted_cycle_tag 
WHERE persisted_cycle_tag IS NOT NULL;

-- Sau khi code chuyển toàn bộ sang dùng statement_cycle_tag,
-- bước cuối cùng đoạn lưới sau này:
-- ALTER TABLE transactions DROP COLUMN persisted_cycle_tag;
```

**Hiểu rõ từng cột:**
```
✅ statement_cycle_tag TEXT      -- "2026-02" (ISO) - chu kỳ statement
❌ persisted_cycle_tag TEXT      -- (cũ) - sẽ xóa sau migration
❌ tag TEXT                       -- (legacy JAN26) - sẽ xóa sau
```

**Quyết định: Xóa Bảng?**
- ❌ Không xóa `cashback_cycles`
- ✅ Giữ lại vì:
  - Chứa dữ liệu tổng hợp (spent_amount, real_awarded, virtual_profit)
  - Được tính lại bởi trigger `recomputeCashbackCycle()`
  - Chưa có bảng thay thế tốt hơn

#### Bước 2: Thêm Cột vào `cashback_cycles`

```sql
-- Thêm boundaries tường minh
ALTER TABLE cashback_cycles
  ADD COLUMN cycle_start_at TIMESTAMP DEFAULT NULL,
  ADD COLUMN cycle_end_at TIMESTAMP DEFAULT NULL;

-- Backfill từ cycle_tag + account config
UPDATE cashback_cycles cc
SET 
  cycle_start_at = cc_range.start_date,
  cycle_end_at = cc_range.end_date
FROM (
  SELECT 
    cc.id,
    (getCashbackCycleRange(
      parseCashbackConfig(ac.cashback_config), 
      DATE_TRUNC('month', TO_DATE(cc.cycle_tag || '-01', 'YYYY-MM-DD'))
    )).start as start_date,
    (getCashbackCycleRange(
      parseCashbackConfig(ac.cashback_config), 
      DATE_TRUNC('month', TO_DATE(cc.cycle_tag || '-01', 'YYYY-MM-DD'))
    )).end as end_date
  FROM cashback_cycles cc
  JOIN accounts ac ON cc.account_id = ac.id
) cc_range
WHERE cc.id = cc_range.id;

-- Rename để rõ ý nghĩa (sau này)
-- ALTER TABLE cashback_cycles RENAME COLUMN cycle_tag TO statement_cycle_tag;
```

**Kết quả:**
```sql
SELECT * FROM cashback_cycles WHERE account_id = 'acc-123';

id           | account_id  | statement_cycle_tag | cycle_start_at      | cycle_end_at
-------------|-------------|---------------------|---------------------|--------------------
2eab73f8... | 0ece401d... | 2026-02             | 2026-01-27 00:00:00 | 2026-02-26 23:59:59
```

#### Bước 3: Thêm Cache vào `accounts`

```sql
-- Lưu chu kỳ hiện tại để tránh tính lại
ALTER TABLE accounts
  ADD COLUMN current_statement_cycle_tag TEXT DEFAULT NULL,
  ADD COLUMN current_cycle_start_at TIMESTAMP DEFAULT NULL,
  ADD COLUMN current_cycle_end_at TIMESTAMP DEFAULT NULL,
  ADD COLUMN cycle_cached_at TIMESTAMP DEFAULT NULL;

-- Backfill: Chu kỳ mới nhất của từng account
UPDATE accounts ac
SET 
  current_statement_cycle_tag = cc.statement_cycle_tag,
  current_cycle_start_at = cc.cycle_start_at,
  current_cycle_end_at = cc.cycle_end_at,
  cycle_cached_at = NOW()
FROM cashback_cycles cc
WHERE ac.id = cc.account_id
  AND cc.statement_cycle_tag = (
    SELECT statement_cycle_tag FROM cashback_cycles 
    WHERE account_id = ac.id 
    ORDER BY statement_cycle_tag DESC 
    LIMIT 1
  );
```

**Kết quả:**
```sql
SELECT id, name, current_statement_cycle_tag, current_cycle_start_at, current_cycle_end_at
FROM accounts WHERE type = 'credit_card' LIMIT 1;

id           | name          | current_statement_cycle_tag | current_cycle_start_at | current_cycle_end_at
-------------|---------------|-----------------------------|-----------------------|-----------------------
0ece401d... | Vib Super Card| 2026-02                    | 2026-01-27 00:00:00  | 2026-02-26 23:59:59
```

### Lựa Chọn 2: Xóa `cashback_cycles`, Hợp Nhất vào `transactions` (❌ KHÔNG KHUYẾN CÁO)

**Tại sao không:**
- ❌ Phải aggregate 200K transactions mỗi lần query stats
- ❌ Mất dữ liệu real_awarded, virtual_profit pre-computed
- ❌ Break trigger logic hiện tại  
- ❌ Migration rất phức tạp

---

## 🔍 Chiến Lược Query

### Trước (Bị Sai)

```typescript
// page.tsx - sai lầm
const stats = await getAccountSpendingStats(id, new Date());
                                                ↑ new Date() ngày hôm nay

// Trong service, nó sẽ tính:
const cycleRange = getCashbackCycleRange(config, new Date()); // 1 Mar 2026
const cycleTag = formatIsoCycleTag(cycleRange.end);           // "2026-03"

// Query sai:
SELECT * FROM transactions 
WHERE account_id = 'acc-123' 
  AND statement_cycle_tag = '2026-03';  ❌ Sai! Transactions có '2026-02'
```

**Kết quả:** 0 transactions → stats = 0

### Sau (Đúng)

#### Query Pattern 1: Lấy Cycle Tag từ Cache

```sql
-- Step 1: Lấy current_statement_cycle_tag từ cache
SELECT current_statement_cycle_tag, current_cycle_start_at, current_cycle_end_at
FROM accounts
WHERE id = 'acc-id-123';

-- Response:
-- current_statement_cycle_tag: "2026-02"
-- current_cycle_start_at: 2026-01-27 00:00:00
-- current_cycle_end_at: 2026-02-26 23:59:59
```

#### Query Pattern 2: Lấy Giao Dịch của Chu Kỳ

```sql
-- Step 2: Lấy giao dịch của chu kỳ này
SELECT 
  t.id, t.amount, t.occurred_at, 
  t.statement_cycle_tag,
  c.name as category,
  s.name as shop
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN shops s ON t.shop_id = s.id
WHERE t.account_id = 'acc-id-123'
  AND t.statement_cycle_tag = '2026-02'    ✅ Chắc chắn match!
  AND t.status != 'void'
  AND t.type IN ('expense', 'debt')
ORDER BY t.occurred_at DESC;
```

**Kết quả:**
```
id           | amount    | statement_cycle_tag | category       | shop
-------------|-----------|---------------------|----------------|---------------
1a65b36d... | -18480000 | 2026-02             | Online Shopping| PNJ
```

#### Query Pattern 3: Lấy Thống Kê Cycle

```sql
-- Step 3: Lấy thống kê đã aggregated
SELECT 
  cc.statement_cycle_tag,
  cc.cycle_start_at,
  cc.cycle_end_at,
  cc.spent_amount,
  cc.real_awarded,
  cc.virtual_profit,
  cc.max_budget - (cc.real_awarded + cc.virtual_profit) as remaining_budget,
  cc.is_exhausted
FROM cashback_cycles cc
WHERE cc.account_id = 'acc-id-123'
  AND cc.statement_cycle_tag = '2026-02';
```

**Kết quả:**
```
statement_cycle_tag | cycle_start_at      | cycle_end_at        | spent_amount | real_awarded | virtual_profit
--------------------|---------------------|---------------------|--------------|--------------|----------------
2026-02             | 2026-01-27 00:00:00 | 2026-02-26 23:59:59 | 18480000     | 0            | 18480
```

#### Query Pattern 4: Combine - Một Request

```sql
-- Lấy stats + transactions của chu kỳ hiện tại
WITH current_cycle AS (
  SELECT 
    current_statement_cycle_tag,
    current_cycle_start_at,
    current_cycle_end_at
  FROM accounts
  WHERE id = 'acc-id-123'
)
SELECT 
  -- Cycle info
  cc.statement_cycle_tag,
  cc.cycle_start_at,
  cc.cycle_end_at,
  cc.spent_amount,
  cc.real_awarded,
  cc.virtual_profit,
  
  -- Transaction count
  COUNT(t.id) as transaction_count,
  
  -- Aggregates
  SUM(ABS(t.amount)) as total_spent,
  COUNT(DISTINCT t.person_id) as people_count
FROM cashback_cycles cc
LEFT JOIN transactions t ON (
  t.account_id = cc.account_id
  AND t.statement_cycle_tag = cc.statement_cycle_tag
  AND t.status != 'void'
  AND t.type IN ('expense', 'debt')
)
WHERE cc.account_id = 'acc-id-123'
  AND cc.statement_cycle_tag = (
    SELECT current_statement_cycle_tag FROM current_cycle
  );
```

**Kết quả:**
```
statement_cycle_tag | spent_amount | real_awarded | virtual_profit | transaction_count
--------------------|--------------|--------------|----------------|-------------------
2026-02             | 18480000     | 0            | 18480          | 1
```

---

## 🛠️ Chiến Lược Migration

### Phase 1: Thêm Cột Mới (Non-Breaking, 30 phút)

```sql
-- Step 1.1: Thêm cột vào transactions
ALTER TABLE transactions 
  ADD COLUMN statement_cycle_tag TEXT DEFAULT NULL;

-- Step 1.2: Backfill từ persisted_cycle_tag
UPDATE transactions 
SET statement_cycle_tag = persisted_cycle_tag 
WHERE persisted_cycle_tag IS NOT NULL;

-- Verify
SELECT COUNT(*) as with_new_tag FROM transactions WHERE statement_cycle_tag IS NOT NULL;
-- Kỳ vọng: tất cả transaction có tag được lưu

-- Step 1.3: Tạo index để query nhanh
CREATE INDEX idx_transactions_statement_cycle_tag ON transactions(statement_cycle_tag, account_id);
```

### Phase 2: Thêm Boundaries vào Cycles (30 phút)

```sql
-- Step 2.1: Thêm cột start/end
ALTER TABLE cashback_cycles
  ADD COLUMN cycle_start_at TIMESTAMP DEFAULT NULL,
  ADD COLUMN cycle_end_at TIMESTAMP DEFAULT NULL;

-- Step 2.2: Backfill - Cách dễ nhất
-- Nếu cycle_tag = "2026-02", tính từ cấu hình account
UPDATE cashback_cycles cc
SET 
  cycle_start_at = CASE 
    WHEN cc.statement_cycle_tag LIKE '%-01' THEN 
      (cc.cycle_start_at)::date         -- Giữ cũ nếu có
    ELSE 
      compute_cycle_start(cc.account_id, cc.statement_cycle_tag)
  END,
  cycle_end_at = CASE 
    WHEN cc.statement_cycle_tag LIKE '%-01' THEN 
      (cc.cycle_end_at)::date
    ELSE 
      compute_cycle_end(cc.account_id, cc.statement_cycle_tag)
  END
WHERE cycle_start_at IS NULL;

-- Hoặc cách thủ công (chắc chắn):
-- Sử dụng getCashbackCycleRange() TypeScript để tính, rồi insert SQL

-- Verify
SELECT COUNT(*) as with_boundaries FROM cashback_cycles 
WHERE cycle_start_at IS NOT NULL AND cycle_end_at IS NOT NULL;
```

### Phase 3: Cache vào Accounts (30 phút)

```sql
-- Step 3.1: Thêm cột cache
ALTER TABLE accounts
  ADD COLUMN current_statement_cycle_tag TEXT DEFAULT NULL,
  ADD COLUMN current_cycle_start_at TIMESTAMP DEFAULT NULL,
  ADD COLUMN current_cycle_end_at TIMESTAMP DEFAULT NULL,
  ADD COLUMN cycle_cached_at TIMESTAMP DEFAULT NULL;

-- Step 3.2: Backfill chu kỳ mới nhất của từng account
WITH latest_cycles AS (
  SELECT DISTINCT ON (account_id)
    account_id,
    statement_cycle_tag,
    cycle_start_at,
    cycle_end_at,
    updated_at
  FROM cashback_cycles
  ORDER BY account_id, statement_cycle_tag DESC
)
UPDATE accounts ac
SET 
  current_statement_cycle_tag = lc.statement_cycle_tag,
  current_cycle_start_at = lc.cycle_start_at,
  current_cycle_end_at = lc.cycle_end_at,
  cycle_cached_at = NOW()
FROM latest_cycles lc
WHERE ac.id = lc.account_id;

-- Verify: Tất cả credit card có chu kỳ không?
SELECT COUNT(*) as accounts_with_cache FROM accounts
WHERE type = 'credit_card' AND current_statement_cycle_tag IS NOT NULL;
```

### Phase 4: Code Migration (Đôi Hôm)

**Tập tin cần sửa:**

1. **src/services/cycle-tag.service.ts** (NEW)
```typescript
export async function getCurrentStatementCycleTag(accountId: string): Promise<string | null> {
  const supabase = createClient();
  
  const { data: account } = await supabase
    .from('accounts')
    .select('current_statement_cycle_tag')
    .eq('id', accountId)
    .single();
  
  return account?.current_statement_cycle_tag || null;
}

export async function updateAccountCycleCache(
  accountId: string, 
  cycleTag: string
): Promise<void> {
  const supabase = createClient();
  
  const { data: cycle } = await supabase
    .from('cashback_cycles')
    .select('*')
    .eq('account_id', accountId)
    .eq('statement_cycle_tag', cycleTag)
    .single();
  
  if (cycle) {
    await supabase
      .from('accounts')
      .update({
        current_statement_cycle_tag: cycleTag,
        current_cycle_start_at: cycle.cycle_start_at,
        current_cycle_end_at: cycle.cycle_end_at,
        cycle_cached_at: new Date().toISOString(),
      })
      .eq('id', accountId);
  }
}
```

2. **src/services/cashback-health.service.ts** (NEW)
```typescript
export async function getCashbackHealthStats(accountId: string) {
  const supabase = createClient();
  
  // Lấy cycle từ cache
  const { data: account } = await supabase
    .from('accounts')
    .select('current_statement_cycle_tag, current_cycle_start_at, current_cycle_end_at')
    .eq('id', accountId)
    .single();
  
  if (!account?.current_statement_cycle_tag) return null;
  
  // Lấy stats từ cashback_cycles
  const { data: cycle } = await supabase
    .from('cashback_cycles')
    .select('*')
    .eq('account_id', accountId)
    .eq('statement_cycle_tag', account.current_statement_cycle_tag)
    .single();
  
  return {
    cycle: {
      tag: account.current_statement_cycle_tag,
      startDate: new Date(account.current_cycle_start_at),
      endDate: new Date(account.current_cycle_end_at),
      spent: cycle?.spent_amount || 0,
      earned: cycle?.real_awarded || 0,
      projected: cycle?.virtual_profit || 0,
      budgetRemaining: cycle?.max_budget 
        ? cycle.max_budget - (cycle.real_awarded + cycle.virtual_profit)
        : null,
    }
  };
}
```

3. **src/app/accounts/[id]/page.tsx** (UPDATE)
```typescript
const cashbackStats = await getCashbackHealthStats(accountId);
// ✅ Không cần tính cycle tag, lấy từ cache
```

### Phase 5: Xóa Cột Cũ (Sau 2 Tuần Production)

```sql
-- Chỉ xóa sau khi chắc code hoàn toàn không dùng persisted_cycle_tag nữa

-- Step 5.1: Drop index cũ
DROP INDEX IF EXISTS idx_transactions_persisted_cycle_tag;
DROP INDEX IF EXISTS idx_transactions_tag;

-- Step 5.2: Drop columns cũ
ALTER TABLE transactions DROP COLUMN IF EXISTS persisted_cycle_tag;
ALTER TABLE transactions DROP COLUMN IF EXISTS tag;

-- Verify
\d transactions;  -- Kiểm tra persisted_cycle_tag không còn
```

---

## 📊 Bảng So Sánh: Trước vs Sau

### Trước Migration

| Bảng | Cột Quan Trọng | Vấn Đề |
|------|---|---|
| transactions | persisted_cycle_tag | Tên gây nhầm lẫn, hai cột tag |
| cashback_cycles | cycle_tag | Không có ranh giới rõ ràng |
| accounts | cashback_config | Không cache cycle hiện tại |

**Query hiện tại:**
```
SELECT * FROM transactions WHERE account_id = ? AND persisted_cycle_tag = ?
(nhưng ? tính sai từ)
```

### Sau Migration

| Bảng | Cột Mới | Lợi Ích |
|------|---|---|
| transactions | statement_cycle_tag | Rõ ý nghĩa, index tốt |
| cashback_cycles | cycle_start_at, cycle_end_at | Ranh giới tường minh |
| accounts | current_statement_cycle_tag (cache) | Tránh re-compute |

**Query mới:**
```sql
SELECT current_statement_cycle_tag FROM accounts WHERE id = ?
-- ✅ Lấy từ cache (fast, 1ms)

SELECT * FROM transactions 
WHERE account_id = ? AND statement_cycle_tag = ?
-- ✅ Tag chắc chắn đúng
```

---

## 🎯 Quyết Định Kiến Trúc

### Câu Hỏi 1: Có Xóa `cashback_cycles` Bảng Không?

**Trả lời: ❌ KHÔNG XÓAI**

Lý do:
- ✅ Bảng này lưu pre-computed stats (spent_amount, real_awarded, etc.)
- ✅ Được cập nhật bởi trigger `recomputeCashbackCycle()` - logic đã tốt
- ✅ Nếu xóa, phải aggregate 200K transactions mỗi lần
- ✅ Ya, rollback dễ hơn nếu giữ bảng

**Thay vào đó:**
- ✅ Giữ bảng, chỉ thêm cột
- ✅ DUng query `JOIN` để kết hợp data

### Câu Hỏi 2: Có Xóa Cột `persisted_cycle_tag` Không?

**Trả lời: ✅ CÓ, NHƯNG SAU NÀY**

Timeline:
1. **Tuần 1:** Thêm `statement_cycle_tag`, backfill
2. **Tuần 2:** Code production dùng `statement_cycle_tag`
3. **Tuần 3:** Verify không ai dùng `persisted_cycle_tag` nữa
4. **Tuần 4:** Drop cột cũ (safety)

**Lý do từng bước:**
- ✅ Nếu xóa sớm, legacy code bị break
- ✅ Nếu giữ lâu, confusing cho developer mới

### Câu Hỏi 3: Cần Tạo Cột Mới Hay Rename Cũ?

**Trả lời: ✅ TẠO MỚI, RENAME SAU**

So sánh:

| Cách | Ưu | Nhược |
|-----|---|---|
| Rename ngay | Code rõ ràng | Phải update code cùng lúc, risky |
| Tạo mới, rename sau | Rollback dễ | Tạm có 2 cột (38 phút) |

**Chiến lược:** Tạo mới → backfill → code lên prod → sau 1 tuần xóa cũ

---

## 🔄 Quy Trình Cập Nhật Cycle Cache

**Khi nào update cache?**

1. **Account config thay đổi** (statement day, cycle type)
```typescript
// Trigger: Khi user edit account settings
await updateAccountCycleCache(accountId, newCycleTag);
```

2. **Giao dịch tạo mới (trigger tự động)**
```sql
-- Trigger: Sau khi insert/update transaction
CREATE OR REPLACE TRIGGER update_cycle_cache_on_transaction
AFTER INSERT OR UPDATE ON transactions
FOR EACH ROW
BEGIN
  UPDATE accounts
  SET cycle_cached_at = NOW()
  WHERE id = NEW.account_id;
END;
```

3. **Scheduled Job (nêu đảm bảo)**
```typescript
// Chạy mỗi hôm lúc 1 AM
export async function refreshAllCycleCaches() {
  const accounts = await supabase
    .from('accounts')
    .select('id, type')
    .eq('type', 'credit_card');
  
  for (const acc of accounts) {
    await updateAccountCycleCache(acc.id);
  }
}
```

---

## 🐛 Validation Queries

Sau mỗi phase, chạy queries này để verify:

### Sau Phase 1 (statement_cycle_tag)
```sql
-- Tất cả transaction có statement_cycle_tag?
SELECT COUNT(*) as total_txns, 
       COUNT(statement_cycle_tag) as with_tag,
       COUNT(*) - COUNT(statement_cycle_tag) as missing
FROM transactions
WHERE account_id = 'account-uuid';
-- Kỳ vọng: missing = 0
```

### Sau Phase 2 (Boundaries)
```sql
-- Tất cả cycles có boundaries?
SELECT COUNT(*) as total_cycles,
       COUNT(cycle_start_at) as with_start,
       COUNT(cycle_end_at) as with_end
FROM cashback_cycles
WHERE account_id = 'account-uuid';
-- Kỳ vọng: with_start = with_end = total_cycles
```

### Sau Phase 3 (Cache)
```sql
-- Cable accounts có cache?
SELECT COUNT(*) as total_cc_accounts,
       COUNT(current_statement_cycle_tag) as with_cache
FROM accounts
WHERE type = 'credit_card';
-- Kỳ vọng: with_cache = total_cc_accounts
```

### Verify Data Consistency
```sql
-- Một giao dịch, check 3 bảng match
WITH sample_txn AS (
  SELECT id, account_id, statement_cycle_tag, occurred_at
  FROM transactions
  WHERE account_id = 'account-uuid' AND statement_cycle_tag = '2026-02'
  LIMIT 1
),
check_cycle AS (
  SELECT COUNT(*) as cycle_exists
  FROM cashback_cycles
  WHERE account_id = (SELECT account_id FROM sample_txn)
    AND statement_cycle_tag = (SELECT statement_cycle_tag FROM sample_txn)
),
check_account AS (
  SELECT COUNT(*) as in_accounts_cache
  FROM accounts
  WHERE id = (SELECT account_id FROM sample_txn)
    AND current_statement_cycle_tag = (SELECT statement_cycle_tag FROM sample_txn)
)
SELECT * FROM check_cycle, check_account;
-- Kỳ vọng: cycle_exists = 1, in_accounts_cache = 1
```

---

## 📈 Performance Impact

### Query Speed

| Query | Trước | Sau | Cải Thiện |
|-------|-------|-----|----------|
| Lấy cycle tag | Re-compute (5ms) | Cache lookup (0.5ms) | 10x |
| Lấy transactions | No index (200ms) | Index (5ms) | 40x |
| Lấy stats | Join + aggregate (150ms) | Single index lookup (5ms) | 30x |

### Storage

| Table | Thêm | Dung Lượng |
|-------|------|-----------|
| transactions | statement_cycle_tag + idx | +200MB |
| cashback_cycles | 2 timestamp columns | +50MB |
| accounts | 4 columns + 1 timestamp | +10MB |
| **Total** | | **+260MB** (chấp nhận được) |

---

## 🚨 Risk & Mitigation

| Risk | Xác Suất | Tác Động | Mitigation |
|------|----------|---------|-----------|
| Backfill data sai | Thấp | Medium | Test script trên dev first |
| Query sai lúc transition | Trung Bình | High | Feature flag, parallel code path |
| Index slow down | Thấp | Low | Test write performance trước |
| Cache stale | Trung Bình | Medium | Refresh job + TTL |

**Rollback Plan:**
- Nếu Phase 1/2 sai: Drop cột, restore từ backup
- Nếu Phase 3 sai: Disable update job, dùng cột cũ
- Nếu Phase 4 sai: Revert code deploy

---

## ✅ Checklist Implementation

### Phase 1: Columns
- [ ] ALTER TABLE transactions ADD statement_cycle_tag
- [ ] Backfill từ persisted_cycle_tag
- [ ] CREATE INDEX idx_transactions_statement_cycle_tag
- [ ] Verify: SELECT COUNT(*) WHERE statement_cycle_tag IS NULL

### Phase 2: Boundaries
- [ ] ALTER TABLE cashback_cycles ADD cycle_start_at, cycle_end_at
- [ ] Backfill từ cycle_tag + config
- [ ] Verify: SELECT COUNT(cycle_start_at) = total

### Phase 3: Cache
- [ ] ALTER TABLE accounts ADD current_statement_cycle_tag + 3 cols
- [ ] Backfill từ latest cashback_cycles
- [ ] CREATE scheduled job để refresh
- [ ] Verify: SELECT COUNT(*) WHERE current_statement_cycle_tag IS NOT NULL

### Phase 4: Code
- [ ] Tạo cycle-tag.service.ts
- [ ] Tạo cashback-health.service.ts
- [ ] Update page.tsx
- [ ] Update transaction triggers (nếu cần)
- [ ] Feature flag test

### Phase 5: Cleanup
- [ ] Chạy queries validation (2 tuần sau)
- [ ] DROP COLUMN persisted_cycle_tag
- [ ] DROP COLUMN tag
- [ ] DROP INDEX cũ
- [ ] Verify: DESCRIBE transactions (không còn cột cũ)

---

## 📌 Kết Luận

### Thiết Kế DB Quyết Định:
```
✅ Giữ 3 bảng (transactions, cashback_cycles, accounts)
✅ Thêm cột mới (statement_cycle_tag, boundaries, cache)
✅ Xóa cột cũ (persisted_cycle_tag) sau 2 tuần
✅ Không rename ngay, tạo mới trước
```

### Query Strategy:
```
1. Lấy cycle tag từ cache: SELECT current_statement_cycle_tag FROM accounts
2. Query transactions với tag: WHERE statement_cycle_tag = ?
3. Join với cashback_cycles để lấy stats
4. Kết quả: Chắc chắn đúng, nhanh (index), scalable
```

### Timeline:
```
Phase 1-3 (Infrastructure): 2 giờ
Phase 4 (Code): 2 ngày  
Phase 5 (Cleanup): Tuần thứ 3
Total: 2.5 ngày dev + 1 tuần validation
```

---

**Tiếp theo:** Phê duyệt design → Bắt đầu Phase 1 từ mai
