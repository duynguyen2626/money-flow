'use client';

import { MouseEvent, useEffect, useState } from 'react';

import { CashbackCard, CashbackTransaction } from '@/types/cashback.types';

type CashbackDetailsDialogProps = {
  card: CashbackCard;
  onClose: () => void;
};

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const cycleOptions = [0, -1, -2];

function formatCycleName(card: CashbackCard | null) {
  if (!card) {
    return 'Cycle ?';
  }
  const monthNumber = new Date(card.cycleEnd).getMonth() + 1;
  return `Cycle T${String(monthNumber).padStart(2, '0')}`;
}

export function CashbackDetailsDialog({ card, onClose }: CashbackDetailsDialogProps) {
  const [selectedOffset, setSelectedOffset] = useState(card.cycleOffset);
  const [cycleCache, setCycleCache] = useState<Record<number, CashbackCard>>({
    [card.cycleOffset]: card,
  });
  const [loadingOffset, setLoadingOffset] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const stopPropagation = (event: MouseEvent<HTMLDivElement>) => event.stopPropagation();

  useEffect(() => {
    setSelectedOffset(card.cycleOffset);
    setCycleCache({ [card.cycleOffset]: card });
  }, [card.accountId, card.cycleOffset]);

  const hasCachedCycle = Boolean(cycleCache[selectedOffset]);

  useEffect(() => {
    if (hasCachedCycle) {
      setFetchError(null);
      setLoadingOffset(null);
      return;
    }

    const controller = new AbortController();
    setLoadingOffset(selectedOffset);
    setFetchError(null);

    fetch(
      `/api/cashback/progress?accountId=${card.accountId}&monthOffset=${selectedOffset}`,
      {
        cache: 'no-store',
        signal: controller.signal,
      }
    )
      .then(async response => {
        if (!response.ok) {
          throw new Error('Failed to load cashback cycle');
        }
        const payload = (await response.json()) as CashbackCard[];
        if (!payload.length) {
          throw new Error('Khong tim thay du lieu chu ky');
        }
        setCycleCache(prev => ({ ...prev, [selectedOffset]: payload[0] }));
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === 'AbortError') {
          return;
        }
        console.error(error);
        setFetchError('Khong the tai du lieu chu ky');
      })
      .finally(() => setLoadingOffset(null));

    return () => {
      controller.abort();
    };
  }, [card.accountId, selectedOffset, hasCachedCycle]);

  const activeCard = cycleCache[selectedOffset] ?? null;
  const displayCard = activeCard ?? card;
  const isLoadingCycle = loadingOffset === selectedOffset;

  if (!activeCard) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"
          onClick={stopPropagation}
        >
          <p className="text-sm font-semibold text-slate-600">
            Khong co du lieu cho ky nay.
          </p>
        </div>
      </div>
    );
  }

  const spentLabel = currencyFormatter.format(displayCard.currentSpend);
  const earnedLabel = currencyFormatter.format(displayCard.totalEarned);
  const sharedLabel = currencyFormatter.format(displayCard.sharedAmount);
  const netLabel = currencyFormatter.format(displayCard.netProfit);
  const minSpendRemainingLabel = Math.max(0, activeCard.minSpendRemaining ?? 0);
  const start = dateFormatter.format(new Date(displayCard.cycleStart));
  const end = dateFormatter.format(new Date(displayCard.cycleEnd));

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"
        onClick={stopPropagation}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase text-slate-400">Chi tiet hoan tien</p>
            <h2 className="text-xl font-semibold text-slate-900">{displayCard.accountName}</h2>
            <p className="text-sm text-slate-500">
              Ky: {start} - {end}
            </p>
            <p className="text-xs text-slate-400">
              {activeCard ? activeCard.cycleLabel : 'Dang tai du lieu chu ky...'}
            </p>
            {fetchError && (
              <p className="text-xs text-rose-600">{fetchError}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500 transition hover:border-slate-400 hover:text-slate-900"
          >
            Dong
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {cycleOptions.map(offset => {
            const optionCard = cycleCache[offset] ?? (offset === card.cycleOffset ? card : null);
            const isActive = offset === selectedOffset;
            return (
              <button
                key={`cycle-${offset}`}
                type="button"
                onClick={() => setSelectedOffset(offset)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {formatCycleName(optionCard ?? null)}
                <span className="text-[10px] uppercase tracking-wide">
                  {optionCard ? optionCard.cycleLabel : 'Dang tai'}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase text-slate-400">Tong chi</p>
            <p className="text-2xl font-semibold text-slate-900">{spentLabel}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
            <p className="text-xs uppercase text-slate-400">Tong hoan tien (Bank)</p>
            <p className="text-2xl font-semibold text-emerald-600">{earnedLabel}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
            <p className="text-xs uppercase text-slate-400">Da chia cho nguoi khac</p>
            <p className="text-2xl font-semibold text-slate-900">{sharedLabel}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
            <p className="text-xs uppercase text-slate-400">Loi nhuan rong</p>
            <p
              className={`text-2xl font-semibold ${
                displayCard.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'
              }`}
            >
              {netLabel}
            </p>
          </div>
        </div>

        {isLoadingCycle && (
          <p className="text-xs text-slate-500">Dang tai du lieu chu ky...</p>
        )}

        {activeCard.minSpend !== null && !activeCard.minSpendMet && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            Can them {currencyFormatter.format(minSpendRemainingLabel)} de dat min spend.
          </div>
        )}

        <div className="mt-6 max-h-[48vh] overflow-y-auto">
          {!activeCard ? (
            <p className="text-sm text-slate-500">
              {isLoadingCycle ? 'Dang tai du lieu chu ky...' : 'Dang cho du lieu chu ky...'}
            </p>
          ) : activeCard.transactions.length === 0 ? (
            <p className="text-sm text-slate-500">Chua co giao dich trong ky nay.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activeCard.transactions.map(txn => (
                <TransactionRow key={txn.id} txn={txn} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

type TransactionRowProps = {
  txn: CashbackTransaction;
};

function TransactionRow({ txn }: TransactionRowProps) {
  return (
    <li className="flex items-center justify-between py-3 text-sm">
      <div>
        <p className="font-semibold text-slate-900">
          {dateFormatter.format(new Date(txn.occurred_at))}
        </p>
        <p className="text-xs text-slate-500">{txn.note || 'Khong co ghi chu'}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-slate-900">{currencyFormatter.format(txn.amount)}</p>
        <p className="text-xs text-emerald-600">
          Hoan tien: {currencyFormatter.format(txn.earned)}
        </p>
      </div>
    </li>
  );
}
