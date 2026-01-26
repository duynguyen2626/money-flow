## Error Type
Console Error

## Error Message
In HTML, <a> cannot be a descendant of <a>.
This will cause a hydration error.

  ...
    <div className="relative w..." style={{}}>
      <div>
      <div className="hidden md:..." style={{...}}>
        <table className="w-full cap..." onMouseUp={function handleCellMouseUp} onMouseLeave={function handleCellMouseUp}>
          <_c2>
          <_c4>
            <tbody ref={null} className={"[&_tr:la..."}>
              <_c8 className="border-b b...">
                <tr ref={null} className="border-b t...">
                  <_c12>
                  <_c12>
                  <_c12 onMouseDown={function onMouseDown} onMouseEnter={function onMouseEnter} className="border-r b..." ...>
                    <td ref={null} className={"p-2 alig..."} onMouseDown={function onMouseDown} ...>
                      <div className="flex items...">
                        <div className="flex-1 min...">
                          <RenderEntity name="Techcomban..." icon="https://im..." link="/accounts/..." badges={[...]} ...>
                            <LinkComponent href="/accounts/..." onClick={function onClick} target="_blank" ...>
>                             <a
>                               target="_blank"
>                               rel="noopener noreferrer"
>                               className="block w-full hover:bg-slate-50 rounded-sm transition-colors p-0.5 relative ..."
>                               ref={function}
>                               onClick={function onClick}
>                               onMouseEnter={function onMouseEnter}
>                               onTouchStart={function onTouchStart}
>                               href="/accounts/8d5bb150-d62e-4473-a00d-a8aee6a12331"
>                             >
                                <div className="flex items...">
                                  <div className="shrink-0 f...">
                                    <LinkComponent href="/accounts/..." onClick={function onClick} target="_blank" ...>
>                                     <a
>                                       target="_blank"
>                                       rel="noopener noreferrer"
>                                       ref={function}
>                                       onClick={function onClick}
>                                       onMouseEnter={function onMouseEnter}
>                                       onTouchStart={function onTouchStart}
>                                       href="/accounts/8d5bb150-d62e-4473-a00d-a8aee6a12331"
>                                     >
                                  ...
                        ...
                  ...
              ...



    at a (<anonymous>:null:null)
    at RenderEntity (src/components/moneyflow/unified-transaction-table.tsx:2267:35)
    at renderCell (src/components/moneyflow/unified-transaction-table.tsx:2588:31)
    at <unknown> (src/components/moneyflow/unified-transaction-table.tsx:2879:30)
    at Array.map (<anonymous>:null:null)
    at <unknown> (src/components/moneyflow/unified-transaction-table.tsx:2850:41)
    at Array.map (<anonymous>:null:null)
    at UnifiedTransactionTable (src/components/moneyflow/unified-transaction-table.tsx:1480:40)
    at UnifiedTransactionsPage (src/components/transactions/UnifiedTransactionsPage.tsx:548:17)
    at TransactionsPage (src\app\transactions\page.tsx:29:7)

## Code Frame
  2265 |                                 {leadingElement && <div className="shrink-0">{leadingElement}</div>}
  2266 |                                 {link ? (
> 2267 |                                   <Link href={link} onClick={(e) => e.stopPropagation()} target="_blank" rel="noopener noreferrer">
       |                                   ^
  2268 |                                     {renderAvatar(icon, name, isSquare)}
  2269 |                                   </Link>
  2270 |                                 ) : renderAvatar(icon, name, isSquare)}

Next.js version: 16.0.10 (Turbopack)
## Error Type
Console Error

## Error Message
<a> cannot contain a nested <a>.
See this log for the ancestor stack trace.


    at a (<anonymous>:null:null)
    at RenderEntity (src/components/moneyflow/unified-transaction-table.tsx:2315:31)
    at renderCell (src/components/moneyflow/unified-transaction-table.tsx:2588:31)
    at <unknown> (src/components/moneyflow/unified-transaction-table.tsx:2879:30)
    at Array.map (<anonymous>:null:null)
    at <unknown> (src/components/moneyflow/unified-transaction-table.tsx:2850:41)
    at Array.map (<anonymous>:null:null)
    at UnifiedTransactionTable (src/components/moneyflow/unified-transaction-table.tsx:1480:40)
    at UnifiedTransactionsPage (src/components/transactions/UnifiedTransactionsPage.tsx:548:17)
    at TransactionsPage (src\app\transactions\page.tsx:29:7)

## Code Frame
  2313 |                           if (link) {
  2314 |                             return (
> 2315 |                               <Link href={link} onClick={(e) => e.stopPropagation()} target="_blank" rel="noopener noreferrer" className="block w-full hover:bg-slate-50 rounded-sm transition-colors p-0.5 relative z-20">
       |                               ^
  2316 |                                 {Content}
  2317 |                               </Link>
  2318 |                             )

Next.js version: 16.0.10 (Turbopack)
