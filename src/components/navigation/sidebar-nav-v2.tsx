'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChevronRight, History, LayoutDashboard, Landmark, ArrowRightLeft, Hourglass, Tags, Users, Banknote, Database, Cloud, Undo2, Sparkles, Settings, Search, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CustomTooltip } from '@/components/ui/custom-tooltip'
import { coloredNavItems, NavIcon } from './nav-icon-system'
import { UnifiedRecentSidebar } from './unified-recent-sidebar'
import { SidebarSearch } from './sidebar-search'
import { RecentAccountsList } from './RecentAccountsList'
import { RecentPeopleList } from './RecentPeopleList'
import { useBreadcrumbs } from '@/context/breadcrumb-context'
import { createPortal } from 'react-dom'

// Items that show a hover flyout to the right instead of inline expansion
const FLYOUT_ITEMS = ['/accounts', '/people', '#recent']

type NavState = 'collapsed' | 'hover_expanded' | 'persistent_expanded'

type SidebarNavV2Props = {
  className?: string
  isCollapsed?: boolean // External state from layout (localStorage)
  onCollapseChange?: (collapsed: boolean) => void
}

export function SidebarNavV2({
  className,
  isCollapsed: externalPersistentCollapsed,
  onCollapseChange,
}: SidebarNavV2Props) {
  const pathname = usePathname()

  // Internal state machine
  const [navState, setNavState] = useState<NavState>(
    externalPersistentCollapsed === false ? 'persistent_expanded' : 'collapsed'
  )

  const [navigatingItem, setNavigatingItem] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Effectively expanded if not 'collapsed'
  const isExpanded = navState !== 'collapsed'
  // Prop-equivalent for legacy child components
  const isCollapsed = !isExpanded

  // Sync with external persistent state
  useEffect(() => {
    if (externalPersistentCollapsed === false) {
      setNavState('persistent_expanded')
    } else if (navState === 'persistent_expanded') {
      setNavState('collapsed')
    }
  }, [externalPersistentCollapsed])

  // Click outside to collapse persistent
  useEffect(() => {
    if (navState !== 'persistent_expanded') return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setNavState('collapsed')
        onCollapseChange?.(true)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [navState, onCollapseChange])

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (navState === 'persistent_expanded') {
      setNavState('collapsed')
      onCollapseChange?.(true)
    } else {
      setNavState('persistent_expanded')
      onCollapseChange?.(false)
    }
  }

  const handleMouseEnter = () => {
    if (navState === 'collapsed') {
      setNavState('hover_expanded')
    }
  }

  const handleMouseLeave = () => {
    if (navState === 'hover_expanded') {
      setNavState('collapsed')
    }
  }

  const handleSearchExpand = () => {
    setNavState('persistent_expanded')
    onCollapseChange?.(false)
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'flex flex-col h-full transition-all duration-300 ease-in-out',
        isExpanded ? 'w-64 px-6' : 'w-16 px-1',
        className
      )}
    >
      {/* ── Stabilize the trigger icon ── */}
      <div className="flex w-16 justify-center mb-6 pt-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleIconClick}
          className={cn(
            "h-10 w-10 rounded-xl transition-all duration-200",
            navState === 'persistent_expanded'
              ? "bg-blue-600 text-white shadow-lg hover:bg-blue-700"
              : "text-slate-500 hover:bg-slate-100"
          )}
        >
          <Menu className={cn("h-5 w-5 transition-transform", isExpanded && "rotate-90")} />
        </Button>
      </div>

      {/* ── Search — stable slot ── */}
      <div className={cn(
        "sticky top-0 z-10 mb-2 py-2 -mx-2 px-2 transition-all",
        isExpanded ? "bg-white z-20" : "bg-card/80 backdrop-blur-md"
      )}>
        <SidebarSearch
          onSearchChange={setSearchQuery}
          onExpand={handleSearchExpand}
          placeholder="Search menu…"
          isCollapsed={isCollapsed}
        />
      </div>

      {/* ── Recent as a Nav Item ── */}
      <nav className="space-y-0.5 mb-4 pb-4 border-b border-slate-100">
        <SidebarNavItem
          item={{
            title: "Recent",
            href: "#recent",
            icon: History,
            color: 'slate',
            description: 'Recent items'
          }}
          pathname={pathname}
          isCollapsed={isCollapsed}
          searchQuery={searchQuery}
          hoveredItem={hoveredItem}
          setHoveredItem={setHoveredItem}
          navigatingItem={navigatingItem}
          setNavigatingItem={setNavigatingItem}
        />
      </nav>

      {/* ── Main Nav Items ── */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto custom-scrollbar -mr-2 pr-2">
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
  const [mounted, setMounted] = useState(false)
  const { customNames } = useBreadcrumbs()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isActive =
    item.href === '/'
      ? pathname === '/'
      : pathname === item.href || pathname.startsWith(item.href + '/')
  const isFlyout = FLYOUT_ITEMS.includes(item.href)

  // Highlight if search matches (Exclude "Recent" as requested)
  const isHighlighted =
    item.href !== '#recent' &&
    searchQuery.length > 0 &&
    (item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false))

  const onSubPage = isFlyout && pathname !== item.href && pathname.startsWith(item.href + '/')
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
      }, 150)
    }
  }

  const handleLinkClick = () => {
    setNavigatingItem(item.href)
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
    setHoveredItem(null)
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

  const container = typeof document !== 'undefined' ? document.getElementById('portal-root') : null
  const flyout =
    isFlyout && (hoveredItem === item.href || navigatingItem === item.href) && container && mounted
      ? createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${flyoutPosition.top}px`,
            left: `${flyoutPosition.left}px`,
            zIndex: 600,
          }}
          className={cn(
            'flex flex-col animate-in fade-in slide-in-from-left-2 duration-200',
            'w-64 rounded-xl border border-slate-200 bg-white shadow-2xl py-2 px-1'
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          suppressHydrationWarning
        >
          <div className="px-3 pb-1.5 mb-1 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {item.title}
            </span>
            <NavIcon icon={item.icon} color={item.color} size="sm" />
          </div>

          <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
            {item.href === '#recent' && (
              <div className="py-1">
                <UnifiedRecentSidebar isCollapsed={false} searchQuery={searchQuery} />
              </div>
            )}
            {item.href === '/accounts' && <RecentAccountsList isCollapsed={false} onClick={handleLinkClick} />}
            {item.href === '/people' && <RecentPeopleList isCollapsed={false} onClick={handleLinkClick} />}
          </div>

          {item.href !== '#recent' && (
            <Link
              href={item.href}
              onClick={handleLinkClick}
              className="mt-1 mx-2 flex items-center gap-1.5 rounded-md px-2 py-2 text-[11px] text-slate-500 hover:bg-slate-50 hover:text-blue-700 transition-colors border-t border-slate-50"
            >
              <ChevronRight className="h-3 w-3" />
              View all {item.title.toLowerCase()}
            </Link>
          )}
        </div>,
        container
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
