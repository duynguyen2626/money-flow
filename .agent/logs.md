## Error Type
Console Error

## Error Message
⚠️ AddTransactionDialog is DEPRECATED. Use TransactionSlideV2 instead: "import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'"


    at console.error (chrome-extension://iohjgamcilhbgmhbnllfolmkmmekfmci/injected-scripts/host-console-events.js:1:351565)
    at AddTransactionDialog (src/components/moneyflow/add-transaction-dialog.tsx:50:11)
    at QuickAddChat (src/components/ai/quick-add-chat.tsx:2836:7)
    at DashboardContent (src/components/dashboard/dashboard-content.tsx:559:7)
    at Home (src\app\page.tsx:43:5)

## Code Frame
  48 |
  49 | export function AddTransactionDialog(props: AddTransactionDialogProps) {
> 50 |   console.error(
     |           ^
  51 |     "⚠️ AddTransactionDialog is DEPRECATED. Use TransactionSlideV2 instead:",
  52 |     "import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'"
  53 |   );

Next.js version: 16.0.10 (Turbopack)
## Error Type
Console Error

## Error Message
⚠️ AddTransactionDialog is DEPRECATED. Use TransactionSlideV2 instead: "import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'"


    at console.error (chrome-extension://iohjgamcilhbgmhbnllfolmkmmekfmci/injected-scripts/host-console-events.js:1:351565)
    at AddTransactionDialog (src/components/moneyflow/add-transaction-dialog.tsx:50:11)
    at <unknown> (src/components/dashboard/dashboard-content.tsx:356:27)
    at Array.map (<anonymous>:null:null)
    at DashboardContent (src/components/dashboard/dashboard-content.tsx:338:42)
    at Home (src\app\page.tsx:43:5)

## Code Frame
  48 |
  49 | export function AddTransactionDialog(props: AddTransactionDialogProps) {
> 50 |   console.error(
     |           ^
  51 |     "⚠️ AddTransactionDialog is DEPRECATED. Use TransactionSlideV2 instead:",
  52 |     "import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'"
  53 |   );

Next.js version: 16.0.10 (Turbopack)
