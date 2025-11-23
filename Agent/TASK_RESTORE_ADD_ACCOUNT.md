AGENT TASK: HOTFIX - RESTORE & UPGRADE CREATE ACCOUNT DIALOG

CRITICAL CONTEXT:
During a previous "Build Fix" session, the CreateAccountDialog was accidentally stripped of all advanced logic. It is now a basic form (Name/Balance only).
We must restore it to match the sophistication of EditAccountDialog.

Objective:
Re-implement src/components/moneyflow/create-account-dialog.tsx with full support for all Account Types (Credit, Savings, Asset) and their specific configurations.

1. UI Logic: The "Smart" Creation Form

Step 1: Account Type Selection (Tabs/Cards)

Instead of a Dropdown, show Tabs or Grid of Cards to select type:

🏦 Payment (Bank)

💳 Credit Card

💰 Savings/Invest

📦 Others (Cash/Wallet)

(Note: Debt is handled in People module, hide it here to keep UI clean).

Step 2: Sub-Type Selection (Only for "Others" Tab)

If "Others" tab is active, show Radio Group:

💵 Cash (Tiền mặt)

📱 E-Wallet (Ví điện tử)

Step 3: Dynamic Fields (Conditional Rendering)

Common: Name, Initial Balance, Logo URL (Preview), Currency (Default VND).

IF Credit Card:

Credit Limit.

Cashback Config Fieldset: Rate (%), Max Amount, Min Spend, Cycle Type, Statement Day. (Reuse logic from Edit Dialog).

Secured By: Dropdown to link with Savings Account.

IF Savings:

Interest Rate, Term, Maturity Date.

2. Implementation Guidelines

Source of Truth:

Look at src/components/moneyflow/edit-account-dialog.tsx. Use it as the template.

Difference: Edit loads existing data. Create initializes with defaults.

Payload Construction:

Ensure the JSON for cashback_config is constructed correctly before sending to createAccount service.

Type Safety: Ensure the payload matches the Supabase Insert type to avoid Vercel build errors.

Code Structure:

// Use React Hook Form + Zod
const formSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['bank', 'credit_card', 'savings', 'investment', 'asset', 'cash', 'ewallet']), 
  // Note: Map UI Tabs to these DB Enums correctly
  current_balance: z.coerce.number(), // Initial balance
  // ... conditional fields ...
  cashback_config: z.object({ ... }).optional(),
});


3. 🚨 MANDATORY SAFETY CHECK (DO NOT SKIP) 🚨

Before marking this task as Done, you MUST:

Run npm run build (or npx tsc --noEmit) in the terminal.

IF there are TypeScript errors (e.g., Type mismatch, 'never' type assignment):

FIX THEM PROPERLY.

Do NOT delete the logic to make the error go away.

Use as any casting only if absolutely necessary to bypass library typing issues, but keep the business logic intact.

Only report "Done" if the build passes AND the UI has the features listed above.

4. Execution Steps

Read src/components/moneyflow/edit-account-dialog.tsx to understand the required fields.

Rewrite src/components/moneyflow/create-account-dialog.tsx completely.

Run Build Test.