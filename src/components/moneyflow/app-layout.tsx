"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Receipt,
  Users,
  CreditCard,
  Settings,
  Menu,
  ChevronLeft,
  ChevronDown,
  ArrowRightLeft,
  ShoppingBag,
  Layers,
  Calendar,
  Wrench,
  BookOpen,
  RefreshCw,
  Landmark,
  Hourglass,
  Tags,
  Wallet,
  Cloud,
  Database,
  Undo2,
  Banknote,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CustomTooltip } from "@/components/ui/custom-tooltip"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet"
import { RecentItems } from "@/components/navigation/RecentItems"
import { RecentPeopleList } from "@/components/navigation/RecentPeopleList"
import { RecentAccountsList } from "@/components/navigation/RecentAccountsList"
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs"
import { GlobalAI } from "@/components/ai/global-ai"
import { useAppFavicon } from "@/hooks/use-app-favicon"

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: <LayoutDashboard className="h-5 w-5" /> },
  { title: "Accounts", href: "/accounts", icon: <Landmark className="h-5 w-5" /> },
  { title: "Transactions", href: "/transactions", icon: <ArrowRightLeft className="h-5 w-5" /> },
  { title: "Installments", href: "/installments", icon: <Hourglass className="h-5 w-5" /> },
  { title: "Categories", href: "/categories", icon: <Tags className="h-5 w-5" /> },
  { title: "Shops", href: "/shops", icon: <ShoppingBag className="h-5 w-5" /> },
  { title: "People", href: "/people", icon: <Users className="h-5 w-5" /> },
  { title: "Cashback", href: "/cashback", icon: <Banknote className="h-5 w-5" /> },
  { title: "Batches", href: "/batch", icon: <Database className="h-5 w-5" /> },
  { title: "Services", href: "/services", icon: <Cloud className="h-5 w-5" /> },
  { title: "Refunds", href: "/refunds", icon: <Undo2 className="h-5 w-5" /> },
  { title: "AI Management", href: "/settings/ai", icon: <Sparkles className="h-5 w-5" /> },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [expandedHrefs, setExpandedHrefs] = useState<string[]>([])
  const [recentHrefs, setRecentHrefs] = useState<string[]>([])
  const pathname = usePathname()

  // Dynamic Favicon for Page Navigation
  useAppFavicon(false)

  // Track navigation usage
  useEffect(() => {
    if (!pathname) return

    // Find the matching nav item (main level)
    const matchingItem = navItems.find(item =>
      item.href === pathname || (item.href !== '/' && pathname.startsWith(item.href))
    )

    if (matchingItem && matchingItem.href !== '/') {
      const savedRecent = JSON.parse(localStorage.getItem("recent-nav-hrefs") || "[]") as string[]

      // Only update if it's not already at the top or content changed
      if (!savedRecent.includes(matchingItem.href) || savedRecent[0] !== matchingItem.href) {
        const updatedRecent = [matchingItem.href, ...savedRecent.filter(h => h !== matchingItem.href)].slice(0, 3)
        setRecentHrefs(updatedRecent)
        localStorage.setItem("recent-nav-hrefs", JSON.stringify(updatedRecent))
      }

      // Auto-expand if active
      if (!expandedHrefs.includes(matchingItem.href)) {
        setExpandedHrefs(prev => [...prev, matchingItem.href])
      }
    }
  }, [pathname, expandedHrefs])

  const currentPageTitle = useMemo(() => {
    if (!pathname) return "Money Flow 3"
    if (pathname === "/") return "Dashboard"

    const match = navItems.find((item) =>
      item.href !== "/" && (pathname === item.href || pathname.startsWith(`${item.href}/`))
    )

    return match?.title ?? "Money Flow 3"
  }, [pathname])

  // Load state from localStorage on mount (Client-side only)
  useEffect(() => {
    setIsMounted(true)
    const savedState = localStorage.getItem("sidebar-collapsed")
    if (savedState) {
      setIsCollapsed(JSON.parse(savedState))
    }

    const savedRecent = JSON.parse(localStorage.getItem("recent-nav-hrefs") || "[]") as string[]
    setRecentHrefs(savedRecent)

    // Initial expansion based on current path
    const matchingItem = navItems.find(item =>
      pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
    )
    if (matchingItem) {
      setExpandedHrefs([matchingItem.href])
    }
  }, [])

  const toggleSidebar = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState))
  }

  const toggleMenu = (href: string) => {
    setExpandedHrefs(prev =>
      prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]
    )
  }

  // Split nav items into Recent and Others
  const { recentItems, otherItems } = useMemo(() => {
    // Exclude Dashboard from dynamic lists since it's pinned at the top
    const navItemsToDistribute = navItems.slice(1)

    const recent = recentHrefs
      .map(href => navItemsToDistribute.find(item => item.href === href))
      .filter(Boolean) as NavItem[]

    const others = navItemsToDistribute.filter(item => !recentHrefs.includes(item.href))

    return { recentItems: recent, otherItems: others }
  }, [recentHrefs])

  const renderNavItem = (item: NavItem, isRecent: boolean = false) => {
    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
    const isPeople = item.href === '/people'
    const isAccounts = item.href === '/accounts'
    const hasSubmenu = isPeople || isAccounts
    const isExpanded = expandedHrefs.includes(item.href)

    const linkContent = (
      <div className="group/nav-item relative flex flex-col px-3">
        <div className="flex items-center">
          <Link
            href={item.href}
            onClick={() => {
              // Mark as used
              const savedRecent = JSON.parse(localStorage.getItem("recent-nav-hrefs") || "[]") as string[]
              if (!savedRecent.includes(item.href) || savedRecent[0] !== item.href) {
                const updatedRecent = [item.href, ...savedRecent.filter(h => h !== item.href)].slice(0, 3)
                setRecentHrefs(updatedRecent)
                localStorage.setItem("recent-nav-hrefs", JSON.stringify(updatedRecent))
              }

              // If it has submenu, we might want to toggle too
              if (hasSubmenu && !isExpanded) toggleMenu(item.href)
            }}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-300 flex-1",
              isActive
                ? "bg-blue-50 text-blue-700 shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              sidebarCollapsed && "justify-center px-2"
            )}
          >
            {item.icon}
            {!sidebarCollapsed && (
              <div className="flex items-center justify-between flex-1">
                <span>{item.title}</span>
                {hasSubmenu && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleMenu(item.href)
                    }}
                    className="p-1 hover:bg-slate-200/50 rounded-sm transition-colors"
                  >
                    <ChevronDown className={cn(
                      "h-3 w-3 text-slate-400 transition-transform duration-300",
                      isExpanded && "rotate-180"
                    )} />
                  </button>
                )}
              </div>
            )}
          </Link>
        </div>

        {/* Submenu Logic */}
        {!sidebarCollapsed && (
          <div className={cn(
            "transition-all duration-300 ease-in-out origin-top overflow-hidden",
            isExpanded ? "max-h-[300px] opacity-100 mt-1" : "max-h-0 opacity-0"
          )}>
            {isPeople && <RecentPeopleList isCollapsed={sidebarCollapsed} />}
            {isAccounts && <RecentAccountsList isCollapsed={sidebarCollapsed} />}
          </div>
        )}
      </div>
    )

    return sidebarCollapsed ? (
      <CustomTooltip key={item.href} content={item.title} side="right">
        <div>{linkContent}</div>
      </CustomTooltip>
    ) : (
      <div key={item.href}>{linkContent}</div>
    )
  }

  // Prevent hydration mismatch by using default state until mounted
  const sidebarCollapsed = isMounted ? isCollapsed : false

  // SSR/Hydration mismatch fix:
  // We explicitly removed the !isMounted placeholder because it causes a mismatch
  // with the server-rendered content (which includes the full sidebar).
  // The client must render the same structure initially.
  if (!isMounted) {
    return <div className="flex h-full w-full overflow-hidden" suppressHydrationWarning />
  }

  // Hide sidebar on login page
  if (pathname?.startsWith('/login')) {
    return (
      <main className="h-full w-full overflow-auto bg-background">
        {children}
      </main>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden" suppressHydrationWarning>
      <aside
        suppressHydrationWarning
        className={cn(
          "flex-none h-full flex-col border-r bg-card py-8 transition-all duration-300 z-20 shadow-sm overflow-y-auto custom-scrollbar hidden md:flex",
          sidebarCollapsed ? "w-16 px-1" : "w-64 px-6"
        )}
      >
        {/* Header / Logo Area */}
        <div suppressHydrationWarning className={cn("sticky top-0 z-50 flex items-center mb-6 bg-card/80 backdrop-blur-md py-4 -mt-4 transition-all", sidebarCollapsed ? "justify-center" : "px-0")}>
          {!sidebarCollapsed ? (
            <span className="text-xl font-bold text-slate-800 tracking-tight pl-2">
              {currentPageTitle}
            </span>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="text-slate-500 hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Toggle Sidebar Button & Pinned Dashboard */}
        <div className="space-y-4 mb-4">
          {!sidebarCollapsed && (
            <div className="px-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="w-full justify-start text-slate-500 hover:bg-slate-100 gap-2 px-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs font-semibold">Collapse Sidebar</span>
              </Button>
            </div>
          )}
          {renderNavItem(navItems[0])}
        </div>

        {/* Navigation Section: Recent */}
        {recentItems.length > 0 && (
          <div className="mb-6 space-y-2">
            {!sidebarCollapsed && (
              <div className="px-3 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Recent
                </span>
              </div>
            )}
            <div className="space-y-1">
              {recentItems.map(item => renderNavItem(item, true))}
            </div>
          </div>
        )}

        {/* Navigation Section: All */}
        <div className="flex-1 space-y-2" suppressHydrationWarning>
          {!sidebarCollapsed && recentItems.length > 0 && (
            <div className="px-3 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Menu
              </span>
            </div>
          )}
          {otherItems.map(item => renderNavItem(item))}
        </div>

        {/* Recent Items Section */}
        <RecentItems isCollapsed={sidebarCollapsed} />

        {/* Footer / User Area */}
        <div className="mt-auto pt-8 border-t" suppressHydrationWarning>
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3 px-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                U
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-700">User</span>
                <span className="text-xs text-slate-500">Admin</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                U
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0 bg-white">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2 text-slate-600">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex h-full flex-col bg-card py-6">
                  {/* Mobile Logo */}
                  <div className="flex items-center px-6 mb-8">
                    <span className="text-xl font-bold text-slate-800 tracking-tight">
                      {currentPageTitle}
                    </span>
                  </div>

                  {/* Mobile Nav */}
                  <nav className="flex-1 space-y-1 px-3">
                    {navItems.map((item) => {
                      const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-blue-50 text-blue-700"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          {item.icon}
                          <span>{item.title}</span>
                        </Link>
                      )
                    })}
                  </nav>

                  {/* Mobile Footer */}
                  <div className="mt-auto px-6 pt-6 border-t">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                        U
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">User</span>
                        <span className="text-xs text-slate-500">Admin</span>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <span className="text-lg font-bold text-slate-800">{currentPageTitle}</span>
          </div>
        </div>
        <Breadcrumbs />
        <div className="w-full flex-1 min-h-0 bg-white">
          {children}
        </div>
        <GlobalAI />
      </main >
    </div >
  )
}
