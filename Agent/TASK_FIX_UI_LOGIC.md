AGENT TASK: FIX UI LOGIC BUGS (NAN & DATE REACTIVITY)Context:Bug 1 (Dashboard): Cashback Progress bar shows "NaN" when data is missing or zero.Bug 2 (Transaction Form): The Cashback Hint/Badge always shows the Current Date's Cycle (e.g., Nov) even when the user selects a past date (e.g., Oct 10) in the form picker.Objective: Ensure math safety in Dashboard and make the Transaction Form reactive to the selected date.1. Fix NaN in src/components/moneyflow/cashback-dashboard.tsxRoot Cause: Division by zero or undefined values in the progress calculation.Action: Apply defensive coding.Code Instruction:Find the progress calculation logic and replace/wrap it with this safe version:// Safe Math Function
const calculateProgress = (earned: number | null, max: number | null) => {
  const safeEarned = earned ?? 0;
  const safeMax = max ?? 0;
  
  if (safeMax === 0) return 0; // Avoid division by zero
  const percent = (safeEarned / safeMax) * 100;
  
  return Number.isNaN(percent) ? 0 : Math.min(percent, 100);
};

// Usage in JSX
const progressValue = calculateProgress(card.earned, card.maxCashback);

{/* Render Progress Bar */}
<Progress value={progressValue} className="..." />

{/* Render Text Safe Check */}
<span>
  {card.maxCashback 
    ? `${calculateProgress(card.earned, card.maxCashback).toFixed(1)}%` 
    : 'N/A'}
</span>
2. Fix Cycle Date Logic in src/components/moneyflow/transaction-form.tsxRoot Cause: The Hint Component is likely using new Date() (Today) instead of watching the form's date field.Action:In the TransactionForm component, ensure you watch the date field: const selectedDate = form.watch('date');.Pass selectedDate into the helper function that calculates the cycle label.Logic Update (Helper Function):function getCycleLabel(targetDate: Date, config: any) {
  if (!config) return '';
  
  const date = targetDate || new Date(); // Fallback to today if null
  const day = date.getDate();
  const month = date.getMonth(); // 0-indexed
  const year = date.getFullYear();

  // Case A: Calendar Month
  if (config.cycle === 'calendar_month') {
    // Logic: Start = 1st, End = Last Day of Target Month
    return `Kỳ: 01/${month + 1} - End/${month + 1}`;
  }

  // Case B: Statement Cycle (e.g., day 20)
  if (config.cycle === 'statement_cycle' && config.statement_day) {
    const cutoff = config.statement_day;
    
    let start, end;
    if (day >= cutoff) {
      // Cycle starts this month on cutoff
      start = new Date(year, month, cutoff);
      end = new Date(year, month + 1, cutoff - 1);
    } else {
      // Cycle started previous month
      start = new Date(year, month - 1, cutoff);
      end = new Date(year, month, cutoff - 1);
    }
    
    // Format DD/MM
    const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
    return `Kỳ: ${fmt(start)} - ${fmt(end)}`;
  }
  
  return '';
}
Implementation:Locate the "Hint/Alert" section in the JSX.Update the label rendering to call getCycleLabel(selectedDate, account.cashback_config).Note: This ensures that if user picks "Oct 10" and cutoff is "20", it correctly identifies the cycle "20/09 - 19/10".3. ExecutionApply NaN fix to Dashboard.Refactor Transaction Form to use form.watch('date') for the Hint logic.