## Error Type
Console Error

## Error Message
Encountered two children with the same key, `e0000000-0000-0000-0000-000000000001`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.


    at console.error (chrome-extension://iohjgamcilhbgmhbnllfolmkmmekfmci/injected-scripts/host-console-events.js:1:351565)
    at <unknown> (src/components/accounts/v2/AccountDetailHeaderV2.tsx:431:57)
    at Array.map (<anonymous>:null:null)
    at <unknown> (src/components/accounts/v2/AccountDetailHeaderV2.tsx:430:66)
    at AccountDetailHeaderV2 (src/components/accounts/v2/AccountDetailHeaderV2.tsx:449:38)
    at AccountDetailViewV2 (src/components/accounts/v2/AccountDetailViewV2.tsx:266:13)
    at AccountPage (src\app\accounts\[id]\page.tsx:112:9)

## Code Frame
  429 |                                                 <div className="flex items-center gap-2">
  430 |                                                     {displayCats.map((cat, idx) => (
> 431 |                                                         <React.Fragment key={cat.id}>
      |                                                         ^
  432 |                                                             <div className="flex items-center gap-1.5">
  433 |                                                                 <span className="text-[10px] font-black uppercase tracking-tight truncate max-w-[120px]">{cat.name}</span>
  434 |                                                                 {cat.mcc_codes && cat.mcc_codes.length > 0 && (

Next.js version: 16.0.10 (Turbopack)
## Error Type
Console Error

## Error Message
Encountered two children with the same key, `e0000000-0000-0000-0000-000000000001`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.


    at console.error (chrome-extension://iohjgamcilhbgmhbnllfolmkmmekfmci/injected-scripts/host-console-events.js:1:351565)
    at <unknown> (src/components/accounts/v2/AccountDetailHeaderV2.tsx:431:57)
    at Array.map (<anonymous>:null:null)
    at <unknown> (src/components/accounts/v2/AccountDetailHeaderV2.tsx:430:66)
    at AccountDetailHeaderV2 (src/components/accounts/v2/AccountDetailHeaderV2.tsx:449:38)
    at AccountDetailViewV2 (src/components/accounts/v2/AccountDetailViewV2.tsx:266:13)
    at AccountPage (src\app\accounts\[id]\page.tsx:112:9)

## Code Frame
  429 |                                                 <div className="flex items-center gap-2">
  430 |                                                     {displayCats.map((cat, idx) => (
> 431 |                                                         <React.Fragment key={cat.id}>
      |                                                         ^
  432 |                                                             <div className="flex items-center gap-1.5">
  433 |                                                                 <span className="text-[10px] font-black uppercase tracking-tight truncate max-w-[120px]">{cat.name}</span>
  434 |                                                                 {cat.mcc_codes && cat.mcc_codes.length > 0 && (

Next.js version: 16.0.10 (Turbopack)
## Error Type
Console Error

## Error Message
Encountered two children with the same key, `e0000000-0000-0000-0000-000000000001`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.


    at console.error (chrome-extension://iohjgamcilhbgmhbnllfolmkmmekfmci/injected-scripts/host-console-events.js:1:351565)
    at <unknown> (src/components/accounts/v2/AccountDetailHeaderV2.tsx:431:57)
    at Array.map (<anonymous>:null:null)
    at <unknown> (src/components/accounts/v2/AccountDetailHeaderV2.tsx:430:66)
    at AccountDetailHeaderV2 (src/components/accounts/v2/AccountDetailHeaderV2.tsx:449:38)
    at AccountDetailViewV2 (src/components/accounts/v2/AccountDetailViewV2.tsx:266:13)
    at AccountPage (src\app\accounts\[id]\page.tsx:112:9)

## Code Frame
  429 |                                                 <div className="flex items-center gap-2">
  430 |                                                     {displayCats.map((cat, idx) => (
> 431 |                                                         <React.Fragment key={cat.id}>
      |                                                         ^
  432 |                                                             <div className="flex items-center gap-1.5">
  433 |                                                                 <span className="text-[10px] font-black uppercase tracking-tight truncate max-w-[120px]">{cat.name}</span>
  434 |                                                                 {cat.mcc_codes && cat.mcc_codes.length > 0 && (

Next.js version: 16.0.10 (Turbopack)
