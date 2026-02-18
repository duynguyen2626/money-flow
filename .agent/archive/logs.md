## Error Type
Console Error

## Error Message
In HTML, <div> cannot be a child of <tr>.
This will cause a hydration error.

  ...
    <SegmentViewNode type="page" pagePath="transactio...">
      <SegmentTrieNode>
      <TransactionsPage>
        <TagFilterProvider>
          <UnifiedTransactionsPage transactions={[...]} accounts={[...]} categories={[...]} people={[...]} shops={[...]}>
            <div className="flex flex-...">
              <div>
              <div className="flex-1 ove...">
                <div className="relative f...">
                  <div className="relative w..." style={{}}>
                    <div>
                    <div className="hidden md:..." style={{...}}>
                      <table className="w-full cap..." onMouseUp={function handleCellMouseUp} ...>
                        <_c2>
                        <_c4>
                          <tbody ref={null} className={"[&_tr:la..."}>
                            <_c8>
                            <_c8>
                            <_c8 className="border-b b...">
>                             <tr
>                               ref={null}
>                               className="border-b transition-colors hover:bg-slate-50 data-[state=selected]:bg-slate..."
>                             >
>                               <div
>                                 className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[1px] flex items-center j..."
>                               >
                                ...
                            ...
                    ...
              ...
    ...



    at createConsoleError (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_f5869406._.js:2189:71)
    at handleConsoleError (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_f5869406._.js:2970:54)
    at console.error (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_f5869406._.js:3114:57)
    at validateDOMNesting (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:1957:211)
    at completeWork (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:6931:25)
    at runWithFiberInDEV (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:959:74)
    at completeUnitOfWork (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:9621:23)
    at performUnitOfWork (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:9558:28)
    at workLoopSync (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:9450:40)
    at renderRootSync (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:9434:13)
    at performWorkOnRoot (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:9062:186)
    at performSyncWorkOnRoot (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:10232:9)
    at flushSyncWorkAcrossRoots_impl (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:10148:316)
    at processRootScheduleInMicrotask (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:10169:106)
    at <unknown> (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:10243:158)
    at div (<anonymous>:null:null)
    at <unknown> (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/src_components_moneyflow_4921158e._.js:7042:485)
    at Array.map (<anonymous>:null:null)
    at <unknown> (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/src_components_moneyflow_4921158e._.js:4555:106)
    at UnifiedTransactionsPage (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/src_components_ff26d44a._.js:1375:385)
    at TransactionsPage (about://React/Server/file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/server/chunks/ssr/%5Broot-of-the-server%5D__da10d692._.js?101:149:432)

Next.js version: 16.0.10 (Turbopack)

## Error Type
Console Error

## Error Message
<tr> cannot contain a nested <div>.
See this log for the ancestor stack trace.


    at createConsoleError (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_f5869406._.js:2189:71)
    at handleConsoleError (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_f5869406._.js:2970:54)
    at console.error (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_f5869406._.js:3114:57)
    at <unknown> (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:1959:21)
    at runWithFiberInDEV (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:959:74)
    at validateDOMNesting (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:1958:178)
    at completeWork (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:6931:25)
    at runWithFiberInDEV (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:959:74)
    at completeUnitOfWork (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:9621:23)
    at performUnitOfWork (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:9558:28)
    at workLoopSync (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:9450:40)
    at renderRootSync (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:9434:13)
    at performWorkOnRoot (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:9062:186)
    at performSyncWorkOnRoot (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:10232:9)
    at flushSyncWorkAcrossRoots_impl (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:10148:316)
    at processRootScheduleInMicrotask (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:10169:106)
    at <unknown> (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:10243:158)
    at tr (<anonymous>:null:null)
    at _c8 (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/src_components_ff26d44a._.js:209:768)
    at <unknown> (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/src_components_moneyflow_4921158e._.js:7039:412)
    at Array.map (<anonymous>:null:null)
    at <unknown> (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/src_components_moneyflow_4921158e._.js:4555:106)
    at UnifiedTransactionsPage (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/src_components_ff26d44a._.js:1375:385)
    at TransactionsPage (about://React/Server/file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/server/chunks/ssr/%5Broot-of-the-server%5D__da10d692._.js?101:149:432)

Next.js version: 16.0.10 (Turbopack)
