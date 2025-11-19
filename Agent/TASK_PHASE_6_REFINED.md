A. GENT TASK: IMPLEMENT SMART SPENDING HINTS (MIN SPEND LOGIC)Context:The User wants the TransactionForm to be "Smart".When selecting a Credit Card, the form must fetch the Current Cycle Spending to give real-time advice about Min Spend and Budget.Objective:Update Dashboard to ensure Min Spend warning is visible (confirming previous fix).Upgrade Transaction Form: Calculate Projected Spend = Current Real Spend + Input Amount.1. Backend: Fetch Spending Stats (src/services/cashback.service.ts)Create a lightweight server action to be called by the Client Form.Function: getAccountSpendingStats(accountId: string, date: Date)Logic:Identify the Cycle based on date and account.cashback_config.Sum transaction_lines (credit) for that account in that cycle.Return:{
  currentSpend: number;
  minSpend: number | null;
  maxCashback: number | null;
  rate: number;
  earnedSoFar: number;
}
2. Frontend: Transaction Form Logic (src/components/moneyflow/transaction-form.tsx)Action:Use useEffect to call getAccountSpendingStats whenever account_id or date changes.Store stats in a local state.Render Logic (The "Brain"):Calculate: projectedTotal = (stats.currentSpend || 0) + (form.watch('amount') || 0)Scenario A: Min Spend Rules (e.g., Min 3,000,000)IF projectedTotal < stats.minSpend:Status: ⚠️ Warning (Amber).Message: "Cần chi thêm [stats.minSpend - projectedTotal] để kích hoạt hoàn tiền ([Rate]%)."Note: Do not block submission, just warn.IF projectedTotal >= stats.minSpend AND stats.currentSpend < stats.minSpend:Status: 🎉 Success (Green).Message: "Tuyệt vời! Giao dịch này giúp bạn đạt mức chi tiêu tối thiểu (3tr)."IF stats.currentSpend >= stats.minSpend:Status: ✅ Active (Blue).Message: "Đã đạt chỉ tiêu Min Spend. Đang tích lũy hoàn tiền." (Proceed to Scenario B).Scenario B: Max Cap Rules (e.g., Max 300,000)(Only runs if Min Spend is met or not required)IF (earnedSoFar + potentialNewEarn) > maxCashback:Status: 🛑 Limit Reached.Message: "Ngân sách hoàn tiền chỉ còn [Remaining]. Bạn chỉ nhận được tối đa [Remaining] cho giao dịch này."3. Execution StepsImplement the Server Action getAccountSpendingStats.Wire it up to TransactionForm.Implement the Conditional Rendering logic above for the Hint Badge.


B.AGENT TASK: HOTFIX UI (CYCLE DUPLICATION & MIN SPEND WARNING)Context:Bug: In the TransactionForm, the Cashback Hint/Badge is displaying the Cycle Label twice or incorrectly (e.g., "Kỳ: ... Kỳ: ...") when a date is selected.Feature: We just added a "Msb Online" card with a min_spend rule. The UI needs to show this requirement in the Hint.Objective: Clean up the Hint rendering and display Min Spend rules.1. Fix Cycle Label Duplication (src/components/moneyflow/transaction-form.tsx)Root Cause Analysis:The component might be rendering the cycle label in two places:Static rendering (based on Today).Dynamic rendering (based on form.watch('date')).OR the getCycleLabel function is somehow appending text.Action: Simplify to Single Source of TruthRefactor getCycleLabel: Ensure it returns only the date range string (e.g., "25/10 - 24/11"), NOT the prefix "Kỳ:".Unified Rendering:// Inside TransactionForm component
const selectedDate = form.watch('date');
const selectedAccount = accounts.find(a => a.id === form.watch('account_id'));

// Calculate variables
const cycleRange = getCycleLabel(selectedDate, selectedAccount?.cashback_config);
const minSpend = selectedAccount?.cashback_config?.min_spend;
const maxCashback = selectedAccount?.cashback_config?.max_amt;

// ...

{/* Render The Hint Badge ONLY ONCE */}
{selectedAccount?.cashback_config && (
  <div className="mt-2 flex flex-col gap-1 rounded-md bg-blue-50 p-3 text-sm text-blue-700">

    {/* Line 1: Cycle Info */}
    <div className="font-semibold">
      Kỳ sao kê: {cycleRange}
    </div>

    {/* Line 2: Rules (Rate / Max / Min Spend) */}
    <div className="text-xs text-blue-600">
       Rate: {(selectedAccount.cashback_config.rate * 100)}% 
       {maxCashback && ` • Max: ${new Intl.NumberFormat('vi-VN').format(maxCashback)}đ`}
    </div>

    {/* Line 3: Min Spend Warning (Red/Amber if exists) */}
    {minSpend && (
       <div className="text-xs font-medium text-amber-600">
         ⚠️ Yêu cầu chi tiêu tối thiểu: {new Intl.NumberFormat('vi-VN').format(minSpend)}đ
       </div>
    )}
  </div>
)}
2. Execution StepsRead src/components/moneyflow/transaction-form.tsx.Remove any redundant/duplicate rendering logic for the Cycle Label.Implement the clean structure above.Verify getCycleLabel logic (ensure it handles the "Statement Day" rollover correctly based on the selected date).Correct Cycle Logic Reminder (Statement Day 25):If Date is Oct 24 -> Cycle is "25/09 - 24/10".If Date is Oct 25 -> Cycle is "25/10 - 24/11".