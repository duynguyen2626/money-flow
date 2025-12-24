---
description: Side Cleanup – Schema Drift Trash Sweep Prompt
---

# Side Cleanup (“Dọn Rác bên lề”) — Schema Drift Trash Sweep

## Purpose

Stop recurring runtime errors caused by **stale schema references** across the repo.
Unify all image fields to **`image_url`** and remove legacy references to:

* `shops.logo_url` (no longer exists)
* `transaction_lines` table + FK relationships (no longer exists)

This is a **cross-cutting cleanup** task. Goal: the app must not query non-existent columns/tables.

---

## Ground Truth (DB)

Use `schema.sql` as the authoritative reference.
Key facts:

* `public.shops` contains `image_url` (NOT `logo_url`).
* There is NO `public.transaction_lines` table.
* There IS `public.transaction_history`.

---

## Non-goals

* Do NOT redesign UI.
* Do NOT change business logic semantics.
* Do NOT introduce new tables.
* Keep PR focused: schema-alignment and dead-code removal.

---

## Success Criteria

* No runtime logs referencing:

  * `shops.logo_url`
  * `transaction_lines`
  * PostgREST relationship errors between `transactions` and `transaction_lines`
* `/transactions`, `/accounts`, `/people` pages load without the listed errors.
* `npm run build` passes.

---

## Required Workflow

1. Read `.agent/workflows/gemini.md`, `.agent/rules/gravityrules.md`, `.agent/workflows/task.md`.
2. Use **search-first** approach to locate all stale references.
3. Make the smallest safe refactor:

   * Replace `logo_url` → `image_url`
   * Replace `transaction_lines` → correct source (usually `transaction_history` or `transactions` alone)
4. Verify via dev + build.

---

## Implementation Tasks

### Task A — Unify image fields to `image_url`

1. Find all uses of `logo_url`:

   * Supabase select strings (e.g. `select('..., logo_url, ...')`)
   * Types/interfaces (Shop type)
   * UI components that expect `logo_url`

2. Replace with `image_url` everywhere.

3. Introduce ONE canonical helper (optional but recommended):
   Create `src/lib/image-url.ts`:

* `export function pickImageUrl(entity: { image_url?: string | null } | null | undefined): string | null`
  Use it wherever rendering an image.

4. Ensure no component still references `logo_url`.

### Task B — Remove all `transaction_lines` references

1. Find all occurrences of `transaction_lines`:

   * Supabase selects like `transactions(..., transaction_lines(...))`
   * Relationship hints / embedded queries
   * Types and DTOs

2. Replace query logic with the correct table(s):

Rules:

* If the code used `transaction_lines` to fetch itemized records, the closest replacement is usually `transaction_history`.
* If the code only needed recent transactions, query `transactions` directly without embedding lines.
* If debt/monthly lines logic relied on `transaction_lines`, update it to derive from:

  * `transactions` + filters
  * `transaction_history` for historical snapshots

3. Ensure all PostgREST embedded relationship selects are valid.

   * Do NOT embed a relationship that doesn’t exist in schema.

### Task C — Fix account/shop creation flows impacted by schema drift

* Confirm `/accounts` create/update uses `image_url` and not `logo_url`.
* Confirm “Create account” from Add Transaction modal uses the same API and succeeds.

### Task D — Delete dead types / dead code

* Remove legacy interfaces/types:

  * `logo_url` fields
  * `TransactionLine` models that map to `transaction_lines`
* Remove unused helpers to reduce confusion.

---

## Verification Checklist

### Runtime verification

* Run dev server, open:

  * `/transactions`
  * `/accounts`
  * (debt/people pages if they use monthly lines)
* Confirm console/server logs no longer show:

  * `column shops.logo_url does not exist`
  * `Could not find table public.transaction_lines`
  * `Could not find relationship between transactions and transaction_lines`

### Build verification

* `npm run build` must pass.

---

## Deliverables

* One PR titled: `chore: schema drift cleanup (image_url, transaction_history)`
* Small commits:

  1. `fix: replace logo_url with image_url`
  2. `fix: remove transaction_lines usage`
  3. `chore: delete dead types`
* Final comment listing all removed legacy references.
