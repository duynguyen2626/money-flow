1/3
## Error Type
Console Error

## Error Message
C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\server\chunks\ssr\93926_51a4f394._.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: Error: sourceMapURL could not be parsed


    at ServiceDetailPage (src\app\services\[id]\page.tsx:9:54)
    at ServiceDetailPage (<anonymous>:null:null)

## Code Frame
   7 |
   8 | export default async function ServiceDetailPage({ params }: { params: { id: string } }) {
>  9 |     const service: any = await getServiceById(params.id)
     |                                                      ^
  10 |     const people = await getPeople()
  11 |
  12 |     if (!service) {

Next.js version: 16.0.3 (Turbopack)

2/3
## Error Type
Console Error

## Error Message
C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\server\chunks\ssr\[root-of-the-server]__be030274._.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: Error: sourceMapURL could not be parsed


    at ServiceDetailPage (src\app\services\[id]\page.tsx:9:54)
    at ServiceDetailPage (<anonymous>:null:null)

## Code Frame
   7 |
   8 | export default async function ServiceDetailPage({ params }: { params: { id: string } }) {
>  9 |     const service: any = await getServiceById(params.id)
     |                                                      ^
  10 |     const people = await getPeople()
  11 |
  12 |     if (!service) {

Next.js version: 16.0.3 (Turbopack)
3/3
## Error Type
Runtime Error

## Error Message
{code: "22P02", details: Null, hint: ..., message: ...}

Next.js version: 16.0.3 (Turbopack)
