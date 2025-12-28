---
trigger: always_on
---

# PR Rejection Checklist — MoneyFlow v3.8 Accounts UI

> This checklist is **BINARY**.
> If **ANY** rule below fails → **REJECT PR immediately**.

---

## A. Architecture & Refactor Rules (AUTO‑FAIL)

❌ Reused old Accounts layout structure (grid / card sections)
❌ Old AccountCard JSX partially reused and "restyled"
❌ Old logic mixed with new layout (hybrid code)
❌ Obsolete layout code left in repo without deletion

✅ Requirement:

* Clean refactor
* Old layout code removed or fully replaced

---

## B. Family Ecosystem Rules (AUTO‑FAIL)

❌ Child card rendered alone (without Parent)
❌ Family broken across rows vertically
❌ Searching Parent/Child does NOT return full family cluster

✅ Requirement:

* Parent + all Children always render together as one cluster

---

## C. Family Bridge Rules (AUTO‑FAIL)

❌ No Link / Chain icon between Parent–Child cards
❌ Icon not centered between cards
❌ No dashed connector line
❌ Bridge implemented as decoration only (not structural)

✅ Requirement:

* Visible, centered Link icon
* Dashed connector line forming "financial bloodstream"

---

## D. Grid System Rules (AUTO‑FAIL)

❌ Using grid-cols-3 / grid-cols-4 / grid-cols-5 as base
❌ Parent–Child stack vertically on desktop
❌ Grid gaps inconsistent (not gap-6 everywhere)

✅ Requirement:

* Base grid = grid-cols-2
* Family cluster occupies 2 columns as a unit

---

## E. Card Layout & Visual Integrity (AUTO‑FAIL)

❌ Card radius not rounded-3xl
❌ Card heights inconsistent between family cards
❌ Card image separated into its own section
❌ Need / Spent overlap or misaligned
❌ Missing vertical divider in Need/Spent zone

✅ Requirement:

* Unified card
* Consistent height
* Image integrated into card

---

## F. Feature Zone Consistency (AUTO‑FAIL)

❌ Cashback bar taller/shorter than Progress bar
❌ Feature zone height varies across cards
❌ Cards with no cashback look visually empty

✅ Requirement:

* Enforced min-h-[44px]
* Visual balance across all cards

---

## G. Interaction & Loading UX (AUTO‑FAIL)

❌ Save / Update button allows multiple clicks
❌ No loading indicator on Save / Update
❌ Clicking card shows no immediate feedback
❌ Navigation feels frozen on Vercel

✅ Requirement:

* Immediate loading feedback everywhere

---

## H. Final Quality Gates (AUTO‑FAIL)

❌ UI does not match mockups (Images 2–4)
❌ Visual comparison screenshots missing
❌ pnpm run build fails

---

## Verdict Rule

If **ANY ❌ appears above → PR = REJECTED**

No discussion. No partial approval.
