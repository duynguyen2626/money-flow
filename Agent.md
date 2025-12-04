# SPRINT 3.1: UI/UX POLISH & BUG FIXES (BONUS)

Goal: Fix critical UX annoyances in Service creation (Slots), Member adding flow, and Repay modal connectivity on Production.

## 1. Git Convention

* **Branch:** `fix/M2-SP3.1-ui-ux-bonus`
* **Commit:** `[M2-SP3.1] fix: ...`

## 2. Issue 1: Service Slots Logic & UI (Critical)

**File:** `src/components/services/service-form.tsx`

**Current Bugs:**
*   **Linked State:** Changing the slot for one member updates ALL members. (Likely binding to a single state variable instead of `fields[index].slot`).
*   **Missing Info:** User has to mentally calculate how much 1 slot costs.

**Requirements:**
1.  **Fix Input Binding:** Ensure the slot input is correctly registered using React Hook Form's field array convention: `name="members.${index}.slot"`. Default value must be 1.
2.  **Add "Total Slots" Indicator:** Show a summary text "Total Slots: {sum}" at the bottom of the member list.
3.  **Add Price Hint:** Next to the Name or Slot input of each member, display the calculated cost dynamically.
    *   **Formula:** `(Service Price / Total Slots of All Members) * This Member's Slot`.
    *   **Format:** Text formatted as currency (e.g., `~ 50,000 đ`).
    *   **UX:** Use muted text color (`gray-500`).

## 3. Issue 2: Add Member UX (Modal Flow)

**File:** `src/components/people/create-person-dialog.tsx` (or similar)

**Current Bug:**
*   After clicking "Save", the modal closes immediately. If the user wants to add 5 people, they have to reopen the modal 5 times.

**Requirements:**
*   **Modify "Save" Behavior:**
    *   **Option A (Preferred):** Keep the modal OPEN after success. Reset the form fields (Name, etc.) to empty. Show a success Toast ("Person added!").
    *   **Decision:** Go with Option A (Keep open until user clicks Cancel/X). Change button text to "Save & Add Another" if possible, or just "Save".

## 4. Issue 3: Confirm Repay Modal Fails on Vercel

**File:** `src/components/moneyflow/confirm-money-received.tsx` (or `repay-dialog.tsx`)

**Current Bug:**
*   Works on Localhost but fails to load the "Target Account" list on Vercel (Production).
*   **Cause Analysis:** Likely using `fetch('/api/accounts')` which might fail due to relative paths on server side or missing auth headers/cookies in the request on Prod.

**Requirements:**
1.  **Refactor Data Fetching:** DO NOT use internal API routes (`/api/...`) for this component.
2.  **Use Supabase Client:** Switch to using the browser client directly inside the `useEffect` or `useQuery`.
    ```typescript
    // Recommended Pattern
    const { data, error } = await supabase
      .from('accounts')
      .select('id, name, current_balance')
      .eq('is_active', true)
      .order('name');
    ```
3.  **Error Handling:** Add `console.error` if fetching fails to debug easier.

## 5. Execution Plan

1.  **Step 1:** Refactor `service-form.tsx` to decouple slots and add the price hint calculator.
2.  **Step 2:** Update `create-person-dialog.tsx` to prevent auto-close on success.
3.  **Step 3:** Refactor Account fetching in the Repay Modal to use `supabase.from('accounts')` directly.
4.  **Step 4:** **Verification:**
    *   Create Service -> Change slots -> Verify numbers don't jump together.
    *   Add Person -> Verify modal stays open.
    *   Check Repay Modal -> Verify account list loads.

