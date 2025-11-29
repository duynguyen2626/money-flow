import { getCashbackProgress } from '@/services/cashback.service'
import { CashbackDetailView } from '../components/cashback-detail-view'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function CashbackDetailPage({ params }: { params: { id: string } }) {
  // Fetch data for the specific account
  const cards = await getCashbackProgress(0, [params.id])

  if (!cards || cards.length === 0) {
    notFound()
  }

  const card = cards[0]

  const bankBackRate = card.rate * 100;
  const peopleBackRate = card.currentSpend > 0 ? (card.sharedAmount / card.currentSpend) * 100 : 0;
  const profitRate = bankBackRate - peopleBackRate;

  const now = new Date();
  const end = new Date(card.cycleEnd);
  const status = now > end ? 'COMPLETED' : 'ACTIVE';

  const detailData = {
    id: card.accountId,
    cardName: card.accountName,
    cycle: card.cycleLabel,
    totalSpend: card.currentSpend,
    bankBackRate: bankBackRate,
    bankBackAmount: card.totalEarned,
    peopleBackRate: peopleBackRate,
    peopleBackAmount: card.sharedAmount,
    profit: card.netProfit,
    profitRate: profitRate,
    transactions: card.transactions,
    status: status
  };

  return (
    <CashbackDetailView cashback={detailData} />
  );
}
