# **AGENT TASK: FIX AUTHENTICATION ERROR & IMPLEMENT PHASE 16**

CRITICAL FIX: "User is not authenticated" Error

The application currently blocks actions because there is no logged-in user session (we haven't built Auth UI yet).

Action: Update ALL Services (account.service.ts, transaction.service.ts, debt.service.ts, subscription.service.ts) to use a Hardcoded Fallback ID when auth.getUser() returns null.

**Fallback User ID (From Seed Data):** 917455ba-16c0-42f9-9cea-264f81a3db66

## **1\. GLOBAL FIX: Service Layer Authentication (src/services/\*.ts)**

**Pattern to Apply (Example for account.service.ts):**

```

// OLD (Broken)
// const { data: { user } } = await supabase.auth.getUser();
// if (!user) throw new Error("User is not authenticated");

// NEW (Fixed for Dev Mode)
const { data: { user } } = await supabase.auth.getUser();
const userId = user?.id || '917455ba-16c0-42f9-9cea-264f81a3db66'; // Fallback to Seed User

// Use `userId` for 'owner_id' or 'created_by' fields

```

**Target Services:**

1. src/services/account.service.ts: createAccount, updateAccount.  
2. src/services/transaction.service.ts: createTransaction (for created\_by).  
3. src/services/people.service.ts: createPerson (for owner\_id of new debt accounts).

## **2\. PHASE 16 IMPLEMENTATION: SHARED LIMIT & LIFECYCLE**

Context:

Implement Shared Limit (Parent/Child cards), Unlimited Cashback option, and Account Closing logic.

**A. Upgrade CreateAccountDialog (src/components/moneyflow/create-account-dialog.tsx)**

* **Parent Account Logic:**  
  * Watch name input. If matches existing credit card name (e.g. "VCB"), suggest linking.  
  * Dropdown: "Liên kết hạn mức (Thẻ phụ)?". List existing Credit Cards.  
  * If Parent selected: Disable "Credit Limit" input.  
* **Cashback Unlimited:**  
  * Add Checkbox: \[ \] Không giới hạn (Unlimited).  
  * If checked: Disable Max Amount input, send max\_amt: 0 (or handle as null).

**B. Upgrade AccountList (src/components/moneyflow/account-list.tsx)**

* **Filter:** Exclude accounts where is\_active \=== false from the main list.  
* **Closed Section:** Add a collapsible details/accordion at the bottom: "Tài khoản đã đóng".  
* **Shared Limit Display:** On Child Cards, show "Link: \[ParentName\]" badge instead of Limit.

**C. Upgrade AccountDetails (src/app/accounts/\[id\]/page.tsx)**

* **Close Action:** Add "Close Account" to the options menu.  
  * Call updateAccount(id, { is\_active: false }).  
* **Reopen Action:** If account is closed, show "Reopen" button.

## **3\. Execution Steps**

1. **PRIORITY 1:** Go through all Service files and apply the **Fallback User ID** fix. This will unblock the "User not authenticated" error immediately.  
2. **PRIORITY 2:** Implement Phase 16 UI features (Create Dialog & Account List updates).  
3. **Safety Check:** Run npm run build to ensure no type errors were introduced.  
10. 