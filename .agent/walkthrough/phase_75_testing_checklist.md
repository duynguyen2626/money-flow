# Phase 75 Testing Checklist

## Test Date: 2026-02-08
## Tester: Agent

---

## A. People Details Page Tests

### 1. Avatar Display
- [ ] Navigate to `/people/[any-person-id]`
- [ ] Verify avatar is **square** (rounded-none)
- [ ] Verify avatar has border
- [ ] Check image displays correctly with object-cover

### 2. Sheet Controls (Split Mode)
- [ ] Verify **[Sync | Settings]** buttons are visible
- [ ] Click **Sync** button → should trigger sync immediately
- [ ] Click **Settings** button → should open popover with settings
- [ ] Verify buttons are `h-10` (taller than before)

### 3. Auto-Sync After Settings Save
- [ ] Open Settings popover
- [ ] Change any setting (e.g., toggle bank account)
- [ ] Click Save
- [ ] Verify toast shows "Settings saved. Syncing sheet..."
- [ ] Verify sync starts automatically

### 4. Loading States
- [ ] While saving settings → Sync button shows "Saving..." with spinner
- [ ] While syncing → Sync button shows "Syncing..." with spinner
- [ ] Verify spinner animation is visible

---

## B. People Page (Main List) Tests

### 1. Avatar Display in Table
- [ ] Navigate to `/people`
- [ ] Verify all avatars in Name column are **square** (rounded-none)
- [ ] Verify avatars have border
- [ ] Check fallback initials display correctly

### 2. Sheet Controls in Rows
- [ ] For people with `sheet_link`:
  - [ ] Verify **[Sync | Settings]** buttons appear next to name
  - [ ] Buttons should be small (`h-6`)
  - [ ] Click Sync → triggers sync for that person
  - [ ] Click Settings → opens settings popover

### 3. Row Interaction
- [ ] Click on row (not buttons) → should expand/collapse details
- [ ] Verify sheet buttons don't trigger row expansion

---

## C. Transaction Slide V2 Tests

### 1. Title Display
- [ ] **New Transaction**: Click "Add Transaction" → title shows "New Transaction"
- [ ] **Edit Transaction**: 
  - [ ] Click edit on existing transaction
  - [ ] Title should show "**Edit Transaction**" (not "New Tr...")
- [ ] **Duplicate Transaction**:
  - [ ] Click duplicate on existing transaction
  - [ ] Title should show "Duplicate Transaction"

### 2. Unsaved Changes Warning (Custom Modal)
- [ ] Make changes to form (e.g., change amount)
- [ ] **Test 1**: Click outside overlay
  - [ ] Custom AlertDialog appears (NOT browser confirm)
  - [ ] Shows "Unsaved Changes" title
  - [ ] Has "Cancel" and "Discard Changes" buttons
  - [ ] Click "Cancel" → modal closes, slide stays open
  - [ ] Click "Discard Changes" → slide closes
- [ ] **Test 2**: Click "Cancel" button
  - [ ] Same custom modal appears
- [ ] **Test 3**: Click "Back" button (if visible)
  - [ ] Same custom modal appears
- [ ] **Test 4**: No changes made
  - [ ] Click Cancel/outside → slide closes immediately (no modal)

### 3. Cashback Section - Tab Design
- [ ] Open transaction slide
- [ ] Scroll to Cashback section
- [ ] Toggle "Auto-Estimate" switch → section expands/collapses
- [ ] **Verify Tabs**:
  - [ ] **Claim Tab**:
    - [ ] Has DollarSign icon (💰)
    - [ ] Active state: emerald border + emerald background + emerald text
  - [ ] **Give Away Tab**:
    - [ ] Has Gift icon (🎁)
    - [ ] Active state: amber border + amber background + amber text
    - [ ] Disabled if no person selected
  - [ ] **Voluntary Tab**:
    - [ ] Has Heart icon (❤️)
    - [ ] Active state: rose border + rose background + rose text
    - [ ] Disabled if no person selected

### 4. Cashback Section - Header Border
- [ ] Verify **NO border** between header and tabs area
- [ ] Section should look clean and unified

### 5. Voluntary Tab Fields
- [ ] Select a person (to enable Voluntary tab)
- [ ] Click **Voluntary** tab
- [ ] **Verify Fields**:
  - [ ] Label 1: "**% Back**" (not "Voluntary %")
  - [ ] Label 2: "**Fixed Back**" (not "Fixed Amount")
  - [ ] Both inputs have `h-10` height
  - [ ] Styling matches Give Away tab exactly
  - [ ] Placeholder shows "0"
  - [ ] Helper text: "* Voluntary cashback is tracked but not deducted..."

### 6. Voluntary Tab Calculation
- [ ] Enter "5" in % Back
- [ ] Enter "10000" in Fixed Back
- [ ] Verify values are saved to form
- [ ] Submit transaction → verify data persists

---

## D. Integration Tests

### 1. People Detail → Edit → Unsaved Warning
- [ ] Go to People Details page
- [ ] Click any transaction to edit
- [ ] Make changes
- [ ] Try to close → verify custom modal appears

### 2. People List → Sync → Loading State
- [ ] Go to People page
- [ ] Click Sync on any person with sheet
- [ ] Verify loading spinner shows
- [ ] Verify sync completes successfully

### 3. Transaction Slide → Cashback → Submit
- [ ] Create new transaction
- [ ] Enable cashback
- [ ] Switch between Claim/Give Away/Voluntary tabs
- [ ] Verify icons and colors change correctly
- [ ] Fill in voluntary fields
- [ ] Submit → verify no errors

---

## E. Regression Tests

### 1. Old Edit Modal Archived
- [ ] Search codebase for `edit-person-dialog` imports
- [ ] Verify no active imports (should only be in .archive)
- [ ] Verify deprecation comment exists in archived file

### 2. No Console Errors
- [ ] Open browser console
- [ ] Navigate through all tested pages
- [ ] Verify no React errors
- [ ] Verify no missing icon errors

### 3. Responsive Design
- [ ] Test on mobile viewport (375px)
- [ ] Verify sheet controls don't overflow
- [ ] Verify tabs are readable
- [ ] Verify modal is centered

---

## F. Performance Tests

### 1. Dev Server
- [ ] Verify `pnpm dev` runs without errors
- [ ] No HMR errors after changes
- [ ] Fast refresh works correctly

### 2. Build Test (if possible)
- [ ] Run `pnpm build` (may fail due to iCloud Drive)
- [ ] Check for TypeScript errors
- [ ] Check for build warnings

---

## Test Results Summary

**Date**: ___________  
**Tester**: ___________  
**Status**: [ ] PASS / [ ] FAIL  

**Failed Tests** (if any):
- 

**Notes**:
- 

**Screenshots** (attach if needed):
- 

---

## Sign-off

- [ ] All critical tests passed
- [ ] No regressions found
- [ ] Ready for production

**Approved by**: ___________  
**Date**: ___________
