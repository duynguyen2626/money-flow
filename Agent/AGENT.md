AGENT TASK: PHASE 59 - REMOVE AUTOMATION BOT & STABILIZE

Context:
The "Lazy Bot" (Subscription Automation) is buggy, generating incorrect transaction data (wrong splits, missing accounts).
Decision: COMPLETELY REMOVE the Bot logic and the UI Trigger (Zap Icon) for now. We will rewrite it from scratch later.

Objective:

Delete UI: Remove AutomationChecker component and the "Zap" icon from the Layout.

Clean Backend: Remove checkAndProcessSubscriptions logic (or stub it).

Verify: Ensure the app builds and runs without the bot.

I. FRONTEND CLEANUP

1. Delete Component

Action: Delete file src/components/moneyflow/automation-checker.tsx.

2. Update Layout (src/components/moneyflow/app-layout.tsx)

Action: Remove the import of AutomationChecker.

Action: Remove the <AutomationChecker /> JSX tag from the render tree.

Action: Remove any "Zap" icon button in the Header area (if manually placed there).

II. BACKEND CLEANUP (src/services/subscription.service.ts)

1. Remove Logic

Target: checkAndProcessSubscriptions function.

Action:

Option A: Delete the function entirely.

Option B (Safer if imported elsewhere): Keep the function signature but make the body empty (return empty array).

Instruction: Delete the function entirely and remove its export. If api/batch or other routes use it, remove those usages too.

2. Clean Imports

Remove unused imports (e.g., transaction.service, debt.service imports used only by the bot).

III. ROUTE CLEANUP

1. Check API Routes

If there is an API route specifically for triggering the bot (e.g., src/app/api/automation/route.ts or similar), DELETE IT.

IV. EXECUTION STEPS

Frontend: Remove UI elements (Icon/Component).

Backend: Strip out the Bot logic code.

Build: Run npm run build to ensure no dangling references remain.