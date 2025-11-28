# Phase 37 Implementation Plan

## Completed:
1. ✅ Added Sigma and Trash2 icons to imports

## In Progress:
### 1. Unified Transaction Table Enhancements
- [ ] Merge cashback columns into single "Back Info" column
  - Line 1: `[Rate]% + [Fix]`
  - Line 2: `Σ [Total]` (green, bold)
- [ ] Fix Date/Time display (use occurred_at for date, created_at for time)
- [ ] Add "Status" column (before Actions)
- [ ] Polish layout (borders, tooltips)
- [ ] Add "Cancel Order (100%)" action
- [ ] Relax refund conditions (remove shop check)

### 2. Transaction Form
- [ ] Auto-select "Refund" category for refund mode
- [ ] Default to "Pending" tab for refunds
- [ ] Allow "Pending" option for Cancel Order

### 3. Table Styling
- [ ] Darker borders (border-2 instead of border)
- [ ] Add sort to Amount column

### 4. Transaction Filters
- [ ] Create clickable filter buttons for Income, Expense, Lend, Collect

### 5. Credit Card Balance Bug
- [ ] Fix formula: Current Balance = Limit - Used Amount

### 6. Batch Features
- [ ] Replace browser confirm with custom dialog for template delete
- [ ] Show templates in both Processing and Monthly Clone tabs
- [ ] Create TF Out transaction when Fund button is clicked

### 7. Sheet API
- [ ] Add bank code to column F (e.g., "203 - Vietcombank")
