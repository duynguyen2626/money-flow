"use client"

import { Home, Receipt, Landmark, CreditCard, Wallet, Users } from "lucide-react"
import Link from "next/link"

import { SidebarNav, type NavItem } from "./sidebar-nav"

const navItems: NavItem[] = [
  { label: "Tong quan", href: "/", icon: Home },
  { label: "Tai khoan", href: "/accounts", icon: Wallet },
  { label: "So Giao dich", href: "/transactions", icon: Receipt },
  { label: "People", href: "/people", icon: Users },
  { label: "So No", href: "/debt", icon: Landmark },
  { label: "Cashback", href: "/cashback", icon: CreditCard },
]

type AppLayoutProps = {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r bg-white px-6 py-8">
        <div className="text-2xl font-bold text-blue-700 mb-10">Money Flow</div>
        <SidebarNav items={navItems} />
        <div className="mt-auto text-xs text-slate-400">
          <p>v3.0 dashboard</p>
          <p>Track cashflow, debts & more.</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between border-b bg-white px-4 py-4 md:px-8">
          <div>
            <p className="text-sm text-slate-500">Money Flow</p>
            <h1 className="text-xl font-semibold text-slate-900">Control Center</h1>
          </div>
          <Link
            href="/transactions"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            Ghi giao dich
          </Link>
        </header>

        <div className="flex-1 px-4 py-6 md:px-8">{children}</div>
      </div>
    </div>
  )
}
