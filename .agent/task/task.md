AGENT TASK PART 2: Implement Volunteer Cashback Feature

=== CONTEXT ===
Part 1 Status: COMPLETED ✅
- Fixed CI/CD errors
- Implemented account filtering
- Added Annual Fee column
- Created transaction detail API

Part 2 Goal: Implement Volunteer Cashback system where users can manually share cashback with specific people at transaction level.

Current PR: https://github.com/rei6868/money-flow-3/pull/179
Branch: chore/handover-refine-people-ui

=== WHAT IS VOLUNTEER CASHBACK ===

Normal Cashback Flow:
    User buys item → Gets automatic cashback from card issuer → System tracks it
    Example: Buy 1M VND → Get 40k cashback (4% rate)
    Data: cashback_mode = "normal" or null

Volunteer Cashback Flow:
    User buys item for someone → Manually shares portion of cost → System tracks both original and final price
    Example: Buy voucher 6.3M for friend → Friend pays 6M → User absorbs 300k as "cashback given"
    Data: cashback_mode = "voluntary"

Key Difference:
    Normal: System calculates cashback FROM card company
    Volunteer: User manually GIVES discount/cashback TO other person

=== DATA STRUCTURE ===

Volunteer Transaction Sample:
{
  "id": "164dbd4e-772c-4733-bc42-60ae0656387e",
  "occurred_at": "2026-01-01 05:00:00+00",
  "amount": "-6300000.00",
  "type": "debt",
  "note": "Voucher TGDĐ 6.3",
  "account_id": "0e7fdcb9-7008-4dfc-8266-c17ceaaa443d",
  "person_id": "d419fd12-ad21-4dfa-8054-c6205f6d6b02",
  "cashback_share_percent": "0.0400",
  "cashback_share_fixed": null,
  "original_amount": null,
  "final_price": "-6048000.000000",
  "cashback_mode": "voluntary",
  "status": "posted"
}

Field Explanations:
    amount: Original price user paid (-6,300,000)
    final_price: Price after "cashback given" (-6,048,000)
    cashback_given: amount - final_price = 252,000 (user gave this to friend)
    cashback_share_percent: 0.04 = 4% share rate
    cashback_mode: "voluntary" = user manually sharing
    person_id: Who received the benefit (friend)

Calculation Logic:
    If cashback_mode === "voluntary":
        cashback_given = Math.abs(amount) - Math.abs(final_price)
        
        Example:
            amount = -6,300,000
            final_price = -6,048,000
            cashback_given = 6,300,000 - 6,048,000 = 252,000
            
    If cashback_mode === "normal" or null:
        cashback_received = Math.abs(amount) - Math.abs(final_price)
        
        Example:
            amount = -1,000,000
            final_price = -960,000
            cashback_received = 1,000,000 - 960,000 = 40,000

=== REQUIREMENTS ===

REQUIREMENT 1: Separate Volunteer Tab/View
Problem: Mixing volunteer and normal cashback in same dashboard is confusing
Solution: Create separate view for volunteer transactions

Option A: Tab switcher in dashboard header
    [Cards (Normal)] [Volunteer] tabs at top
    Click "Volunteer" → Show only volunteer transactions
    Click "Cards" → Show normal card cashback

Option B: Separate route
    /cashback → Normal card cashback
    /cashback/volunteer → Volunteer transactions
    
Recommendation: Use Option A (tabs) for better UX

UI Design:
    ┌────────────────────────────────────────────────┐
    │ Cashback Dashboard                             │
    │                                                │
    │ [Cards]  [Volunteer]  ← Tabs                  │
    │ ──────                                         │
    │                                                │
    │ When "Volunteer" tab active:                  │
    │                                                │
    │ Person (Jan-Jun)    Jan    Feb    Mar    ...  │
    │ ────────────────────────────────────────────── │
    │ Tuấn                252k    -      100k   ...  │
    │ Nghĩa               -       500k   -      ...  │
    │ CLT                 -       -      300k   ...  │
    │                                                │
    │ TOTAL               252k   500k   400k   ...  │
    └────────────────────────────────────────────────┘

REQUIREMENT 2: Volunteer Data Fetching
Create new query to fetch volunteer transactions grouped by person + month

Database Query Logic:
    SELECT 
        person_id,
        people.name as person_name,
        EXTRACT(MONTH FROM occurred_at) as month,
        EXTRACT(YEAR FROM occurred_at) as year,
        SUM(ABS(amount) - ABS(final_price)) as cashback_given_total,
        COUNT(*) as transaction_count
    FROM transactions
    LEFT JOIN people ON transactions.person_id = people.id
    WHERE 
        cashback_mode = 'voluntary'
        AND EXTRACT(YEAR FROM occurred_at) = 2026
        AND status = 'posted'
    GROUP BY person_id, people.name, month, year
    ORDER BY people.name, month

Expected Output Structure:
    [
      {
        "personId": "d419fd12-ad21-4dfa-8054-c6205f6d6b02",
        "personName": "Tuấn",
        "year": 2026,
        "months": [
          { "month": 1, "cashbackGiven": 252000, "txCount": 1 },
          { "month": 3, "cashbackGiven": 100000, "txCount": 2 }
        ],
        "yearTotal": 352000
      },
      {
        "personId": "xxx",
        "personName": "Nghĩa",
        "year": 2026,
        "months": [
          { "month": 2, "cashbackGiven": 500000, "txCount": 3 }
        ],
        "yearTotal": 500000
      }
    ]

REQUIREMENT 3: Volunteer Matrix View Component
Create new component: cashback-volunteer-matrix-view.tsx

Component Structure:
    interface VolunteerData {
      personId: string
      personName: string
      year: number
      months: Array<{
        month: number
        cashbackGiven: number
        txCount: number
      }>
      yearTotal: number
    }

    function CashbackVolunteerMatrixView({ 
      data, 
      year 
    }: { 
      data: VolunteerData[]
      year: number 
    }) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              {months.map(m => (
                <TableHead key={m} className="text-right">{m}</TableHead>
              ))}
              <TableHead className="text-right font-bold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(person => (
              <TableRow key={person.personId}>
                <TableCell className="font-medium">
                  {person.personName}
                </TableCell>
                {months.map((_, idx) => {
                  const monthData = person.months.find(m => m.month === idx + 1)
                  return (
                    <TableCell key={idx} className="text-right">
                      {monthData ? (
                        <button
                          onClick={() => openTransactionModal(
                            person.personId, 
                            idx + 1, 
                            year
                          )}
                          className="text-green-600 hover:text-green-800 hover:underline"
                        >
                          {formatCurrency(monthData.cashbackGiven)}
                        </button>
                      ) : (
                        <span className="text-muted-foreground/30">-</span>
                      )}
                    </TableCell>
                  )
                })}
                <TableCell className="text-right font-bold text-green-600">
                  {formatCurrency(person.yearTotal)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold bg-muted/50">
              <TableCell>TOTAL</TableCell>
              {months.map((_, idx) => {
                const monthTotal = data.reduce((sum, p) => {
                  const m = p.months.find(m => m.month === idx + 1)
                  return sum + (m?.cashbackGiven || 0)
                }, 0)
                return (
                  <TableCell key={idx} className="text-right">
                    {monthTotal > 0 ? formatCurrency(monthTotal) : '-'}
                  </TableCell>
                )
              })}
              <TableCell className="text-right text-green-600">
                {formatCurrency(data.reduce((sum, p) => sum + p.yearTotal, 0))}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
    }

REQUIREMENT 4: Tab Switcher Component
Update main cashback page to include tab switcher

File: src/app/cashback/page.tsx

Add state for active tab:
    const [activeTab, setActiveTab] = useState<'cards' | 'volunteer'>('cards')

Fetch both datasets:
    // Existing card data fetch (already done in Part 1)
    const cardData = await fetchCardCashbackData(year)
    
    // NEW: Volunteer data fetch
    const volunteerData = await fetchVolunteerCashbackData(year)

UI Layout:
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Cashback Dashboard</h1>
        <YearSelector value={year} onChange={setYear} />
      </div>
      
      {/* Tab Switcher */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="cards">
            <CreditCard className="w-4 h-4 mr-2" />
            Cards (Normal)
          </TabsTrigger>
          <TabsTrigger value="volunteer">
            <Users className="w-4 h-4 mr-2" />
            Volunteer
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="cards">
          <CashbackMatrixView data={cardData} year={year} />
        </TabsContent>
        
        <TabsContent value="volunteer">
          <CashbackVolunteerMatrixView data={volunteerData} year={year} />
        </TabsContent>
      </Tabs>
    </div>

REQUIREMENT 5: Volunteer Transaction API
Create API endpoint to fetch volunteer transactions by person + month

File: src/app/api/cashback/volunteer-transactions/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const personId = searchParams.get('person_id')
  const month = searchParams.get('month')
  const year = searchParams.get('year')

  if (!personId || !month || !year) {
    return NextResponse.json(
      { error: 'Missing required parameters: person_id, month, year' },
      { status: 400 }
    )
  }

  try {
    const supabase = createClient()

    // Calculate date range
    const startDate = `${year}-${month.padStart(2, '0')}-01`
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`

    // Fetch volunteer transactions
    const { data, error } = await supabase
      .from('transactions')
      .select('id, occurred_at, note, amount, final_price, cashback_share_percent')
      .eq('person_id', personId)
      .eq('cashback_mode', 'voluntary')
      .gte('occurred_at', startDate)
      .lte('occurred_at', endDate)
      .eq('status', 'posted')
      .order('occurred_at', { ascending: false })

    if (error) throw error

    // Calculate cashback given for each transaction
    const transactions = data.map(tx => {
      const originalAmount = Math.abs(parseFloat(tx.amount))
      const finalPrice = tx.final_price ? Math.abs(parseFloat(tx.final_price)) : originalAmount
      const cashbackGiven = originalAmount - finalPrice

      return {
        id: tx.id,
        date: tx.occurred_at,
        note: tx.note,
        originalAmount: originalAmount,
        finalPrice: finalPrice,
        cashbackGiven: cashbackGiven,
        sharePercent: parseFloat(tx.cashback_share_percent || '0')
      }
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching volunteer transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch volunteer transactions' },
      { status: 500 }
    )
  }
}

REQUIREMENT 6: Volunteer Transaction Modal
Reuse existing month-detail-modal component but adapt for volunteer data

Update month-detail-modal.tsx to support both modes:

interface MonthDetailModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'card' | 'volunteer'
  // For card mode:
  cardId?: string
  cardName?: string
  // For volunteer mode:
  personId?: string
  personName?: string
  // Common:
  month: number
  year: number
}

function MonthDetailModal({ 
  isOpen, 
  onClose, 
  mode,
  cardId,
  cardName,
  personId,
  personName,
  month,
  year
}: MonthDetailModalProps) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchTransactions()
    }
  }, [isOpen, mode, cardId, personId, month, year])

  async function fetchTransactions() {
    setLoading(true)
    try {
      let url = ''
      if (mode === 'card') {
        url = `/api/cashback/transactions?card_id=${cardId}&month=${month}&year=${year}`
      } else {
        url = `/api/cashback/volunteer-transactions?person_id=${personId}&month=${month}&year=${year}`
      }
      
      const res = await fetch(url)
      const data = await res.json()
      setTransactions(data)
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const displayName = mode === 'card' ? cardName : personName
  const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'card' ? 'Card Transactions' : 'Volunteer Cashback'} - {displayName}
          </DialogTitle>
          <DialogDescription>
            {monthName} {year}
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found
          </div>
        ) : (
          <div className="overflow-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Note</TableHead>
                  {mode === 'volunteer' && (
                    <>
                      <TableHead className="text-right">Original</TableHead>
                      <TableHead className="text-right">Final</TableHead>
                    </>
                  )}
                  <TableHead className="text-right">
                    {mode === 'card' ? 'Amount' : 'You Gave'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx: any) => (
                  <tr key={tx.id} className="border-b hover:bg-muted/50">
                    <TableCell>{formatDate(tx.date)}</TableCell>
                    <TableCell>{tx.note}</TableCell>
                    {mode === 'volunteer' && (
                      <>
                        <TableCell className="text-right">
                          {formatCurrency(tx.originalAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(tx.finalPrice)}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(mode === 'card' ? tx.cashback : tx.cashbackGiven)}
                    </TableCell>
                  </tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

=== IMPLEMENTATION STEPS ===

STEP 1: Create Volunteer Data Fetching Function
File: src/app/cashback/page.tsx or src/lib/cashback-helpers.ts

async function fetchVolunteerCashbackData(year: number) {
  const supabase = createClient()
  
  // Fetch all volunteer transactions for the year
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      id,
      occurred_at,
      amount,
      final_price,
      person_id,
      people:person_id (
        id,
        name
      )
    `)
    .eq('cashback_mode', 'voluntary')
    .gte('occurred_at', `${year}-01-01`)
    .lte('occurred_at', `${year}-12-31`)
    .eq('status', 'posted')
    .order('occurred_at', { ascending: true })

  if (error) {
    console.error('Error fetching volunteer transactions:', error)
    return []
  }

  // Group by person and month
  const grouped = new Map<string, VolunteerData>()
  
  transactions.forEach(tx => {
    const personId = tx.person_id
    const personName = tx.people?.name || 'Unknown'
    const month = new Date(tx.occurred_at).getMonth() + 1
    const cashbackGiven = Math.abs(parseFloat(tx.amount)) - Math.abs(parseFloat(tx.final_price || tx.amount))
    
    if (!grouped.has(personId)) {
      grouped.set(personId, {
        personId,
        personName,
        year,
        months: [],
        yearTotal: 0
      })
    }
    
    const personData = grouped.get(personId)!
    const monthData = personData.months.find(m => m.month === month)
    
    if (monthData) {
      monthData.cashbackGiven += cashbackGiven
      monthData.txCount += 1
    } else {
      personData.months.push({
        month,
        cashbackGiven,
        txCount: 1
      })
    }
    
    personData.yearTotal += cashbackGiven
  })
  
  return Array.from(grouped.values()).sort((a, b) => 
    a.personName.localeCompare(b.personName)
  )
}

STEP 2: Create Volunteer Matrix View Component
File: src/components/cashback/cashback-volunteer-matrix-view.tsx

Copy full implementation from REQUIREMENT 3 above.
Add proper imports (Table, TableHeader, etc. from @/components/ui/table)
Add formatCurrency helper
Add modal state management

STEP 3: Update Main Cashback Page with Tabs
File: src/app/cashback/page.tsx

Import Tabs components from @/components/ui/tabs
Add tab state: useState<'cards' | 'volunteer'>('cards')
Fetch both card and volunteer data
Render tab switcher with both views

STEP 4: Create Volunteer Transaction API
File: src/app/api/cashback/volunteer-transactions/route.ts

Copy full implementation from REQUIREMENT 5 above
Test API endpoint manually:
  curl "http://localhost:3000/api/cashback/volunteer-transactions?person_id=xxx&month=1&year=2026"

STEP 5: Update Modal Component for Dual Mode
File: src/components/cashback/month-detail-modal.tsx

Add mode prop: 'card' | 'volunteer'
Add conditional rendering for volunteer columns
Update fetch logic to call correct API endpoint
Update table headers and cells based on mode

=== TESTING CHECKLIST ===

Manual Testing Steps:
1. Navigate to /cashback
2. Verify "Cards" tab is active by default
3. Click "Volunteer" tab
4. Verify volunteer data loads correctly
5. Verify person names display correctly
6. Verify monthly cashback given amounts show
7. Click on a non-zero cell
8. Verify modal opens with transaction list
9. Verify "Original", "Final", "You Gave" columns show
10. Verify calculations are correct:
    - You Gave = Original - Final
11. Close modal, switch back to "Cards" tab
12. Verify card data still works correctly

Data Validation:
- Check sample transaction:
    amount: -6,300,000
    final_price: -6,048,000
    Expected cashback_given: 252,000
- Verify this matches in UI

API Testing:
  GET /api/cashback/volunteer-transactions?person_id=d419fd12-ad21-4dfa-8054-c6205f6d6b02&month=1&year=2026
  
  Expected response:
    [
      {
        "id": "164dbd4e-772c-4733-bc42-60ae0656387e",
        "date": "2026-01-01T05:00:00.000Z",
        "note": "Voucher TGDĐ 6.3",
        "originalAmount": 6300000,
        "finalPrice": 6048000,
        "cashbackGiven": 252000,
        "sharePercent": 0.04
      }
    ]

=== EDGE CASES ===

Case 1: Person with no name
    If people.name is null, show "Unknown Person"

Case 2: No volunteer transactions
    Show empty state: "No volunteer cashback transactions found"

Case 3: Month with 0 transactions
    Show "-" in cell, not clickable

Case 4: Negative cashback given (error case)
    If cashbackGiven < 0, show red and flag as potential data error

Case 5: Multiple transactions in same month
    Sum all cashback given, show total in cell
    Modal shows individual transaction breakdown

=== COLOR CODING ===

Volunteer View Colors:
- Cashback Given cells: Green (#10b981) - user gave money
- Person names: Default text color
- Total row: Bold, muted background
- Zero cells: Muted/gray text

Distinction from Card View:
- Card view: Blue for cashback RECEIVED (from card company)
- Volunteer view: Green for cashback GIVEN (to friend)

=== COMMIT STRUCTURE ===

Commit 1: Create volunteer data fetching logic
    feat(cashback): add volunteer transaction data fetching
    
    - Create fetchVolunteerCashbackData function
    - Query transactions with cashback_mode='voluntary'
    - Group by person_id and month
    - Calculate cashback given (original - final)

Commit 2: Create volunteer matrix view component
    feat(cashback): add volunteer cashback matrix view
    
    - Create CashbackVolunteerMatrixView component
    - Display person x month grid
    - Show cashback given per person per month
    - Add clickable cells for transaction details

Commit 3: Add tab switcher to main page
    feat(cashback): add tab switcher for cards vs volunteer
    
    - Add Tabs component to cashback page
    - Switch between "Cards" and "Volunteer" views
    - Preserve data fetching for both modes

Commit 4: Create volunteer transaction API
    feat(cashback): add API endpoint for volunteer transactions
    
    - Create /api/cashback/volunteer-transactions route
    - Query by person_id, month, year
    - Return transaction details with cashback calculations

Commit 5: Update modal for dual mode support
    feat(cashback): update modal to support volunteer mode
    
    - Add mode prop to MonthDetailModal
    - Conditional rendering for volunteer columns
    - Fetch from correct API based on mode

=== NOTES ===

Backward Compatibility:
- Existing card cashback features must not break
- Normal transactions (cashback_mode = null or 'normal') unaffected
- Volunteer transactions are additive, not replacing

Performance:
- If volunteer transactions are large (>1000), consider:
    - Server-side grouping (SQL aggregation)
    - Pagination in API
    - Virtual scrolling for large person lists

Future Enhancements (NOT in this task):
- Filter by person
- Search transactions
- Export volunteer report
- Charts/graphs for volunteer trends
- Link volunteer transactions to receivables

Database Schema Note:
- No migration needed
- Using existing columns: cashback_mode, final_price, person_id
- All data already exists in transactions table

=== ACCEPTANCE CRITERIA ===

Feature is complete when:
✓ User can switch between "Cards" and "Volunteer" tabs
✓ Volunteer tab shows person x month matrix
✓ Cashback given amounts display correctly (green)
✓ Clicking cell opens modal with transaction details
✓ Modal shows Original, Final, You Gave columns
✓ API returns correct volunteer transactions
✓ Calculations match database values
✓ Card tab still works (no regression)
✓ All commits follow conventions
✓ Build passes with no errors
✓ No TypeScript or ESLint errors

=== END OF TASK PART 2 ===
