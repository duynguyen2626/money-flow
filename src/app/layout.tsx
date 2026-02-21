import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { TooltipProvider } from '@/components/ui/custom-tooltip'
import { PageTransitionOverlay } from '@/components/navigation/page-transition-overlay'
import { AppLayoutV2 as AppLayout } from '@/components/moneyflow/app-layout-v2'
import { Toaster } from '@/components/ui/sonner'
import { BreadcrumbProvider } from '@/context/breadcrumb-context'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://money-flow-3.vercel.app'),
  title: 'Money Flow 3.0',
  description: 'Precision personal finance tracking with high-performance dashboards and Google Sheets sync.',
  icons: {
    icon: [
      { url: '/favicon.svg?v=6', type: 'image/svg+xml' },
      { url: '/icon.svg?v=6', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icon.svg?v=6', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    title: 'Money Flow 3.0',
    description: 'Precision personal finance tracking.',
    images: [{ url: '/og-image.png?v=5' }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full w-full overflow-hidden">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full w-full overflow-hidden flex flex-col bg-background font-sans`} suppressHydrationWarning>
        <PageTransitionOverlay />
        <TooltipProvider>
          <BreadcrumbProvider>
            <AppLayout>{children}</AppLayout>
          </BreadcrumbProvider>
          <Toaster position="top-right" richColors />
        </TooltipProvider>
        <div id="portal-root" suppressHydrationWarning />
        <div id="transition-root" suppressHydrationWarning />
      </body>
    </html>
  )
}
