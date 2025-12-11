1. ## Error Type
Recoverable Error

## Error Message
Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch

  ...
    <DevRootHTTPAccessFallbackBoundary>
      <HTTPAccessFallbackBoundary notFound={<NotAllowedRootHTTPFallbackError>}>
        <HTTPAccessFallbackErrorBoundary pathname="/accounts" notFound={<NotAllowedRootHTTPFallbackError>} ...>
          <RedirectBoundary>
            <RedirectErrorBoundary router={{...}}>
              <Head>
              <__next_root_layout_boundary__>
                <SegmentViewNode type="layout" pagePath="/money-flo...">
                  <SegmentTrieNode>
                  <link>
                  <script>
                  <script>
                  <script>
                  <RootLayout>
                    <html lang="en" suppressHydrationWarning={true} className="h-full w-f...">
                      <body className="geist_a715..." suppressHydrationWarning={true}>
                        <TooltipProvider>
                          <TooltipProviderProvider scope={undefined} isOpenDelayedRef={{current:true}} ...>
                            <AppLayout>
                              <div className="flex h-ful..." suppressHydrationWarning={true}>
+                               <aside
+                                 suppressHydrationWarning={true}
+                                 className="flex-none h-full flex-col border-r bg-card py-8 transition-all duration-3..."
+                               >
                                ...
                            ...
              ...



    at aside (<anonymous>:null:null)
    at AppLayout (src/components/moneyflow/app-layout.tsx:74:7)
    at RootLayout (src\app\layout.tsx:37:11)

## Code Frame
  72 |   return (
  73 |     <div className="flex h-full w-full overflow-hidden" suppressHydrationWarning>
> 74 |       <aside
     |       ^
  75 |         suppressHydrationWarning
  76 |         className={cn(
  77 |           "flex-none h-full flex-col border-r bg-card py-8 transition-all duration-300 z-20 shadow-sm overflow-y-auto hidden md:flex",

Next.js version: 16.0.7 (Turbopack)
2. ## Error Type
Runtime ReferenceError

## Error Message
balance is not defined


    at renderDataSection (src/components/moneyflow/account-card.tsx:289:13)
    at AccountCardComponent (src/components/moneyflow/account-card.tsx:434:12)
    at <unknown> (src/components/moneyflow/account-list.tsx:360:19)
    at Array.map (<anonymous>:null:null)
    at <unknown> (src/components/moneyflow/account-list.tsx:359:35)
    at Array.map (<anonymous>:null:null)
    at AccountList (src/components/moneyflow/account-list.tsx:344:20)
    at AccountsPage (src\app\accounts\page.tsx:147:9)

## Code Frame
  287 |           <div className={cn(
  288 |             "text-2xl font-bold tracking-tight whitespace-nowrap",
> 289 |             balance < 0 ? "text-red-600" : "text-slate-900"
      |             ^
  290 |           )}>
  291 |             {formatCurrency(balance)}
  292 |           </div>

Next.js version: 16.0.7 (Turbopack)
