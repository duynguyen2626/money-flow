## Error Type
Console Error

## Error Message
C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\server\chunks\ssr\93926_51a4f394._.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: Error: sourceMapURL could not be parsed


    at CashbackPage (src\app\cashback\page.tsx:14:31)
    at CashbackPage (<anonymous>:null:null)

## Code Frame
  12 |     searchParams: { year?: string; view?: string };
  13 | }) {
> 14 |     const year = searchParams.year ? parseInt(searchParams.year) : new Date().getFullYear();
     |                               ^
  15 |     const viewMode = searchParams.view || 'credit'; // 'credit' or 'volunteer'
  16 |
  17 |     const { data, error } = await getCashbackMatrixData(year);

Next.js version: 16.0.10 (Turbopack)
## Error Type
Console Error

## Error Message
C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\server\chunks\ssr\[root-of-the-server]__67256422._.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: Error: sourceMapURL could not be parsed


    at CashbackPage (src\app\cashback\page.tsx:14:31)
    at CashbackPage (<anonymous>:null:null)

## Code Frame
  12 |     searchParams: { year?: string; view?: string };
  13 | }) {
> 14 |     const year = searchParams.year ? parseInt(searchParams.year) : new Date().getFullYear();
     |                               ^
  15 |     const viewMode = searchParams.view || 'credit'; // 'credit' or 'volunteer'
  16 |
  17 |     const { data, error } = await getCashbackMatrixData(year);

Next.js version: 16.0.10 (Turbopack)
