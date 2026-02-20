'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Account, Person } from '@/types/moneyflow.types'
import { getRecentAccountsByTransactions } from '@/services/account.service'
import { getRecentPeopleByTransactions } from '@/services/people.service'
import { cn } from '@/lib/utils'
import { Landmark, User } from 'lucide-react'
import { CustomTooltip } from '@/components/ui/custom-tooltip'

interface UnifiedRecentSidebarProps {
  isCollapsed: boolean
  searchQuery?: string
}

// Use '_kind' to avoid collision with Account.type ('bank'|'cash'|...)
type RecentItemType = 
  | ({ _kind: 'account' } & Account)
  | ({ _kind: 'person' } & Person)

export function UnifiedRecentSidebar({ isCollapsed, searchQuery = '' }: UnifiedRecentSidebarProps) {
  const [recentAccounts, setRecentAccounts] = useState<Account[]>([])
  const [recentPeople, setRecentPeople] = useState<Person[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        setIsLoading(true)
        const [accounts, people] = await Promise.all([
          getRecentAccountsByTransactions(2),
          getRecentPeopleByTransactions(2)
        ])
        setRecentAccounts(accounts)
        setRecentPeople(people)
      } catch (err) {
        console.error('Failed to fetch recent items:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchRecent()
  }, [])

  // Combine all items — search never filters, only highlights
  const allRecentItems: RecentItemType[] = [
    ...recentAccounts.map((acc): RecentItemType => ({ ...acc, _kind: 'account' as const })),
    ...recentPeople.map((pers): RecentItemType => ({ ...pers, _kind: 'person' as const }))
  ]

  // Always show all items; search query is only used for yellow highlight below
  const filteredItems = allRecentItems

  if (isLoading || allRecentItems.length === 0) return null

  return (
    <div className={cn(
      "space-y-1.5 mb-6 pb-4 border-b border-slate-200",
      isCollapsed && "space-y-0.5"
    )}>
      {!isCollapsed && (
        <div className="px-3 mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Recent
          </span>
        </div>
      )}

      <div className="space-y-0.5">
        {filteredItems.map(item => {
            const href = item._kind === 'account' ? `/accounts/${item.id}` : `/people/${item.id}`
            const isActive = pathname === href
            const label = item.name || 'Unknown'
            const image_url = (item as any).image_url

            const icon = item._kind === 'account' ? (
              <Landmark className="h-3.5 w-3.5" />
            ) : (
              <User className="h-3.5 w-3.5" />
            )

            // Highlight color for search matches
            const highlightClass = searchQuery && label.toLowerCase().includes(searchQuery.toLowerCase())
              ? 'bg-yellow-50'
              : ''

            const content = (
              <Link
                key={`${item._kind}-${item.id}`}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 transition-all group relative",
                  isActive
                    ? item._kind === 'account'
                      ? "text-blue-700 font-bold bg-blue-50"
                      : "text-indigo-700 font-bold bg-indigo-50"
                    : `text-slate-500 hover:bg-slate-50 hover:text-slate-900 ${highlightClass}`,
                  isCollapsed && "justify-center px-1"
                )}
              >
                {/* Vertical line for nesting visual */}
                {!isCollapsed && (
                  <div className={cn(
                    "absolute -left-3 top-0 bottom-0 w-px bg-slate-100 group-hover:bg-blue-200 transition-colors",
                    item._kind === 'account' && isActive && "bg-blue-300",
                    item._kind === 'person' && isActive && "bg-indigo-300"
                  )} />
                )}

                <div className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-none transition-colors",
                  isActive ? "bg-white" : "bg-slate-50"
                )}>
                  {image_url ? (
                    <img src={image_url} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <div className="text-slate-400">
                      {icon}
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  <span className="text-[10px] truncate leading-tight flex-1">{label}</span>
                )}
                {!isCollapsed && item._kind === 'account' && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-medium ml-auto">
                    Account
                  </span>
                )}
                {!isCollapsed && item._kind === 'person' && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 font-medium ml-auto">
                    Person
                  </span>
                )}
              </Link>
            )

            if (isCollapsed) {
              return (
                <CustomTooltip key={`${item._kind}-${item.id}`} content={label} side="right">
                  {content}
                </CustomTooltip>
              )
            }

            return content
          })}
      </div>
    </div>
  )
}
