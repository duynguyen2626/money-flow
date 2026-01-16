📋 AGENT RESPONSE - CONFIRMATION & ANSWERS

=================================================================================
✅ CONFIRMATION: TÔI ĐÃ HIỂU RÕ REQUIREMENTS
=================================================================================

Volunteer Cashback Concept: ✓ CORRECT
    Normal Cashback:
        - User NHẬN tiền TỪ card company (Blue color)
        - Example: Mua 1M → Nhận 40k cashback
        - Data: cashback_mode = null or "normal"
    
    Volunteer Cashback:
        - User CHO tiền CHO friend (Green color)
        - Example: Mua voucher 6.3M → Bạn trả 6M → User hỗ trợ 300k
        - Data: cashback_mode = "voluntary"
        - Calculation: cashback_given = |amount| - |final_price|

Implementation Plan: ✓ APPROVED
    Step 1: Fetch volunteer data (group by person + month)
    Step 2: Create volunteer matrix component (person x month grid)
    Step 3: Add tab switcher (Cards | Volunteer)
    Step 4: Create volunteer transaction API
    Step 5: Update modal for dual mode

=================================================================================
💬 ANSWERS TO YOUR QUESTIONS
=================================================================================

QUESTION 1: TypeScript Types - Interface VolunteerData đặt ở đâu?
────────────────────────────────────────────────────────────────────────────────
ANSWER: Option A - Tạo file mới src/types/cashback.types.ts

    Reason:
        - Clean architecture, tách types ra riêng
        - Reusable cho nhiều components
        - Dễ maintain khi có thêm types

    File structure:
        src/
        ├── types/
        │   └── cashback.types.ts  ← TẠO FILE MỚI NÀY
        ├── components/
        │   └── cashback/
        │       ├── cashback-matrix-view.tsx (existing)
        │       └── cashback-volunteer-matrix-view.tsx (new)
        └── app/
            └── cashback/
                └── page.tsx

    Content của cashback.types.ts:
        // Types for NORMAL card cashback
        export interface CardCashbackData {
          cardId: string
          cardName: string
          year: number
          months: Array<{
            month: number
            totalSpend: number
            cashbackReceived: number
            cashbackRedeemed: number
            txCount: number
          }>
          cashbackGivenYearTotal: number
          cashbackRedeemedYearTotal: number
          annualFeeYearTotal: number
          netProfit: number
        }

        // Types for VOLUNTEER cashback
        export interface VolunteerCashbackData {
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

        // Type for month detail modal
        export interface MonthDetailModalProps {
          isOpen: boolean
          onClose: () => void
          mode: 'card' | 'volunteer'
          // For card mode
          cardId?: string
          cardName?: string
          // For volunteer mode
          personId?: string
          personName?: string
          // Common
          month: number
          year: number
        }

    Usage trong components:
        import { VolunteerCashbackData } from '@/types/cashback.types'

    ✅ TÔI SẼ TẠO FILE NÀY Ở STEP 1


QUESTION 2: Tabs Component - Confirm dùng @/components/ui/tabs?
────────────────────────────────────────────────────────────────────────────────
ANSWER: ✅ YES - Dùng @/components/ui/tabs (Radix UI)

    Import statement:
        import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

    Usage:
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

    Icons import:
        import { CreditCard, Users } from 'lucide-react'

    ✅ NẾU THIẾU, TÔI SẼ INSTALL:
        npx shadcn@latest add tabs


QUESTION 3: Color Coding - Confirm màu?
────────────────────────────────────────────────────────────────────────────────
ANSWER: ✅ CORRECT - Nhưng có chỉnh sửa nhỏ

    Cards View (Normal Cashback):
        - Color: Blue #3b82f6
        - Class: text-blue-600
        - Meaning: User RECEIVES money FROM card company
        - Apply to: Cashback received cells, totals

    Volunteer View:
        - Color: Green #10b981
        - Class: text-green-600
        - Meaning: User GIVES money TO friend
        - Apply to: Cashback given cells, totals

    Additional colors:
        - Red (text-red-600): Annual fee, negative values
        - Gray (text-muted-foreground/30): Zero/empty cells (-)
        - Muted background (bg-muted/50): Total rows

    Example từ volunteer matrix:
        // Non-zero cell (clickable)
        <TableCell className="text-right">
          <button className="text-green-600 hover:text-green-800 hover:underline">
            252,000đ
          </button>
        </TableCell>

        // Zero cell (not clickable)
        <TableCell className="text-right">
          <span className="text-muted-foreground/30">-</span>
        </TableCell>

        // Total row
        <TableRow className="font-bold bg-muted/50">
          <TableCell className="text-right text-green-600">
            1,152,000đ
          </TableCell>
        </TableRow>

    ✅ COLOR SCHEME CONFIRMED


QUESTION 4: Sample Data - Có volunteer transactions trong database không?
────────────────────────────────────────────────────────────────────────────────
ANSWER: ✅ YES - Có sẵn sample data (theo file bạn cung cấp)

    Sample transaction trong database:
        ID: 164dbd4e-772c-4733-bc42-60ae0656387e
        Date: 2026-01-01
        Amount: -6,300,000
        Final Price: -6,048,000
        Person ID: d419fd12-ad21-4dfa-8054-c6205f6d6b02
        Cashback Mode: "voluntary"
        Note: "Voucher TGDĐ 6.3"

    Expected result trong UI:
        Person: (Lookup from people table by person_id)
        Month: January 2026
        Cashback Given: 252,000 (= 6,300,000 - 6,048,000)

    Để test, tôi sẽ:
        1. Query database để xem có bao nhiêu volunteer transactions
        2. Verify person names từ people table
        3. Test với data này trước khi push

    Query test:
        SELECT 
          t.id,
          t.occurred_at,
          t.amount,
          t.final_price,
          t.cashback_mode,
          t.note,
          p.name as person_name,
          (ABS(t.amount::numeric) - ABS(t.final_price::numeric)) as cashback_given
        FROM transactions t
        LEFT JOIN people p ON t.person_id = p.id
        WHERE t.cashback_mode = 'voluntary'
          AND t.status = 'posted'
          AND EXTRACT(YEAR FROM t.occurred_at) = 2026
        ORDER BY t.occurred_at DESC

    ✅ KHÔNG CẦN TẠO SAMPLE DATA MỚI


=================================================================================
🚀 READY TO START - FINAL CONFIRMATION
=================================================================================

Implementation Checklist:
    ✅ Understood volunteer vs normal cashback concept
    ✅ 5-step plan approved
    ✅ TypeScript types location confirmed (src/types/cashback.types.ts)
    ✅ Tabs component confirmed (@/components/ui/tabs)
    ✅ Color coding confirmed (Blue for cards, Green for volunteer)
    ✅ Sample data exists in database

Files to CREATE:
    1. src/types/cashback.types.ts (NEW)
    2. src/components/cashback/cashback-volunteer-matrix-view.tsx (NEW)
    3. src/app/api/cashback/volunteer-transactions/route.ts (NEW)

Files to UPDATE:
    1. src/app/cashback/page.tsx (Add tabs, fetch volunteer data)
    2. src/components/cashback/month-detail-modal.tsx (Add dual mode support)

Commit Structure (5 commits):
    1. feat(cashback): add volunteer transaction data fetching
    2. feat(cashback): add volunteer cashback matrix view
    3. feat(cashback): add tab switcher for cards vs volunteer
    4. feat(cashback): add API endpoint for volunteer transactions
    5. feat(cashback): update modal to support volunteer mode

Verification Before Push:
    ✓ npm run type-check
    ✓ npm run lint
    ✓ npm run build
    ✓ Manual test: tabs work
    ✓ Manual test: volunteer data displays
    ✓ Manual test: modal opens with correct data

=================================================================================
⚡ STARTING IMPLEMENTATION NOW
=================================================================================

Step 1: Creating TypeScript types file...
    → Creating src/types/cashback.types.ts
    → Defining VolunteerCashbackData interface
    → Defining MonthDetailModalProps interface

Step 2: Creating volunteer data fetching logic...
    → Adding fetchVolunteerCashbackData() to src/app/cashback/page.tsx
    → Query transactions WHERE cashback_mode = 'voluntary'
    → Group by person_id + month
    → Calculate cashback_given per transaction

Step 3: Creating volunteer matrix view component...
    → Creating src/components/cashback/cashback-volunteer-matrix-view.tsx
    → Render Person x Month grid
    → Green color for cashback given
    → Clickable cells for details

Step 4: Adding tab switcher to main page...
    → Update src/app/cashback/page.tsx
    → Import Tabs components
    → Add activeTab state
    → Render both views conditionally

Step 5: Creating volunteer transaction API...
    → Creating src/app/api/cashback/volunteer-transactions/route.ts
    → GET endpoint with person_id, month, year params
    → Return transaction details with calculations

Step 6: Updating modal for dual mode...
    → Update src/components/cashback/month-detail-modal.tsx
    → Add mode prop
    → Conditional rendering for volunteer columns
    → Conditional API endpoint call

✅ ALL CLEAR - STARTING IMPLEMENTATION!

TÔI SẼ BẮT ĐẦU VỚI STEP 1 NGAY BÂY GIỜ.
NẾU CÓ VẤN ĐỀ GÌ TRONG QUÁ TRÌNH IMPLEMENT, TÔI SẼ BÁO CẠN NGAY LẬP TỨC.

=================================================================================
