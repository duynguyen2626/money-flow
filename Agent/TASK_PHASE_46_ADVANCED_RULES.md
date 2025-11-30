# **AGENT TASK: PHASE 46 \- ADVANCED CASHBACK RULES & VOLUNTARY LOGIC**

**Context:**

1. **Complex Cards:** Users have cards like "VPBank Lady" with Tiered Rates based on Total Spend and Categories (MCC).  
2. **UX Improvement:** Voluntary Cashback (Discount) should be hidden for non-credit accounts unless toggled.  
3. **Smart Hint:** The transaction form needs to calculate potential cashback *accurately* based on the selected Category, MCC, and current Cycle Spend.

**Objective:**

1. Build a "Rule Builder" UI in EditAccountDialog (Support Tiers, MCC, Max Reward).  
2. Upgrade CashbackService to process Tiers logic.  
3. Upgrade TransactionForm with Smart Hint and Voluntary Toggle.

## **1\. UI: Cashback Rule Builder (src/components/moneyflow/edit-account-dialog.tsx)**

**Add Section: "Cấu hình Nâng cao (Advanced Rules)"**

* Render this inside the Cashback Fieldset.  
* **Component:** TierList (List of Tiers).  
  * **Add Tier Button.**  
  * **Tier Item (Card/Bordered Box):**  
    * **Header:**  
      * Input **"Tổng chi tiêu tối thiểu (\>=)"** (Min Spend).  
      * *Hint:* "Ví dụ: Nhập 15,000,000 nếu rule áp dụng khi tiêu trên 15tr".  
      * Input **"Rate mặc định của Tier"** (Default Rate for unlisted categories).  
    * **Rules Table (Grid):**  
      * **Col 1: Category:** Multi-Select (Select 'Education', 'Medical'...).  
      * **Col 2: MCC Codes:** Text Input (Optional). e.g., "8211, 8220". *Tooltip: "Nhập mã MCC ngăn cách bởi dấu phẩy".*  
      * **Col 3: Rate (%):** Number Input (e.g., 15 for 15%).  
      * **Col 4: Max Reward (VND):** Number Input (e.g., 200,000). *Crucial: Limit per category group*.  
      * **Action:** Delete Rule Button.  
    * **Action:** Add Rule Button.

**Data Saving:**

* Serialize this detailed structure into cashback\_config.tiers.

## **2\. Backend: Smart Cashback Engine (src/services/cashback.service.ts)**

**Upgrade getAccountSpendingStats (The Hint Logic):**

* **Step 1:** Calculate CurrentTotalSpend for the cycle (Sum of all posted expense txns).  
* **Step 2:** Determine Active Tier.  
  * Sort tiers by min\_spend desc.  
  * Find the first tier where CurrentTotalSpend \>= tier.min\_spend.  
* **Step 3:** Check Category/MCC Rule.  
  * Find a rule in the Active Tier where:  
    * category\_id matches Input Category.  
    * OR mcc\_codes (if input provided) is in the rule's MCC list.  
  * **Result:**  
    * Rate \= Rule Rate (or Tier Default).  
    * Cap \= Rule Max Reward (or Account Max).  
  * **Logic:** PotentialCashback \= Min(Amount \* Rate, Cap).  
  * *Note:* For MVP, we calculate potential based on the *current single transaction*, keeping it simple.

## **3\. Frontend: Transaction Form Logic (src/components/moneyflow/transaction-form.tsx)**

**A. Voluntary Cashback Toggle**

* **Condition:** If account.type \!== 'credit\_card'.  
* **UI:** Show Toggle Switch: "🎁 Tặng/Giảm giá (Voluntary Cashback)".  
* **Logic:**  
  * If Off: Hide % Back and Fix Back inputs.  
  * If On: Show inputs. Treat as "Discount Given" expense.

**B. Advanced Smart Hint**

* **Trigger:** When account AND category are selected.  
* **Action:** Call getAccountSpendingStats(accountId, categoryId).  
* **Display:**  
  * "Rate áp dụng: **\[Rate\]%** (Theo mức tiêu \[TierMin\])" (Green).  
  * "Tối đa danh mục: **\[MaxReward\]đ**" (if set).  
  * "Dự kiến hoàn: **\[Calculated Amount\]**".

## **4\. Execution Steps**

1. **Service:** Implement the Tier/Category/MCC matching logic.  
2. **UI (Edit Account):** Build the complex Form for Tiers with **Max Reward** and **MCC** inputs.  
3. **UI (Add Txn):** Connect the Smart Hint.  
4. **UI (Add Txn):** Add the Voluntary Toggle.  
*   
* 