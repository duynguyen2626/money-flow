# Handover - Money Flow 3 - Bank Linking & Repayment UX

## 1. Project Context
Enhancing the Bank Account selection for individual people and automating the Repayment workflow to reduce manual input and errors. Also polished the Google Sheet synchronization for a more premium reporting experience.

## 2. Recent Changes (Updated: Jan 28, 2026 - Final)

### ✅ Bank Linking & UI (Manage Sheet Button)
1. **Separated UX & Reporting**: 
   - Moved "Default Bank Account" to a clear, always-visible section for **Quick Repay** automation.
   - Isolated "Sync Settings" (Show Bank Info, QR) to independent toggles to allow fast repayments without exposing data to the Sheet.
2. **Enhanced Popover UX**:
   - **Instant Feedback**: Popover closes immediately after clicking "Save" or "Sync".
   - **Background Toasts**: Uses non-blocking toasts with loading spinners and detailed status.
   - **Smart Reports**: "Sync Report" modal no longer auto-opens; it's available via a "View Report" action link within the success toast.

### ✅ Repayment Workflow Automation (Slide V2)
1. **Auto-Prefill Logic**: 
   - `amount` auto-sets to `activeCycle.remains`.
   - `source_account_id` auto-sets to `sheet_linked_bank_id` (linked profile bank).
2. **Dynamic UI**: Improved labels and visibility for repayment switches.

### ✅ Google Sheet Sync (Code.js v7.2)
1. **Layout Optimization**:
   - Narrowed **Shop (D)** column to 60 for a cleaner look.
   - Widened **% Back (G)** and **đ Back (H)** to 65/70 to prevent header truncation.
2. **Accounting Logic**:
   - `In (Gross)` in the summary table now correctly displays as a **negative** value (`* -1`) to match credit principles.
3. **Safety & Headers**: Improved script versioning and forced styling for new sheets.

## 3. Mandatory Rules for Agents
When modifying the Google Apps Script (`integrations/google-sheets/people-sync/Code.js`):
1. **Update Version Header**: ALWAYS increment the version number in the file header (`@version X.Y`).
2. **Update Timestamp**: Update the `@date` field with the current YYYY-MM-DD HH:mm.
3. **Update Sheet Note**: Update the `Script Version` note in the `setupNewSheet` function to match the header.
4. **Push Locally**: Run `pnpm run sheet:people` to verify the push logic works before committing.

## 4. Build & Test Status
- **Google Sheet Push**: ✅ Successfully pushed to all 4 profiles (Anh, Lam, My, Tuan).
- **TypeScript**: ✅ Passed `npx tsc --noEmit`.
- **UI Testing**: ✅ Verified background toasts and "Quick Repay" bank linking.

## 5. Key Files Modified
- `src/components/people/manage-sheet-button.tsx`: Complete UX overhaul (popover closing, toasts, separated settings).
- `src/app/people/details/member-detail-view.tsx`: Auto-populate amount and bank for repayments.
- `src/services/sheet.service.ts`: Handle privacy toggles before syncing to the cloud.
- `integrations/google-sheets/people-sync/Code.js` (v7.2): Final layout and accounting logic fixes.
- `src/app/people/[id]/page.tsx` & `src/app/accounts/[id]/page.tsx`: Added dynamic metadata for browser tab titles.
