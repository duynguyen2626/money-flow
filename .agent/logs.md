## Error Type
Build Error

## Error Message
Parsing ecmascript source code failed

## Build Output
./money-flow-3/src/components/accounts/v2/AccountRowV2.tsx:172:26
Parsing ecmascript source code failed
  170 |                             onEditTransaction, // Pass wrapper function
  171 |                             modalRefreshKey
> 172 |                         )}
      |                          ^
  173 |                     </td>
  174 |                 ))}
  175 |             </tr>

Unexpected token. Did you mean `{'}'}` or `&rbrace;`?

Import traces:
  Client Component Browser:
    ./money-flow-3/src/components/accounts/v2/AccountRowV2.tsx [Client Component Browser]
    ./money-flow-3/src/components/accounts/v2/AccountTableV2.tsx [Client Component Browser]
    ./money-flow-3/src/components/accounts/v2/AccountDirectoryV2.tsx [Client Component Browser]
    ./money-flow-3/src/components/accounts/v2/AccountDirectoryV2.tsx [Server Component]
    ./money-flow-3/src/app/accounts/v2/page.tsx [Server Component]

  Client Component SSR:
    ./money-flow-3/src/components/accounts/v2/AccountRowV2.tsx [Client Component SSR]
    ./money-flow-3/src/components/accounts/v2/AccountTableV2.tsx [Client Component SSR]
    ./money-flow-3/src/components/accounts/v2/AccountDirectoryV2.tsx [Client Component SSR]
    ./money-flow-3/src/components/accounts/v2/AccountDirectoryV2.tsx [Server Component]
    ./money-flow-3/src/app/accounts/v2/page.tsx [Server Component]

Next.js version: 16.0.10 (Turbopack)
