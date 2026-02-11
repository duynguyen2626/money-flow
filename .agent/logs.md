## Error Type
Runtime ReferenceError

## Error Message
onReset is not defined


    at onClick (src/components/transactions-v2/header/CycleFilterDropdown.tsx:79:27)
    at div (<anonymous>:null:null)
    at CycleFilterDropdown (src/components/transactions-v2/header/CycleFilterDropdown.tsx:76:23)
    at CycleFilterDropdown (src/components/transactions-v2/header/CycleFilterDropdown.tsx:75:21)
    at AccountDetailTransactions (src/components/accounts/v2/AccountDetailTransactions.tsx:594:29)
    at AccountDetailViewV2 (src/components/accounts/v2/AccountDetailViewV2.tsx:262:17)
    at AccountPage (src\app\accounts\[id]\page.tsx:112:9)

## Code Frame
  77 |                         onClick={(e) => {
  78 |                           e.stopPropagation()
> 79 |                           if (onReset) onReset()
     |                           ^
  80 |                           else onChange(undefined)
  81 |                         }}
  82 |                         className="hover:bg-slate-100 rounded p-1 transition-colors cursor-pointer group/reset"

Next.js version: 16.0.10 (Turbopack)

## Error Type
Console Error

## Error Message
Encountered two children with the same key, `Food & Drink`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.


    at span (<anonymous>:null:null)
    at <unknown> (src/components/accounts/v2/AccountDetailHeaderV2.tsx:444:93)
    at Array.map (<anonymous>:null:null)
    at <unknown> (src/components/accounts/v2/AccountDetailHeaderV2.tsx:443:115)
    at Array.map (<anonymous>:null:null)
    at <unknown> (src/components/accounts/v2/AccountDetailHeaderV2.tsx:437:84)
    at AccountDetailHeaderV2 (src/components/accounts/v2/AccountDetailHeaderV2.tsx:477:50)
    at AccountDetailViewV2 (src/components/accounts/v2/AccountDetailViewV2.tsx:248:13)
    at AccountPage (src\app\accounts\[id]\page.tsx:112:9)

## Code Frame
  442 |                                                                                     <div className="flex flex-wrap gap-1 mt-1">
  443 |                                                                                         {group.catIds.slice(0, 3).map((catId: string) => (
> 444 |                                                                                             <span key={catId} className="text-[8px] px-1 bg-slate-100 rounded text-slate-500 font-medium">{catId}</span>
      |                                                                                             ^
  445 |                                                                                         ))}
  446 |                                                                                         {group.catIds.length > 3 && (
  447 |                                                                                             <span className="text-[8px] text-slate-400 font-medium">+{group.catIds.length - 3}</span>

Next.js version: 16.0.10 (Turbopack)