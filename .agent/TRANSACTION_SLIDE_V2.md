# Transaction Slide V2 - README

## Overview

Transaction Slide V2 is a modern, full-featured transaction input system for Money Flow 3, supporting both single and bulk transaction entry with advanced features like cashback tracking, debt management, and smart auto-fill.

## Status

✅ **Phase 1 Complete** - Production-ready, available at `/txn/v2`
✅ **Phase 9 Complete** - Unified Flow UI for transactions
✅ **Phase 15 Complete** - Account Table Intelligence (Sorting, Color-coding, Waiver Tracking)

## Features

### Single Transaction Mode
- Support for all transaction types: Expense, Income, Transfer, Debt, Repayment
- Cashback tracking with billing cycle badges
- Auto-fill features (tag sync, category defaults)
- Input validation and error handling
- Split bill support (placeholder)

### Bulk Transaction Mode
- Multi-row input for fast data entry
- Shared date and default account
- Per-row cashback configuration
- Person/Debt tracking
- Total amount with text representation

## Quick Start

### For Users
1. Navigate to http://localhost:3000/txn/v2
2. Click "Open Slide V2"
3. Choose Single or Bulk mode
4. Fill in transaction details
5. Click "Lưu" to save

### For Developers
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests (if available)
npm test
```

## Documentation

- **User Guide**: `.agent/guide.md` - How to use the feature
- **Implementation Plan**: `.agent/implementation_plan.md` - Technical roadmap
- **Task Breakdown**: `.agent/task.md` - Detailed task list
- **Handover Guide**: `.agent/handover.md` - For next developer
- **Cashback Config Guide**: `.agent/workflows/cashback-config-guide.md` - JSON samples for VPBank Diamond/Lady

## Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **Forms**: React Hook Form + Zod
- **State**: React Server Components + Server Actions

### File Structure
```
src/components/transaction/slide-v2/
├── transaction-slide-v2.tsx          # Main component
├── types.ts                          # Schemas & types
├── single-mode/                      # Single transaction UI
│   ├── basic-info-section.tsx
│   ├── account-selector.tsx
│   ├── cashback-section.tsx
│   └── split-bill-section.tsx
└── bulk-mode/                        # Bulk transaction UI
    ├── bulk-input-section.tsx
    ├── bulk-row.tsx
    └── quick-cashback-input.tsx
```

## Key Concepts

### Transaction Types
- **Expense**: Regular spending (e.g., groceries, shopping)
- **Income**: Money received (e.g., salary, refunds)
- **Transfer**: Move money between accounts
- **Debt (Lend)**: Money lent to others
- **Repayment**: Money received back from debts

### Cashback Modes
- **None Back**: No cashback
- **Percent (Virtual)**: Projected cashback
- **Real Percent**: Actual cashback received
- **Real Fixed**: Fixed cashback amount
- **Voluntary**: Shared cashback (doesn't count toward budget)

### Cashback Cycle
For credit cards with configured statement day:
- Automatically calculates billing cycle
- Displays as badge (e.g., "26-12 to 25-01")
- Helps track cashback within billing period

## Development

### Adding a New Field
1. Update schema in `types.ts`
2. Add UI component in relevant section
3. Update submission handler
4. Test thoroughly

### Modifying Cashback Logic
- **Frontend**: `cashback-section.tsx` or `quick-cashback-input.tsx`
- **Backend**: `src/services/cashback.service.ts`

### Running Tests
```bash
# Build verification
npm run build

# Lint check (if configured)
npm run lint
```

## Next Steps

### Phase 2: Cards Integration (Planned)
- Add "Quick Add" to Account cards
- Add "Quick Lend/Repay" to People cards
- Pre-fill context data

### Phase 3: Modal Refactoring (Future)
- Replace edit modal with slide
- Unify all creation flows
- Improve mobile UX

### Phase 4: Main Integration (Future)
- Replace /transactions modal
- Make V2 the default
- Deprecate V1

### Phase 10: Accounts Page Enhancements (Planned)
- Add MCC column to Accounts page table
- Compute “annual fee waiver target met” based on credit-card spend rules
- Add Category dropdown to Accounts filters

## Contributing

### Before Making Changes
1. Read `.agent/handover.md`
2. Check current task in `.agent/task.md`
3. Review implementation plan
4. Run `npm run build` to verify

### Commit Guidelines
- Use descriptive commit messages
- Reference issue/ticket numbers
- Run build verification before pushing

## Troubleshooting

### Common Issues
- **Cashback badge not showing**: Check account type and statement_day config
- **Tag not syncing**: Verify date is selected first
- **Build fails**: Check TypeScript errors and imports

### Getting Help
1. Check documentation in `.agent/` directory
2. Review code comments
3. Check git history for context
4. Ask the team

## License

Internal project - Money Flow 3

---

**Version**: 2.1.0
**Last Updated**: 2026-02-17
**Status**: Production-ready (Phase 15)
**Test URL**: http://localhost:3000/accounts/v2
