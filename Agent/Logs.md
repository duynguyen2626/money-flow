## Error Type
Console Error

## Error Message
Encountered two children with the same key, `eccde148-a84e-455f-ba96-c8aa0b149ac8`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.


    at span (<anonymous>:null:null)
    at <unknown> (src/components/moneyflow/transaction-form.tsx:3091:19)
    at Array.map (<anonymous>:null:null)
    at TransactionForm (src/components/moneyflow/transaction-form.tsx:3090:41)
    at AddTransactionDialog (src/components/moneyflow/add-transaction-dialog.tsx:253:15)
    at QuickAddChat (src/components/ai/quick-add-chat.tsx:1648:7)
    at DashboardContent (src/components/dashboard/dashboard-content.tsx:230:11)
    at Home (src\app\page.tsx:43:5)

## Code Frame
  3089 |               <div className="flex flex-wrap items-center gap-2">
  3090 |                 {splitExtraParticipants.map((participant) => (
> 3091 |                   <span
       |                   ^
  3092 |                     key={participant.personId}
  3093 |                     className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
  3094 |                   >

Next.js version: 16.0.10 (Turbopack)
## Error Type
Console Error

## Error Message
Encountered two children with the same key, `eccde148-a84e-455f-ba96-c8aa0b149ac8`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.


    at tr (<anonymous>:null:null)
    at <unknown> (src/components/moneyflow/split-bill-table.tsx:107:15)
    at Array.map (<anonymous>:null:null)
    at SplitBillTable (src/components/moneyflow/split-bill-table.tsx:106:27)
    at TransactionForm (src/components/moneyflow/transaction-form.tsx:3176:7)
    at AddTransactionDialog (src/components/moneyflow/add-transaction-dialog.tsx:253:15)
    at QuickAddChat (src/components/ai/quick-add-chat.tsx:1648:7)
    at DashboardContent (src/components/dashboard/dashboard-content.tsx:230:11)
    at Home (src\app\page.tsx:43:5)

## Code Frame
  105 |           <tbody className="divide-y divide-slate-100">
  106 |             {participants.map((row) => (
> 107 |               <tr key={row.personId} className="bg-white">
      |               ^
  108 |                 <td className="px-3 py-2 text-slate-800">{row.name}</td>
  109 |                 <td className="px-3 py-2">
  110 |                   <Input

Next.js version: 16.0.10 (Turbopack)
## Error Type
Console Error

## Error Message
Encountered two children with the same key, `eccde148-a84e-455f-ba96-c8aa0b149ac8`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.


    at div (<anonymous>:null:null)
    at <unknown> (src/components/moneyflow/split-bill-table.tsx:174:11)
    at Array.map (<anonymous>:null:null)
    at SplitBillTable (src/components/moneyflow/split-bill-table.tsx:173:23)
    at TransactionForm (src/components/moneyflow/transaction-form.tsx:3176:7)
    at AddTransactionDialog (src/components/moneyflow/add-transaction-dialog.tsx:253:15)
    at QuickAddChat (src/components/ai/quick-add-chat.tsx:1648:7)
    at DashboardContent (src/components/dashboard/dashboard-content.tsx:230:11)
    at Home (src\app\page.tsx:43:5)

## Code Frame
  172 |       <div className="space-y-3 md:hidden">
  173 |         {participants.map((row) => (
> 174 |           <div
      |           ^
  175 |             key={row.personId}
  176 |             className="rounded-lg border border-slate-200 bg-white p-3 space-y-2"
  177 |           >

Next.js version: 16.0.10 (Turbopack)
## Error Type
Console Error

## Error Message
Encountered two children with the same key, `eccde148-a84e-455f-ba96-c8aa0b149ac8`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.


    at span (<anonymous>:null:null)
    at <unknown> (src/components/moneyflow/transaction-form.tsx:3091:19)
    at Array.map (<anonymous>:null:null)
    at TransactionForm (src/components/moneyflow/transaction-form.tsx:3090:41)
    at AddTransactionDialog (src/components/moneyflow/add-transaction-dialog.tsx:253:15)
    at QuickAddChat (src/components/ai/quick-add-chat.tsx:1648:7)
    at DashboardContent (src/components/dashboard/dashboard-content.tsx:230:11)
    at Home (src\app\page.tsx:43:5)

## Code Frame
  3089 |               <div className="flex flex-wrap items-center gap-2">
  3090 |                 {splitExtraParticipants.map((participant) => (
> 3091 |                   <span
       |                   ^
  3092 |                     key={participant.personId}
  3093 |                     className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
  3094 |                   >

Next.js version: 16.0.10 (Turbopack)
## Error Type
Console Error

## Error Message
Encountered two children with the same key, `eccde148-a84e-455f-ba96-c8aa0b149ac8`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.


    at tr (<anonymous>:null:null)
    at <unknown> (src/components/moneyflow/split-bill-table.tsx:107:15)
    at Array.map (<anonymous>:null:null)
    at SplitBillTable (src/components/moneyflow/split-bill-table.tsx:106:27)
    at TransactionForm (src/components/moneyflow/transaction-form.tsx:3176:7)
    at AddTransactionDialog (src/components/moneyflow/add-transaction-dialog.tsx:253:15)
    at QuickAddChat (src/components/ai/quick-add-chat.tsx:1648:7)
    at DashboardContent (src/components/dashboard/dashboard-content.tsx:230:11)
    at Home (src\app\page.tsx:43:5)

## Code Frame
  105 |           <tbody className="divide-y divide-slate-100">
  106 |             {participants.map((row) => (
> 107 |               <tr key={row.personId} className="bg-white">
      |               ^
  108 |                 <td className="px-3 py-2 text-slate-800">{row.name}</td>
  109 |                 <td className="px-3 py-2">
  110 |                   <Input

Next.js version: 16.0.10 (Turbopack)
## Error Type
Console Error

## Error Message
Encountered two children with the same key, `eccde148-a84e-455f-ba96-c8aa0b149ac8`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.


    at div (<anonymous>:null:null)
    at <unknown> (src/components/moneyflow/split-bill-table.tsx:174:11)
    at Array.map (<anonymous>:null:null)
    at SplitBillTable (src/components/moneyflow/split-bill-table.tsx:173:23)
    at TransactionForm (src/components/moneyflow/transaction-form.tsx:3176:7)
    at AddTransactionDialog (src/components/moneyflow/add-transaction-dialog.tsx:253:15)
    at QuickAddChat (src/components/ai/quick-add-chat.tsx:1648:7)
    at DashboardContent (src/components/dashboard/dashboard-content.tsx:230:11)
    at Home (src\app\page.tsx:43:5)

## Code Frame
  172 |       <div className="space-y-3 md:hidden">
  173 |         {participants.map((row) => (
> 174 |           <div
      |           ^
  175 |             key={row.personId}
  176 |             className="rounded-lg border border-slate-200 bg-white p-3 space-y-2"
  177 |           >

Next.js version: 16.0.10 (Turbopack)
## Error Type
Console Error

## Error Message
Encountered two children with the same key, `eccde148-a84e-455f-ba96-c8aa0b149ac8`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.


    at span (<anonymous>:null:null)
    at <unknown> (src/components/moneyflow/transaction-form.tsx:3091:19)
    at Array.map (<anonymous>:null:null)
    at TransactionForm (src/components/moneyflow/transaction-form.tsx:3090:41)
    at AddTransactionDialog (src/components/moneyflow/add-transaction-dialog.tsx:253:15)
    at QuickAddChat (src/components/ai/quick-add-chat.tsx:1648:7)
    at DashboardContent (src/components/dashboard/dashboard-content.tsx:230:11)
    at Home (src\app\page.tsx:43:5)

## Code Frame
  3089 |               <div className="flex flex-wrap items-center gap-2">
  3090 |                 {splitExtraParticipants.map((participant) => (
> 3091 |                   <span
       |                   ^
  3092 |                     key={participant.personId}
  3093 |                     className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
  3094 |                   >

Next.js version: 16.0.10 (Turbopack)
## Error Type
Console Error

## Error Message
Encountered two children with the same key, `eccde148-a84e-455f-ba96-c8aa0b149ac8`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.


    at tr (<anonymous>:null:null)
    at <unknown> (src/components/moneyflow/split-bill-table.tsx:107:15)
    at Array.map (<anonymous>:null:null)
    at SplitBillTable (src/components/moneyflow/split-bill-table.tsx:106:27)
    at TransactionForm (src/components/moneyflow/transaction-form.tsx:3176:7)
    at AddTransactionDialog (src/components/moneyflow/add-transaction-dialog.tsx:253:15)
    at QuickAddChat (src/components/ai/quick-add-chat.tsx:1648:7)
    at DashboardContent (src/components/dashboard/dashboard-content.tsx:230:11)
    at Home (src\app\page.tsx:43:5)

## Code Frame
  105 |           <tbody className="divide-y divide-slate-100">
  106 |             {participants.map((row) => (
> 107 |               <tr key={row.personId} className="bg-white">
      |               ^
  108 |                 <td className="px-3 py-2 text-slate-800">{row.name}</td>
  109 |                 <td className="px-3 py-2">
  110 |                   <Input

Next.js version: 16.0.10 (Turbopack)
## Error Type
Console Error

## Error Message
Encountered two children with the same key, `eccde148-a84e-455f-ba96-c8aa0b149ac8`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.


    at div (<anonymous>:null:null)
    at <unknown> (src/components/moneyflow/split-bill-table.tsx:174:11)
    at Array.map (<anonymous>:null:null)
    at SplitBillTable (src/components/moneyflow/split-bill-table.tsx:173:23)
    at TransactionForm (src/components/moneyflow/transaction-form.tsx:3176:7)
    at AddTransactionDialog (src/components/moneyflow/add-transaction-dialog.tsx:253:15)
    at QuickAddChat (src/components/ai/quick-add-chat.tsx:1648:7)
    at DashboardContent (src/components/dashboard/dashboard-content.tsx:230:11)
    at Home (src\app\page.tsx:43:5)

## Code Frame
  172 |       <div className="space-y-3 md:hidden">
  173 |         {participants.map((row) => (
> 174 |           <div
      |           ^
  175 |             key={row.personId}
  176 |             className="rounded-lg border border-slate-200 bg-white p-3 space-y-2"
  177 |           >

Next.js version: 16.0.10 (Turbopack)
