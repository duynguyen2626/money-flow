# Transaction Slide V2 - Implementation Plan

## Current Status: Phase 1 Complete ✅

Transaction Slide V2 is **production-ready** with Single and Bulk modes fully implemented. Currently available at `/txn/v2` for testing.

## Completed Features

### Phase 1: Core Implementation ✅
- ✅ Single Transaction Mode
  - Personal transactions (Expense, Income, Transfer)
  - External transactions (Debt, Repayment)
  - Full field support (Date, Tag, Amount, Account, Category, Shop, Person, Notes)
  - Cashback tracking with cycle badges
  - Input validation and error handling
  
- ✅ Bulk Transaction Mode
  - Multi-row input with field array
  - Shared date and default account
  - Per-row cashback input
  - Person/Debt tracking support
  - Total amount with text representation
  - Tag sync with date

- ✅ Advanced Features
  - Dynamic tag sync based on date
  - Cashback cycle badge (for credit cards)
  - Category auto-defaults (Debt → Shopping, Repayment → Repayment)
  - Input validation (cashback rate warning)
  - Compact metadata layout

## Next Phases

### Phase 2: Integration with Cards (Planned)
**Goal**: Enable quick transaction creation from Account and People cards

#### Account Cards Integration
- [ ] Add "Quick Add" button to Account detail pages
- [ ] Pre-fill source account when opening from card
- [ ] Context-aware type selection (e.g., Credit Card → Expense)
- [ ] Quick actions: "Pay Bill", "Transfer Out", "Add Expense"

#### People Cards Integration
- [ ] Add "Quick Lend" and "Quick Repay" buttons to People detail pages
- [ ] Pre-fill person when opening from card
- [ ] Auto-detect debt direction (Lend vs Repay) based on balance
- [ ] Show current debt balance in slide
- [ ] Suggest repayment amount (full or partial)

**Estimated Effort**: 2-3 days

### Phase 3: Modal Refactoring (Future)
**Goal**: Replace legacy modals with unified slide pattern

#### Candidates for Refactoring
- [ ] Edit Transaction Modal → Edit Slide
- [ ] Create Account Modal → Account Slide
- [ ] Create Person Modal → Person Slide
- [ ] Service Management Modal → Service Slide
- [ ] Split Bill Modal → Split Bill Slide

**Benefits**:
- Consistent UX across the app
- Better mobile experience (full-screen slides)
- Reusable components
- Easier maintenance

**Estimated Effort**: 1-2 weeks

### Phase 4: Main Integration (Future)
**Goal**: Replace current transaction creation flow

- [ ] Add "New Transaction" button to main `/transactions` page
- [ ] Replace quick-add modal with Slide V2
- [ ] Migrate existing transaction edit to Slide V2
- [ ] Deprecate V1 components
- [ ] Update navigation and shortcuts

**Estimated Effort**: 3-5 days

## Technical Architecture

### File Structure
```
src/components/transaction/slide-v2/
├── transaction-slide-v2.tsx          # Main component
├── types.ts                          # Shared types & schemas
├── single-mode/
│   ├── basic-info-section.tsx        # Date, Tag, Account
│   ├── account-selector.tsx          # Account/Person selection
│   ├── cashback-section.tsx          # Cashback tracking
│   └── split-bill-section.tsx        # (Placeholder)
└── bulk-mode/
    ├── bulk-input-section.tsx        # Header + rows
    ├── bulk-row.tsx                  # Individual row
    └── quick-cashback-input.tsx      # Cashback popover
```

### Key Dependencies
- `react-hook-form` - Form state management
- `zod` - Schema validation
- `date-fns` - Date formatting
- `sonner` - Toast notifications
- Custom UI components (Shadcn/Radix)

### Server Actions
- `createTransaction` - Single transaction creation
- `bulkCreateTransactions` - Bulk transaction creation
- Both integrate with cashback service automatically

## Design Decisions

### Why Slide Over Modal?
1. **Better Mobile UX**: Full-screen on mobile, side panel on desktop
2. **More Space**: Can fit more fields without scrolling
3. **Context Preservation**: Main page visible in background
4. **Modern Pattern**: Matches industry standards (Notion, Linear, etc.)

### Why Separate Single/Bulk Modes?
1. **Different Mental Models**: Single = detail-focused, Bulk = speed-focused
2. **Different Layouts**: Single = vertical form, Bulk = table-like
3. **Easier Maintenance**: Clear separation of concerns
4. **Better Performance**: Only load what's needed

### Why Keep V2 (Not V3)?
1. **Proven Stability**: V2 has been tested and works
2. **Feature Complete**: All requirements met
3. **Less Risk**: No need for experimental layouts yet
4. **Incremental Improvement**: Can iterate on V2 based on feedback

## Migration Strategy

### For Phase 2 (Cards Integration)
1. Add `initialData` prop to TransactionSlideV2
2. Create wrapper components for each card type
3. Pass pre-filled data based on context
4. Test thoroughly before rollout

### For Phase 3 (Modal Refactoring)
1. Identify modal usage patterns
2. Create slide equivalents one by one
3. Run A/B tests if needed
4. Gradual migration (feature flag)

### For Phase 4 (Main Integration)
1. Add feature flag for V2 vs V1
2. Soft launch to beta users
3. Gather feedback and iterate
4. Full rollout after 2 weeks of testing

## Success Metrics

### Phase 1 (Current)
- ✅ Build passes without errors
- ✅ All transaction types supported
- ✅ Cashback tracking functional
- ✅ Bulk mode working

### Phase 2 (Cards Integration)
- [ ] 50% reduction in clicks for common actions
- [ ] Positive user feedback on quick actions
- [ ] No regression in transaction creation time

### Phase 3 (Modal Refactoring)
- [ ] Consistent UX across all creation flows
- [ ] Improved mobile satisfaction scores
- [ ] Reduced code duplication

### Phase 4 (Main Integration)
- [ ] V2 becomes default for all users
- [ ] V1 deprecated and removed
- [ ] Codebase simplified

## Risks & Mitigation

### Risk: User Confusion
**Mitigation**: Clear labeling, tooltips, and onboarding guide

### Risk: Performance Issues
**Mitigation**: Lazy loading, code splitting, performance monitoring

### Risk: Data Loss
**Mitigation**: Auto-save drafts, confirmation dialogs, transaction history

## Timeline

- **Phase 1**: ✅ Complete (2 weeks)
- **Phase 2**: 📅 Q1 2026 (2-3 days)
- **Phase 3**: 📅 Q2 2026 (1-2 weeks)
- **Phase 4**: 📅 Q2 2026 (3-5 days)

## Notes

- V3 (Smart Context Layout) was explored but deferred
- Focus on stability and incremental improvement
- User feedback will drive future iterations
