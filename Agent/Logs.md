1/2 ## Error Type
Console Error

## Error Message
C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\server\chunks\ssr\93926_51a4f394._.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: Error: sourceMapURL could not be parsed


    at Home (src\app\page.tsx:28:30)
    at Home (<anonymous>:null:null)

## Code Frame
  26 |   // Parse month/year from query params
  27 |   const now = new Date()
> 28 |   const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1
     |                              ^
  29 |   const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear()
  30 |
  31 |   const [stats, accounts, categories, people, shops] = await Promise.all([

Next.js version: 16.0.3 (Turbopack)
2/2 ## Error Type
Console Error

## Error Message
C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\server\chunks\ssr\[root-of-the-server]__dd3e640a._.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: Error: sourceMapURL could not be parsed


    at Home (src\app\page.tsx:28:30)
    at Home (<anonymous>:null:null)

## Code Frame
  26 |   // Parse month/year from query params
  27 |   const now = new Date()
> 28 |   const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1
     |                              ^
  29 |   const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear()
  30 |
  31 |   const [stats, accounts, categories, people, shops] = await Promise.all([

Next.js version: 16.0.3 (Turbopack)
