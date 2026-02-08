## Error Type
Console Error

## Error Message
React has detected a change in the order of Hooks called by RolloverDebtDialog. This will lead to bugs and errors if not fixed. For more information, read the Rules of Hooks: https://react.dev/link/rules-of-hooks

   Previous render            Next render
   ------------------------------------------------------
1. useState                   useState
2. useActionState             useActionState
3. useState                   useState
4. useState                   useState
5. undefined                  useEffect
   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^



    at createConsoleError (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_f5869406._.js:2189:71)
    at handleConsoleError (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_f5869406._.js:2970:54)
    at console.error (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_f5869406._.js:3114:57)
    at updateHookTypesDev (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:4612:25)
    at Object.useEffect (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:15221:13)
    at exports.useEffect (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_6182f83d._.js:1722:36)
    at RolloverDebtDialog (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/src_components_people_42dd1dda._.js:3578:342)
    at Object.react_stack_bottom_frame (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:14816:24)
    at renderWithHooks (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:4645:24)
    at updateFunctionComponent (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:6106:21)
    at beginWork (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:6702:24)
    at runWithFiberInDEV (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:959:74)
    at performUnitOfWork (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:9556:97)
    at workLoopConcurrentByScheduler (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:9552:58)
    at renderRootConcurrent (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:9535:71)
    at performWorkOnRoot (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:9062:150)
    at performWorkOnRootViaSchedulerTask (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:10224:9)
    at MessagePort.performWorkUntilDeadline (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_6182f83d._.js:2647:64)
    at TransactionControlBar (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/src_components_people_42dd1dda._.js:5161:398)
    at MemberDetailView (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/src_components_people_42dd1dda._.js:7068:385)
    at PeopleDetailContent (about://React/Server/file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/server/chunks/ssr/%5Broot-of-the-server%5D__97f906f5._.js?142:248:432)
    at PeopleDetailPage (about://React/Server/file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/server/chunks/ssr/%5Broot-of-the-server%5D__97f906f5._.js?13:196:432)

Next.js version: 16.0.10 (Turbopack)

## Error Type
Runtime Error

## Error Message
Rendered more hooks than during the previous render.


    at updateWorkInProgressHook (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:4759:23)
    at updateEffectImpl (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:5322:20)
    at Object.useEffect (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:15222:13)
    at exports.useEffect (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_6182f83d._.js:1722:36)
    at RolloverDebtDialog (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/src_components_people_42dd1dda._.js:3578:342)
    at Object.react_stack_bottom_frame (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:14816:24)
    at renderWithHooks (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:4645:24)
    at updateFunctionComponent (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:6106:21)
    at beginWork (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:6702:24)
    at runWithFiberInDEV (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:959:74)
    at performUnitOfWork (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:9556:97)
    at workLoopSync (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:9450:40)
    at renderRootSync (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:9434:13)
    at performWorkOnRoot (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:9099:47)
    at performWorkOnRootViaSchedulerTask (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_react-dom_8990ed71._.js:10224:9)
    at MessagePort.performWorkUntilDeadline (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/d6ff3_next_dist_compiled_6182f83d._.js:2647:64)
    at TransactionControlBar (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/src_components_people_42dd1dda._.js:5161:398)
    at MemberDetailView (file:///Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.next/dev/static/chunks/src_components_people_42dd1dda._.js:7068:385)
    at PeopleDetailContent (about://React/Server/file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/server/chunks/ssr/%5Broot-of-the-server%5D__97f906f5._.js?142:248:432)
    at PeopleDetailPage (about://React/Server/file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/server/chunks/ssr/%5Broot-of-the-server%5D__97f906f5._.js?13:196:432)

Next.js version: 16.0.10 (Turbopack)
