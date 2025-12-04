# **AGENT TASK: FIX JSON PARSING BUG & BUILD ACCOUNT DETAILS PAGE**

**Context:**

1. **Critical Bug:** The cashback\_config field from Supabase is returned as a **STRING**, not an Object. This causes the frontend to crash or show "Not Found" when accessing properties like .rate or .min\_spend.  
2. **Goal:** Build the /accounts/\[id\] page with a working "Edit Configuration" dialog.

## **1\. Backend Fix (src/services/account.service.ts)**

**Update getAccount(id):**

* Fetch the account by ID.  
* **Crucial Step:** Check if cashback\_config is a string. If yes, JSON.parse() it before returning.

// Logic required inside getAccount:  
const { data, error } \= await supabase.from('accounts').select('\*').eq('id', id).single();

if (data && typeof data.cashback\_config \=== 'string') {  
  try {  
    data.cashback\_config \= JSON.parse(data.cashback\_config);  
  } catch (e) {  
    console.error("Failed to parse cashback\_config", e);  
    data.cashback\_config \= null;  
  }  
}  
return data; // Now it is a proper Object

**Add updateAccount(id, data):**

* Function to save changes from the Edit Dialog.  
* Ensure cashback\_config is stringified (if needed by your supabase client version) or passed as an object.

## **2\. Frontend: Account Details Page (src/app/accounts/\[id\]/page.tsx)**

**Layout:**

1. **Fetch Data:** const account \= await getAccount(params.id).  
   * *Handle 404:* If \!account, return \<div\>Không tìm thấy tài khoản\</div\>.  
2. **Header:**  
   * Display Account Name, Type.  
   * **Action:** Place \<EditAccountDialog account={account} /\> button here.  
3. **Debug Section (Temporary):**  
   * If you want to verify data, print \<pre\>{JSON.stringify(account.cashback\_config, null, 2)}\</pre\>.

## **3\. Frontend: Edit Account Dialog (src/components/moneyflow/edit-account-dialog.tsx)**

**UI Requirements:**

* Use react-hook-form \+ zod.  
* **Fields:**  
  * Name (Text).  
  * Credit Limit (Number).  
  * **Cashback Config Section (Only if type \=== 'credit\_card'):**  
    * Rate (0.0 \- 1.0).  
    * Max Amount (Number).  
    * Min Spend (Number) \-\> **Important: Match the user's MSB card logic.**  
    * Statement Day (Number).  
* **Submit Handler:**  
  * Construct the clean JSON object.  
  * Call updateAccount.  
  * Use router.refresh() to update the page data.

**Handling the "String vs Object" in Form Default Values:**

* When initializing the form defaultValues, assume account.cashback\_config is now an Object (thanks to step 1).  
* Map account.cashback\_config?.min\_spend to the form input.

## **4\. Execution Steps**

1. **Fix the Service First:** Modify getAccount in account.service.ts to parse JSON.  
2. **Create Components:** Build the Dialog and the Page.  
3. **Test:** Click on the "MSB Online" card again. It should now load correctly without crashing.