'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Intercepts internal link clicks → shows a centered loading overlay.
 * Hides automatically when the new page's pathname is rendered.
 */
export function NavigationProgress() {
  const [isNavigating, setIsNavigating] = useState(false)
  const pathname = usePathname()

  // New page has loaded — hide spinner
  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  // Intercept every anchor click that looks like an internal navigation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('http') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        anchor.target === '_blank'
      ) return

      // Skip if same page
      if (href === pathname || href === window.location.pathname) return

      setIsNavigating(true)
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [pathname])

  if (!isNavigating) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-[3px] border-slate-200 border-t-blue-500 animate-spin" />
        <span className="text-xs text-slate-400 font-medium tracking-wide">Loading…</span>
      </div>
    </div>
  )
}
