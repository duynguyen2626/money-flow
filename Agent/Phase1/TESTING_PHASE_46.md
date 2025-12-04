# PHASE 46 TESTING GUIDE: Advanced Cashback Tiers & Smart Hint

## 🎯 Testing Objectives

Verify that the VPBank Lady card (or any tiered cashback card) can be configured accurately and the smart hint displays correct information.

---

## 📋 Test Case 1: Configure VPBank Lady Card

### Setup
1. Navigate to `/accounts`
2. Find or create a credit card account (e.g., "VPBank Lady")
3. Click "Settings" to open the Edit Account Dialog

### Configuration Steps

#### Basic Settings
- **Name**: VPBank Lady
- **Type**: Credit card
- **Credit Limit**: 50,000,000
- **Logo URL**: (Optional)

#### Cashback Configuration
- **Rate (%)**: 1 (base rate)
- **Max amount**: 200,000
- **Min spend**: 0
- **Cycle type**: Statement cycle
- **Statement day**: 15

#### Advanced Tiers

**Tier 1: Premium (Spend > 15M)**
- **Min Total Spend**: 15,000,000
- **Default Rate (%)**: 1

**Category Rules for Tier 1:**

| Category | MCC Codes | Rate (%) | Max Reward (VND) |
|----------|-----------|----------|------------------|
| Education | 8211, 8220 | 15 | 200,000 |
| Medical | 8011, 8021 | 10 | 150,000 |
| Utilities | - | 5 | 100,000 |
| Dining | 5812, 5814 | 3 | 50,000 |

**Tier 2: Base (Spend >= 0)**
- **Min Total Spend**: 0
- **Default Rate (%)**: 1
- **Category Rules**: (Leave empty - uses default rate)

### Expected Result
✅ All tiers and rules should be saved successfully
✅ The configuration should be visible when reopening the dialog

---

## 📋 Test Case 2: Smart Hint - Below Tier Threshold

### Setup
1. Create a new transaction
2. **Account**: VPBank Lady
3. **Type**: Expense
4. **Category**: Education
5. **Amount**: 500,000

### Expected Smart Hint Display

```
Cycle: 15/11/2025 - 14/12/2025 (Remaining: X days)
Applied Rate: 1.00% (Base Rate (No Tier Met))
Estimated Cashback: 5,000
```

**Explanation**: Since current cycle spend is 0 (below 15M threshold), only the base rate applies.

---

## 📋 Test Case 3: Smart Hint - Above Tier Threshold (Education)

### Setup
1. Assume current cycle spend is 16,000,000 (above 15M threshold)
2. Create a new transaction:
   - **Account**: VPBank Lady
   - **Type**: Expense
   - **Category**: Education
   - **Amount**: 2,000,000

### Expected Smart Hint Display

```
Cycle: 15/11/2025 - 14/12/2025 (Remaining: X days)
Applied Rate: 15.00% (Category "Education" (Tier > 15tr) [Max: 200,000đ])
Max Reward (Category): 200,000đ
Estimated Cashback: 200,000
```

**Explanation**: 
- Tier 1 is active (spend > 15M)
- Education category matches → 15% rate
- Raw cashback would be 2,000,000 × 15% = 300,000
- But max reward is 200,000, so it's capped

---

## 📋 Test Case 4: Smart Hint - Above Tier Threshold (Medical)

### Setup
1. Assume current cycle spend is 16,000,000
2. Create a new transaction:
   - **Account**: VPBank Lady
   - **Type**: Expense
   - **Category**: Medical
   - **Amount**: 1,000,000

### Expected Smart Hint Display

```
Cycle: 15/11/2025 - 14/12/2025 (Remaining: X days)
Applied Rate: 10.00% (Category "Medical" (Tier > 15tr) [Max: 150,000đ])
Max Reward (Category): 150,000đ
Estimated Cashback: 100,000
```

**Explanation**: 
- Tier 1 is active
- Medical category matches → 10% rate
- Cashback: 1,000,000 × 10% = 100,000 (under max reward of 150,000)

---

## 📋 Test Case 5: Smart Hint - Unlisted Category in Active Tier

### Setup
1. Assume current cycle spend is 16,000,000
2. Create a new transaction:
   - **Account**: VPBank Lady
   - **Type**: Expense
   - **Category**: Shopping (not in tier rules)
   - **Amount**: 1,000,000

### Expected Smart Hint Display

```
Cycle: 15/11/2025 - 14/12/2025 (Remaining: X days)
Applied Rate: 1.00% (Default Tier Rate (Tier > 15tr))
Estimated Cashback: 10,000
```

**Explanation**: 
- Tier 1 is active
- Shopping is not in the category rules
- Falls back to Tier 1's default rate (1%)

---

## 📋 Test Case 6: Voluntary Cashback Toggle (Non-Credit Card)

### Setup
1. Create/select a **Bank Account** (not credit card)
2. Create a new transaction:
   - **Account**: Bank Account (e.g., VCB)
   - **Type**: Expense
   - **Category**: Food
   - **Amount**: 100,000

### Expected Behavior

**Before Toggle:**
- ❌ Cashback inputs should be **hidden**
- ❌ No "% Back" or "Fixed Back" fields visible

**After Enabling "Voluntary Cashback" Toggle:**
- ✅ Cashback inputs section appears
- ✅ Can enter "% Back" and "Fixed Back"
- ✅ Shows "Total shared with person"
- ℹ️ No smart hint (since it's not a credit card with cashback config)

---

## 📋 Test Case 7: Edit Account - Verify Tier Persistence

### Setup
1. Open Edit Account Dialog for VPBank Lady
2. Verify all tiers and rules are displayed correctly
3. Modify Tier 1 → Education rate from 15% to 12%
4. Save changes
5. Reopen the dialog

### Expected Result
✅ The Education rate should now show 12%
✅ All other rules remain unchanged
✅ MCC codes are preserved

---

## 🐛 Common Issues to Check

### Issue 1: Smart Hint Not Showing
**Possible Causes:**
- Account doesn't have `cashback_config`
- Category is not selected
- API `/api/cashback/stats` is failing

**Debug:**
- Check browser console for errors
- Verify the account has `hasTiers: true` in config
- Check Network tab for API response

### Issue 2: Wrong Rate Applied
**Possible Causes:**
- Category name doesn't match (case-sensitive partial match)
- Current spend is below tier threshold
- Tier sorting issue

**Debug:**
- Check current cycle spend in the database
- Verify category name matches the rule key (partial, case-insensitive)

### Issue 3: Max Reward Not Capping
**Possible Causes:**
- `max_reward` field is not set in the rule
- Frontend calculation not using the capped value

**Debug:**
- Check the `spendingStats.maxReward` value in browser console
- Verify `potentialCashback` calculation respects the cap

---

## ✅ Success Criteria

- [ ] Can configure multiple tiers with different thresholds
- [ ] Can add category rules with all 4 fields (Category, MCC, Rate, Max Reward)
- [ ] Smart hint displays correct rate based on current spend and tier
- [ ] Smart hint shows "Max Reward (Category)" when applicable
- [ ] Estimated cashback respects the max reward cap
- [ ] Voluntary cashback toggle works for non-credit accounts
- [ ] All configurations persist after save and reload

---

## 📊 Example Real-World Scenario

**VPBank Lady Card - November Cycle**

| Date | Transaction | Category | Amount | Tier Active | Rate | Max Reward | Cashback |
|------|------------|----------|--------|-------------|------|------------|----------|
| Nov 16 | Tuition Fee | Education | 5,000,000 | Base (0M) | 1% | - | 50,000 |
| Nov 20 | Groceries | Shopping | 3,000,000 | Base (5M) | 1% | - | 30,000 |
| Nov 22 | Hospital | Medical | 8,000,000 | Base (8M) | 1% | - | 80,000 |
| Nov 25 | Online Course | Education | 2,000,000 | Premium (16M) | 15% | 200,000 | 200,000* |
| Nov 28 | Pharmacy | Medical | 500,000 | Premium (18M) | 10% | 150,000 | 50,000 |

**Total Earned**: 410,000 VND (capped at 200,000 by account max)

*Note: Raw cashback would be 300,000 but capped at 200,000 by category max reward

---

**Testing Date**: 2025-11-30
**Status**: Ready for Testing
