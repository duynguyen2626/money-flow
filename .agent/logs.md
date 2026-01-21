## Error Type
Console Error

## Error Message
React does not recognize the `indicatorClassName` prop on a DOM element. If you intentionally want it to appear in the DOM as a custom attribute, spell it as lowercase `indicatorclassname` instead. If you accidentally passed it from a parent component, remove it from the DOM element.


    at div (<anonymous>:null:null)
    at Progress (src/components/ui/progress.tsx:18:5)
    at renderCell (src/components/accounts/v2/AccountRowV2.tsx:329:25)
    at <unknown> (src/components/accounts/v2/AccountRowV2.tsx:120:26)
    at Array.map (<anonymous>:null:null)
    at AccountRowV2 (src/components/accounts/v2/AccountRowV2.tsx:115:33)
    at <unknown> (src/components/accounts/v2/AccountTableV2.tsx:183:53)
    at Array.map (<anonymous>:null:null)
    at <unknown> (src/components/accounts/v2/AccountTableV2.tsx:177:61)
    at Array.map (<anonymous>:null:null)
    at AccountTableV2 (src/components/accounts/v2/AccountTableV2.tsx:164:45)
    at AccountDirectoryV2 (src/components/accounts/v2/AccountDirectoryV2.tsx:177:21)
    at AccountsV2Page (src\app\accounts\v2\page.tsx:36:17)

## Code Frame
  16 |
  17 |   return (
> 18 |     <div
     |     ^
  19 |       role="progressbar"
  20 |       aria-valuenow={value}
  21 |       aria-valuemin={0}

Next.js version: 16.0.10 (Turbopack)
