Phase 13 Implementation Plan - Services & Batch Enhancements
Mục tiêu
Sửa các lỗi nghiêm trọng trong /services và /batch pages, bao gồm:
    1. Service distribution không tạo transactions tự động
    2. Foreign key relationship error trong service_members
    3. Batch Edit modal thay vì Slide navigation
    4. Bank Name filter trong Add Batch Item (MBB) modal không chính xác
    5. Clone functionality thiếu confirmation modal
    6. Loading indicators toàn bộ /batch page
Context
Phase 12.1 đã hoàn thành việc fix MCC badges và Flow column UI trên /txn page (PR #209 merged). Giờ cần chuyển sang Phase 13 để fix các critical bugs trong Services và Batch management.
Priority Order
[!IMPORTANT]
Thực hiện theo thứ tự: S1 (Service Critical) → S2 (Batch Edit Modal) → S3 (Bank Filter) → S4 (UX Enhancements)

Problem Statement Analysis
Root Cause Identification
Issue 1: Service Distribution Failure
Logs Analysis:
Error fetching service members: {
code: 'PGRST200',
details: "Searched for a foreign key relationship between 'service_members'
and 'profiles' in the schema 'public', but no matches were found.",
hint: "Perhaps you meant 'people' instead of 'profiles'.",
message: "Could not find a relationship between 'service_members' and
'profiles' in the schema cache"
}
Critical Findings:
    • Service found successfully (Youtube, iCloud services loaded)
    • Distribution status: completed
    • next_distribution_date: 2026-02-01 (should trigger on 2026-02-03)
    • Root Cause: Query references wrong table profiles instead of people
    • Failed to fetch service members → cannot distribute costs
Issue 2: Date Logic Problem
Logs show:
Tag: 2026-02, Today VN: 2026-02-03T11:20:39.000Z
next_distribution_date: '2026-02-01T07:10:16.858+00:00'
Questions:
    • Why didn't distribution trigger on Feb 1st?
    • Is there a cron job or manual trigger required?
    • Check if next_distribution_date comparison logic is correct
Issue 3: Modal vs Slide Navigation
User Report:
    • Clicking Edit on accounts in /batch opens V1 modal
    • Expected: Should open Account Transaction V2 slide (like /txn page)
    • Problem: Old V1 account modal still active, needs archiving
Issue 4: Bank Filter in Add Batch Item
User Report:
    • "Add Batch Item (MBB)" modal Bank Name filter mixing MBB with VIB
    • Need to research correct filtering logic based on schema

S1: Fix Service Distribution (CRITICAL)
Problem Statement
Services cannot distribute costs to members due to foreign key relationship error. Auto-distribution on next_distribution_date not triggering.
Investigation Steps
Step 1: Identify Service Query Files
Files to Check:
    • [ ] src/services/service.service.ts - Main service operations
    • [ ] src/actions/service.actions.ts - Server actions for distribution
    • [ ] src/app/services/page.tsx - Services page UI
    • [ ] src/types/service.types.ts - Type definitions
    • [ ] Database schema documentation
Search Patterns:
// Find all queries referencing 'profiles' in service context
.select(', profiles()')
.select('service_members(, profiles())')
Step 2: Database Schema Verification
Check schema.md or database:
-- Verify service_members table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'service_members';
-- Check foreign key constraints
SELECT
tc.constraint_name,
tc.table_name,
kcu.column_name,
ccu.table_name AS foreign_table_name,
ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'service_members';
Expected Schema:
// service_members table
{
id: string;
service_id: string; // FK to services.id
person_id: string; // FK to people.id (NOT profiles.id)
share_amount: number;
created_at: string;
}
Step 3: Locate Incorrect Query
Example of WRONG query:
// ❌ WRONG - References profiles
const { data, error } = await supabase
.from('service_members')
.select(*, profiles(first_name, last_name, avatar_url))
.eq('service_id', serviceId);
Correct query should be:
// ✅ CORRECT - References people
const { data, error } = await supabase
.from('service_members')
.select(*, people(first_name, last_name, image_url))
.eq('service_id', serviceId);
Implementation Requirements
Fix 1: Update Service Members Query
Locate and fix in service.service.ts:
// Before (WRONG)
export async function getServiceMembers(serviceId: string) {
const { data, error } = await supabase
.from('service_members')
.select(', profiles()')
.eq('service_id', serviceId);
if (error) throw error;
return data;
}
// After (CORRECT)
export async function getServiceMembers(serviceId: string) {
const { data, error } = await supabase
.from('service_members')
.select(*, people:person_id( id, first_name, last_name, image_url ))
.eq('service_id', serviceId);
if (error) {
console.error('[getServiceMembers] Error:', error);
throw new Error(Failed to fetch service members: ${error.message});
}
return data;
}
Fix 2: Distribution Date Logic
Check distribution trigger logic:
// In distributeAllServices or similar function
export async function distributeAllServices() {
const today = new Date();
const todayVN = format(today, 'yyyy-MM-dd', {
timeZone: 'Asia/Ho_Chi_Minh'
});
const { data: services, error } = await supabase
.from('services')
.select('*')
.eq('is_active', true)
.lte('next_distribution_date', todayVN); // ✓ Should trigger if date <= today
if (error) throw error;
for (const service of services) {
await distributeService(service.id);
}
}
Questions to Answer:
    • Is distributeAllServices called automatically (cron) or manually (button)?
    • If manual: Where is the "Distribute" button UI?
    • If automatic: Check API route or cron job configuration
Fix 3: Update Type Definitions
// src/types/service.types.ts
export interface ServiceMember {
id: string;
service_id: string;
person_id: string; // FK to people.id
share_amount: number;
created_at: string;
people?: { // Join result
id: string;
first_name: string;
last_name: string;
image_url: string | null;
};
}
export interface Service {
id: string;
name: string;
price: number;
currency: string;
cycle_interval: number;
next_billing_date: string | null;
shop_id: string;
is_active: boolean;
max_slots: number;
last_distribution_date: string | null;
next_distribution_date: string | null;
distribution_status: 'pending' | 'completed' | 'failed';
}
Files to Modify
    • [MODIFY] src/services/service.service.ts
        ◦ Update getServiceMembers query: profiles → people
        ◦ Fix all service member queries
    • [MODIFY] src/actions/service.actions.ts
        ◦ Update distribution logic
        ◦ Fix date comparison for auto-trigger
    • [MODIFY] src/types/service.types.ts
        ◦ Update ServiceMember type
        ◦ Ensure correct foreign key references
    • [VERIFY] src/app/services/page.tsx
        ◦ Check if "Distribute" button exists
        ◦ Verify UI updates after distribution
Testing Requirements
Manual Test Cases:
    1. Service Member Fetch:
        ◦ [ ] Navigate to /services
        ◦ [ ] Verify service list loads without errors
        ◦ [ ] Check browser console for foreign key errors (should be none)
        ◦ [ ] Verify service members display with correct names/avatars
    2. Distribution Trigger:
        ◦ [ ] Click "Distribute" button (if exists)
        ◦ [ ] Verify transactions created for each member
        ◦ [ ] Check next_distribution_date updated to next month
        ◦ [ ] Verify last_distribution_date updated to today
    3. Date Logic:
        ◦ [ ] Services with next_distribution_date = today should trigger
        ◦ [ ] Services with next_distribution_date > today should skip
        ◦ [ ] Check logs for successful distribution messages
Expected Logs (Success):
Starting batch distribution for all active services...
Found 2 active services.
Distributing service: Youtube (95064279...)
Service members found: 3
Created 3 transactions successfully
Distribution completed: Youtube
Next distribution date: 2026-03-01
Batch distribution completed. Success: 2, Failed: 0, Skipped: 0

S2: Archive Account V1 Modal & Fix Batch Edit Navigation
Problem Statement
Clicking Edit on accounts in /batch page opens old V1 modal instead of navigating to Account Transaction V2 slide (like /txn does).
Investigation Steps
Step 1: Find V1 Account Modal
Search Strategy:
Search for account modal/dialog components
grep -r "account.modal|account.
dialog" src/components --include=".tsx"grep -r "AccountModal|AccountDialog" src/ --include=".tsx"
Look for old edit account forms
grep -r "edit.*account.form" src/components --include=".tsx"
Likely Locations:
    • src/components/accounts/AccountModal.tsx (V1 - OLD)
    • src/components/accounts/AccountDialog.tsx (V1 - OLD)
    • src/components/accounts/EditAccountModal.tsx (V1 - OLD)
    • src/app/batch/page.tsx - Check onClick handler for Edit button
Step 2: Identify V2 Slide Pattern
Reference Implementation:
// In /txn page - CORRECT navigation
const handleAccountClick = (accountId: string) => {
router.push(/accounts/${accountId}/details);
// OR
setSelectedAccountId(accountId);
setSlideOpen(true); // Opens slide, not modal
};
Find in:
    • src/app/txn/page.tsx - Study account click behavior
    • src/components/transactions/UnifiedTransactionsPage.tsx - Check slide implementation
    • src/components/accounts/AccountTransactionSlide.tsx (V2 - NEW)
Step 3: Trace Batch Page Edit Handler
In /batch page:
// Current (WRONG) - Opens modal
const handleEditAccount = (accountId: string) => {
setEditAccountId(accountId);
setShowAccountModal(true); // ❌ Opens V1 modal
};
// Should be (CORRECT) - Opens slide
const handleEditAccount = (accountId: string) => {
router.push(/accounts/${accountId}/details);
// OR use slide like /txn
};
Implementation Requirements
Step 1: Archive V1 Modal Files
Create archive directory:
src/components/accounts/_archived_v1/
├── AccountModal.tsx (archived)
├── AccountDialog.tsx (archived)
└── EditAccountForm.tsx (archived)
Add deprecation notices:
// At top of archived files
/**
    • @deprecated This V1 modal is archived.
    • Use Account Transaction V2 Slide instead:
        ◦ Navigate to /accounts/{id}/details
        ◦ Or use AccountTransactionSlide component
    • Archived: 2026-02-03 (Phase 13)
    • Replaced by: Account Transaction V2 system
*/
Step 2: Update Batch Page Navigation
// src/app/batch/page.tsx
'use client';
import { useRouter } from 'next/navigation';
export default function BatchPage() {
const router = useRouter();
// ❌ Remove V1 modal state
// const [showAccountModal, setShowAccountModal] = useState(false);
// const [editAccountId, setEditAccountId] = useState<string | null>(null);
// ✅ Add V2 slide navigation
const handleEditAccount = (accountId: string) => {
router.push(/accounts/${accountId}/details);
};
return (
<div>
{/* Batch items list */}
<button onClick={() => handleEditAccount(item.account_id)}>
Edit
</button>
  {/* ❌ Remove V1 modal */}
  {/* {showAccountModal && (
    <AccountModal 
      accountId={editAccountId}
      onClose={() => setShowAccountModal(false)}
    />
  )} */}
</div>

);
}
Step 3: Remove V1 Imports
Search and remove:
// Find all imports
grep -r "from.*AccountModal|from.AccountDialog" src/ --include=".tsx"
// Files to check:
// - src/app/batch/page.tsx
// - src/components/batch/**/*.tsx
// - Any other files importing V1 modals
Remove imports:
// ❌ Remove
import { AccountModal } from '@/components/accounts/AccountModal';
import { AccountDialog } from '@/components/accounts/AccountDialog';
// ✅ No replacement needed - use router.push navigation
Files to Modify
    • [ARCHIVE] src/components/accounts/AccountModal.tsx
        ◦ Move to _archived_v1/
        ◦ Add deprecation notice
    • [ARCHIVE] src/components/accounts/AccountDialog.tsx (if exists)
        ◦ Move to _archived_v1/
        ◦ Add deprecation notice
    • [MODIFY] src/app/batch/page.tsx
        ◦ Remove V1 modal state
        ◦ Update Edit handler to use router navigation
        ◦ Remove modal component rendering
    • [VERIFY] Check all files importing V1 modals
        ◦ Remove imports
        ◦ Update to use V2 navigation
Testing Requirements
Manual Test Cases:
    1. Batch Page Edit:
        ◦ [ ] Navigate to /batch
        ◦ [ ] Click "Edit" on any account item
        ◦ [ ] Verify navigates to /accounts/{id}/details (NOT modal)
        ◦ [ ] Verify Account Transaction V2 slide opens
        ◦ [ ] Edit transaction, save, verify updates
    2. No V1 Modal:
        ◦ [ ] Verify NO modal appears on Edit click
        ◦ [ ] Check browser console for import errors (should be none)
        ◦ [ ] Test multiple account edits in sequence
    3. Navigation Flow:
        ◦ [ ] From /batch → click Edit → opens slide
        ◦ [ ] Close slide → back to /batch
        ◦ [ ] Verify batch list data refreshes after edit

S3: Fix Bank Name Filter in Add Batch Item Modal
Problem Statement
"Add Batch Item (MBB)" modal's Bank Name dropdown filter is incorrect - mixing MBB with VIB results.
Investigation Steps
Step 1: Locate Add Batch Item Modal
Files to Find:
src/components/batch/AddBatchItemModal.tsx
src/components/batch/BatchItemForm.tsx
src/app/batch/page.tsx (modal trigger)
Search Pattern:
grep -r "Add Batch Item|AddBatchItem" src/ --include="*.tsx"
grep -r "Bank Name.*select|bank.dropdown" src/components/batch --include=".tsx"
Step 2: Understand Schema Relationships
Review schema.md:
-- What table stores "MBB" and "VIB" distinction?
-- Likely: accounts table with type or category field
-- Check account types
SELECT DISTINCT type FROM accounts;
-- Expected: 'credit', 'debit', 'mbb', 'vib', etc.
-- Or check account categories
SELECT DISTINCT category_name FROM accounts
JOIN account_categories ON accounts.category_id = account_categories.id;
Questions:
    • Is MBB a type, category, or name field?
    • What field distinguishes MBB from VIB?
    • Is there a bank_name or institution field?
Step 3: Analyze Current Filter Logic
Example of potential bug:
// ❌ WRONG - Not filtering by type
const { data: banks } = await supabase
.from('accounts')
.select('id, name, image_url')
.order('name');
// ✅ CORRECT - Filter by account type or category
const { data: banks } = await supabase
.from('accounts')
.select('id, name, image_url, type')
.eq('type', 'credit') // If MBB is a credit type
.ilike('name', '%MBB%') // Or filter by name pattern
.order('name');
Check UI Component:
// In AddBatchItemModal.tsx
<Select
options={banks} // ← Check if filtered correctly
filterOption={(option, inputValue) => {
// Is this filter logic correct?
return option.label.toLowerCase().includes(inputValue.toLowerCase());
}}
/>
Implementation Requirements
Option A: Filter by Account Type
If MBB/VIB are account types:
// src/services/account.service.ts
export async function getMBBAccounts() {
const { data, error } = await supabase
.from('accounts')
.select('id, name, image_url, type, bank_number')
.eq('type', 'mbb') // Filter by type
.eq('is_active', true)
.order('name');
if (error) throw error;
return data;
}
Option B: Filter by Name Pattern
If MBB/VIB are in account names:
export async function getMBBAccounts() {
const { data, error } = await supabase
.from('accounts')
.select('id, name, image_url, receiver_name')
.or('name.ilike.%MBB%,name.ilike.%Maritime Bank%')
.eq('is_active', true)
.order('name');
if (error) throw error;
return data;
}
Option C: Filter by Category
If MBB is a category:
export async function getMBBAccounts() {
const { data, error } = await supabase
.from('accounts')
.select(id, name, image_url, account_categories(name))
.eq('account_categories.name', 'MBB')
.eq('is_active', true)
.order('name');
if (error) throw error;
return data;
}
Update Modal Component
// src/components/batch/AddBatchItemModal.tsx
import { getMBBAccounts } from '@/services/account.service';
export function AddBatchItemModal() {
const [banks, setBanks] = useState([]);
useEffect(() => {
async function loadMBBBanks() {
const data = await getMBBAccounts(); // ✓ Only MBB accounts
setBanks(data);
}
loadMBBBanks();
}, []);
return (

<Select
label="Bank Name"
options={banks.map(bank => ({
value: bank.id,
label: bank.name
}))}
placeholder="Select MBB bank..."
/>

);
}
Files to Modify
    • [RESEARCH] schema.md or database
        ◦ Determine correct field for MBB/VIB distinction
    • [MODIFY] src/services/account.service.ts
        ◦ Add getMBBAccounts() function
        ◦ Implement correct filter based on schema
    • [MODIFY] src/components/batch/AddBatchItemModal.tsx
        ◦ Use filtered query
        ◦ Verify dropdown only shows MBB options
    • [VERIFY] Similar modals
        ◦ Check if VIB modal has same issue
        ◦ Apply same fix pattern
Testing Requirements
Manual Test Cases:
    1. MBB Modal Filter:
        ◦ [ ] Click "Add Batch Item (MBB)" button
        ◦ [ ] Open Bank Name dropdown
        ◦ [ ] Verify ONLY MBB banks appear
        ◦ [ ] Verify NO VIB banks in list
        ◦ [ ] Search for "VIB" → should return empty
    2. VIB Modal Filter (if exists):
        ◦ [ ] Repeat same test for VIB modal
        ◦ [ ] Should only show VIB banks
    3. Data Accuracy:
        ◦ [ ] Select MBB bank → verify correct account data loads
        ◦ [ ] Check bank_number, receiver_name populate correctly

S4: UX Enhancements
Feature 1: Clone Confirmation Modal
Problem Statement
Clone button directly duplicates batch item without confirmation. Users may accidentally clone items.
Implementation Requirements
Add confirmation dialog:
// src/components/batch/BatchItemActions.tsx
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
export function BatchItemActions({ item, onClone }) {
const [showCloneConfirm, setShowCloneConfirm] = useState(false);
const handleClone = () => {
setShowCloneConfirm(true);
};
const confirmClone = async () => {
await onClone(item.id);
setShowCloneConfirm(false);
};
return (
<>
Clone
  <ConfirmDialog
    open={showCloneConfirm}
    onOpenChange={setShowCloneConfirm}
    title="Clone Batch Item"
    description="Do you want to edit the item before cloning?"
    confirmText="Clone & Edit"
    cancelText="Clone as-is"
    onConfirm={async () => {
      // Clone then open edit modal
      const newId = await onClone(item.id);
      router.push(`/batch/${newId}/edit`);
    }}
    onCancel={async () => {
      // Clone without editing
      await onClone(item.id);
      setShowCloneConfirm(false);
    }}
  />
</>

);
}
Alternative: Two-button approach:
<ConfirmDialog
open={showCloneConfirm}
onOpenChange={setShowCloneConfirm}
title="Clone Batch Item"
description="Would you like to edit the cloned item?"

Clone & Edit Clone as-is setShowCloneConfirm(false)}>Cancel
</ConfirmDialog>
Files to Modify
    • [CREATE] src/components/ui/ConfirmDialog.tsx (if not exists)
        ◦ Reusable confirmation dialog component
    • [MODIFY] src/components/batch/BatchItemActions.tsx
        ◦ Add clone confirmation logic
        ◦ Implement "Clone & Edit" vs "Clone as-is" options
    • [MODIFY] src/app/batch/page.tsx
        ◦ Handle clone confirmation flow

Feature 2: Loading Indicators for Batch Page
Problem Statement
No visual feedback when clicking MBB, VIB, Edit, Clone, Create - users see "Compiling..." in dev but nothing in production.
Implementation Requirements
Page-level loading state:
// src/app/batch/page.tsx
'use client';
import { useState, useTransition } from 'react';
import { Loader } from '@/components/ui/Loader';
export default function BatchPage() {
const [isPending, startTransition] = useTransition();
const [isLoading, setIsLoading] = useState(false);
const handleMBBClick = () => {
startTransition(async () => {
setIsLoading(true);
await createMBBBatchItem();
setIsLoading(false);
});
};
return (
<div className="relative">
{/* Global loading overlay */}
{(isPending || isLoading) && (




)}
  {/* Page content */}
  <button 
    onClick={handleMBBClick}
    disabled={isPending || isLoading}
  >
    Add MBB Item
  </button>
</div>

);
}
Server Action with loading state:
// src/actions/batch.actions.ts
'use server';
export async function createBatchItem(data: BatchItemData) {
try {
// Simulate processing time for visual feedback
await new Promise(resolve => setTimeout(resolve, 300));
const result = await supabase
  .from('batch_items')
  .insert(data)
  .select()
  .single();

if (result.error) throw result.error;

return { success: true, data: result.data };

} catch (error) {
console.error('[createBatchItem] Error:', error);
return { success: false, error: error.message };
}
}
Button-level loading states:
// src/components/batch/BatchActions.tsx
import { useFormStatus } from 'react-dom';
function SubmitButton() {
const { pending } = useFormStatus();
return (

{pending ? (
<>

Processing...
</>
) : (
'Save'
)}

);
}
Files to Modify
    • [CREATE] src/components/ui/Loader.tsx
        ◦ Global loading overlay component
        ◦ Spinner + message
    • [MODIFY] src/app/batch/page.tsx
        ◦ Add useTransition hook
        ◦ Add loading overlay
        ◦ Disable actions during loading
    • [MODIFY] src/components/batch/BatchItemForm.tsx
        ◦ Use useFormStatus for submit button
        ◦ Add loading states to all action buttons
    • [MODIFY] src/actions/batch.actions.ts
        ◦ Add consistent error handling
        ◦ Add minimum delay for UX (optional)
Loading State Locations
High Priority:
    • [x] Add Batch Item (MBB) modal → Submit button
    • [x] Add Batch Item (VIB) modal → Submit button
    • [x] Edit batch item → Save button
    • [x] Clone batch item → Clone button
    • [x] Delete batch item → Confirmation + delete
Medium Priority:
    • [ ] Batch list refresh after actions
    • [ ] Navigate to account details (Edit)
Testing Requirements
Manual Test Cases:
    1. Clone Confirmation:
        ◦ [ ] Click Clone → confirmation dialog appears
        ◦ [ ] "Clone & Edit" → opens edit form with cloned data
        ◦ [ ] "Clone as-is" → duplicates item without editing
        ◦ [ ] Cancel → closes dialog without cloning
    2. Loading Indicators:
        ◦ [ ] Click MBB → loading overlay appears
        ◦ [ ] Modal opens → overlay disappears
        ◦ [ ] Submit form → button shows "Processing..."
        ◦ [ ] Success → overlay disappears, list updates
        ◦ [ ] Navigate to prod Vercel → verify loading shows (not just "Compiling...")
    3. Loading Behavior:
        ◦ [ ] Actions disabled during loading
        ◦ [ ] Cannot trigger multiple actions simultaneously
        ◦ [ ] Loading persists until server responds

Files Summary
Critical Service Files (S1)
    • src/services/service.service.ts - Main fix for profiles → people
    • src/actions/service.actions.ts - Distribution logic
    • src/types/service.types.ts - Type updates
    • src/app/services/page.tsx - UI verification
Critical Batch Files (S2)
    • src/components/accounts/AccountModal.tsx - Archive to _archived_v1/
    • src/app/batch/page.tsx - Remove modal, add router navigation
    • src/components/batch/**/* - Remove V1 modal imports
Bank Filter Files (S3)
    • src/services/account.service.ts - Add getMBBAccounts()
    • src/components/batch/AddBatchItemModal.tsx - Use filtered query
    • schema.md or database - Research MBB/VIB distinction
UX Enhancement Files (S4)
    • src/components/ui/ConfirmDialog.tsx - New reusable component
    • src/components/ui/Loader.tsx - New loading overlay
    • src/components/batch/BatchItemActions.tsx - Clone confirmation
    • src/app/batch/page.tsx - Loading states
    • src/actions/batch.actions.ts - Server action updates

Success Criteria
S1: Services Fixed ✓
    • [ ] Service members query uses people table (not profiles)
    • [ ] No foreign key errors in console logs
    • [ ] Service distribution creates transactions successfully
    • [ ] next_distribution_date updates after distribution
    • [ ] Logs show "Success: 2, Failed: 0"
S2: Batch Edit Navigation Fixed ✓
    • [ ] V1 Account modal archived with deprecation notices
    • [ ] All V1 modal imports removed
    • [ ] Edit button navigates to /accounts/{id}/details
    • [ ] Account Transaction V2 slide opens
    • [ ] No TypeScript errors
S3: Bank Filter Fixed ✓
    • [ ] MBB modal only shows MBB accounts
    • [ ] VIB modal only shows VIB accounts (if exists)
    • [ ] Correct filter logic based on schema
    • [ ] No mixed results in dropdowns
S4: UX Enhanced ✓
    • [ ] Clone shows confirmation dialog
    • [ ] "Clone & Edit" and "Clone as-is" options work
    • [ ] Loading overlays on all batch actions
    • [ ] Loading visible in production (not just dev)
    • [ ] Actions disabled during loading

Testing Strategy
Manual Testing
Environment:
    • Dev server: npm run dev
    • Test in Chrome/Firefox
    • Check console for errors
    • Verify Vercel production deployment
Test Sequence:
    1. S1: Services → Test distribution
    2. S2: Batch → Test Edit navigation
    3. S3: MBB Modal → Test bank filter
    4. S4: UX → Test clone + loading
Browser Console Checks
Before fixes:
❌ Error fetching service members: Could not find relationship...
❌ Import error: AccountModal not found
❌ [Batch] Mixed MBB/VIB results in dropdown
After fixes:
✓ [getServiceMembers] Found 3 members
✓ [distributeService] Created 3 transactions
✓ [BatchPage] Navigating to /accounts/{id}/details
✓ [getMBBAccounts] Loaded 5 MBB accounts

Git Workflow
Suggested Branch: feat/phase-13-services-batch-fixes
Base Branch: main (after PR #209)
Commit Strategy:
S1
git commit -m "fix(services): Update service members query to use people table"
git commit -m "fix(services): Fix distribution date trigger logic"
S2
git commit -m "refactor(batch): Archive V1 account modal"
git commit -m "fix(batch): Use V2 slide navigation for Edit"
S3
git commit -m "fix(batch): Add MBB account filter for Add Item modal"
S4
git commit -m "feat(batch): Add clone confirmation dialog"
git commit -m "feat(batch): Add loading indicators for all actions"

Notes
Important Reminders
    1. Service members: MUST use people table, NOT profiles
    2. Date logic: Check if auto-distribution requires cron job or manual trigger
    3. V1 Modal: Archive, don't delete - keep for reference
    4. Bank filter: Research schema first before implementing
    5. Loading states: Test on Vercel prod, not just dev server
Known Limitations
    • Source map warnings in logs are Next.js dev server artifacts (ignore)
    • iCloud Drive EPERM issue - test with dev server only
Future Considerations (Phase 13.2)
Potential optimizations:
    • Batch bulk edit (select multiple items, edit in one action)
    • Service distribution scheduling (configure custom dates)
    • Batch item templates (save frequently used configurations)

Handover Checklist
Before closing Phase 13:
    • [ ] S1: Service distribution working ✓
    • [ ] S1: Foreign key error resolved ✓
    • [ ] S2: V1 modal archived ✓
    • [ ] S2: Batch Edit uses V2 navigation ✓
    • [ ] S3: Bank filter researched and fixed ✓
    • [ ] S4: Clone confirmation implemented ✓
    • [ ] S4: Loading indicators on all actions ✓
    • [ ] All tests passed (manual verification)
    • [ ] No console errors
    • [ ] Documentation updated
    • [ ] PR created and reviewed
Good luck with Phase 13! 🚀
References
[1] Supabase Foreign Key Documentation: https://supabase.com/docs/guides/graphql/views
[2] Next.js Server Actions Loading States: https://nextjs.org/docs/app/building-your-application/data-fetching/forms-and-mutations#displaying-loading-state
[3] React useFormStatus Hook: https://react.dev/reference/react-dom/hooks/useFormStatus
[4] React Confirmation Modal Patterns: https://daveceddia.com/react-confirmation-modal-state-machine/