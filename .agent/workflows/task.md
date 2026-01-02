---
description: Sprint 4: Global Cashback Matrix (RPC Strategy)
---

Sprint 4: Global Cashback Matrix (RPC Strategy)

Context:
We are building the /cashback page to provide a "Global Yearly Overview" of credit card returns. The core data aggregation will be offloaded to Supabase via a PostgreSQL RPC function to ensure performance and simplicity on the frontend.

Role: Senior Full-stack Engineer (Database & Visualization Focus).

Target Files:

Database: supabase/migrations/20260105_get_cashback_matrix.sql (New RPC).

Logic: src/actions/cashback-global.action.ts.

Page: src/app/cashback/page.tsx.

Components:

src/components/cashback/global-cashback-table.tsx (Main Matrix).

src/components/cashback/year-filter.tsx.

1. Database Implementation (RPC Function)

Function Name: get_year_cashback_summary(year_input integer)
Returns: TABLE (...) or JSON.
Logic:

Filter: Only accounts of type Liability (Credit Cards) or specific Assets involved in cashback.

Aggregation 1 (Estimated): Join with transactions -> Check metadata->>'cashback_amount'. Group by Account & Month.

Aggregation 2 (Real/Settled): Join with transactions -> Check category ILIKE 'Cashback' OR 'Income'. Group by Account.

Aggregation 3 (Fees): Join with transactions -> Check category ILIKE '%Fee%'. Group by Account.

Output Structure Example:

[
  {
    "account_id": "...",
    "account_name": "VIB Super Card",
    "account_logo": "...",
    "monthly_data": [0, 50000, 120000, ...], // Array 12 elements (Jan-Dec)
    "total_estimated": 1500000,
    "total_real": 1200000,
    "total_fees": 990000,
    "profit": 210000 // (Real - Fees)
  }
]


2. Frontend Implementation

A. Server Action (cashback-global.action.ts)

Simple wrapper to call supabase.rpc('get_year_cashback_summary', { year_input: year }).

Revalidate path /cashback logic if needed.

B. GlobalCashbackTable (global-cashback-table.tsx)

Design: A wide table with sticky columns.

Structure:

Sticky Left (Z-Index 20): Account Info (Logo + Name).

Scrollable Middle: 12 Columns (Jan -> Dec).

Show estimated cashback.

Style: Text Green-600 font-medium if > 0. Gray-300 dash (-) if 0.

Sticky Right (Z-Index 20):

Est: Total Estimated (Gray).

Real: Total Settled (Green).

Profit: Net Profit (Bold. Green if > 0, Red if < 0).

C. Page Layout

src/app/cashback/page.tsx:

Header: "Global Cashback" title.

Control: Year Selector (Dropdown: 2024, 2025...).

Body: The Table.

3. Execution Workflow

Migration: Write the SQL function first.

Action: Create the Typescript wrapper.

UI: Build the Table components using Shadcn UI Table + Tailwind sticky classes.

Wiring: Connect Page -> Action -> Component.