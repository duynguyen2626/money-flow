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
              <RootLayout>
                <html lang="en" suppressHydrationWarning={true} className="h-full w-f...">
                  <body className="geist_a715...">
                    <PageTransitionOverlay>
                    <TooltipProvider>
                      <TooltipProviderProvider scope={undefined} isOpenDelayedRef={{current:true}} delayDuration={700} ...>
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



    at throwOnHydrationMismatch (file://C:/Users/nam.thanhnguyen/Personal Project/money-flow-3/.next/dev/static/chunks/e474c_next_dist_compiled_react-dom_858b3af1._.js:3342:56)
    at beginWork (file://C:/Users/nam.thanhnguyen/Personal Project/money-flow-3/.next/dev/static/chunks/e474c_next_dist_compiled_react-dom_858b3af1._.js:6769:918)
    at runWithFiberInDEV (file://C:/Users/nam.thanhnguyen/Personal Project/money-flow-3/.next/dev/static/chunks/e474c_next_dist_compiled_react-dom_858b3af1._.js:959:74)
    at performUnitOfWork (file://C:/Users/nam.thanhnguyen/Personal Project/money-flow-3/.next/dev/static/chunks/e474c_next_dist_compiled_react-dom_858b3af1._.js:9556:97)
    at workLoopConcurrentByScheduler (file://C:/Users/nam.thanhnguyen/Personal Project/money-flow-3/.next/dev/static/chunks/e474c_next_dist_compiled_react-dom_858b3af1._.js:9552:58)
    at renderRootConcurrent (file://C:/Users/nam.thanhnguyen/Personal Project/money-flow-3/.next/dev/static/chunks/e474c_next_dist_compiled_react-dom_858b3af1._.js:9535:71)
    at performWorkOnRoot (file://C:/Users/nam.thanhnguyen/Personal Project/money-flow-3/.next/dev/static/chunks/e474c_next_dist_compiled_react-dom_858b3af1._.js:9062:150)
    at performWorkOnRootViaSchedulerTask (file://C:/Users/nam.thanhnguyen/Personal Project/money-flow-3/.next/dev/static/chunks/e474c_next_dist_compiled_react-dom_858b3af1._.js:10224:9)
    at MessagePort.performWorkUntilDeadline (file://C:/Users/nam.thanhnguyen/Personal Project/money-flow-3/.next/dev/static/chunks/e474c_next_dist_compiled_a0775dff._.js:2647:64)
    at aside (<anonymous>:null:null)
    at AppLayoutV2 (file://C:/Users/nam.thanhnguyen/Personal Project/money-flow-3/.next/dev/static/chunks/src_components_moneyflow_18aadbd0._.js:1145:326)
    at RootLayout (src\app\layout.tsx:52:13)

## Code Frame
  50 |         <TooltipProvider>
  51 |           <BreadcrumbProvider>
> 52 |             <AppLayout>
     |             ^
  53 |               <AppErrorBoundary>{children}</AppErrorBoundary>
  54 |             </AppLayout>
  55 |           </BreadcrumbProvider>

Next.js version: 16.0.10 (Turbopack)
## Error Type
Runtime TypeError

## Error Message
Cannot read properties of null (reading 'parentNode')

Next.js version: 16.0.10 (Turbopack)
