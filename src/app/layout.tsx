import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import NextTopLoader from 'nextjs-toploader';

import './globals.css'
import { TooltipProvider } from '@/components/ui/custom-tooltip'
import { AppLayout } from '@/components/moneyflow/app-layout'
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
      { url: '/favicon.ico?v=5', sizes: 'any' },
      { url: '/icon.svg?v=5', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icon.svg?v=5', type: 'image/svg+xml' },
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
        <NextTopLoader
          color="#2299DD"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #2299DD,0 0 5px #2299DD"
        />
        <TooltipProvider>
          <BreadcrumbProvider>
            <AppLayout>{children}</AppLayout>
          </BreadcrumbProvider>
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </body>
    </html>
  )
}

