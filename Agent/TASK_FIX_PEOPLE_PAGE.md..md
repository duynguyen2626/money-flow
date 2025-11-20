# **AGENT TASK: FIX PEOPLE DETAILS PAGE (ASYNC PARAMS BUG)**

Context:  
The User gets a Server Error / 404 when navigating to /people/\[id\].  
Cause: Next.js 15 Breaking Change. params is a Promise and must be awaited. The current code accesses params.id synchronously, which is undefined.  
**Objective:** Fix src/app/people/\[id\]/page.tsx to await params properly.

## **1\. Fix src/app/people/\[id\]/page.tsx**

**Action:** Refactor the component to await params.

**Correct Code Pattern:**

import { notFound } from 'next/navigation';  
import { getPersonDetails, getDebtByTags } from '@/services/debt.service';  
// ... imports

export default async function PeopleDetailPage({  
  params,  
}: {  
  params: Promise\<{ id: string }\>; // Type definition update  
}) {  
  // 1\. Await the params  
  const { id } \= await params;

  // 2\. Validate ID  
  if (\!id || id \=== 'undefined') {  
    return \<div\>Error: Invalid Person/Account ID\</div\>;  
  }

  // 3\. Fetch Data  
  // Note: The ID passed in URL is likely the DEBT ACCOUNT ID (starts with 9000...) based on previous steps.  
  // Ensure getPersonDetails handles finding the person via this Account ID.  
  const person \= await getPersonDetails(id);  
  const debtCycles \= await getDebtByTags(id);

  if (\!person) {  
    notFound(); // Triggers the 404 UI  
  }

  // 4\. Render UI (Profile Header, Debt Cycles Grid, Transaction List)  
  // ... existing render logic ...  
}

## **2\. Verify src/services/debt.service.ts**

**Action:** Ensure getPersonDetails works with the ID provided in the URL.

**Logic Check:**

* The URL http://localhost:3000/people/90000000... uses the **Account ID** of the Debt Account.  
* Ensure the service query looks like:  
  export async function getPersonDetails(id: string) {  
    const supabase \= createClient();

    // Try finding by Account ID first (since user clicked from Debt List)  
    let { data: account } \= await supabase  
      .from('accounts')  
      .select('\*, profiles(\*)') // Join profiles to get Avatar  
      .eq('id', id)  
      .single();

    if (account) {  
      return {  
         id: account.id,  
         name: account.name, // or account.profiles.name  
         avatar: account.profiles?.avatar\_url,  
         totalDebt: account.current\_balance  
         // ... other mapping  
      };  
    }

    // Fallback: Try finding by Profile ID (if needed later)  
    return null;  
  }

## **3\. Execution Steps**

1. Update PeopleDetailPage to use await params.  
2. Update getPersonDetails in service to correctly map the Data from Supabase.  
3. **Test:** Click the link again. It should load the Person Profile.