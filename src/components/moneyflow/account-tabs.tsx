'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type AccountTabsProps = {
  accountId: string
  activeTab: 'transactions' | 'cashback'
}

export function AccountTabs({ accountId, activeTab }: AccountTabsProps) {
  const router = useRouter()
  const [currentTab, setCurrentTab] = useState<'transactions' | 'cashback'>(activeTab)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setCurrentTab(activeTab)
  }, [activeTab])

  const handleTabChange = (tab: 'transactions' | 'cashback') => {
    setCurrentTab(tab)
    startTransition(() => {
      router.push(`/accounts/${accountId}?tab=${tab}`)
    })
  }

  const tabs = [
    { key: 'transactions' as const, label: 'Transactions' },
    { key: 'cashback' as const, label: 'Cashback Analysis' },
  ]

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                disabled={isPending}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors disabled:opacity-70',
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                <span className="inline-flex items-center gap-2">
                  {tab.label}
                  {isActive && isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                  )}
                </span>
              </button>
            )
          })}
        </div>
        {isPending && (
          <div className="flex items-center gap-2 pr-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading...
          </div>
        )}
      </div>
    </>
  )
}
