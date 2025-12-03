1/2
## Error Type
Runtime Error

## Error Message
invalid input syntax for type integer: ""


    at updateServiceMembers (src\services\service-manager.ts:333:15)
    at  updateServiceMembersAction (src\actions\service-actions.ts:11:3)

## Code Frame
  331 |         console.error('Error inserting service members:', insertError)
  332 |
> 333 |         throw new Error(insertError.message)
      |               ^
  334 |
  335 |       }
  336 |

Next.js version: 16.0.3 (Turbopack)

2/2
## Error Type
Runtime i

## Error Message
Failed to connect to MetaMask


    at Object.connect (chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/scripts/inpage.js:1:58695)
    at async s (chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/scripts/inpage.js:1:56490)

Next.js version: 16.0.3 (Turbopack)
