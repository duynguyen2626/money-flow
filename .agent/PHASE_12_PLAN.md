Phase 12.1 Implementation Plan - Transaction Flow UI Hot Fix & MCC Badge Correction
Mục tiêu
Sửa lỗi hot fix khẩn cấp liên quan đến việc implement nhầm MCC badges và các lỗi UI nghiêm trọng ở cột Flow trên trang Transactions (/txn).
Context
Agent Phase 12 trước đã hiểu nhầm yêu cầu và implement MCC/Category badges vào trang /txn (Transactions) thay vì trang /accounts (Accounts). Cần reverse lại và implement đúng vị trí. Đồng thời cần fix các lỗi UI ở cột Flow.
User Review Required
[!IMPORTANT]
Ưu tiên thực hiện: Thực hiện theo thứ tự S1 → S2 → S3 → S4 để đảm bảo tính nhất quán.

Proposed Changes
S1: Reverse MCC/Category Badges Display (CRITICAL)
Problem Statement
Agent trước đã implement nhầm MCC/Category badges vào cột "Account Name" trên trang /txn (Transactions) thay vì trang /accounts (Accounts). Cần đảo ngược (revert) các thay đổi này.
Investigation Steps
Step 1: Identify Changes Made
Files to Check:
src/components/moneyflow/unified-transaction-table.tsx
Tìm logic hiển thị badges trong cột "Account Name"
Check xem có conditional rendering nào liên quan đến category_name, category_icon, hoặc category_image_url
Questions:
Badges được render ở đâu trong component?
Có conditional logic nào kiểm tra page context (/txn vs /accounts)?
Step 2: Revert Changes
Action:
Remove tất cả category/MCC badge rendering logic trong cột "Account Name" trên trang /txn
Ensure cột "Account Name" chỉ hiển thị:
Account icon
Account name
(Không có category badges)
Step 3: Verify Correct Behavior
Manual Test:
    1. Navigate to /txn (Transactions page)
    2. Verify cột "Account Name" KHÔNG hiển thị category badges
    3. Verify layout không bị broken sau khi remove
Implementation Requirements
Revert Logic:
Locate và remove đoạn code render category badges trong Account Name cell
Example code to REMOVE:
{txn.category_name && (

{txn.category_name}

)}
Files to Modify
[MODIFY] src/components/moneyflow/unified-transaction-table.tsx
Revert Account Name cell rendering logic
Remove category badge display

S2: Implement MCC Badges Correctly (On /accounts Page)
Problem Statement
Sau khi revert, cần implement MCC/Category badges vào đúng vị trí: cột "Account Name" trên trang /accounts (Accounts page).
Investigation Steps
Step 1: Understand Accounts Page Structure
Files to Review:
src/app/accounts/page.tsx - Main accounts page
src/components/accounts/**/* - Account list components
Check nếu accounts page sử dụng UnifiedTransactionTable hoặc có table riêng
Step 2: Locate Account Name Column Rendering
Find:
Component render danh sách accounts
Logic hiển thị account name trong table/list
Step 3: Verify Data Availability
Check:
Account data có include category_name, category_icon, category_image_url?
Nếu không, cần update query để fetch category data
Files to Check:
src/services/account.service.ts
src/types/moneyflow.types.ts - Account type definition
Implementation Requirements
Option A: Accounts Page Uses Separate Component
If accounts page có component riêng (không dùng UnifiedTransactionTable):
Add category badge logic vào account name cell
Example:
{account.name} {account.category_name && ( {account.category_name} )}
Option B: Accounts Page Uses UnifiedTransactionTable
If accounts page reuse UnifiedTransactionTable:
Add conditional rendering based on page context
Example:
// In unified-transaction-table.tsx
const isAccountsPage = pathname === '/accounts';
// In Account Name cell
{isAccountsPage && item.category_name && (

)}
Files to Modify
[VERIFY] src/app/accounts/page.tsx
[MODIFY] Account list component (TBD after investigation)
[VERIFY] src/services/account.service.ts - Ensure category data is fetched

S3: Fix Flow Column UI Issues (5 Scenarios)
Problem Statement
Cột "Flow" trên trang /txn có nhiều lỗi UI nghiêm trọng. Cần fix 5 scenarios sau:

Scenario 3.1: Single Flow - Pills Not Wide Enough
Problem
Pills flow đôi khi không đủ rộng
Text bị cắt hoặc hiển thị "Unknown"
Investigation
Reference Implementation:
src/app/accounts/[id]/details/page.tsx
src/app/people/[id]/details/page.tsx
Study logic hiển thị flow trong các trang này để đảm bảo consistency
Check:
Pills có flex-1 hoặc w-full class?
Container có width constraints?
Solution
Requirements:
Nếu chỉ có one flow (single flow):
Pills phải hiển thị full width
Đảm bảo text được hiển thị đầy đủ
Tránh hiện "Unknown"
Example:
{flows.length === 1 && (




)}
Files to Modify
[MODIFY] src/components/moneyflow/unified-transaction-table.tsx
Update Flow column rendering logic
Add full-width styling for single flow

Scenario 3.2: Non-Credit Bank Accounts Showing Cycle Badges
Problem
Tài khoản ngân hàng không phải credit type vẫn hiển thị cycle badges
Tài khoản không có cycle nhưng vẫn show badge
Click vào badge không navigate đến page hợp lệ
Investigation
Check:
account.type field - Determine nếu là credit account
account.cycle or account.has_cycle - Check nếu có cycle data
Database Schema:
Table: accounts
Columns:
type (e.g., 'credit', 'debit', 'savings')
cycle_day or similar field
Solution
Requirements:
KHÔNG hiển thị cycle badges nếu:
account.type !== 'credit', HOẶC
account.cycle is null/undefined, HOẶC
Account không có cycle configuration
Logic:
const shouldShowCycleBadge =
account.type === 'credit' &&
account.cycle &&
account.cycle_day;
{shouldShowCycleBadge && (

)}
Files to Modify
[MODIFY] src/components/moneyflow/unified-transaction-table.tsx
Add conditional check before rendering cycle badge
[VERIFY] src/types/moneyflow.types.ts
Ensure Account type includes type and cycle fields

Scenario 3.3: Target Flow là People - Avatar Missing & Wrong Order
Problem
Khi target flow là people, hình ảnh (avatar) bị mất
Thứ tự hiển thị không đúng
Investigation
Check Current Rendering:
Flow component cho people entity
Order of elements being rendered
Reference:
src/app/people/[id]/details/page.tsx
Study cách people avatar được render
Solution
Requirements:
Thứ tự hiển thị ĐÚNG: [debt tag] [people name] [avatar img]
Example:
[2026-02] John Doe [👤]
Avatar PHẢI được hiển thị
Check nếu people.image_url hoặc people.avatar_url tồn tại
Implementation:
{flow.targetType === 'people' && (


{flow.debtTag && }
{flow.targetName}
{flow.targetImageUrl && (



)}


)}
Files to Modify
[MODIFY] src/components/moneyflow/unified-transaction-table.tsx
Fix people flow rendering order
Ensure avatar image is displayed

Scenario 3.4: Entity có 2 Flows - Showing Category Badge (Wrong)
Problem
Entities có 2 flows (hoặc nhiều hơn) vẫn hiển thị category badge
Gây confusing UI
Category badge chỉ nên show khi có single flow
Investigation
Check:
Flow count logic
Category badge rendering conditions
Solution
Requirements:
KHÔNG hiển thị category badge khi flows.length >= 2
CHỈ hiển thị category badge khi:
flows.length === 1, VÀ
Category data hợp lệ (có category_name hoặc category_icon)
Logic:
const shouldShowCategoryBadge =
flows.length === 1 &&
(flow.category_name || flow.category_icon);
{shouldShowCategoryBadge && (

)}
Files to Modify
[MODIFY] src/components/moneyflow/unified-transaction-table.tsx
Add flow count check before rendering category badge

Scenario 3.5: Unwanted Debt Badges on Non-People Flows
Problem
Flows không liên quan đến people vẫn hiển thị debt badges
Example: 2026-01, Food & Drink, [2026-02]
Các badges này chỉ nên show cho people flows có debt/cycle logic
Investigation
Debug:
Identify nguồn gốc của các badges này
Check logic xác định khi nào render debt badges
Questions:
Có logic nào check targetType === 'people' trước khi show debt badge?
Có data contamination từ category/shop names?
Solution
Requirements:
Debt badges (e.g., 2026-01, cycle tags) CHỈ hiển thị khi:
targetType === 'people' hoặc sourceType === 'people', VÀ
Có debt/loan/cycle data hợp lệ
Logic:
const isPeopleFlow =
flow.targetType === 'people' ||
flow.sourceType === 'people';
const hasDebtData = flow.debtTag || flow.cycleTag;
{isPeopleFlow && hasDebtData && (
<DebtBadge tag={flow.debtTag || flow.cycleTag} />
)}
Files to Modify
[MODIFY] src/components/moneyflow/unified-transaction-table.tsx
Add people flow type check before rendering debt badges
Remove any incorrect badge logic for non-people flows

S4: Code Quality & Testing
Code Review Checklist
[ ] All revert changes are clean (no leftover code)
[ ] MCC badges only show on /accounts page
[ ] No MCC badges on /txn page
[ ] All 5 Flow UI scenarios are fixed
[ ] Code follows existing patterns in codebase
[ ] TypeScript types are correct
[ ] No console errors or warnings
Manual Testing Checklist
Test Case 1: Transactions Page (/txn)
[ ] Navigate to /txn
[ ] Verify Account Name column KHÔNG có category badges
[ ] Verify Flow column displays correctly for all scenarios
[ ] Test single flow transactions
[ ] Test multi-flow transactions
[ ] Test people flows with avatars
Test Case 2: Accounts Page (/accounts)
[ ] Navigate to /accounts
[ ] Verify Account Name column CÓ category badges (nếu có category data)
[ ] Verify badges display correctly next to account name
[ ] Test với nhiều accounts có categories khác nhau
Test Case 3: Flow Scenarios
[ ] Scenario 3.1: Single flow - Pills show full width, no "Unknown"
[ ] Scenario 3.2: Non-credit accounts - NO cycle badges
[ ] Scenario 3.3: People flows - Avatar shows, correct order
[ ] Scenario 3.4: 2+ flows - NO category badge
[ ] Scenario 3.5: Non-people flows - NO debt badges

Success Criteria
S1: Reverse MCC Badges
[ ] Category badges removed from /txn page Account Name column
[ ] No visual artifacts or broken layout
[ ] Transaction table functions normally
S2: Implement MCC Badges Correctly
[ ] Category badges display on /accounts page Account Name column
[ ] Badges show correct category name/icon
[ ] Badges styled consistently
[ ] Data fetched correctly from database
S3: Flow Column Fixed
[ ] Scenario 3.1: Single flow pills full width ✓
[ ] Scenario 3.2: No cycle badges on non-credit accounts ✓
[ ] Scenario 3.3: People avatars show in correct order ✓
[ ] Scenario 3.4: No category badge on multi-flow entities ✓
[ ] Scenario 3.5: No debt badges on non-people flows ✓
S4: Quality
[ ] All tests pass
[ ] No TypeScript errors
[ ] Code reviewed and clean
[ ] Documentation updated

Files Summary
Critical Files
src/components/moneyflow/unified-transaction-table.tsx
Primary file for all S1, S3 changes
Contains Flow column rendering logic
Contains Account Name column logic
Supporting Files
src/app/accounts/page.tsx - For S2 investigation
src/services/account.service.ts - Verify category data fetching
src/types/moneyflow.types.ts - Type definitions
src/app/accounts/[id]/details/page.tsx - Reference for Flow logic
src/app/people/[id]/details/page.tsx - Reference for People avatar logic

Phase 12.2 Preview (Future)
Prompt Service Refactor
Objective: Tách logic prompt service ra khỏi component
Scope: To be defined
Priority: After Phase 12.1 completion

Notes
Important Reminders
    1. Trang /txn KHÔNG được có category badges trong cột Account Name
    2. Trang /accounts PHẢI có category badges trong cột Account Name
    3. Tham khảo logic từ /accounts/[id]/details và /people/[id]/details để đảm bảo consistency
    4. Test kỹ tất cả 5 scenarios của Flow column
    5. iCloud Drive EPERM issue - dùng dev server để test
Git Workflow
Suggested Branch: hotfix/transaction-flow-ui-fixes
Base Branch: main (sau khi merge PR #207)
Testing Strategy
Dev server (npm run dev)
Manual browser testing
TypeScript compiler trong IDE
KHÔNG dùng npm run build (iCloud Drive issue)

Handover to Phase 12.2
[ ] S1: MCC badges reversed from /txn ✓
[ ] S2: MCC badges implemented on /accounts ✓
[ ] S3: All 5 Flow scenarios fixed ✓
[ ] S4: Testing completed ✓
[ ] Documentation updated
[ ] Ready for Prompt Service refactor
Good luck! 🚀