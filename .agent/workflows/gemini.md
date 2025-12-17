---
description: Money Flow 3 (Updated Phase 75)
---

# .agent/workflows/gemini.md — Context (MF4)

## Project Overview

Money Flow 3 is a personal finance manager built with:

* Next.js (App Router)
* TypeScript
* Tailwind CSS + shadcn/ui
* Supabase (PostgreSQL)

## Key Domain Concepts

### Transactions

Types:

* Expense
* Income
* Transfer
* Lending
* Repay

Each transaction type controls visible fields in the modal.

### Accounts

* Credit cards
* Banks / wallets
* Savings / secured accounts

Important rules:

* Credit cards **cannot** be transfer sources
* Some credit cards have cashback policies

### Cashback (Current State)

* Cashback configuration lives in `accounts.cashback_config`
* Current system computes cashback mostly in backend logic
* There is no unified table to manage cashback per cycle yet

### Voluntary Cashback (MF4)

Voluntary cashback means:

* User gives cashback manually even when:

  * Account has no cashback
  * Cashback budget for the cycle is exhausted

Rules:

* Voluntary cashback is allowed
* It must NOT affect:

  * Min spend
  * Cashback budget
* These values will be persisted separately in MF5

## UI Conventions

* Transaction modal uses sticky header + fixed footer
* Transaction type tabs are visually dominant
* Due / cashback logic clarity > compactness
* Mobile experience is first‑class

## Agent Operating Mode

* Read existing implementation before coding
* Prefer minimal refactors
* Do not introduce backend breaking changes
* Keep UI consistent with existing design system

## Phase Boundaries

MF4 focuses on:

* Transaction modal UI
* Form logic & validation

MF5 will handle:

* Cashback tables
* Budget aggregation
* Profit / loss reporting
Cashback is now persisted in:

cashback_cycles (per account per cycle)

cashback_entries (ledger)

Modes:

real = awarded cashback (counts toward budget)

virtual = predicted profit (clamped)

voluntary = overflow/loss (does not count)

* Cashback recomputation must be consistent across SQL and TS.
* `overflow_loss` must include real overflow when cap is exceeded.
* Missing config should be stored as NULL, not 0.

## Current Phase (MF5.2.1)

* Branch: `PHASE-9.2.1-CASHBACK-PERCENT-ENTRIES-SHEET`
* Commit: `PHASE 9.2.1 - Fix cashback percent, ensure entries/cycles, and sheet export`
* PR title: `MF5.2.1: Fix percent display + ensure cashback tables + correct sheet export`

## Cashback Percent Rules
* DB stores decimal [0..1] (e.g. 0.05)
* UI shows percent [0..100] (e.g. 5)
* Sheet Export sends raw percent [0..100] (e.g. 5)
* Transactions must ALWAYS update `cashback_entries` and recompute `cashback_cycles` (including old cycle if moved).
