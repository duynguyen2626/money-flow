# Transaction Slide V2 - User Guide

## Overview
Transaction Slide V2 is a comprehensive transaction input system supporting Single and Bulk modes with advanced features like cashback tracking, split bills, and debt management.

## Features

### Single Transaction Mode
Create individual transactions with full control over all fields.

#### Transaction Types
1. **💸 Expense** - Regular spending
2. **💰 Income** - Money received
3. **🔄 Transfer** - Move money between accounts
4. **👥 Debt (Lend)** - Money lent to others
5. **👥 Repayment** - Money received back from debts

#### Key Fields
- **Date & Tag**: When the transaction occurred and monthly tag
- **Amount**: Transaction amount (auto-calculated with cashback)
- **Account**: Source account (where money comes from)
- **Category & Shop**: Categorization for expenses
- **Person**: For debt/repayment transactions
- **Notes**: Optional description
- **Cashback**: Track cashback earnings

### Bulk Transaction Mode
Quickly add multiple transactions at once.

#### Features
- **Shared Date**: All transactions use the same date
- **Default Account**: Set once, applies to all rows
- **Quick Cashback**: Per-row cashback input
- **Person Support**: Track debts in bulk
- **Total Summary**: See total amount and text representation

## How to Use

### Creating a Single Transaction

1. **Open the Slide**
   - Navigate to `/txn/v2`
   - Click "Open Slide V2"

2. **Select Transaction Type**
   - Choose between Personal (Expense/Income/Transfer) or External (Debt/Repayment)
   - Click the appropriate type button

3. **Fill in Details**
   - **Date**: Select transaction date (defaults to today)
   - **Tag**: Auto-filled based on date (YYYY-MM format)
   - **Account**: Choose source account
   - **Amount**: Enter transaction amount
   - **Category/Shop**: (For expenses) Select category and shop
   - **Person**: (For debts) Select person
   - **Notes**: Add optional description

4. **Configure Cashback** (Optional)
   - Click "Cashback" section to expand
   - Choose mode:
     - **None Back**: No cashback
     - **Percent**: Virtual cashback (projected)
     - **Real Percent**: Actual cashback received
     - **Real Fixed**: Fixed cashback amount
     - **Voluntary**: Shared cashback with others
   - Enter percentage or fixed amount
   - View cycle badge (for credit cards with statement day)

5. **Save**
   - Click "💾 Lưu" to create transaction
   - Slide will close automatically on success

### Creating Bulk Transactions

1. **Switch to Bulk Mode**
   - Click "Bulk" tab at the top

2. **Set Global Settings**
   - **Date**: Select date for all transactions
   - **Tag**: Auto-synced with date
   - **Default Account**: Choose account for all rows

3. **Add Rows**
   - Click "+ Add Row" to add transaction rows
   - Each row has:
     - **Amount**: Transaction amount
     - **Shop**: Select shop
     - **Person**: (Optional) For debt tracking
     - **Cashback**: Quick cashback input
     - **Notes**: Optional description

4. **Review Total**
   - See total amount in numbers and words
   - Verify row count

5. **Submit**
   - Click "💾 Lưu tất cả" to create all transactions

## Advanced Features

### Cashback Tracking

#### Cycle Badge
For credit cards with configured statement day:
- Shows billing cycle (e.g., "26-12 to 25-01")
- Automatically calculates based on statement day
- Helps track cashback within billing period

#### Cashback Modes
- **None Back**: Transaction doesn't earn cashback
- **Percent (Virtual)**: Projected cashback based on card rate
- **Real Percent**: Actual cashback received (uses card rate or custom)
- **Real Fixed**: Fixed cashback amount
- **Voluntary**: Cashback shared with others (doesn't count toward budget)

#### Input Validation
- Warning if cashback rate exceeds 10%
- Auto-reset to 10% if exceeded
- Prevents data entry errors

### Auto-Fill Features

#### Tag Sync
- Tag automatically updates to YYYY-MM when date changes
- Persistent default value
- Works in both Single and Bulk modes

#### Category Defaults
- **Debt transactions**: Auto-select "Shopping" category + "Shopee" shop
- **Repayment transactions**: Auto-select "Repayment" category
- Reduces repetitive input

### Split Bill
(Placeholder - Not yet implemented in V2)

## Tips & Best Practices

### For Daily Expenses
1. Use **Single Mode** for one-off transactions
2. Enable cashback tracking for credit card purchases
3. Use category/shop for better tracking

### For Bulk Entry
1. Use **Bulk Mode** when entering multiple transactions from bank statements
2. Set default account once to save time
3. Use quick cashback input for fast entry

### For Debt Management
1. Use **External (Debt)** tab for lending money
2. Use **External (Repayment)** tab when receiving money back
3. Always select the person to track debt balance

### For Cashback Optimization
1. Check cycle badge to know your billing period
2. Use "Real Percent" mode when you know the exact cashback rate
3. Review total cashback in the badge

## Keyboard Shortcuts
(To be implemented)

## Account Intelligence (Phase 15)

The Accounts V2 table (`/accounts/v2`) includes smart visualization tools to help track financial health.

### Intelligence Legend
Amounts in the table are automatically color-coded based on their magnitude:
- 🔴 **Red (Critical)**: Amounts > 100,000,000 VND. Requires immediate attention.
- 🟠 **Orange (Monitoring)**: Amounts between 50,000,000 and 100,000,000 VND. Keep an eye on these.
- 🟢 **Green (Safe)**: Amounts < 50,000,000 VND. Standard safe zone.

### Coverage Metric
Found in the main header, **Coverage** tracks your external credit exposure:
- **Formula**: Total External Limit / Current External Debt.
- **Purpose**: Helps visualize how much credit capacity is still available for family/others.
- **HoverCard**: Hover over the Coverage stat to see a detailed breakdown.

### Waiver & Qualification
- **Qualified**: Visible when spend targets (e.g., for cashback or fee waiver) are met.
- **Needs Action**: Visible when further spend is required to meet targets.

## Troubleshooting

### Cashback not showing
- Ensure account is a Credit Card type
- Verify statement day is configured in account settings
- Check that transaction date falls within a valid cycle

### Tag not syncing
- Ensure date is selected first
- Tag will auto-update when date changes
- Manual override is possible

### Bulk mode total incorrect
- Verify all amounts are entered correctly
- Check for empty rows (they're skipped)
- Ensure default account is selected

## Related Documentation
- [MASTER_CONTEXT_LOAD.md](./prompts/MASTER_CONTEXT_LOAD.md)
- [TASK_TEMPLATE.md](./prompts/TASK_TEMPLATE.md)
- [AGENT_CONTEXT.md](./AGENT_CONTEXT.md)
- [ONBOARDING.md](./prompts/ONBOARDING.md)
