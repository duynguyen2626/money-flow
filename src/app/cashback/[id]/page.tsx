'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, TrendingUp, Wallet, PiggyBank, CreditCard, ChevronRight } from 'lucide-react'
import { getCashbackProgress } from '@/services/cashback.service'
import { CashbackCard, CashbackTransaction } from '@/types/cashback.types'
import { CashbackTransactionTable } from '@/components/cashback/cashback-transaction-table'
import { Progress } from '@/components/ui/progress'
import { TransactionForm, TransactionFormValues } from '@/components/moneyflow/transaction-form'
import { createPortal } from 'react-dom'
import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { getUnifiedTransactions } from '@/services/transaction.service'

export default function CashbackDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [cardData, setCardData] = useState<CashbackCard | null>(null)
  const [loading, setLoading] = useState(true)

  // Data for Edit Form
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [shops, setShops] = useState<Shop[]>([])

  // Edit State
  const [editingTxn, setEditingTxn] = useState<CashbackTransaction | null>(null)
  const [editInitialValues, setEditInitialValues] = useState<Partial<TransactionFormValues> | null>(null)

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  })

  useEffect(() => {
    if (!id) return

    async function loadData() {
      try {
        // Fetch cashback data
        const cards = await getCashbackProgress(0, [id])
        if (cards.length > 0) {
          setCardData(cards[0])
        }

        // Fetch auxiliary data for edit form
        const [accs, cats, ppl, shps] = await Promise.all([
          getAccounts(),
          getCategories(),
          getPeople(),
          getShops()
        ])
        setAccounts(accs)
        setCategories(cats)
        setPeople(ppl)
        setShops(shps)

      } catch (error) {
        console.error('Failed to load cashback details:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  const handleEdit = async (txn: CashbackTransaction) => {
    // We need to fetch the full transaction details to populate the form correctly
    // Since CashbackTransaction is a simplified view, we'll fetch the full txn by ID
    try {
      // We can use getUnifiedTransactions with a filter for ID, but it returns an array.
      // Or we can just try to map what we have if it's enough.
      // Actually, UnifiedTransactionTable's buildEditInitialValues logic is complex and handles lines.
      // We should probably fetch the single transaction with lines.
      // For now, let's try to reconstruct basic values and rely on the form to handle defaults.
      // BETTER: Fetch the single transaction using getUnifiedTransactions
      const fullTxns = await getUnifiedTransactions({ accountId: id, limit: 1 }) // This won't get specific ID easily without filter
      // Let's just use what we have and some defaults, or add a service method to get one txn.
      // Actually, we can just fetch all transactions for this account again using unified service? No, too heavy.

      // Let's construct initial values from CashbackTransaction
      // Note: This is a best-effort mapping. For full editing power, we really should fetch the full txn.
      // But let's try to map what we have.

      const values: Partial<TransactionFormValues> = {
        occurred_at: new Date(txn.occurred_at),
        amount: txn.amount,
        note: txn.note || '',
        // We don't have source/dest account IDs easily available in CashbackTransaction
        // We know the credit account is 'id' (current page).
        // If it's an expense, source is 'id'.
        // If it's a transfer, we don't know the other side.
        // This is risky.

        // ALTERNATIVE: Just open the form with the ID and let the form fetch? 
        // TransactionForm takes 'initialValues'. It doesn't fetch itself.

        // OK, let's use the helper we saw in UnifiedTransactionTable.
        // But we don't have the full TransactionWithDetails object here.

        // Workaround: We will fetch the specific transaction details on demand.
        // We can use getUnifiedTransactions but we need to filter by ID.
        // The service doesn't support ID filter?
        // Let's check getUnifiedTransactions signature.
      }

      // For now, let's just set the ID and basic info we have. 
      // The user might need to re-select some things if we can't fully populate.
      // Wait, I can import buildEditInitialValues if I export it, but it needs TransactionWithDetails.

      // Let's try to fetch the full transaction for editing.
      // I'll add a quick fetch here.
      const response = await getUnifiedTransactions({ accountId: id, limit: 1000 }) // We already have this data in memory in the service? No.
      const found = response.find(t => t.id === txn.id)

      if (found) {
        // We need to import buildEditInitialValues from unified-transaction-table or duplicate it.
        // Since it's not exported, I'll duplicate the logic or simplify it.
        // Let's simplify:

        const lines = found.transaction_lines || []
        const creditLine = lines.find(l => l.type === 'credit')
        const debitLine = lines.find(l => l.type === 'debit')

        // Determine type
        let type: TransactionFormValues['type'] = 'expense'
        if (found.type === 'income') type = 'income'
        if (found.type === 'transfer') type = 'transfer'
        if (found.type === 'repayment') type = 'repayment'

        // Determine Category
        const categoryId = lines.find(l => l.category_id)?.category_id

        // Determine Person
        const personId = lines.find(l => l.person_id)?.person_id

        // Determine Accounts
        const sourceId = type === 'income' ? debitLine?.account_id : (creditLine?.account_id || debitLine?.account_id)
        const destId = type === 'transfer' || type === 'repayment' ? debitLine?.account_id : undefined // Simplified

        // Share info
        const sharePercent = found.cashback_share_percent
        const shareFixed = found.cashback_share_fixed

        setEditInitialValues({
          occurred_at: new Date(found.occurred_at || new Date()),
          type,
          amount: found.amount,
          note: found.note || '',
          tag: found.tag || '',
          category_id: categoryId || undefined,
          person_id: personId || undefined,
          source_account_id: sourceId || undefined,
          debt_account_id: destId || undefined,
          shop_id: found.shop_id || undefined,
          cashback_share_percent: sharePercent ? sharePercent * 100 : undefined,
          cashback_share_fixed: shareFixed || undefined
        })
        setEditingTxn(txn)
      } else {
        alert("Could not load full transaction details.")
      }

    } catch (e) {
      console.error(e)
      alert("Failed to prepare edit form")
    }
  }

  const handleEditSuccess = () => {
    setEditingTxn(null)
    setEditInitialValues(null)
    // Reload data
    // We can just reload the page or re-fetch
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-slate-400">Loading cashback details...</div>
      </div>
    )
  }

  if (!cardData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-10">
          <h2 className="text-xl font-semibold text-slate-700">Account Not Found</h2>
          <Button onClick={() => router.push('/cashback')} className="mt-4">
            Back to List
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => router.push('/cashback')}
          className="gap-2 pl-0 hover:pl-2 transition-all text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cashback List
        </Button>
      </div>

      {/* Single Row Header Layout */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col xl:flex-row items-center justify-between gap-8">

        {/* 1. Account Info */}
        <div className="flex items-center w-full xl:w-auto border-b xl:border-b-0 border-slate-100 pb-4 xl:pb-0">
          <Link href={`/accounts/${id}`} className="flex items-center gap-4 group">
            {cardData.accountImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cardData.accountImageUrl}
                alt={cardData.accountName}
                className="h-14 w-auto object-contain rounded-md group-hover:opacity-80 transition-opacity"
              />
            ) : (
              <div className="h-14 w-20 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-200 transition-colors">
                <CreditCard className="h-6 w-6" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-900 whitespace-nowrap group-hover:text-blue-600 transition-colors">{cardData.accountName}</h1>
              <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider">
                  {cardData.cycleLabel}
                </span>
                <span>•</span>
                <span>{(cardData.rate * 100).toFixed(1)}%</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Stats Group - Flex on Desktop, Grid on Mobile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full xl:w-auto flex-1 justify-end">

          {/* 2. Net Profit */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Net Profit</span>
            <div className="text-2xl font-bold text-emerald-600 whitespace-nowrap">
              {currencyFormatter.format(cardData.netProfit)}
            </div>
          </div>

          {/* 3. Total Earned */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1 flex items-center gap-1">
              Earned <span className="text-slate-300 font-normal">(Bank)</span>
            </span>
            <div className="text-xl font-bold text-blue-600 whitespace-nowrap">
              {currencyFormatter.format(cardData.totalEarned)}
            </div>
          </div>

          {/* 4. Shared */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Shared</span>
            <div className="text-xl font-bold text-orange-600 whitespace-nowrap">
              {currencyFormatter.format(cardData.sharedAmount)}
            </div>
          </div>

          {/* 5. Remaining Cap */}
          <div className="flex flex-col min-w-[120px]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Cap</span>
              <span className="text-[10px] font-medium text-slate-500">
                {typeof cardData.maxCashback === 'number' ? `${cardData.progress.toFixed(0)}%` : '∞'}
              </span>
            </div>
            <div className="text-xl font-bold text-slate-700 whitespace-nowrap">
              {cardData.remainingBudget !== null ? currencyFormatter.format(cardData.remainingBudget) : 'Unlimited'}
            </div>
            {typeof cardData.maxCashback === 'number' && (
              <Progress value={cardData.progress} className="h-1 mt-1.5 bg-slate-100" />
            )}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Transaction Details</h2>
        <CashbackTransactionTable
          transactions={cardData.transactions}
          onEdit={handleEdit}
        />
      </div>

      {/* Edit Dialog Portal */}
      {editingTxn && editInitialValues && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-4 sm:py-10"
          onClick={() => {
            setEditingTxn(null)
            setEditInitialValues(null)
          }}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-2xl scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-slate-200"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Edit Transaction</h3>
              <button
                className="rounded px-2 py-1 text-slate-500 transition hover:bg-slate-100"
                onClick={() => {
                  setEditingTxn(null)
                  setEditInitialValues(null)
                }}
                aria-label="Close"
              >
                X
              </button>
            </div>
            <TransactionForm
              accounts={accounts}
              categories={categories}
              people={people}
              shops={shops}
              transactionId={editingTxn.id}
              initialValues={editInitialValues}
              mode="edit"
              onSuccess={handleEditSuccess}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}