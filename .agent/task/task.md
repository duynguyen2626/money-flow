TASK: Refactor Transaction Modal to Slide V2 + Bulk Add Feature

CONTEXT:
  - Current: Modal add transaction (single txn, monolithic code ~5k lines)
  - Goal: Create new Slide V2 with:
    1. Refactored single transaction input (cleaner, componentized)
    2. NEW bulk transaction input feature (discussed requirements)
  - Strategy: Test on separate /txn/v2 page first, then integrate to main /txn page
  - Important: V2 references V1 code WITHOUT breaking existing functionality

REQUIREMENTS:

1. REFACTOR SINGLE TXN INPUT TO SLIDE V2
   Objectives:
     - Extract modal logic to reusable Slide component
     - Break down monolithic code into smaller components
     - Maintain all existing features (date, amount, notes, shop, card, cashback, split bill, etc.)
     - Improve code organization (max 500 lines per component)
   
   Component Structure:
     src/components/transaction/
       ├── slide-v2/
       │   ├── transaction-slide-v2.tsx           (Main slide container, <300 lines)
       │   ├── basic-info-section.tsx             (Date, Amount, Notes, Shop)
       │   ├── account-card-section.tsx           (From Account, Card selection)
       │   ├── cashback-section.tsx               (Existing cashback logic, extracted)
       │   ├── split-bill-section.tsx             (Split bill feature)
       │   ├── bulk-input-section.tsx             (NEW: Bulk transaction rows)
       │   └── types.ts                           (Shared types)

2. BULK ADD FEATURE (NEW)
   Spec:
     - UI: Collapsible rows, each row = 1 transaction
     - Toggle: Switch between "Single" and "Bulk" mode
     
   Row Structure (per transaction):
     ┌─ Row N ──────────────────────────────────────┐
     │ Amount: [______]  Notes: [________________]  │
     │ Shop: [Shopee ▼]  Card: [Select ▼]          │
     │ 💰 Quick Cashback: [% __] [₫ __] [⚙️]       │
     │    Auto-detected: Virtual 10% OR Voluntary   │
     │                                              │
     │ [Expanded cashback section when click ⚙️]   │
     └──────────────────────────────────────────────┘
   
   Behavior:
     - Date: Shared across all rows (fixed at top)
     - Notes: Individual per row, empty = "Auto Notes"
     - Shop: Default "Shopee", can change per row
     - Card: Individual selection per row
     - Cashback:
       * Quick input: [% __] or [₫ __] (inline editing)
       * Auto-detect: When card selected, load policy
       * No policy card → Auto switch to "Voluntary" tab
       * Click [⚙️] → Expand full cashback section (tabs: Virtual/Real/Voluntary)
     - Add/Remove rows: [+ Add Row] button, [X] to remove
     - Submit: Create N transactions based on N rows
   
   Component Implementation:
     bulk-input-section.tsx:
       - Main container with mode toggle (Single/Bulk)
       - Renders array of <BulkTransactionRow />
       
     bulk-transaction-row.tsx:
       - Single row component
       - Props: index, data, onUpdate, onRemove
       - Contains: Amount, Notes, Shop, Card, QuickCashback
       - State: expanded (for cashback section)
       
     quick-cashback-input.tsx:
       - Compact cashback input: [% __] [₫ __] [⚙️]
       - Auto-detect policy from card
       - Toggle expand/collapse full section
       - Smart logic: No policy → Voluntary tab

3. SMART UX ENHANCEMENTS (Agent discretion)
   Think about:
     - Keyboard shortcuts (Tab to next field, Enter to add row, Ctrl+Enter to submit)
     - Auto-focus management (new row → focus Amount field)
     - Validation feedback (inline errors, prevent submit if invalid)
     - Duplicate row feature (copy previous row data)
     - Quick shop selection (recent shops, favorites)
     - Cashback preview (show total cashback across all rows)
     - Undo/Redo for bulk edits
     - Drag-to-reorder rows
     - Save as template (future: bulk patterns)
   
   UI Polish:
     - Smooth animations (row add/remove, expand/collapse)
     - Loading states (submit progress, card policy loading)
     - Empty states (no rows, no cards, no shops)
     - Responsive design (mobile considerations)
     - Accessibility (ARIA labels, keyboard navigation)

4. TECHNICAL REQUIREMENTS
   State Management:
     - Use React Hook Form for form state
     - Bulk rows: useFieldArray hook
     - Cashback state: Per-row independent state
     - Validation: Zod schema per row
   
   Data Flow:
     ```typescript
     interface TransactionSlideV2Props {
       mode: 'single' | 'bulk';
       onSubmit: (data: SingleTxn | BulkTxn[]) => Promise<void>;
       onClose: () => void;
     }
     
     interface BulkTxnRow {
       amount: number;
       notes: string;
       shop: string;
       cardId: string;
       cashback: {
         quickPercent?: number;
         quickFixed?: number;
         expanded: boolean;
         type: 'virtual' | 'real' | 'voluntary';
         rate?: number;
         amount?: number;
         // ... full cashback fields
       };
     }
     
     interface BulkTxnSubmit {
       date: string;          // Shared
       rows: BulkTxnRow[];    // N rows → N transactions
     }
     ```
   
   API Integration:
     - Single mode: Reuse existing createTransaction action
     - Bulk mode: New bulkCreateTransactions action
       * Input: BulkTxnSubmit
       * Logic: Loop rows, create N transactions
       * Return: { success: boolean, count: number, errors?: string[] }

5. TESTING STRATEGY
   Phase 1: V2 Page (Isolated Testing)
     - Create route: /txn/v2 (new page)
     - Import <TransactionSlideV2 /> component
     - Test single mode (compare with V1)
     - Test bulk mode (new feature)
     - Verify: All fields work, validation, submit
   
   Phase 2: Integration to /txn Page
     - Add new button: [⚡ Bulk Add] next to existing [+ Add Transaction]
     - Button placement:
       ```
       ┌─────────────────────────────────┐
       │ [+ Add Transaction] [⚡ Bulk]   │
       └─────────────────────────────────┘
       ```
     - Click [⚡ Bulk] → Open Slide V2 in bulk mode
     - Existing [+ Add Transaction] → Keep V1 for now (safety)
     - After V2 stable → Migrate single mode to V2, deprecate V1

6. CODE ORGANIZATION
   File Structure:
     src/
       ├── components/transaction/
       │   ├── slide-v2/
       │   │   ├── transaction-slide-v2.tsx       (Main component)
       │   │   ├── basic-info-section.tsx
       │   │   ├── account-card-section.tsx
       │   │   ├── cashback-section.tsx
       │   │   ├── split-bill-section.tsx
       │   │   ├── bulk-input-section.tsx
       │   │   ├── bulk-transaction-row.tsx
       │   │   ├── quick-cashback-input.tsx
       │   │   ├── types.ts
       │   │   └── utils.ts
       │   └── (existing V1 components - DO NOT TOUCH)
       │
       ├── app/txn/v2/
       │   └── page.tsx                           (Test page)
       │
       └── actions/
           └── bulk-transaction-actions.ts        (New action)
   
   Guidelines:
     - Max 500 lines per component
     - Extract shared logic to utils.ts
     - Shared types in types.ts
     - Each component: Single responsibility
     - Use composition (nested components)

7. DELIVERABLES
   Must Have:
     ✓ Refactored Slide V2 (single mode working)
     ✓ Bulk input feature (multi-row, all fields)
     ✓ Quick cashback input (inline + expandable)
     ✓ Auto-detect cashback policy
     ✓ Volunteer tab auto-switch (no policy)
     ✓ Component breakdown (<500 lines each)
     ✓ /txn/v2 test page working
     ✓ Bulk submit action (create N txn)
   
   Nice to Have:
     ○ Smart UX features (keyboard shortcuts, drag-reorder, etc.)
     ○ Template system (save/load bulk patterns)
     ○ Cashback preview summary
     ○ Mobile responsive design

DESIGN REFERENCE:
  V1 Modal (Current):
    - Location: src/components/transaction-modal.tsx (or similar)
    - Study: Form structure, validation, cashback logic, split bill
    - Extract: Reusable logic, keep same behavior
  
  Cashback Section:
    - Reference screenshot: image.jpg (file:54)
    - Tabs: Virtual (Auto) | Real (Claimed) | Voluntary
    - Fields: % Rate, Amount, Total Give Away, Match Policy, Budget Left
    - Compact version: Quick input [% __] [₫ __] + expand icon

CONSTRAINTS:
  - DO NOT break existing /txn page functionality
  - DO NOT modify V1 components directly
  - V2 must support both single + bulk mode
  - Bulk mode: Date shared, other fields per-row
  - Cashback: Per-row independent state
  - Submit: N rows → N transactions (atomic if possible)

NEXT STEPS:
  1. Analyze existing V1 modal code
  2. Design component architecture (confirm with user)
  3. Implement Slide V2 (single mode first)
  4. Add bulk mode (incremental)
  5. Test on /txn/v2 page
  6. Integrate to /txn page (new button)
  7. Polish UX (animations, shortcuts, etc.)
