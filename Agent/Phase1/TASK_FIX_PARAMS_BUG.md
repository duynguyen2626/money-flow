# **AGENT TASK: FIX NEXT.JS 15 ASYNC PARAMS BUG**

Context:  
The user is receiving Error: invalid input syntax for type uuid: "undefined" when accessing /accounts/\[id\].  
This is a known breaking change in Next.js 15: Page params are now a Promise and must be awaited.  
**Current (Broken) Code Pattern:**

export default async function Page({ params }: { params: { id: string } }) {  
  const id \= params.id; // undefined in Next.js 15\!  
  const account \= await getAccount(id); // Crashes service  
}

**Objective:** Update src/app/accounts/\[id\]/page.tsx to properly await params.

## **1\. Fix src/app/accounts/\[id\]/page.tsx**

**Action:** Refactor the Page component signature and param retrieval.

**Correct Code Pattern:**

import { getAccount, getAccountTransactions } from '@/services/account.service';  
import { EditAccountDialog } from '@/components/moneyflow/edit-account-dialog';  
// ... other imports

// 1\. Update Type Definition  
export default async function AccountDetailsPage({  
  params,  
}: {  
  params: Promise\<{ id: string }\>; // Params is now a Promise  
}) {  
  // 2\. Await the params object  
  const { id } \= await params;

  // 3\. Validations (Optional but good)  
  if (\!id || id \=== 'undefined') {  
    return \<div\>Error: Invalid Account ID\</div\>;  
  }

  // 4\. Fetch Data using the resolved ID  
  const account \= await getAccount(id);  
  const transactions \= await getAccountTransactions(id);

  if (\!account) {  
    return \<div className="p-8 text-center"\>Không tìm thấy tài khoản (404)\</div\>;  
  }

  // ... Rest of the UI rendering  
}

## **2\. Hardening src/services/account.service.ts**

**Action:** Add a safety check at the start of getAccount.

export async function getAccount(id: string) {  
  // Validate UUID format to prevent SQL crash logs  
  if (\!id || id.length \< 10\) {  
    console.error("getAccount received invalid ID:", id);  
    return null;  
  }

  const supabase \= createClient();  
  // ... existing logic ...  
}

## **3\. Execution Steps**

1. Update the AccountDetailsPage component in src/app/accounts/\[id\]/page.tsx.  
2. Add the safety check to getAccount in src/services/account.service.ts.  
3. **Test:** Click on an account again. It should load the data correctly.