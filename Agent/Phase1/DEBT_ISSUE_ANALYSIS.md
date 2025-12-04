# 🐛 **BUG ANALYSIS: Sổ Nợ (Debt Book) Blank Issue**

## **Problem Summary:**
1. ❌ Dashboard "Sổ Nợ" section shows "No outstanding debts"
2. ❌ People card for "Lam-Nov" shows "No Pending" 
3. ✅ But there's a 666 VND transaction visible in the transaction table

---

## **Root Cause:**

### **The transaction is an EXPENSE, NOT a DEBT!**

Looking at the Supabase data you provided:

```json
// Transaction Lines
{
  "category_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99", // Shopping category
  "person_id": "b93df089-6935-41af-90b9-5ae6bf920636", // Lam-Nov  
  "amount": "666.00",
  "type": "debit", // Debit to expense category
  "account_id": null // NO debt account!
}
```

**What this transaction does:**
- ✅ Records an expense of 666 VND
- ✅ Tags it to person "Lam-Nov" (for tracking WHO it was for)
- ❌ Does NOT create a debt (no money is owed)

**The `person_id` field is just metadata** - it tracks which person the expense relates to, but doesn't create a debt obligation.

---

## **How Debt Tracking Works:**

### **1. Debt Accounts**
- Each person who owes money has a **debt account** (type='debt')
- This account tracks the total amount they owe
- Created automatically when you first lend money to someone

### **2. Debt Transactions (Cho vay)**
When you lend 666 VND to Lam-Nov, the system creates:

```
Transaction Type: "debt"
Lines:
  1. Debit to Debt Account (Lam-Nov) = +666 (Asset increases - they owe you)
  2. Credit from Bank Account = -666 (Your cash decreases)
```

### **3. Expense Transactions with Person**
When you pay 666 VND for Lam-Nov's expense:

```
Transaction Type: "expense"  
Lines:
  1. Debit to Category (Shopping) = +666 (Expense recorded)
  2. Credit from Bank Account = -666 (Your cash decreases)
  person_id: "lam-nov" (metadata only - WHO it was for)
```

**Key Difference:**
- **Debt transaction** → Creates obligation (they must pay you back)
- **Expense transaction** → Just tracks spending (no payback expected)

---

## **Why Dashboard Shows Blank:**

### **Dashboard Query Logic:**
```typescript
// src/services/dashboard.service.ts line 211-217
const { data: debtAccounts } = await supabase
  .from('accounts')
  .select('id, name, owner_id, current_balance')
  .eq('type', 'debt')           // ← Looks for debt accounts
  .gt('current_balance', 0)      // ← With positive balance
  .order('current_balance', { ascending: false })
  .limit(5)
```

**What it's looking for:**
- Accounts with `type = 'debt'`
- With `current_balance > 0` (they owe you money)

**Why it's empty:**
- The 666 VND transaction didn't create/update a debt account
- It only created an expense record with `person_id` metadata
- No debt account exists with positive balance for Lam-Nov

---

## **Solution:**

### **To create an actual debt, you need to:**

1. **Use the "Cho vay" (Lend) button** on the person card
2. **OR** Create a transaction with `type = "debt"`

This will:
- ✅ Create a debt account for Lam-Nov (if doesn't exist)
- ✅ Record 666 VND as money they owe you
- ✅ Show in Dashboard "Sổ Nợ" section
- ✅ Show "Chờ thu: 666" badge on person card

### **Current Transaction:**
The 666 VND expense transaction is correct if:
- You paid for Lam-Nov's shopping
- You DON'T expect them to pay you back
- You just want to track that you spent money on them

### **If you want them to owe you:**
You need to either:
1. **Delete the expense transaction**
2. **Create a new "debt" transaction** for 666 VND using "Cho vay" button

---

## **Code Verification:**

### **Dashboard Service (Correct):**
```typescript
// Queries debt accounts with positive balance
.eq('type', 'debt')
.gt('current_balance', 0)
```
✅ Logic is correct

### **People Service (Correct):**
```typescript
// Calculates balance from transaction_lines for debt accounts
debtBalanceMap.set(line.account_id, current + change)
```
✅ Logic is correct

### **Person Card (Correct):**
```typescript
// Shows badge based on person.balance
const balance = person.balance ?? 0
if (balance > 0) {
  // Show "Chờ thu" badge
}
```
✅ Logic is correct

---

## **Summary:**

**The system is working correctly!**

The issue is a **misunderstanding of transaction types**:
- **Expense + person_id** = Track spending on someone (no debt)
- **Debt transaction** = Create obligation (they owe you)

**To fix:**
1. Use "Cho vay" button to create proper debt transactions
2. The expense transaction with `person_id` is for tracking only

**Dashboard will show debts when:**
- Debt accounts exist with `current_balance > 0`
- Created by "debt" type transactions, not "expense" type

---

**Status:** ✅ No bug - Working as designed
**Action:** Use correct transaction type for lending money
