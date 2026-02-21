'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

// Map pathname prefixes to friendly page names
function getPageName(path: string): string {
  if (path === '/') return 'Dashboard'
  const segments: Record<string, string> = {
    '/accounts': 'Accounts',
    '/transactions': 'Transactions',
    '/installments': 'Installments',
    '/categories': 'Categories',
    '/shops': 'Shops',
    '/people': 'People',
    '/cashback': 'Cashback',
    '/batch': 'Batches',
    '/services': 'Services',
    '/refunds': 'Refunds',
    '/settings': 'Settings',
    '/debt': 'Debt',
  }
  for (const [prefix, name] of Object.entries(segments)) {
    if (path === prefix || path.startsWith(prefix + '/')) return name
  }
  return 'Page'
}

import { createPortal } from 'react-dom'

/**
 * PageTransitionOverlay
 *
 * - Patches history.pushState to detect navigation start
 * - Shows a frosted overlay + spinner + target page name immediately
 * - Hides once the new pathname is committed by React
 * - setState is always deferred via setTimeout to avoid useInsertionEffect error
 */
export function PageTransitionOverlay() {
  const [targetPage, setTargetPage] = useState<string | null>(null)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const pathname = usePathname()
  const prevPathname = useRef(pathname)
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stable setter — deferred so it never runs inside React's commit phase
  const startNav = useCallback((pageName: string) => {
    if (startTimer.current) clearTimeout(startTimer.current)
    startTimer.current = setTimeout(() => setTargetPage(pageName), 0)
    if (safetyTimer.current) clearTimeout(safetyTimer.current)
    safetyTimer.current = setTimeout(() => setTargetPage(null), 10000)
  }, [])

  useEffect(() => {
    setPortalContainer(document.getElementById('transition-root') || document.body)

    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href^="/"]') as HTMLAnchorElement | null

      if (link && !e.defaultPrevented && link.target !== '_blank') {
        const href = link.getAttribute('href')
        if (href && href !== pathname) {
          startNav(getPageName(href))
        }
      }
    }

    document.addEventListener('click', handleLinkClick, true) // capture phase
    return () => {
      document.removeEventListener('click', handleLinkClick, true)
      if (safetyTimer.current) clearTimeout(safetyTimer.current)
      if (startTimer.current) clearTimeout(startTimer.current)
    }
  }, [pathname, startNav])

  // Hide once the new pathname is rendered by React
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      // Keep visible for a tiny bit up to 300ms
      const t = setTimeout(() => setTargetPage(null), 300)
      return () => clearTimeout(t)
    }
  }, [pathname])

  if (!targetPage || !portalContainer) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/75 backdrop-blur-sm pointer-events-all">
      <div className="flex flex-col items-center gap-5">
        {/* Spinner */}
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-[3px] border-slate-200" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-500 animate-spin" />
        </div>
        {/* Label */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-semibold text-slate-700">
            Opening {targetPage}
          </p>
          <p className="text-xs text-slate-400">Please wait…</p>
        </div>
      </div>
    </div>,
    portalContainer
  )
}
