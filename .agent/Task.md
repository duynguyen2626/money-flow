# MF4.1 — Category Kind + Fix Category Filtering + Preserve Selection on Shop Create

You are the coding agent working on **Money Flow 3**.
This task is **Phase MF4.1**.

Your mission is to fix category filtering across transaction type tabs by introducing a new `kind` field on categories, and to fix the “lost selection” bug when creating a shop inside the Add Transaction modal.

Read the repo first. Reuse existing patterns. Keep PRs reviewable.

---

## Problem Summary

### 1) Category filtering is wrong

* Current category model only uses `categories.type` (income/expense/transfer).
* Lending/Repay cannot be filtered correctly because the system has only 3 category types.
* Transfer tab currently shows all categories.
* Repay tab doesn’t show category field at all.

### 2) Lost-selection bug on Create Shop

Flow:

* Open Add Transaction (Expense)
* Select Category = `Utility`
* Click “Create new shop”
* Create shop `Power`

Bug:

* Category selection jumps to a different value
* New shop is not auto-selected

---

## A) Schema Change: add `categories.kind`

### Goal

Introduce `categories.kind` so we can filter categories correctly per transaction tab.

### Recommended DB design

Implement `kind` as **Postgres text[]**:

* `['ex']` = external
* `['in']` = internal
* `['ex','in']` = both

(If text[] is too hard in your code path, fallback to 2 booleans `kind_ex`, `kind_in`.)

### Migration rules

* Existing `type='transfer'` → `kind=['in']`
* Existing `type in ('income','expense')` → `kind=['ex']`

Add index if needed (GIN for array).

### Update shared types

* Update Category TS types + Zod schemas/DTOs to include `kind`.

---

## B) Filtering Rules (must implement)

Tab → Category list filter:

* **Expense tab**: `type='expense'` AND `kind contains 'ex'`
* **Income tab**: `type='income'` AND `kind contains 'ex'`
* **Transfer tab**: `type='transfer'` AND `kind contains 'in'` (no more show-all)
* **Lending tab**: `kind contains 'in'` AND (use the appropriate type based on existing domain; if no dedicated type, treat as expense-like but internal)
* **Repay tab**: MUST SHOW category field and filter as internal (same strategy as Lending)

Notes:

* Ensure Transfer does not leak other category types.
* Ensure Repay includes category UI.

---

## C) Add/Edit Category Modal updates

Update “Add Category” UI:

* Add `kind` selector:

  * Checkbox “External (ex)”
  * Checkbox “Internal (in)”
  * Allow both checked

Smart defaults based on current transaction tab:

* Creating from Transfer tab:

  * default: `type='transfer'`, `kind=['in']`
* Creating from Expense/Income:

  * default: `kind=['ex']`
* Creating from Lending/Repay:

  * default: `kind=['in']` and suitable `type` consistent with your domain

---

## D) Fix Create-Shop flow (preserve category + auto-select new shop)

### Required behavior

* Preserve selected category throughout shop creation.
* Create Shop modal must receive current `categoryId` and prefill it.
* After create success:

  * Keep `categoryId` unchanged
  * Auto-select the newly created shop (`setValue('shopId', createdShop.id)`)
  * Do NOT reset the whole form

### Implementation guidance

* Find where shop creation triggers a form reset / default-values reinit.
* Replace broad `reset()` calls with targeted `setValue` updates.
* Pass context into the Create Shop modal: `{ currentCategoryId, currentTxnType }`.

---

## Acceptance Criteria

* Transfer tab shows only transfer categories.
* Lending/Repay show only internal categories (per your rules).
* Repay tab has category field.
* DB persists `categories.kind` and UI allows editing it.
* Creating a shop inside Add-Txn:

  * category stays the same
  * new shop auto-selected
  * shop modal prefilled with the chosen category

---

## Branch / Commit / PR

* Branch: `PHASE-8.x-CATEGORY-KIND-AND-SHOP-FLOW-FIX`
* Commit: `PHASE 8.x - Add category kind and fix txn category/shop flows`
* PR title: `MF4.1: Category kind + correct tab filtering + preserve shop create selection`

---

## QA Checklist

* [ ] Expense/Income categories correct
* [ ] Transfer does not show all
* [ ] Lending filters correctly
* [ ] Repay shows category and filters correctly
* [ ] Add Category supports kind (ex/in/both)
* [ ] Create Shop preserves category and auto-selects new shop
