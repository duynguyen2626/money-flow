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
  Banknote
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
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const pathname = usePathname()

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
  }, [])

  const toggleSidebar = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState))
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
          "flex-none h-full flex-col border-r bg-card py-8 transition-all duration-300 z-20 shadow-sm overflow-y-auto hidden md:flex",
          sidebarCollapsed ? "w-16 px-2" : "w-64 px-6"
        )}
      >
        {/* Header / Logo Area */}
        <div suppressHydrationWarning className={cn("sticky top-0 z-50 flex items-center mb-8 bg-card/80 backdrop-blur-md py-4 -mt-4 transition-all", sidebarCollapsed ? "justify-center" : "justify-between")}>
          {!sidebarCollapsed && (
            <span className="text-xl font-bold text-slate-800 tracking-tight">
              {currentPageTitle}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-slate-500 hover:bg-slate-100"
          >
            {sidebarCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-2" suppressHydrationWarning>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  sidebarCollapsed && "justify-center px-2"
                )}
              >
                {item.icon}
                {!sidebarCollapsed && <span>{item.title}</span>}
              </Link>
            )

            return sidebarCollapsed ? (
              <CustomTooltip key={item.href} content={item.title} side="right">
                <div>{linkContent}</div>
              </CustomTooltip>
            ) : linkContent
          })}
        </nav>

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
      <main className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0 bg-slate-50">
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
        <div className="mx-auto w-full max-w-[1920px] px-4 sm:px-6 lg:px-8 flex-1 min-h-0 bg-white">
          {children}
        </div>
      </main>
    </div>
  )
}
