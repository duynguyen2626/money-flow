1/2
## Error Type
Console Error

## Error Message
A param property was accessed directly with `params.id`. `params` is a Promise and must be unwrapped with `React.use()` before accessing its properties. Learn more: https://nextjs.org/docs/messages/sync-dynamic-apis


    at CashbackDetailsPage (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/app/cashback/[id]/page.tsx:46:14)

## Code Frame
  44 |     }
  45 |     loadData()
> 46 |   }, [params.id])
     |              ^
  47 |
  48 |   if (loading) {
  49 |     return (

Next.js version: 16.0.3 (Turbopack)

2/2 ## Error Type
Console Error

## Error Message
A param property was accessed directly with `params.id`. `params` is a Promise and must be unwrapped with `React.use()` before accessing its properties. Learn more: https://nextjs.org/docs/messages/sync-dynamic-apis


    at loadData (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/app/cashback/[id]/page.tsx:35:60)
    at CashbackDetailsPage.useEffect (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/app/cashback/[id]/page.tsx:45:5)

## Code Frame
  33 |         // We use monthOffset=0 for current cycle. 
  34 |         // TODO: Add cycle selector in future to change offset
> 35 |         const cards = await getCashbackProgress(0, [params.id])
     |                                                            ^
  36 |         if (cards.length > 0) {
  37 |           setCardData(cards[0])
  38 |         }

Next.js version: 16.0.3 (Turbopack)
