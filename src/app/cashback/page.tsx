import { getCashbackProgress } from '@/services/cashback.service'
import { CashbackTable, Cashback } from './components/cashback-table'

export const dynamic = 'force-dynamic'

export default async function CashbackPage() {
  const cards = await getCashbackProgress()

  const cashbackData: Cashback[] = cards.map(card => {
    // Calculate derived values
    // card.rate is e.g. 0.1 (10%)
    const bankBackRate = card.rate * 100;
    const peopleBackRate = card.currentSpend > 0 ? (card.sharedAmount / card.currentSpend) * 100 : 0;

    // Status logic
    let status = 'ACTIVE';
    // If we have progress 100% or cycle ended?
    // Usually status is derived from time or progress.
    const now = new Date();
    const end = new Date(card.cycleEnd);
    if (now > end) status = 'COMPLETED';
    else status = 'ACTIVE';

    return {
      id: card.accountId,
      cardName: card.accountName,
      cycle: card.cycleLabel,
      totalSpend: card.currentSpend,
      bankBackRate: bankBackRate,
      bankBackAmount: card.totalEarned,
      peopleBackRate: peopleBackRate,
      peopleBackAmount: card.sharedAmount,
      profit: card.netProfit,
      status: status
    };
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Cashback Management</h1>
        <p className="text-slate-500">Track all cashback cycles with detailed analytics</p>
      </header>

      {/* Table view of all cashback cycles */}
      <CashbackTable
        data={cashbackData}
      />
    </div>
  );
}
