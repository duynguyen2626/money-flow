# V2 Implementation Strategy

## Approach
Rather than copying all 3187 lines and making edits, we'll create a NEW V2 component that:

1. **Imports & reuses** all the business logic from unified-transaction-table.tsx
2. **Creates custom column layouts** for the merged columns (Date+Type, Notes+Category+Flow, Amount with cashback)
3. **Preserves 100% of interaction logic** from V1
4. **Adds modern styling** without touching component structure

## Key Realization
- V2 doesn't need to duplicate all 3187 lines
- We can create a wrapper/variant that adjusts column rendering
- Or create separate component with cleaner structure

## V2 Column Design (Final)

### Merged Columns Structure:
1. **Date + Type** (left aligned)
   - Checkbox + Date/Time + Type Badge (IN/OUT/LEND/REPAY)
   
2. **Flow & Entities** (centered/flexible)
   - [Source Icon + Name] ➜ [Target Icon + Name]
   - Badges: Cycle tag, Debt tag, FROM/TO badges
   - Smart context display (hide self when viewing person/account page)

3. **Notes + Shop + Category** (left aligned, flexible width)
   - Shop image (if exists) + Notes text
   - Badges: SPLIT/SHARE, Refund state (Request/Confirm/OK), Category
   - Copy ID button (on hover)

4. **Amount** (right aligned)
   - Base amount (smaller, secondary)
   - Cashback info (if exists)
   - Net Value (bold, primary)

5. **Actions** (centered)
   - Wrench icon → dropdown with Edit, Duplicate, Void, Refund, Delete, History

## File Structure
- Keep V1 as-is (unified-transaction-table.tsx)
- Create V2: unified-transaction-table-v2.tsx (with simplified structure, focusing on column layout changes)
- Create test page: transactions/page-v2.tsx to compare V1 vs V2

## Status
Ready to proceed with V2 implementation when user confirms this approach.
