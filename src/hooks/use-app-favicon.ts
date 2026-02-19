'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Color theme: Premium Gold #f59e0b, Blue #3b82f6
const THEME = {
    gold: '#f59e0b',
    goldDark: '#92400e',
    blue: '#3b82f6',
    slate: '#1e293b'
}

const ICONS: Record<string, string> = {
    dashboard: `<rect x="10" y="10" width="35" height="35" rx="4" fill="currentColor"/><rect x="55" y="10" width="35" height="35" rx="4" fill="currentColor" opacity="0.8"/><rect x="10" y="55" width="35" height="35" rx="4" fill="currentColor" opacity="0.8"/><rect x="55" y="55" width="35" height="35" rx="4" fill="currentColor" opacity="0.6"/>`,
    accounts: `<path d="M50 5 L10 30 L90 30 Z" fill="currentColor"/><rect x="15" y="35" width="15" height="40" fill="currentColor"/><rect x="42.5" y="35" width="15" height="40" fill="currentColor"/><rect x="70" y="35" width="15" height="40" fill="currentColor"/><rect x="5" y="80" width="90" height="15" rx="2" fill="currentColor"/>`,
    transactions: `<path d="M15 35 L45 35 L45 20 L85 50 L45 80 L45 65 L15 65 Z" fill="currentColor" opacity="0.9"/><path d="M85 35 L55 35 L55 20 L15 50 L55 80 L55 65 L85 65 Z" fill="currentColor" opacity="0.5"/>`,
    installments: `<path d="M20 10 L80 10 L80 30 C80 50 50 55 50 55 C50 55 20 50 20 30 Z M20 90 L80 90 L80 70 C80 50 50 45 50 45 C50 45 20 50 20 70 Z" fill="currentColor"/>`,
    categories: `<path d="M50 10 L85 10 L85 45 L40 90 L10 60 Z" fill="currentColor"/><circle cx="65" cy="30" r="8" fill="white"/>`,
    shops: `<path d="M10 30 L90 30 L95 50 L5 50 Z" fill="currentColor"/><rect x="15" y="50" width="70" height="40" fill="currentColor" opacity="0.8"/><path d="M30 30 Q 50 5 70 30" stroke="currentColor" stroke-width="8" fill="none"/>`,
    people: `<circle cx="35" cy="35" r="20" fill="currentColor"/><path d="M10 85 C10 65 60 65 60 85 Z" fill="currentColor" opacity="0.8"/><circle cx="75" cy="45" r="15" fill="currentColor" opacity="0.6"/><path d="M60 85 C60 70 90 70 90 85 Z" fill="currentColor" opacity="0.5"/>`,
    cashback: `<rect x="5" y="20" width="90" height="60" rx="8" fill="currentColor"/><circle cx="50" cy="50" r="20" stroke="white" stroke-width="4" fill="none"/><path d="M30 50 H70" stroke="white" stroke-width="4"/>`,
    batch: `<ellipse cx="50" cy="25" rx="40" ry="15" fill="currentColor"/><path d="M10 25 V75 C10 85 50 90 90 75 V25 C90 35 50 40 10 25" fill="currentColor" opacity="0.8"/><path d="M10 50 C10 60 50 65 90 50" stroke="white" stroke-width="2" fill="none" opacity="0.5"/>`,
    services: `<path d="M25 80 C10 80 5 70 5 60 C5 45 20 35 35 35 C40 20 60 15 75 25 C90 25 95 40 95 55 C95 75 80 80 75 80 Z" fill="currentColor"/>`,
    refunds: `<path d="M90 50 Q 90 90 50 90 Q 10 90 10 50 Q 10 10 50 10 L 50 30 L 85 0 L 50 -30 V -10 Q 0 -10 0 50 Q 0 110 50 110 Q 100 110 100 50 Z" fill="currentColor" transform="scale(0.8) translate(10, 10)"/>`,
    ai: `<path d="M50 5 L60 40 L95 50 L60 60 L50 95 L40 60 L5 50 L40 40 Z" fill="currentColor"/><path d="M20 15 L25 25 L35 20 L25 30 L30 45 L20 35 L10 40 L15 30 Z" fill="currentColor" opacity="0.6"/>`
}

export function useAppFavicon(isLoading: boolean) {
    const pathname = usePathname()

    useEffect(() => {
        // Priority 1: Loading Spinner
        if (isLoading) {
            const loadingSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" stroke="${THEME.blue}" stroke-width="10" fill="none" stroke-dasharray="160 100" opacity="0.8">
            <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="0.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="50" cy="50" r="28" fill="${THEME.gold}" stroke="${THEME.goldDark}" stroke-width="2" />
          <text x="50" y="60" font-size="32" font-weight="950" fill="white" text-anchor="middle" font-family="Arial">$</text>
        </svg>
      `
            const { cleanup } = updateFavicon(loadingSvg)
            return () => {
                cleanup()
            }
        }

        // Priority 2: Page specific icon
        let pageKey = 'dashboard'
        if (pathname) {
            if (pathname.includes('/accounts')) pageKey = 'accounts'
            else if (pathname.includes('/transactions')) pageKey = 'transactions'
            else if (pathname.includes('/installments')) pageKey = 'installments'
            else if (pathname.includes('/categories')) pageKey = 'categories'
            else if (pathname.includes('/shops')) pageKey = 'shops'
            else if (pathname.includes('/people')) pageKey = 'people'
            else if (pathname.includes('/cashback')) pageKey = 'cashback'
            else if (pathname.includes('/batch')) pageKey = 'batch'
            else if (pathname.includes('/services')) pageKey = 'services'
            else if (pathname.includes('/refunds')) pageKey = 'refunds'
            else if (pathname.includes('/settings/ai')) pageKey = 'ai'
        }

        const iconContent = ICONS[pageKey] || ICONS.dashboard
        const pageSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="${THEME.blue}">
        <rect width="100" height="100" rx="20" fill="#f8fafc"/>
        <g transform="translate(15, 15) scale(0.7)">
          ${iconContent}
        </g>
      </svg>
    `
        const { url, link, cleanup } = updateFavicon(pageSvg)

        return () => {
            cleanup()
        }
    }, [isLoading, pathname])
}

function updateFavicon(svg: string) {
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('link')
    link.rel = 'icon'
    link.href = url
    link.id = 'dynamic-favicon'

    // Remove existing favicons
    const existingIcons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
    existingIcons.forEach(icon => icon.parentNode?.removeChild(icon))

    document.head.appendChild(link)

    // Also update Apple Touch Icon
    const appleLink = document.createElement('link')
    appleLink.rel = 'apple-touch-icon'
    appleLink.href = url
    appleLink.id = 'dynamic-apple-icon'
    document.head.appendChild(appleLink)

    return {
        url,
        link,
        cleanup: () => {
            URL.revokeObjectURL(url)
            link.parentNode?.removeChild(link)
            appleLink.parentNode?.removeChild(appleLink)
        }
    }
}
