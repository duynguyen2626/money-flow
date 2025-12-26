🧠 GRAVITY DOMAIN LOGIC: ACCOUNT & CASHBACK

This file serves as the Single Source of Truth for business logic. All code implementations MUST adhere to these formulas.

1. 💳 Credit Card Balance Logic

Current Issue: The system is incorrectly summing Limit + Debt.
Correct Formulas:

Definitions

Credit Limit: The maximum amount the bank allows to be spent (Positive Constant, e.g., 30,000,000).

Total Out (Spending): Sum of all posted debit transactions (e.g., 2,919,718).

Total In (Repayment): Sum of all posted credit transactions (payments to card).

Calculation Rules

Current Balance (Dư nợ hiện tại):

Logic: Total Out - Total In

Value: Should be a Positive number representing how much is owed to the bank.

Example: Spent 2.9M -> Current Balance = 2.9M. (If DB stores spending as negative, apply ABS()).

Available Balance (Hạn mức khả dụng):

Logic: Credit Limit - Current Balance

Example: 30M (Limit) - 2.9M (Debt) = 27.1M.

NEVER add Limit to Balance.

2. 🔄 Cashback Cycle Logic

Current Issue: Cycles are confused with Debt Tags (legacy month tags) and lack Year context.

Cycle Determination Rule

A transaction belongs to a Cashback Cycle based on its occurred_at date and the Account's statement_day.

Formula:

If occurred_at.day > statement_day:

Cycle Month = occurred_at.month + 1

Else:

Cycle Month = occurred_at.month

Year Handling:

The Cycle Tag MUST include the Year context to avoid collision (e.g., DEC-2025 or 2025-12).

Do NOT rely on abbreviated month tags like "MMMYY" (ambiguous and error-prone).

Trigger Rules

INSERT: Find Cycle -> Add Amount -> Update Progress.

UPDATE:

If amount changed: Re-calc old amount vs new amount in Cycle.

If occurred_at changed: Remove from Old Cycle -> Add to New Cycle.

DELETE: Remove amount from Cycle.

Update text to:

Canonical cycle tag MUST be YYYY-MM (e.g. 2025-12)

Legacy formats like MMMYY are forbidden for persistence and display

If legacy exists in DB: normalize at read; migrate to canonical ASAP
