VIBE CODING: PHASE 74 - UI POLISH & LOGIC FIXES

Pre-requisite:
Ensure .cursorrules dictates "Square Avatars" and "Row Click Disabled".

PROMPT 1: UI REFINEMENT - UNIFIED TABLE

Copy & Paste this into Chat:

Role: You are a Senior Frontend Developer & UI Perfectionist.

Context:
1.  **Feedback on Transaction Table:**
    * **Alignment Issue:** The "Accounts ➜ People" column has too much whitespace on the right side of the Person. The Arrow icon is blurry and overlapped.
    * **Visual Issue:** Shop images are still rounded (should be square). Note Copy icon is not visible or inconsistent.
    * **Logic Issue ("Ghost Tag"):** Transactions *without* a `person_id` are still showing the Cycle Tag (e.g., "DEC25") on the right side (where the Person should be), causing confusion.

Task: Polish the `UnifiedTransactionTable` (`src/components/moneyflow/unified-transaction-table.tsx`).

Requirements:

1.  **Refine "Accounts ➜ People" Column Layout:**
    * **Container:** Use `flex w-full items-center justify-between relative` (or a strict Grid).
    * **Left Side (Account):** Flex start. Max-width 45%.
    * **Right Side (Person):** Flex end. Max-width 45%. Text align Right.
    * **Center (Arrow):**
        * Make it prominent: `text-muted-foreground font-bold`.
        * Ensure z-index is correct so it doesn't get overlapped by long text.
        * *If no person:* Hide the arrow. Center the Account info? Or keep Account Left and leave Right empty? **Decision:** Keep Account Left to maintain column vertical rhythm.

2.  **Fix "Ghost Tag" Logic:**
    * **Rule:** The "Debt Tag" (e.g., DEC25) displayed under the Person **MUST ONLY** be visible if `transaction.person_id` is NOT NULL.
    * If `person_id` is null, the right side of the cell (Avatar, Name, Tag) must be completely empty.

3.  **Strict Visual Rules:**
    * **Square Images:** Verify `ShopAvatar`, `AccountAvatar`, `PersonAvatar` all use `rounded-none`. Check `src/components/ui/avatar.tsx` or inline classes.
    * **Copy Icon:** Ensure the Note column uses a `group` class, and the Copy button has `opacity-0 group-hover:opacity-100 transition-opacity`.

4.  **Handling "Refund" Transactions (No Person):**
    * For transactions like "Refund Received" (where `person_id` is null but `tag` exists), do NOT show the tag in the People column. (The tag exists in DB for tracking, but irrelevant for UI connection here).

Deliverable: A crisp, pixel-perfect table component.


PROMPT 2: HYDRATION & LAYOUT FIX

Copy & Paste this into Chat (To fix the Log file issues):

Role: You are a Next.js Expert.

Context:
1.  **Error Log:** User reported `Hydration failed` errors referencing `id="definer-bubble-host"`. This is caused by browser extensions injecting elements into the DOM, causing a mismatch with SSR HTML.
2.  **Target:** `src/app/layout.tsx`.

Task: Harden the Layout against Hydration errors.

Requirements:
1.  Add `suppressHydrationWarning` to the `<html>` and `<body>` tags in `src/app/layout.tsx`.
2.  This tells React to ignore attribute mismatches caused by extensions, clearing the console noise.

Deliverable: Updated `layout.tsx`.
