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
import { useEffect } from 'react'
import { useBreadcrumbs } from '@/context/breadcrumb-context'

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
  const [navigatingItem, setNavigatingItem] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed

  const handleCollapse = (collapsed: boolean) => {
    setInternalCollapsed(collapsed)
    onCollapseChange?.(collapsed)
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
        {coloredNavItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            item={item}
            pathname={pathname}
            isCollapsed={isCollapsed}
            searchQuery={searchQuery}
            hoveredItem={hoveredItem}
            setHoveredItem={setHoveredItem}
            navigatingItem={navigatingItem}
            setNavigatingItem={setNavigatingItem}
          />
        ))}
      </nav>
    </div>
  )
}

import { createPortal } from 'react-dom'
import { useRef } from 'react'

type SidebarNavItemProps = {
  item: (typeof coloredNavItems)[0]
  pathname: string
  isCollapsed: boolean
  searchQuery: string
  hoveredItem: string | null
  setHoveredItem: (href: string | null) => void
  navigatingItem: string | null
  setNavigatingItem: (href: string | null) => void
}

function SidebarNavItem({
  item,
  pathname,
  isCollapsed,
  searchQuery,
  hoveredItem,
  setHoveredItem,
  navigatingItem,
  setNavigatingItem,
}: SidebarNavItemProps) {
  const linkRef = useRef<HTMLAnchorElement>(null)
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [flyoutPosition, setFlyoutPosition] = useState({ top: 0, left: 0 })
  const { customNames } = useBreadcrumbs()

  const isActive =
    item.href === '/'
      ? pathname === '/'
      : pathname === item.href || pathname.startsWith(item.href + '/')
  const isFlyout = FLYOUT_ITEMS.includes(item.href)

  // Highlight if search matches
  const isHighlighted =
    searchQuery.length > 0 &&
    (item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false))

  const onSubPage = isFlyout && pathname !== item.href && pathname.startsWith(item.href + '/')

  // Get dynamic title from breadcrumbs context if available
  const subPageTitle = customNames[pathname] || 'Details'

  useEffect(() => {
    if (hoveredItem === item.href && linkRef.current) {
      const rect = linkRef.current.getBoundingClientRect()
      setFlyoutPosition({
        top: rect.top,
        left: rect.right + 8,
      })
    }
  }, [hoveredItem, item.href])

  // Cleanup and container setup
  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
    }
  }, [])

  const handleMouseEnter = () => {
    if (isFlyout) {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
      setHoveredItem(item.href)
    }
  }

  const handleMouseLeave = () => {
    if (isFlyout) {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = setTimeout(() => {
        setHoveredItem(null)
      }, 400) // 400ms delay to move mouse to flyout
    }
  }

  const handleLinkClick = () => {
    setNavigatingItem(item.href)
    // Clear hover state immediately on click to prevent race conditions
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
    setHoveredItem(null)

    // Safety unlock after 3 seconds
    setTimeout(() => setNavigatingItem(null), 3000)
  }

  const itemColorClass = item.color === 'indigo' ? 'text-indigo-700' : 'text-blue-700'
  const itemBgClass = item.color === 'indigo' ? 'bg-indigo-50' : 'bg-blue-100'

  const linkRow = (
    <Link
      ref={linkRef}
      href={item.href}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleLinkClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 relative',
        isActive && !onSubPage
          ? `${itemBgClass} ${itemColorClass} shadow-sm`
          : isHighlighted
            ? 'bg-yellow-100 text-slate-800 ring-1 ring-yellow-300'
            : isActive
              ? `${itemColorClass} hover:bg-slate-50`
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <div className="flex-shrink-0 relative">
        <NavIcon icon={item.icon} color={item.color} size="md" />
        {/* Active Child Indicator for Collapsed Mode */}
        {isCollapsed && onSubPage && (
          <div className={cn(
            "absolute -top-1 -right-1 h-2 w-2 rounded-full border-2 border-white animate-pulse",
            item.color === 'indigo' ? "bg-indigo-500" : "bg-blue-500"
          )} />
        )}
      </div>
      {!isCollapsed && <span className="truncate flex-1">{item.title}</span>}
      {!isCollapsed && isFlyout && <ChevronRight className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />}
    </Link>
  )

  // Portal-based flyout
  const flyout =
    isFlyout && (hoveredItem === item.href || navigatingItem === item.href) && typeof document !== 'undefined'
      ? createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${flyoutPosition.top}px`,
            left: `${flyoutPosition.left}px`,
            zIndex: 10000,
          }}
          className={cn(
            'flex flex-col animate-in fade-in duration-200',
            'w-52 rounded-xl border border-slate-200 bg-white shadow-xl py-2 px-1'
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="px-3 pb-1.5 mb-1 border-b border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {item.title}
            </span>
          </div>
          {item.href === '/accounts' && <RecentAccountsList isCollapsed={false} onClick={handleLinkClick} />}
          {item.href === '/people' && <RecentPeopleList isCollapsed={false} onClick={handleLinkClick} />}
          <Link
            href={item.href}
            onClick={handleLinkClick}
            className="mt-1 mx-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50 hover:text-blue-700 transition-colors"
          >
            <ChevronRight className="h-3 w-3" />
            View all {item.title.toLowerCase()}
          </Link>
        </div>,
        document.body
      )
      : null

  const subPageIndicator =
    !isCollapsed && onSubPage ? (
      <div className="pl-9 pr-2 py-1">
        <div className={cn(
          "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-all shadow-sm",
          item.color === 'indigo' ? "bg-indigo-600 text-white" : "bg-blue-600 text-white"
        )}>
          <div className="text-[10px] font-bold truncate">
            ↳ {subPageTitle}
          </div>
          <div className="px-1.5 py-0.5 rounded bg-white/20 text-[8px] font-black uppercase tracking-tight whitespace-nowrap">
            {pathname.startsWith('/people') ? 'Person' : 'Account'}
          </div>
        </div>
      </div>
    ) : null

  const wrapper = (
    <div className="w-full">
      <div className="relative w-full">
        {linkRow}
        {flyout}
      </div>
      {subPageIndicator}
    </div>
  )

  if (isCollapsed) {
    return (
      <CustomTooltip content={item.title} side="right">
        {wrapper}
      </CustomTooltip>
    )
  }

  return wrapper
}
