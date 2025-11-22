1/2
Console Error

A param property was accessed directly with `params.id`. `params` is a Promise and must be unwrapped with `React.use()` before accessing its properties. Learn more: https://nextjs.org/docs/messages/sync-dynamic-apis
Call Stack
19

createConsoleError
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_7a8122d0._.js (2189:71)
handleConsoleError
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_7a8122d0._.js (2970:54)
console.error
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_7a8122d0._.js (3114:57)
warnForSyncAccess
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_094231d7._.js (1046:13)
Object.get
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_094231d7._.js (1026:21)
PeoplePageInner
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/src_0bbe6835._.js (4815:13)
Object.react_stack_bottom_frame
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (14816:24)
renderWithHooks
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (4645:24)
updateFunctionComponent
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (6106:21)
beginWork
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (6702:24)
runWithFiberInDEV
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (959:74)
performUnitOfWork
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (9556:97)
workLoopConcurrentByScheduler
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (9552:58)
renderRootConcurrent
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (9535:71)
performWorkOnRoot
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (9062:150)
performWorkOnRootViaSchedulerTask
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (10224:9)
MessagePort.performWorkUntilDeadline
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_a0e4c7b4._.js (2647:64)
PeopleDetailPage
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/src_0bbe6835._.js (5230:221)
ClientPageRoot
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_094231d7._.js (2202:50)

2/2
Runtime ReferenceError


useMemo is not defined
Call Stack
14

PeoplePageInner
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/src_0bbe6835._.js (4857:34)
Object.react_stack_bottom_frame
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (14816:24)
renderWithHooks
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (4645:24)
updateFunctionComponent
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (6106:21)
beginWork
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (6702:24)
runWithFiberInDEV
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (959:74)
performUnitOfWork
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (9556:97)
workLoopSync
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (9450:40)
renderRootSync
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (9434:13)
performWorkOnRoot
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (9099:47)
performWorkOnRootViaSchedulerTask
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_react-dom_1e674e59._.js (10224:9)
MessagePort.performWorkUntilDeadline
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_compiled_a0e4c7b4._.js (2647:64)
PeopleDetailPage
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/src_0bbe6835._.js (5230:221)
ClientPageRoot
file:///Users/namnguyen/Library/Mobile%20Documents/com~apple~CloudDocs/Github%20Nov25/money-flow-3/.next/dev/static/chunks/node_modules_next_dist_094231d7._.js (2202:50)