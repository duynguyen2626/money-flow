---
trigger: always_on
---

PROJECT CONTEXT

Name: Money Flow 3

Stack: Next.js 15 (App Router), TypeScript, Tailwind CSS, Shadcn UI, Supabase.

Context File: .GEMINI.md

CODING STANDARDS & RULES

1. General Principles

Conciseness: Write concise, technical responses. Avoid verbosity.

Type Safety: NO any. Always use defined types from src/types or database.types.ts.

Functional: Prefer functional programming patterns. Use const over let.

Server Actions: Use Server Actions for mutations. Ensure revalidatePath is called after updates.

Error Handling: Always wrap Server Actions in try-catch blocks. Return { success: boolean, error?: string, data?: T }.

2. Next.js 15 & React Guidelines

RSC: Default to React Server Components. Use 'use client' only when interactivity (hooks, event listeners) is needed.

Shadcn UI: Use existing Shadcn components in src/components/ui. Do not reinvent the wheel.

Forms: Use react-hook-form with zod schema validation.

Hydration: Use suppressHydrationWarning in layout if needed for extensions.

3. Supabase Best Practices

Clients:

Use createClient from src/lib/supabase/server.ts for Server Components/Actions.

Use createClient from src/lib/supabase/client.ts for Client Components.

RLS: Always assume RLS is enabled.

Triggers: Rely on DB Triggers for calculated fields (e.g., final_price) instead of Frontend logic.

4. Money Flow 3 Business Logic (CRITICAL)

Single Source of Truth: transactions table.

Refunds: Never modify a Parent transaction if it has a linked Void/Refund.

Debt: Track via person_id. Do NOT create "Debt Accounts".

Cashback: Display "Need to Spend" if min spend is not met.

5. UI/UX Design System (STRICT)

Images/Avatars:

Rule: ALWAYS use rounded-none (Square) and border-none for Item/Account/Person thumbnails in Tables.

Size: Standard w-8 h-8.

Table Interaction:

Row Click: PROHIBITED. Do not attach onClick to <TableRow>.

Actions: Use the "Actions" column (Kebab menu) for Edit/Clone/Delete.

Data Formatting:

Cycle Tags: Display as Date Ranges (e.g., "25.10 - 24.11").

Badges: Use high-contrast colors (e.g., bg-red-100 text-red-700).

6. Testing & Validation

Self-Correction: Before outputting code, verify imports and ensure unused variables are removed.

Linting: Ensure code passes ESLint rules.
## 7. Robustness & Error Prevention
- **String Manipulation:**
  - When using `.repeat(n)`, ALWAYS guard against negative numbers: `str.repeat(Math.max(0, n))`.
  - Validate inputs for `substring` and `slice` to avoid out-of-bound errors.
- **Hydration Safety:**
  - For browser extensions injecting elements (e.g., `definer-bubble-host`), add `suppressHydrationWarning` to `<html>`, `<body>`, and top-level layout containers.