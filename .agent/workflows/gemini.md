---
description: Money Flow 3 (Updated Phase 75)
---

Project

Money Flow 3 — personal finance manager. Stack: Next.js 15 (App Router), TypeScript, Tailwind + shadcn, Supabase Postgres.

Key Concepts

Accounts: banks, wallets, credit cards, savings, debt.

Credit card action states:

Due soon / overdue

Need to spend (minSpend)

Waiting confirm (pending batch)

Family:

Parent/Child relationship uses accounts.parent_account_id.

Parent implies shared limit; UI may present shared balance depending on product rule.

Secured:

accounts.secured_by_account_id links a card to a collateral savings account.

UI Conventions

Card left side is a portrait image strip (no square crop).

Due is displayed as a hanging banner attached to left image section.

Need-to-spend uses a two-column pill matching Share/Remains style.

Quick Add row stays at the bottom; Limit bar pinned above it.

Non-negotiable Business Rules

Transfer source cannot be Credit Card.

Transfer quick-add must auto-select category Money Transfer.

Family linkage must persist to parent_account_id on create/update.

Agent Operating Mode

Always search the repo for existing implementations before creating new ones.

Make changes in small commits.

Run: lint + build (+ typecheck if present).

Open PRs with before/after screenshots.

Phase Naming

Branch names and commit messages are phase-driven:

Branch: PHASE-XX.Y-<SHORT-SLUG>

Commit: PHASE XX.Y - <TITLE>