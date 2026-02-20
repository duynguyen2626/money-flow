'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CustomTooltip } from '@/components/ui/custom-tooltip'
import { coloredNavItems, NavIcon } from './nav-icon-system'
import { UnifiedRecentSidebar } from './unified-recent-sidebar'
import { SidebarSearch } from './sidebar-search'
import { RecentAccountsList } from './RecentAccountsList'
import { RecentPeopleList } from './RecentPeopleList'

// Items that show a hover flyout to the right instead of inline expansion
const FLYOUT_ITEMS = ['/accounts', '/people']

type SidebarNavV2Props = {
  className?: string
  isCollapsed?: boolean
  onCollapseChange?: (collapsed: boolean) => void
}

export function SidebarNavV2({
  className,
  isCollapsed: externalCollapsed,
  onCollapseChange,
}: SidebarNavV2Props) {
  const pathname = usePathname()
  const [internalCollapsed, setInternalCollapsed] = useState(externalCollapsed ?? false)
  const [searchQuery, setSearchQuery] = useState('')

  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed

  const handleCollapse = (collapsed: boolean) => {
    setInternalCollapsed(collapsed)
    onCollapseChange?.(collapsed)
  }

  const renderNavItem = (item: (typeof coloredNavItems)[0]) => {
    const isActive =
      item.href === '/'
        ? pathname === '/'
        : pathname === item.href || pathname.startsWith(item.href + '/')
    const isFlyout = FLYOUT_ITEMS.includes(item.href)

    // Highlight if search matches — NEVER filter the list
    const isHighlighted =
      searchQuery.length > 0 &&
      (item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false))

    // On a sub-page of this item? (e.g. /accounts/123 under /accounts)
    const onSubPage =
      isFlyout && pathname !== item.href && pathname.startsWith(item.href + '/')

    const linkRow = (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
          isActive && !onSubPage
            ? 'bg-blue-100 text-blue-700 shadow-sm'
            : isHighlighted
              ? 'bg-yellow-100 text-slate-800 ring-1 ring-yellow-300'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
          isCollapsed && 'justify-center px-2'
        )}
      >
        <div className="flex-shrink-0">
          <NavIcon icon={item.icon} color={item.color} size="md" />
        </div>
        {!isCollapsed && <span className="truncate flex-1">{item.title}</span>}
        {!isCollapsed && isFlyout && (
          <ChevronRight className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
        )}
      </Link>
    )

    // Hover flyout panel — appears to the right on hover
    const flyout = isFlyout ? (
      <div
        className={cn(
          'absolute left-full top-0 z-50 ml-2',
          'hidden group-hover:flex flex-col',
          'w-52 rounded-xl border border-slate-200 bg-white shadow-xl py-2 px-1'
        )}
      >
        <div className="px-3 pb-1.5 mb-1 border-b border-slate-100">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {item.title}
          </span>
        </div>
        {item.href === '/accounts' && <RecentAccountsList isCollapsed={false} />}
        {item.href === '/people' && <RecentPeopleList isCollapsed={false} />}
        <Link
          href={item.href}
          className="mt-1 mx-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50 hover:text-blue-700 transition-colors"
        >
          <ChevronRight className="h-3 w-3" />
          View all {item.title.toLowerCase()}
        </Link>
      </div>
    ) : null

    // Inline active sub-page indicator (only when on a sub-route, e.g. /accounts/123)
    const subPageIndicator =
      !isCollapsed && onSubPage ? (
        <div className="pl-9 pr-2 py-0.5">
          <div className="border-l-2 border-blue-200 pl-3">
            <div className="text-[10px] text-blue-500 font-medium truncate py-0.5">
              ↳ current page
            </div>
          </div>
        </div>
      ) : null

    const wrapper = (
      <div key={item.href} className="relative group">
        {linkRow}
        {flyout}
        {subPageIndicator}
      </div>
    )

    if (isCollapsed) {
      return (
        <CustomTooltip key={item.href} content={item.title} side="right">
          {wrapper}
        </CustomTooltip>
      )
    }

    return wrapper
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* ── Collapse/Expand — always in same position ── */}
      <div className={cn('mb-4 flex', isCollapsed ? 'justify-center' : '-mx-3')}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleCollapse(!isCollapsed)}
          className={cn(
            'text-slate-500 hover:bg-slate-100 gap-2',
            isCollapsed ? 'px-2' : 'w-full justify-start px-3'
          )}
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform duration-300', isCollapsed && 'rotate-180')}
          />
          {!isCollapsed && <span className="text-xs font-semibold">Collapse</span>}
        </Button>
      </div>

      {/* ── Search — stable height slot, fades out when collapsed ── */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isCollapsed ? 'h-0 opacity-0 mb-0' : 'mb-4 opacity-100'
        )}
      >
        <SidebarSearch
          onSearchChange={setSearchQuery}
          placeholder="Search menu…"
          isCollapsed={false}
        />
      </div>

      {/* ── Recent ── */}
      <UnifiedRecentSidebar isCollapsed={isCollapsed} searchQuery={searchQuery} />

      {/* ── Menu label — stable height slot ── */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isCollapsed ? 'h-0 opacity-0 mb-0' : 'h-5 mb-1 opacity-100'
        )}
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Menu
        </span>
      </div>

      {/* ── All nav items — always shown, never filtered ── */}
      <nav className="flex-1 space-y-0.5">
        {coloredNavItems.map((item) => renderNavItem(item))}
      </nav>
    </div>
  )
}
