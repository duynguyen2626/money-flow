# 📚 Hướng Dẫn Cashback - Tài Liệu Kỹ Thuật Tiếng Việt

## 📖 Mục Lục
1. [Tổng Quan Kiến Trúc](#tổng-quan-kiến-trúc)
2. [Luồng Dữ Liệu Cashback](#luồng-dữ-liệu-cashback)
3. [Cột Rewards (Tương Tác)](#cột-rewards-tương-tác)
4. [Slide Edit Transaction](#slide-edit-transaction)
5. [Policy Resolver (Giải Quyết Chính Sách)](#policy-resolver)
6. [Cycle Management (Quản Lý Kỳ)](#cycle-management)
7. [Code Files Reference](#code-files-reference)

---

## 🏗️ Tổng Quan Kiến Trúc

### Cashback 3-Tier Model

Hệ thống cashback Money Flow 3 sử dụng mô hình **3-tầng ưu tiên** (priority):

```
┌─────────────────────────────────────────────────────┐
│ 1. Category Rule (Priority 20)                      │
│    - Áp dụng cho từng loại chi tiêu (e.g. Education)
│    - Chỉ khả dụng nếu điều kiện tầng được đáp ứng   │
│    - Ví dụ: Vpbank Lady, Education, Premium 15%     │
└─────────────────────────────────────────────────────┘
                        ↓ (không match?)
┌─────────────────────────────────────────────────────┐
│ 2. Level Default (Priority 10)                      │
│    - Áp dụng cho toàn bộ chi tiêu nếu tầng match    │
│    - Ví dụ: Vpbank Lady, Premium, default 15%       │
└─────────────────────────────────────────────────────┘
                        ↓ (không match tầng?)
┌─────────────────────────────────────────────────────┐
│ 3. Program Default (Priority 0)                     │
│    - Fallback cuối cùng: 0.3% cho toàn bộ           │
│    - Được áp dụng khi không match rule/tầng nào     │
└─────────────────────────────────────────────────────┘
```

### Cấu Trúc Dữ Liệu Config

```typescript
cashback_config: {
  program: {
    defaultRate: 0.003,           // 0.3% fallback
    statementDay: 20,             // Ngày bắt đầu kỳ (20 = từ 20 hôm nay đến 19 tháng sau)
    cycleType: "statement_cycle",  // calendar_month hoặc statement_cycle
    minSpendTarget: 100000,       // Ngưỡng tối thiểu để qualify (nếu > 0)
    
    levels: [
      {
        id: "lvl_premium",
        name: "Premium Tier ≥15M",
        minTotalSpend: 15000000,   // Phải chi ≥15M trong kỳ để unlock
        defaultRate: 0.15,         // 15% mặc định cho các chi tiêu khác
        rules: [                    // Category-specific rules
          {
            id: "rule_1",
            categoryIds: ["aac49..."], // Education category ID
            rate: 0.15,             // 15% cho Education
            maxReward: 300000       // Cap tối đa 300k cho rule này
          }
        ]
      },
      {
        id: "lvl_standard",
        name: "Standard (<15M)",
        minTotalSpend: 100000,     // Phải chi ≥100k để unlock
        defaultRate: 0.075,        // 7.5% cho các chi tiêu khác
        rules: [
          {
            id: "rule_2",
            categoryIds: ["aac49..."], // Education category ID
            rate: 0.075,            // 7.5% cho Education
            maxReward: 150000       // Cap 150k
          }
        ]
      }
    ]
  }
}
```

---

## 🔄 Luồng Dữ Liệu Cashback

### 1. Tạo/Edit Transaction (Slide V2)

```
User nhập: {amount, category, account}
           ↓
Slide V2 tính: projectedSpent = cycleSpent + amount
           ↓
Policy Resolver chọn level (Premium/Standard) dựa trên projectedSpent
           ↓
User xem preview rate + reward
           ↓
Submit: saveTransaction()
           ↓
Backend: generateCashbackMetadata()
           ↓
Lưu: cashback_entries {
       transaction_id,
       amount,
       rate,
       awarded_amount,
       metadata: {policySource, rate, levelId, ruleMaxReward}
     }
```

### 2. Hiển Thị Rewards (Account Row)

```
Account Table Row (AccountTableV2)
           ↓
AccountRowV2 (render hàng)
           ↓
account-rewards-cell.tsx (cột "Reward")
           ↓
Gọi getCashbackProgress(account.id, cycle)
           ↓
Tính toán:
  - currentSpent (chi tiêu hiện tại)
  - isMet (đạt ngưỡng minimum spend?)
  - currentRate (tỷ lệ hiện tại dựa trên spent)
  - projectedAwarded (dự báo reward)
           ↓
Hiển thị Progress Bar với tooltip chi tiết
           ↓
Click bar → mở modal AccountCycleTransactionsModal
           ↓
Modal: 3 tabs (All / By Strategy / Summary)
```

### 3. Đóng Kỳ (Cycle Close - Backend)

```
End of statement cycle (e.g., Dec 19)
           ↓
Cron job: closeCashbackCycle()
           ↓
Tính final reward: SUM(awarded_amount) cho kỳ
           ↓
Áp dụng capping: min(final_reward, maxBudget)
           ↓
Tạo cashback_claims record
           ↓
Update account balance (nếu claim)
```

---

## 💰 Cột Rewards (Tương Tác)

### Vị Trí & Layout
- **File**: `src/components/accounts/v2/cells/account-rewards-cell.tsx`
- **Nằm trong**: AccountTableV2 (bảng Account chính)
- **Cột thứ**: Cột "Reward" (phải cùng)

### Giao Diện & Tương Tác

#### Với Multi-Tier Config (e.g. Vpbank Lady)
```
┌──────────────────────────────────┐
│ ⚠️ Needs 4.050.000 (nếu chưa meet) │  ← Status line (chỉ hiện nếu chưa qualified)
│                                  │
│ [▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░] │
│  QUALIFIED / Needs 6.050.000  45% │  ← Progress bar (clickable, có border)
│                                  │
│ 📅 20.11 - 19.12  │  Claim 405.500 / 1.000.000 │  ← Cycle button + Claim text
└──────────────────────────────────┘
```

**Hover Tooltip** (Click bar):
```
┌─────────────────────────────────────────┐
│ 📊 Cycle Progress          [Qualified]  │
│ ─────────────────────────────────────── │
│ Need 6.050.000 more to reach ...        │
│                                        │
│ 🎯 Cashback Strategy           3 RULES │
│ ┌──────────────────────────────────┐  │
│ │ Premium Tier ≥15M    ≥15.000.000 │  │
│ │   Education: 15.0% (cap 300k)     │  │
│ │   Other: 15.0%                    │  │
│ │ Standard (<15M)     ≥100.000      │  │
│ │   Education: 7.5% (cap 150k)      │  │
│ │   Other: 7.5%                     │  │
│ └──────────────────────────────────┘  │
│                                        │
│ 💸 Spent: 8.950.000 (9 triệu)          │
│ 🎯 Target: 15.000.000                  │
│ 🔒 Cap: 1.000.000                      │
│                                        │
│ ✅ Awarded: 405.500                    │
│ 🌱 Default 0.3%*: 26.850               │
│ 💰 Profit: 25.000 (nếu có)              │
│ 🔮 Est. Award: 500.000 (nếu chưa meet) │
└─────────────────────────────────────────┘
```

#### Với Simple Config (chỉ defaultRate)
```
┌──────────────────────────────────┐
│ [▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░] │
│      55% complete                 │
│                                  │
│ 📅 20.01 - 19.02  │  405.500 / 1.000.000 │
└──────────────────────────────────┘

Tooltip: Earned / Cap / Default 0.3%*
```

### Tương Tác Chi Tiết

**1. Click Progress Bar**
```
Action: Click bất kỳ đâu trên progress bar
Result: Mở modal AccountCycleTransactionsModal
        (hiển thị toàn bộ transaction của kỳ này)
```

**2. Click Cycle Button (📅 20.11 - 19.12)**
```
Action: Click nút ngày
Result: Mở modal giao dịch cho kỳ này (same as click bar)
```

**3. Hover Bar**
```
Action: Hover chuột lên progress bar
Result: Border thay đổi từ slate-200 → indigo-200
Ghi chú: Gợi ý user rằng đây là clickable
```

### Logic Tính Toán

```typescript
// 1. Determine level qualification
const spent = account.stats.spent_this_cycle;
const isMet = spent >= minSpendTarget;

// 2. Select appropriate level
if (spent >= 15_000_000) {
  level = Premium;  // 15%
} else if (spent >= 100_000) {
  level = Standard;  // 7.5%
} else {
  use Program default;  // 0.3%
}

// 3. Calculate reward
if (rule matches category) {
  rate = rule.rate;  // Category-specific
  maxReward = rule.maxReward;
} else {
  rate = level.defaultRate;  // Level default
  maxReward = ???;  // Usually no cap for level default
}

reward = amount × rate;
final = min(reward, maxReward) if exists;
```

---

## ✏️ Slide Edit Transaction

### Flow Tương Tác Edit

**Bước 1: Open Edit Mode**
```
AccountTableV2 row → [⋯ menu]
       ↓
Click "Edit" button
       ↓
AccountRowV2 onEditTransaction(txnId)
       ↓
parent: TransactionSlideV2 open={true} editingId={txnId}
```

**Bước 2: Load Transaction Data**
```
TransactionSlideV2 (transaction-slide-v2.tsx)
useEffect: if (open && editingId && !initialData)
       ↓
loadTransactions({transactionId: editingId})
       ↓
Set form fields:
  - occurred_at
  - amount
  - category_id  ← ⚠️ IMPORTANT: Được load từ DB, không auto-assign lại
  - source_account_id
  - cashback_mode
  - ...
```

**Bước 3: BasicInfoSection (Nhập Liệu)**
```
File: src/components/transaction/slide-v2/single-mode/basic-info-section.tsx

useEffect (auto-assign defaults):
  if (type === 'debt' && !currentCategoryId)  ← Guard: skip nếu category đã có
    form.setValue('category_id', Shopping)
  
  This prevents overwriting loaded Education category during edit!
```

**Bước 4: CashbackSection (Preview)**
```
File: src/components/transaction/slide-v2/single-mode/cashback-section.tsx

Đọc form values:
  - categoryId = useWatch('category_id')
  - amount = useWatch('amount')
  - sourceAccountId = useWatch('source_account_id')
  
Tính:
  cycleSpent = account.stats.spent_this_cycle
  projectedSpent = cycleSpent + amount
  
Gọi:
  policy = resolveCashbackPolicy({
    account,
    categoryId,    ← Dynamic update khi user đổi category
    amount,
    cycleTotals: { spent: projectedSpent }
  })
  
Hiển thị:
  - Cycle badge: "20.11 - 19.12"
  - Bank Rate: {policy.rate}%
  - Projected Reward: amount × policy.rate (capped by policy.maxReward)
  - Cycle Spent: from account.stats.spent_this_cycle
```

**Bước 5: Submit Update**
```
onSingleSubmit(data):
  payload = {
    ...data,
    category_id: data.category_id || null  ← Gửi category từ form
  }
  
  updateTransaction(editingId, payload)
  
Backend sẽ:
  1. Xóa old cashback_entries
  2. Tính lại metadata dựa trên category_id mới
  3. Lưu new cashback_entries với rate đúng
```

### Common Issues & Fixes

| Issue | Nguyên Nhân | Fix |
|-------|-----------|-----|
| Edit mode auto-assigns Shopping | `form.setValue` ngoài useEffect | Move guard inside useEffect |
| Slide shows old rate | projectedSpent dùng currentSpend | Use `cycle.spent_amount` |
| Category không lưu | callback missing | Verify `onEditTransaction` pass editingId |
| Edit txn render error | Early return before hooks | Move logic inside useEffect |

---

## 🎯 Policy Resolver

### Vị Trí File
`src/services/cashback/policy-resolver.ts`

### Hàm Chính: `resolveCashbackPolicy()`

```typescript
interface CashbackPolicyInput {
  account: Account;
  categoryId?: string;
  amount: number;
  cycleTotals: { spent: number };  // ← Dùng cycle.spent_amount, KHÔNG phải currentSpend
  categoryName?: string;
}

interface CashbackPolicy {
  rate: number;                // Final rate to apply
  maxReward?: number;          // Cap if exists
  metadata: {
    policySource: string;      // "category_rule" | "level_default" | "program_default"
    rate: number;
    ruleMaxReward?: number;
    levelId?: string;
    levelName?: string;
    categoryId?: string;
    reason: string;            // Explain why this rate was chosen
  }
}
```

### Logic Chi Tiết

**Step 1: Check minSpendTarget Gate**
```typescript
if (config.program.minSpendTarget && 
    cycleTotals.spent < config.program.minSpendTarget) {
  // Skip all levels, return program default only
  return {
    rate: config.program.defaultRate,
    metadata: {
      policySource: "program_default",
      reason: "Below minSpendTarget"
    }
  };
}
```

**Step 2: Select Appropriate Level**
```typescript
// Sort levels by minTotalSpend descending (highest first)
const sorted = [...levels].sort((a, b) => b.minTotalSpend - a.minTotalSpend);

// Find level where spent >= minTotalSpend
const selectedLevel = sorted.find(l => cycleTotals.spent >= l.minTotalSpend);

if (!selectedLevel) {
  // No level matches, use program default
  return programDefaultPolicy;
}
```

**Step 3: Try Category Rule in Selected Level**
```typescript
const rule = selectedLevel.rules?.find(r => 
  r.categoryIds?.includes(categoryId)
);

if (rule) {
  // ✅ Category rule matched
  return {
    rate: rule.rate,
    maxReward: rule.maxReward,
    metadata: {
      policySource: "category_rule",
      levelId: selectedLevel.id,
      levelName: selectedLevel.name,
      categoryId,
      rate: rule.rate,
      ruleMaxReward: rule.maxReward
    }
  };
}

// ❌ Category rule NOT found in this level
// → Return PROGRAM DEFAULT, NOT level default!
if (!rule) {
  return {
    rate: config.program.defaultRate,  // ← Program default, not level default
    metadata: {
      policySource: "program_default",
      levelId: selectedLevel.id,
      reason: "Category not in level rules"
    }
  };
}
```

**Step 4: Apply Level Default (if no category rule needed)**
```typescript
// If categoryId is not provided or user wants level default
if (!categoryId || user.preference === 'use_level_default') {
  return {
    rate: selectedLevel.defaultRate,
    metadata: {
      policySource: "level_default",
      levelId: selectedLevel.id,
      levelName: selectedLevel.name,
      rate: selectedLevel.defaultRate
    }
  };
}
```

### Ví Dụ: Vpbank Lady

**Case 1: Education, 8.950.000 chi tiêu (Premium tier)**
```
1. Spend 8.950.000 >= minTotalSpend (100.000) ✓
2. Sort levels: [Premium (15M), Standard (100k)]
3. Find: 8.950.000 >= Premium (15M)? ✗ → try Standard (100k) ✓
4. Selected level: Standard
5. Category Education in Standard.rules? ✓
6. Rate: 7.5%, maxReward: 150.000

→ RESULT: 7.5%, cap 150k ✅
```

**Case 2: Shopping, 8.950.000 chi tiêu**
```
1-4. Same → Standard level selected
5. Category Shopping in Standard.rules? ✗
6. No rule found → Use PROGRAM DEFAULT (0.3%)

→ RESULT: 0.3% ✅ (not 7.5% level default!)
```

**Case 3: Spend only 50.000 (below all levels)**
```
1. Spend 50.000 >= minTotalSpend (100.000)? ✗
2. Gate: return program default immediately

→ RESULT: 0.3% (regardless of category) ✅
```

---

## 📅 Cycle Management

### Cycle Types

**1. Statement Cycle (e.g. Vpbank Lady)**
```
statementDay: 20

Cycle: 20 Dec 2025 - 19 Jan 2026
Tag: "2026-01" (end month)

Fiscal Year Detection:
  if (statementDay > 15 && month === 1) {
    year = current_year - 1;  // Jan cycle started in Dec previous year
  }
  
Example: Cycle 2025-01 (Dec 20, 2024 - Jan 19, 2025) 
         → Grouped under year 2025 (start year)
```

**2. Calendar Month Cycle**
```
statementDay: null
cycleType: "calendar_month"

Cycle: 1 Dec - 31 Dec
Tag: "2025-12"
Year: 2025 (end month)
```

### getCashbackProgress() - Critical Fix

**File**: `src/services/cashback/cashback.service.ts`

**Before (Bug)**:
```typescript
const currentSpend = account.stats.spent_this_cycle;  // ← Current cycle's spent
const policy = resolveCashbackPolicy({
  cycleTotals: { spent: currentSpend }  // ← WRONG! Using current cycle for historical
});
// Result: 2025-11 cycle transactions show rates from 2026-01 cycle (current)
```

**After (Fixed)**:
```typescript
const cycleSpent = cycle.spent_amount;  // ← THIS cycle's total
const policy = resolveCashbackPolicy({
  cycleTotals: { spent: cycleSpent }  // ← Correct! Using viewed cycle
});
// Result: 2025-11 cycle transactions show rates from 2025-11 (accurate)
```

### Grouping Cycles by Year

**File**: `src/components/moneyflow/AccountCycleTransactionsModal.tsx`

**getYear() Function**:
```typescript
const getYear = (cycleTag: string, statementDay: number) => {
  const [year, month] = cycleTag.split('-').map(Number);
  
  // For statement cycles spanning months (e.g. Nov 20 - Dec 19)
  if (statementDay > 15 && month === 1) {
    return year - 1;  // Jan cycle started in Dec previous year
  }
  
  return year;  // For calendar months, use end month year
};

// Usage
const cycles = data.map(c => ({
  ...c,
  year: getYear(c.tag, account.credit_card_info.statement_day)
}));

const groupedByYear = groupBy(cycles, 'year');
// Now 2025-12 (Nov 20 - Dec 19, 2025) groups under year 2025 ✓
```

---

## 📂 Code Files Reference

### Core Files (Thiết Yếu)

| File | Mục Đích | Chỉnh Sửa Gần Đây |
|------|---------|-----------------|
| `src/services/cashback/policy-resolver.ts` | 3-tier policy resolution | Min spend gate, fallback to program default |
| `src/services/cashback/cashback.service.ts` | getCashbackProgress, cycle spent | Use cycle.spent_amount not currentSpend |
| `src/components/accounts/v2/cells/account-rewards-cell.tsx` | Rewards column UI | Border, larger bar, better labels |
| `src/components/transaction/slide-v2/transaction-slide-v2.tsx` | Edit transaction form | Load editingId data correctly |
| `src/components/transaction/slide-v2/single-mode/basic-info-section.tsx` | Category auto-assign | Guard inside useEffect to skip on edit |
| `src/components/transaction/slide-v2/single-mode/cashback-section.tsx` | Cashback preview | projectedSpent, cycle badge, dynamic rate |
| `src/components/moneyflow/AccountCycleTransactionsModal.tsx` | Cycle modal (3 tabs) | getYear() fiscal year detection |

### Supporting Files

| File | Mục Đích |
|------|---------|
| `src/types/moneyflow.types.ts` | Type definitions (Account, Category, etc.) |
| `src/lib/cashback.ts` | Cashback utilities (normalizeCashbackConfig, parseCashbackConfig) |
| `src/lib/cycle-utils.ts` | calculateStatementCycle() |
| `src/actions/transaction-actions.ts` | Server actions (createTransaction, updateTransaction) |
| `supabase/migrations/` | Schema & historical migrations |
| `database/SCHEMA.md` | Current schema documentation |

### Config Files

| File | Mục Đích |
|------|---------|
| `supabase/sample.sql` | Sample data with Vpbank Lady config (15M Premium) |
| `src/scripts/update-lady-config.ts` | Script to update production config |
| `.env.local` | Supabase credentials (not in repo) |

---

## 🔗 Navigation Guide cho Agent Sau

**Nếu cần sửa Cashback Rate**:
1. Kiểm tra `policy-resolver.ts` logic
2. Verify `cashback.service.ts` sử dụng `cycle.spent_amount`
3. Test với `getCashbackProgress()`

**Nếu cần sửa Rewards Column Display**:
1. Edit `account-rewards-cell.tsx`
2. Modify progress bar styling hoặc tooltip content
3. Update label wording

**Nếu cần sửa Edit Transaction Flow**:
1. Check `transaction-slide-v2.tsx` - editingId loading
2. Verify `basic-info-section.tsx` - category guard
3. Check `cashback-section.tsx` - dynamic rate calculation

**Nếu cần sửa Cycle Grouping**:
1. Edit `AccountCycleTransactionsModal.tsx` - `getYear()` function
2. Update cycle calculation logic nếu thay statement_day

---

## 📝 Checklist Khi Deploy

- [ ] Config có minTotalSpend = 15M (cho Premium tier)
- [ ] Policy resolver fallback = 0.3% (program default)
- [ ] cashback.service.ts dùng cycle.spent_amount
- [ ] account-rewards-cell.tsx có border + bigger bar
- [ ] basic-info-section.tsx guard ngoài top-level
- [ ] Rewards tooltip hiện Default 0.3%* row
- [ ] Cycle year grouping dùng getYear() with fiscal detection
- [ ] Build pass, lint clean, test pass

---

## 🎓 Learning Path cho Agent Sau

**Mới bắt đầu:**
1. Đọc file này (CASHBACK_GUIDE_VI.md)
2. Xem `supabase/sample.sql` để hiểu config structure
3. Trace `resolveCashbackPolicy()` flow với ví dụ Vpbank Lady

**Sửa bugs:**
1. Kiểm tra `.agent/CASHBACK_DEBUGGING.md` (nếu có)
2. Gọi `getCashbackProgress()` để debug spent/rate
3. Check transaction metadata sau submit

**Thêm feature:**
1. Update `CashbackConfig` type trong `types/moneyflow.types.ts`
2. Modify `resolveCashbackPolicy()` logic
3. Test new rates trong modal preview
4. Verify metadata stored correctly

---

**Cập nhật cuối: 23 Jan 2026**
**Phiên bản: 3.0 (Multi-Tier Cashback)**
