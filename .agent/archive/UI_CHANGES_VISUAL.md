## Updated Account Detail Header - UI Changes

### Layout Before
```
[Back] [Avatar] [Name] [Status] [Type]   [Limit] [Available] [Balance]   [Cashback Goal Card that overflows...]
[Quick][Income][Expense][Pay][Transfer][Lend][Settings][Pending][Expand/Collapse Button]
```

### Layout After  
```
[Back] [Avatar] [Name] [Status] [Type]   [Limit] [Available] [Balance]
                                                   [Open Details] [Settings] [Pending] [⌄]
─────────────────────────────────────────────────────────────────────────────
[Quick][Income][Expense][Pay][Transfer][Lend]
─────────────────────────────────────────────────────────────────────────────
Spending Target [Qualified/Need X]    Current/Target    Reward
█████████████░░░░░                    1,500,000/2,000,000  250,000
```

### Key Improvements

✅ **No Overflow**: Cashback goal separated, won't break layout  
✅ **Compact Controls**: Icon-only collapse (ChevronDown/ChevronUp)  
✅ **New Open Details**: ArrowUpRight button opens `/accounts/{id}?tab=cashback` in new tab  
✅ **V2 Transactions**: All quick add buttons use TransactionSlideV2  
✅ **English Labels**: "Spending Target" instead of "Mục tiêu"  
✅ **Better Mobile**: Wrapping prevents buttons from breaking layout on narrow screens  

### Button Styles
```
Quick    - Indigo (existing TransactionTrigger)
Income   - Green (new: opens V2 slide)
Expense  - Red (new: opens V2 slide)
Pay      - Amber (new: opens V2 slide for credit card)
Transfer - Blue (new: opens V2 slide for regular account)
Lend     - Purple (new: opens V2 slide)
Open →   - Slate (new: opens details in new tab)
⚙️        - Slate (existing: opens account settings)
```

### Component Props Added
```typescript
const [transactionSlideOpen, setTransactionSlideOpen] = useState(false)
const [transactionSlideInitialData, setTransactionSlideInitialData] = useState({})
```

### Imported Components
```typescript
import { TransactionSlideV2 } from '@/components/transaction/slide-v2/transaction-slide-v2'
```
