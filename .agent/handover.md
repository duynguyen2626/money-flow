# Handover - Money Flow 3 - Bank Linking & Repayment UX

## 1. Project Context
Enhancing the Bank Account selection for individual people and automating the Repayment workflow to reduce manual input and errors. Also polished the Google Sheet synchronization for a more premium reporting experience.

## 2. Recent Changes (Updated: Jan 28, 2026)

### ✅ Bank Linking & UI (Manage Sheet Button)
1. **Refined Bank Selector**: 
   - Replaced custom searchable list with standard `Combobox` component for consistency.
   - Bank logos are displayed with `object-contain` to avoid cropping.
   - Filtered to show only accounts with `type === 'bank'`.
2. **Automated Manual Info**:
   - Selecting a linked bank automatically populates the "Manual Bank Info" field with the format: `Bank Name - Account Number - Receiver`.
   - Manual info field is clearly visible and editable below the selector.

### ✅ Repayment Workflow Automation (Slide V2)
1. **Auto-Prefill Amount**: 
   - When clicking "Repay" from a person's detail page, the `amount` is automatically set to the `activeCycle.remains` value.
2. **Auto-Select Linked Bank**:
   - The "Deposit To" (source_account_id) field is automatically set to the person's `sheet_linked_bank_id` if available.
   - Fixed conflict with "recent account" pre-population to prioritize the specific linked bank for repayments.
3. **UI Label Improvements**:
   - Label dynamically changes to **"Deposit To"** for `repayment` and `income` types, and **"Pay With"** for `expense` types.

### ✅ Google Sheet Sync (Code.js v7.1)
1. **Premium Aesthetics**:
   - Headers (`Row 1`) and Summary Header now use a vibrant **Indigo (#4f46e5)** background with white text.
   - Headers are forced to indigo every sync to ensure visibility on new sheets.
2. **Structure & Layout**:
   - Column **M (No.)** narrowed to `25` for better spacing.
   - Column **N (Summary)** and **O (Value)** adjusted for optimal readability.
   - **M7:O26** area is properly merged and protected for QR/Summary images.
3. **Intelligent Shop Column**:
   - Formula handles both text and icons.
   - If a mapping is a URL (`http...`), it uses `IMAGE(..., 1)` to **fit-width** while maintaining aspect ratio.
   - Data rows height set to `30` to make icons clear and easy to see.

## 3. Build & Test Status
- **Google Sheet Push**: ✅ Successfully pushed to all 4 profiles (Anh, Lam, My, Tuan).
- **TypeScript**: ✅ Verified `sheet_linked_bank_id` in database type definitions.
- **UI Testing**: ✅ Verified Combobox behavior and auto-fill logic in `member-detail-view.tsx`.

## 4. Key Files Modified
- `src/components/people/manage-sheet-button.tsx`: New Combobox-based bank selector.
- `src/app/people/details/member-detail-view.tsx`: Auto-populate amount and account for repayments.
- `src/components/transaction/slide-v2/single-mode/account-selector.tsx`: Repayment label and linked bank override.
- `integrations/google-sheets/people-sync/Code.js`: Major layout and styling overhaul.

## 5. Next Steps
- Continue refining the synchronization logic if the user requests more summary details on the sheet.
- Ensure all new users have their bank accounts correctly linked to benefit from the auto-repayment feature.
