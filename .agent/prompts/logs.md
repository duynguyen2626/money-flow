## Error Type
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
    <HTTPAccessFallbackErrorBoundary pathname="/batch/mbb" notFound={<NotAllowedRootHTTPFallbackError>} ...>
      <RedirectBoundary>
        <RedirectErrorBoundary router={{...}}>
          <Head>
          <__next_root_layout_boundary__>
            <SegmentViewNode type="layout" pagePath="layout.tsx">
              <SegmentTrieNode>
              <link>
              <script>
              <script>
              <script>
              <script>
              <script>
              <script>
              <script>
              <script>
              <script>
              <script>
              <script>
              <script>
              <script>
              <script>
              <script>
              <script>
              <script>
              <script>
              <script>
              <script>
              <script>
              <script>
              <script>
              <RootLayout>
                <html lang="en" suppressHydrationWarning={true} className="h-full w-f...">
                  <body className="geist_a715..." suppressHydrationWarning={true}>
                    <TooltipProvider>
                      <TooltipProviderProvider scope={undefined} isOpenDelayedRef={{current:true}} delayDuration={700} ...>
                        <PageTransitionOverlay>
                        <BreadcrumbProvider>
                          <AppLayoutV2>
                            <div className="flex h-ful..." suppressHydrationWarning={true}>
+                             <aside
+                               suppressHydrationWarning={true}
+                               className="flex-none h-full flex-col border-r border-slate-200 bg-card transition-all ..."
+                             >
                              ...
                        ...
                    ...
          ...



    at aside (<anonymous>:null:null)
    at AppLayoutV2 (src/components/moneyflow/app-layout-v2.tsx:68:7)
    at RootLayout (src\app\layout.tsx:55:13)

## Code Frame
  66 |     <div className="flex h-full w-full overflow-hidden" suppressHydrationWarning>
  67 |       {/* Desktop Sidebar */}
> 68 |       <aside
     |       ^
  69 |         suppressHydrationWarning
  70 |         className={cn(
  71 |           "flex-none h-full flex-col border-r border-slate-200 bg-card transition-all duration-300 z-20 shadow-sm hidden md:flex overflow-visible",

Next.js version: 16.0.10 (Turbopack)
## Error Type
Runtime TypeError

## Error Message
Cannot read properties of null (reading 'parentNode')

Next.js version: 16.0.10 (Turbopack)
