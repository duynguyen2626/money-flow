# Phase 1 Test Cases - Database Migration

## Prerequisites
```bash
# Run migration
psql $DATABASE_URL -f supabase/migrations/20260301_rename_cycle_columns.sql
```

---

## Test Case 1: Verify New Columns Exist

**Query:**
```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions' 
  AND column_name IN ('debt_cycle_tag', 'statement_cycle_tag')
ORDER BY column_name;
```

**Expected Result:**
```
column_name          | data_type | is_nullable
---------------------+-----------+------------
debt_cycle_tag       | text      | YES
statement_cycle_tag  | text      | YES
```

✅ **Pass Criteria:** Both columns exist and are nullable

---

## Test Case 2: Verify Backfill Accuracy

**Query:**
```sql
WITH backfill_check AS (
  SELECT 
    COUNT(*) FILTER (WHERE tag IS NOT NULL) as old_tag_count,
    COUNT(*) FILTER (WHERE debt_cycle_tag IS NOT NULL) as new_debt_count,
    COUNT(*) FILTER (WHERE persisted_cycle_tag IS NOT NULL) as old_persisted_count,
    COUNT(*) FILTER (WHERE statement_cycle_tag IS NOT NULL) as new_statement_count
  FROM transactions
)
SELECT 
  old_tag_count,
  new_debt_count,
  old_tag_count = new_debt_count as debt_match,
  old_persisted_count,
  new_statement_count,
  old_persisted_count = new_statement_count as statement_match
FROM backfill_check;
```

**Expected Result:**
```
old_tag_count | new_debt_count | debt_match | old_persisted_count | new_statement_count | statement_match
--------------+----------------+------------+---------------------+---------------------+----------------
     X        |       X        |    true    |         Y           |          Y          |      true
```

✅ **Pass Criteria:** Both `debt_match` and `statement_match` are `true`

---

## Test Case 3: Verify Sample Transaction (Lâm's PNJ Transaction)

**Query:**
```sql
SELECT 
  id,
  occurred_at::date as date,
  amount,
  type,
  note,
  -- Old columns
  tag as old_debt_cycle,
  persisted_cycle_tag as old_statement_cycle,
  -- New columns
  debt_cycle_tag as new_debt_cycle,
  statement_cycle_tag as new_statement_cycle,
  -- Check person
  (SELECT name FROM people WHERE id = person_id) as person_name,
  -- Check account
  (SELECT name FROM accounts WHERE id = account_id) as account_name
FROM transactions
WHERE id = '1a65b36d-8be4-49f7-a4af-9178fcd1885d';
```

**Expected Result:**
```
id          | date       | amount      | type | note | old_debt_cycle | old_statement_cycle | new_debt_cycle | new_statement_cycle | person_name | account_name
------------+------------+-------------+------+------+----------------+---------------------+----------------+---------------------+-------------+--------------
1a65b36d... | 2026-02-26 | -18480000.00| debt | PNJ  | 2026-02        | 2026-02             | 2026-02        | 2026-02             | Lâm         | Vib Super Card
```

✅ **Pass Criteria:** 
- `new_debt_cycle = old_debt_cycle = "2026-02"` (kỳ nợ tháng 2 của Lâm)
- `new_statement_cycle = old_statement_cycle = "2026-02"` (chu kỳ 27.01-26.02 của Vib)
- Both new columns populated correctly

---

## Test Case 4: Verify Indexes Created

**Query:**
```sql
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'transactions' 
  AND indexname LIKE '%cycle%'
ORDER BY indexname;
```

**Expected Result:**
```
indexname                              | indexdef
---------------------------------------+--------------------------------------------------
idx_transactions_debt_cycle            | CREATE INDEX ... ON transactions(debt_cycle_tag, person_id) WHERE ...
idx_transactions_statement_cycle       | CREATE INDEX ... ON transactions(statement_cycle_tag, account_id) WHERE ...
```

✅ **Pass Criteria:** Both indexes exist

---

## Test Case 5: Verify Data Consistency (No Data Loss)

**Query:**
```sql
-- Check if any old values were not copied
SELECT 
  COUNT(*) as mismatches
FROM transactions
WHERE 
  (tag IS NOT NULL AND debt_cycle_tag IS NULL) OR
  (persisted_cycle_tag IS NOT NULL AND statement_cycle_tag IS NULL);
```

**Expected Result:**
```
mismatches
----------
    0
```

✅ **Pass Criteria:** `mismatches = 0`

---

## Test Case 6: Performance Test - Debt Query

**Query:**
```sql
EXPLAIN ANALYZE
SELECT 
  id,
  occurred_at,
  amount,
  note
FROM transactions
WHERE debt_cycle_tag = '2026-02'
  AND person_id = 'eccde148-a84e-455f-ba96-c8aa0b149ac8'
  AND status != 'void';
```

**Expected Result:**
```
Index Scan using idx_transactions_debt_cycle on transactions
  Index Cond: ((debt_cycle_tag = '2026-02'::text) AND (person_id = 'eccde148-a84e-455f-ba96-c8aa0b149ac8'::uuid))
  Filter: (status <> 'void'::text)
  Execution Time: < 1ms
```

✅ **Pass Criteria:** Query uses index `idx_transactions_debt_cycle`

---

## Test Case 7: Performance Test - Cashback Query

**Query:**
```sql
EXPLAIN ANALYZE
SELECT 
  id,
  occurred_at,
  amount,
  note
FROM transactions
WHERE statement_cycle_tag = '2026-02'
  AND account_id = '0ece401d-36eb-4414-a637-03814c88c216'
  AND status != 'void';
```

**Expected Result:**
```
Index Scan using idx_transactions_statement_cycle on transactions
  Index Cond: ((statement_cycle_tag = '2026-02'::text) AND (account_id = '0ece401d-36eb-4414-a637-03814c88c216'::uuid))
  Filter: (status <> 'void'::text)
  Execution Time: < 1ms
```

✅ **Pass Criteria:** Query uses index `idx_transactions_statement_cycle`

---

## Test Case 8: Transaction with BOTH Cycles

**Scenario:** Transaction vừa là debt (có person_id) vừa track cashback (có account cashback_config)

**Query:**
```sql
SELECT 
  id,
  occurred_at::date,
  amount,
  type,
  note,
  debt_cycle_tag,
  statement_cycle_tag,
  person_id IS NOT NULL as has_debt_tracking,
  (SELECT cashback_config IS NOT NULL FROM accounts WHERE id = account_id) as has_cashback_tracking
FROM transactions
WHERE debt_cycle_tag IS NOT NULL 
  AND statement_cycle_tag IS NOT NULL
LIMIT 5;
```

**Expected Result:**
```
id          | occurred_at | amount   | type | note | debt_cycle_tag | statement_cycle_tag | has_debt_tracking | has_cashback_tracking
------------+-------------+----------+------+------+----------------+---------------------+-------------------+----------------------
1a65b36d... | 2026-02-26  | -18480000| debt | PNJ  | 2026-02        | 2026-02             | true              | true
```

✅ **Pass Criteria:** Transaction có CẢ 2 cycle tags được populate đúng

---

## Summary Checklist

Run all tests và check:

- [ ] Test 1: Columns exist ✅
- [ ] Test 2: Backfill counts match ✅
- [ ] Test 3: Sample transaction correct ✅
- [ ] Test 4: Indexes created ✅
- [ ] Test 5: No data loss ✅
- [ ] Test 6: Debt query uses index ✅
- [ ] Test 7: Cashback query uses index ✅
- [ ] Test 8: Both cycles work together ✅

**All tests pass → Proceed to Phase 2**

---

## Rollback (If Needed)

```sql
-- Remove new columns
ALTER TABLE transactions DROP COLUMN IF EXISTS debt_cycle_tag;
ALTER TABLE transactions DROP COLUMN IF EXISTS statement_cycle_tag;

-- Drop indexes
DROP INDEX IF EXISTS idx_transactions_debt_cycle;
DROP INDEX IF EXISTS idx_transactions_statement_cycle;
```
