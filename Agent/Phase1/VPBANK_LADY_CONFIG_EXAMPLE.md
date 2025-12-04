# VPBank Lady Card Configuration Example

## Card Details
- **Name**: VPBank Lady Card
- **Tiered Structure**: Yes
- **Cycle Type**: Statement Cycle (Day 15)

## Configuration JSON

```json
{
  "rate": 0.02,
  "max_amt": 1000000,
  "cycle_type": "statement_cycle",
  "statement_day": 15,
  "min_spend": 5000000,
  "has_tiers": true,
  "tiers": [
    {
      "minSpend": 15000000,
      "categories": {
        "insurance": {
          "rate": 0.10,
          "maxAmount": 500000
        },
        "supermarket": {
          "rate": 0.05
        },
        "shopping": {
          "rate": 0.03
        },
        "dining": {
          "rate": 0.03
        }
      },
      "defaultRate": 0.02
    },
    {
      "minSpend": 5000000,
      "categories": {
        "insurance": {
          "rate": 0.05
        },
        "supermarket": {
          "rate": 0.03
        }
      },
      "defaultRate": 0.015
    }
  ]
}
```

## How It Works

### Tier 1: Spend >= 15,000,000₫
- Insurance: **10%** cashback (max 500,000₫)
- Supermarket: **5%** cashback
- Shopping: **3%** cashback
- Dining: **3%** cashback
- Other categories: **2%** cashback

### Tier 2: Spend >= 5,000,000₫ (but < 15M)
- Insurance: **5%** cashback
- Supermarket: **3%** cashback
- Other categories: **1.5%** cashback

### Base: Spend < 5,000,000₫
- All categories: **2%** cashback

## Category Mapping

The system matches transaction categories to tier categories using **substring matching** (case-insensitive):

| Database Category | Matches Config Key |
|-------------------|-------------------|
| "Bảo hiểm" | "insurance" |
| "Siêu thị" | "supermarket" |
| "Shopping" | "shopping" |
| "Ăn uống" | "dining" |

## SQL Update Command

```sql
UPDATE accounts
SET cashback_config = '{
  "rate": 0.02,
  "max_amt": 1000000,
  "cycle_type": "statement_cycle",
  "statement_day": 15,
  "min_spend": 5000000,
  "has_tiers": true,
  "tiers": [
    {
      "minSpend": 15000000,
      "categories": {
        "insurance": {"rate": 0.10, "maxAmount": 500000},
        "supermarket": {"rate": 0.05},
        "shopping": {"rate": 0.03},
        "dining": {"rate": 0.03}
      },
      "defaultRate": 0.02
    },
    {
      "minSpend": 5000000,
      "categories": {
        "insurance": {"rate": 0.05},
        "supermarket": {"rate": 0.03}
      },
      "defaultRate": 0.015
    }
  ]
}'::jsonb
WHERE name = 'VPBank Lady';
```

## Example Calculation

### Scenario: Monthly spend = 20,000,000₫

**Transaction 1: Insurance - 5,000,000₫**
- Qualifies for Tier 1 (spend >= 15M)
- Category: Insurance → 10% rate
- Bank Back: 500,000₫ (capped at maxAmount)
- Shared: 0₫
- **Profit: 500,000₫**

**Transaction 2: Supermarket - 3,000,000₫**
- Qualifies for Tier 1
- Category: Supermarket → 5% rate
- Bank Back: 150,000₫
- Shared: 0₫
- **Profit: 150,000₫**

**Transaction 3: Shopping - 12,000,000₫**
- Qualifies for Tier 1
- Category: Shopping → 3% rate
- Bank Back: 360,000₫
- Shared: 180,000₫ (50% shared with friend)
- **Profit: 180,000₫**

### Total for Month:
- Total Spend: 20,000,000₫
- Bank Back: 1,010,000₫ (but capped at max_amt: 1,000,000₫)
- People Back: 180,000₫
- **Net Profit: 820,000₫**

## Notes

1. **Tier Qualification**: Based on **total spend** in the cycle, not per transaction
2. **Category Matching**: Flexible substring matching (e.g., "Bảo hiểm xe" matches "insurance")
3. **Max Amount**: Applied at the **cycle level**, not per transaction
4. **Default Rate**: Used when transaction category doesn't match any tier category
5. **Backward Compatible**: Accounts without `has_tiers` use standard rate calculation
