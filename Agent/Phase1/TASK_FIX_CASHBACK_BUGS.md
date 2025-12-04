AGENT TASK: FIX CASHBACK BUGS (NULL POINTER & NAN)Context:The App crashes when switching to a Cashback Cycle with no data (null activeCard).Some numbers show as NaN when calculations involve 0 or undefined.Objective: Harden the UI components against null/undefined values.1. Fix Crash in src/components/moneyflow/cashback-details.tsxProblem: The condition activeCard?.minSpend !== null is unsafe because undefined !== null is true, leading to property access on null.Action: Update the rendering logic for the Min Spend Alert.Code Fix:{/* Add a safe check for activeCard existence FIRST */}
{activeCard && activeCard.minSpend != null && !activeCard.minSpendMet && (
  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
    Cần thêm {currencyFormatter.format((activeCard.minSpend || 0) - (activeCard.currentSpend || 0))} để đạt min spend.
  </div>
)}
Additional Safety:Wrap the entire content of the Dialog in a check: if (!activeCard) return <div className="p-4">Không có dữ liệu cho kỳ này.</div>;Ensure minSpendRemaining logic handles negative numbers (if overspent) -> Math.max(0, ...)2. Fix NaN in src/components/moneyflow/cashback-dashboard.tsxProblem: Division by zero or undefined inputs results in NaN.Action:Locate where progress or percentage is calculated.Use Nullish Coalescing (??) and Optional Chaining (?.).Logic to Apply:// Bad
const progress = (current / max) * 100;

// Good
const safeMax = max || 1; // Avoid division by zero
const progress = ((current ?? 0) / safeMax) * 100;
UI Display Fix:Whenever displaying a number, safeguard it:{Number.isNaN(activeCard?.progress) ? 0 : activeCard?.progress}3. Fix Backend src/services/cashback.service.ts (Optional but Recommended)Ensure the service returns "Zero Data" objects instead of null or undefined numbers when a cycle has no transactions.// Return structure fallback
return {
  accountId,
  currentSpend: 0,
  earned: 0,
  progress: 0,
  minSpendMet: false,
  // ...
}
