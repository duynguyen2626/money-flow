# Transaction Slide V2 - Current System

## Overview
This is the **CURRENT** transaction management system using a slide-in panel from the right edge of the screen.

## Main Component
- **File:** `transaction-slide-v2.tsx`
- **Usage:** Import `TransactionSlideV2` component
- **UI:** Slides from right edge, Sheet component from Shadcn UI

## Architecture

```
transaction-slide-v2.tsx          # Main container with header, mode toggle, form management
├── single-mode/                  # Single transaction entry
│   ├── basic-info-section.tsx   # Type, category, amount, date, note
│   ├── account-selector.tsx     # Source/target accounts, person
│   ├── cashback-section.tsx     # Cashback modes and calculations
│   └── split-bill-section.tsx   # Split bill between people
├── bulk-mode/                    # Bulk transaction entry
│   └── bulk-input-section.tsx   # Multi-row quick entry
├── transaction-trigger.tsx       # Trigger button wrapper
└── types.ts                      # TypeScript types and schemas
```

## Key Features
- **Back Button:** Top-left corner of header (ArrowLeft icon)
- **Mode Toggle:** Single/Bulk tabs in header
- **Form Validation:** Zod schemas with react-hook-form
- **Modular Design:** Sections are separate components
- **Sheet UI:** Uses Shadcn Sheet (not modal)

## Usage Example
```tsx
import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'

<TransactionSlideV2
  open={isOpen}
  onOpenChange={setIsOpen}
  mode="single"
  initialData={defaultValues}
  accounts={accounts}
  categories={categories}
  people={people}
  shops={shops}
  onSuccess={() => console.log('Success')}
/>
```

## Where It's Used
- `/transactions` page - Main transaction list
- `/people/[id]` page - Person detail view
- `/accounts/[id]` page - Account detail view
- Paid Transactions Modal
- People Directory V2

## Legacy System (DEPRECATED)
⚠️ **Do NOT use these files for new features:**
- `src/components/moneyflow/add-transaction-dialog.tsx` - Old modal dialog (center screen)
- `src/components/moneyflow/transaction-form.tsx` - Old 5300+ line monolithic form

These are kept for backward compatibility only. All new development should use TransactionSlideV2.

## Recent Updates
- **Feb 2, 2026:** Added Back button to header (line 288-294)
- **Jan 2026:** Modular architecture with single-mode/bulk-mode sections

## Development Guidelines
1. Keep sections modular and focused
2. Use react-hook-form for form state
3. Zod schemas for validation
4. Back button always visible for UX
5. Support both create and edit modes
6. Handle unsaved changes warnings

## Contact
See `.agent/README.md` for full V2 architecture documentation.
