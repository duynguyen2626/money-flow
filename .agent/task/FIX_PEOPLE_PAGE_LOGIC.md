🚨 RESCUE PLAN: PEOPLE DETAILS V2 & LOGIC FIXES

Objective: Forcefully switch the People Details page to the V2 architecture and fix the broken filter logic for Unpaid/Cashback/Paid.

⚠️ PHASE 1: THE GREAT REPLACEMENT (MANDATORY)

File: src/app/people/[id]/page.tsx
Action: DELETE existing content and REPLACE with this exact structure. This connects the URL to the new V2 components.

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MemberDetailLayout } from "@/components/people/v2/MemberDetailLayout";
import { getPeopleService } from "@/services/people.service";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PersonPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const peopleService = getPeopleService(supabase);
  
  // 1. Fetch Person Data
  const person = await peopleService.getPerson(id);
  if (!person) notFound();

  // 2. Fetch Transactions (Server Side)
  // Note: We fetch ALL transactions here and let the Client Component handle smart filtering
  // to support "Cross-year Unpaid" logic without multiple round-trips.
  const transactions = await peopleService.getPersonTransactions(id);

  return (
    // Pass initial data to the Client Layout
    <MemberDetailLayout 
      person={person} 
      initialTransactions={transactions} 
    />
  );
}


🛠️ PHASE 2: LOGIC REPAIR - DEBT TIMELINE

File: src/components/people/v2/DebtTimeline.tsx (or wherever the logic lives in V2)

Problem: Selecting "2026" hides "Unpaid" items from "2025".
Fix: The Unpaid filter must have higher priority than the Year filter.

Algorithm:

const filteredTransactions = useMemo(() => {
  let result = transactions;

  // 1. SPECIAL MODES (Override Year Filter)
  if (activeFilter === 'UNPAID') {
    // Return ALL unpaid/partial items regardless of year
    return result.filter(t => t.status === 'unpaid' || t.remaining_amount > 0);
  }
  
  if (activeFilter === 'CASHBACK') {
    // Return ALL cashback items regardless of year
    return result.filter(t => t.category === 'cashback' || t.is_cashback);
  }

  // 2. STANDARD MODE (Respect Year Filter)
  // Only apply year filter if we are NOT in a special mode
  if (selectedYear !== 'ALL') {
    result = result.filter(t => new Date(t.date).getFullYear().toString() === selectedYear);
  }

  return result;
}, [transactions, activeFilter, selectedYear]);


UI Requirement (Single Line Card):
Ensure the card render looks like this (Horizontal Layout):
[ JAN 26 ] [ Badges/Tags ] ------------------- [ Amount ] [ Status Badge ] [ More > ]

🛠️ PHASE 3: INTERACTIVE STATS

File: src/components/people/v2/StatsToolbar.tsx

Requirement:

Clickable: The div blocks for Cashback and Paid must be <button> or have onClick.

Paid Logic: Clicking "Paid" should trigger a prop onViewPaidHistory().

Cashback Logic: Clicking "Cashback" should trigger onFilterChange('CASHBACK').

Code Snippet (Example):

<div className="grid grid-cols-4 gap-2">
  {/* ... Lend/Repay ... */}

  {/* CASHBACK BUTTON */}
  <button 
    onClick={() => onFilterChange(filter === 'CASHBACK' ? 'ALL' : 'CASHBACK')}
    className={`p-3 rounded-lg border transition-all ${filter === 'CASHBACK' ? 'bg-indigo-900 border-indigo-500' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
  >
    <div className="text-xs text-slate-400">Cashback</div>
    <div className="text-lg font-bold text-emerald-400">{formatCurrency(stats.cashback)}</div>
  </button>

  {/* PAID BUTTON */}
  <button 
    onClick={onViewPaidHistory}
    className="p-3 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 transition-all text-left"
  >
    <div className="text-xs text-slate-400">Paid</div>
    <div className="text-lg font-bold text-slate-200">{stats.paid_count} <span className="text-xs font-normal">txns</span></div>
  </button>
</div>


🛠️ PHASE 4: THE PAID HISTORY MODAL

File: src/components/people/v2/MemberDetailLayout.tsx

Add state: const [isPaidModalOpen, setIsPaidModalOpen] = useState(false);

Pass onViewPaidHistory={() => setIsPaidModalOpen(true)} down to StatsToolbar.

Render the PaidTransactionsModal (you may need to create or import it from ../paid-transactions-modal.tsx) when state is true.

Modal Logic: The modal should receive transactions.filter(t => t.status === 'paid').

📝 CHECKLIST FOR AGENT

[ ] src/app/people/[id]/page.tsx uses MemberDetailLayout (V2).

[ ] DebtTimeline logic allows "Unpaid" to ignore the selected year.

[ ] "Cashback" stat button filters the list.

[ ] "Paid" stat button opens a modal.

[ ] Timeline cards are single-line horizontal layouts.