# task.md — People Flow: Split Bill (MVP) for Lend/Repay

## Why this first (priority)

We implement **manual Split Bill MVP** first because it:

* Unlocks the core product workflow (group bills) without Gemini/API complexity.
* Keeps DB/domain logic unchanged by using the safest approach (multiple transactions).
* Lets UI/UX be validated quickly before AI automation.

AI bill split + chat input will be **Phase 2**.

---

## Goal

In **People → Lend/Repay → Add Transaction modal**, add a **Split Bill** workflow for group/team debts.

User story:

* I select a **team/group** (e.g. GCS) that contains multiple people.
* I toggle **Split Bill**.
* I see a table listing participants and how much each owes.
* Submitting creates **one debt transaction per participant** (or repay transactions, same pattern).

---

## Non-negotiable requirements

1. **No breaking changes** to existing debt logic.
2. **No new dependencies**.
3. Must preserve existing fields / displays and not regress current People pages.
4. Loading UX:

   * Save/Update button must disable + show spinner to prevent double submit.

---

## Scope (MVP)

### A) UI: Split Bill toggle in TransactionForm

* Add a `split_bill` toggle only for transaction types:

  * `lend` / `debt` (whatever your internal enum is)
  * `repay`
* When OFF:

  * Form behaves exactly as today.
* When ON:

  * Replace single-person debt selection with **participants selection** + **SplitBillTable**.

### B) Participants selection

Provide 2 options:

1. Select a **Group** (Team) → auto-load members.
2. Optionally add/remove individuals in the table after group selection.

MVP acceptance:

* It’s OK to start with “Select group only” if that’s faster, as long as members appear.

### C) SplitBillTable component

* Renders rows: `Person | Share (amount) | Paid by (optional) | Note (optional)`
* Default:

  * Total amount = main Amount in form
  * Split evenly by default across members
  * Default payer = “Me” (the current user / self) for the bill
* Validations:

  * Sum of row amounts must equal Total Amount
  * No negative, no empty person
  * Show inline error in modal, not console-only

### D) Submit behavior (CRITICAL)

When Split Bill ON:

* On submit, create **N transactions** (N = number of participants).
* Each transaction:

  * person_id = participant
  * amount = participant share amount
  * type = lend or repay (based on form)
  * note includes a standardized prefix, e.g.:

    * `[SplitBill] {groupName} | {billTitle}`
    * plus optional payer info
* Must be done as a single UX action:

  * One Save click → creates all rows
  * Loading state until all requests complete
  * If any request fails:

    * show error summary
    * do not silently partially succeed without informing user

Implementation guidance:

* If backend has bulk endpoint, use it.
* If not, do sequential or Promise.all with proper error handling.

### E) People page integration

* From People details (or group view), clicking **Lend/Repay** should allow Split Bill.
* After save, UI refreshes cycles/list correctly.

---

## Out of scope (Phase 2)

* Gemini API bill split suggestions
* Chat AI quick input
* Dedicated Bill Management page
* Installment + split interactions

---

## Files to inspect (must read)

* `src/components/moneyflow/add-transaction-dialog.tsx`
* `src/components/moneyflow/transaction-form.tsx`
* People detail components and debt cycle list/group:

  * `src/components/people/**`
  * `src/components/moneyflow/debt-cycle-list.tsx`
  * `src/components/moneyflow/debt-cycle-group.tsx`
* Any services used to create debt/repay transactions.

---

## Deliverables

1. `SplitBillTable` component (new file) and integration into TransactionForm.
2. Submission logic to create multiple transactions.
3. Inline validation errors.
4. Loading UX on Save/Update.
5. Short dev note in PR description: design decisions, limitations, next Phase 2.

---

## Acceptance criteria

* Split Bill OFF → no behavior changes.
* Split Bill ON:

  * group members appear
  * default even split
  * total validation works
  * Save creates N transactions
  * modal prevents double submit
* `pnpm run build` passes.
