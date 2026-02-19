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
    dashboard: `<path d="M5 5 H45 V45 H5 Z M55 5 H95 V45 H55 Z M5 55 H45 V95 H5 Z M55 55 H95 V95 H55 Z" fill="currentColor"/>`,
    accounts: ``, // Handled specifically to show money bag
    transactions: `<path d="M5 35 H55 V15 L95 50 L55 85 V65 H5 Z" fill="currentColor" opacity="0.9"/><path d="M95 35 H45 V15 L5 50 L45 85 V65 H95 Z" fill="currentColor" opacity="0.5"/>`,
    installments: `<rect x="15" y="5" width="70" height="90" rx="10" stroke="currentColor" stroke-width="8" fill="none"/><path d="M15 35 H85 M15 65 H85" stroke="currentColor" stroke-width="8"/>`,
    categories: `<path d="M10 10 H60 L90 40 L40 90 L10 60 Z" fill="currentColor"/><circle cx="45" cy="35" r="10" fill="white"/>`,
    shops: `<path d="M5 40 L95 40 L95 90 L5 90 Z" fill="currentColor"/><path d="M25 40 Q 50 5 75 40" stroke="currentColor" stroke-width="10" fill="none"/>`,
    people: `<circle cx="50" cy="35" r="25" fill="currentColor"/><path d="M10 95 C10 65 90 65 90 95 Z" fill="currentColor" opacity="0.8"/>`,
    cashback: `<rect x="5" y="20" width="90" height="60" rx="10" stroke="currentColor" stroke-width="8" fill="none"/><circle cx="50" cy="50" r="15" fill="currentColor"/>`,
    batch: `<path d="M10 20 C10 10 90 10 90 20 V80 C90 90 10 90 10 80 Z" fill="currentColor" opacity="0.8"/><ellipse cx="50" cy="20" rx="40" ry="10" fill="currentColor"/><path d="M10 45 Q 50 55 90 45" stroke="white" stroke-width="4" fill="none"/>`,
    services: `<path d="M25 85 C5 85 0 70 0 55 C0 35 25 25 40 25 C50 5 75 5 85 20 C100 20 100 45 100 60 C100 85 80 90 75 90 Z" fill="currentColor"/>`,
    refunds: `<path d="M90 50 Q 90 95 50 95 Q 10 95 10 50 Q 10 5 50 5 L 50 30 L 95 0 L 50 -30 V 0 Q 0 0 0 50 Q 0 115 50 115 Q 100 115 100 50 Z" fill="currentColor" transform="scale(0.85) translate(10, 5)"/>`,
    ai: `<path d="M50 0 L65 35 L100 50 L65 65 L50 100 L35 65 L0 50 L35 35 Z" fill="currentColor"/>`
}

export function useAppFavicon(isLoading: boolean, customIcon?: string) {
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
            return () => cleanup()
        }

        // Priority 2: Custom Image (Cloudinary Profile/Logo)
        if (customIcon) {
            const { cleanup } = updateFavicon(customIcon, true)
            return () => cleanup()
        }

        // Priority 3: Page specific icon
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

        // SPECIFIC REQUEST: Accounts page keeps the golden bag
        if (pageKey === 'accounts') {
            const { cleanup } = updateFavicon('/favicon.svg?v=6', true)
            return () => cleanup()
        }

        const iconContent = ICONS[pageKey] || ICONS.dashboard
        const pageSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="${THEME.blue}">
        <g transform="translate(5, 5) scale(0.9)">
          ${iconContent}
        </g>
      </svg>
    `
        const { cleanup } = updateFavicon(pageSvg)
        return () => cleanup()

    }, [isLoading, pathname, customIcon])
}

function updateFavicon(content: string, isUrl: boolean = false) {
    let url = content
    let isBlob = false

    if (!isUrl) {
        const blob = new Blob([content], { type: 'image/svg+xml' })
        url = URL.createObjectURL(blob)
        isBlob = true
    }

    const link = document.createElement('link')
    link.rel = 'icon'
    link.href = url
    link.id = 'dynamic-favicon'

    // Apple Touch Icon support
    const appleLink = document.createElement('link')
    appleLink.rel = 'apple-touch-icon'
    appleLink.href = url
    appleLink.id = 'dynamic-apple-icon'

    // Remove existing favicons SAFELY
    const existingIcons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
    existingIcons.forEach(icon => {
        if (icon.parentNode) {
            icon.parentNode.removeChild(icon)
        }
    })

    document.head.appendChild(link)
    document.head.appendChild(appleLink)

    return {
        cleanup: () => {
            if (isBlob) URL.revokeObjectURL(url)
            if (link.parentNode) link.parentNode.removeChild(link)
            if (appleLink.parentNode) appleLink.parentNode.removeChild(appleLink)
        }
    }
}
