EMERGENCY: TRANSACTION TABLE LAYOUT COMPLETELY BROKEN
Priority: CRITICAL - STOP ALL OTHER WORK
Date: 2026-01-12 07:45

========================================================================
CRITICAL ISSUES - FIX IMMEDIATELY IN THIS ORDER
========================================================================

ISSUE #1: COLUMN WIDTHS COMPLETELY WRONG
------------------------------------------
Current state: Flow column is TOO NARROW, causing text wrap chaos

MANDATORY COLUMN WIDTHS (DO NOT CHANGE):

Grid layout: 7 columns with FIXED widths

| Column      | Width     | CSS Class          |
|-------------|-----------|-------------------|
| Checkbox    | 40px      | w-10              |
| Date        | 80px      | w-20              |
| Details     | 280px     | w-70              |
| Flow        | 480px     | min-w-[480px]     |
| Base Amount | 180px     | w-45              |
| Net Amount  | 200px     | w-50              |
| Actions     | 120px     | w-30              |

Total width: ~1380px (requires horizontal scroll on small screens)

CRITICAL: Flow column MUST be 480px minimum. This is non-negotiable.
The cycle badges and entity names need this space.

Implementation (use CSS Grid):

```css
.transaction-row {
  display: grid;
  grid-template-columns: 40px 80px 280px 480px 180px 200px 120px;
  gap: 16px;
  align-items: center;
}
Or with Tailwind (preferred):

tsx
<div className="grid grid-cols-[40px_80px_280px_480px_180px_200px_120px] gap-4 items-center">
  {/* columns */}
</div>
ISSUE #2: SHOP ICONS IN NOTES COLUMN STILL ROUNDED
Current: Shop icons are circles (WRONG)
Target: Square with rounded corners

Shop icon in Details/Notes column MUST be:

tsx
<div className="w-10 h-10 rounded-md overflow-hidden bg-white border border-gray-200">
  <img 
    src={shop?.icon || category?.icon}
    alt="icon"
    className="w-full h-full object-contain"
  />
</div>
DO NOT USE:

rounded-full (this makes circles)

<<<<<<< HEAD
1. ✅ Fix TypeScript errors in paid-transactions-modal
2. ⏳ Verify build passes
3. ⏳ Test Paid modal functionality
4. ⏳ Locate and fix redundant counterparty names
5. ⏳ Verify Unpaid filter logic
### 7. Google Script Auto-Deploy
- [x] Auto-deploy `push-sheet.mjs` with `clasp deploy`
- [x] Environment variables configuration
- [x] Fix grey grid formatting in scripts

### 8. People Details UI Enhancements
- [x] Split Sheet button (Sync / Settings)
- [x] Styled Rollover/Debt/Repay buttons
- [x] Restored Refund Menu item
=======
rounded-lg (too round)

MUST USE:

rounded-md (6px radius, perfect for shop icons)

ISSUE #3: TARGET PERSON AVATAR STILL ROUNDED SQUARE
Current: Person avatars are rounded squares (WRONG)
Target: Perfect circles

Person avatar in Flow column MUST be:

tsx
<div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-600 flex-shrink-0">
  {person?.avatar ? (
    <img 
      src={person.avatar}
      alt={person.name}
      className="w-full h-full object-cover"
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-white text-sm font-semibold">
      {getInitials(person.name)}
    </div>
  )}
</div>
DO NOT USE:

rounded-md (this makes rounded squares)

rounded-lg (this makes rounded squares)

MUST USE:

rounded-full (perfect circle)

ISSUE #4: CYCLE BADGES WRAPPING/OVERLAPPING
Current: Cycle badges are wrapping and overlapping (caused by Flow
column being too narrow)

After fixing Flow column width to 480px, cycle badges should render
properly.

Cycle badge layout in Flow column:

tsx
<div className="flex flex-col gap-1 min-w-[200px]">
  {/* Source entity */}
  <div className="flex items-center gap-2">
    <img src={account.card_image} className="max-w-[64px]" />
    <div>
      <div className="font-medium">{account.name}</div>
      {cycleBadge && (
        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded mt-1">
          {cycleBadge}
        </span>
      )}
    </div>
  </div>

  {/* Arrow */}
  <div className="text-gray-400">→</div>

  {/* Target entity */}
  <div className="flex items-center gap-2">
    <div className="text-right">
      <div className="font-medium">{person.name}</div>
      {debtBadge && (
        <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded mt-1">
          {debtBadge}
        </span>
      )}
    </div>
    <div className="w-10 h-10 rounded-full ...">
      {/* person avatar */}
    </div>
  </div>
</div>
ISSUE #5: DUPLICATE "Back 4%" BADGE IN MIDDLE
Current: There's a stray "Back 4%" badge appearing between columns

This is likely from a previous implementation that wasn't removed.

Action required:

Search for ALL instances of "Back" badge rendering

Ensure ONLY ONE location renders it: Base Amount column

Remove any badges in Flow column or between columns

Verify no stray <span> tags with "Back" text

ISSUE #6: FILTER RESET ICON UGLY
Current: Reset icon on filter bar looks bad

Target: Clean icon button with hover state

tsx
<button 
  onClick={handleReset}
  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
  title="Reset filters"
>
  <svg 
    className="w-5 h-5 text-gray-600" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
    />
  </svg>
</button>
========================================================================
IMPLEMENTATION CHECKLIST - MUST COMPLETE ALL
Step 1: Fix Grid Layout
□ Change to CSS Grid with fixed column widths
□ Flow column = 480px minimum
□ Details column = 280px
□ Verify grid spans entire row width

Step 2: Fix Shop Icons
□ Find ALL shop icon renders in Details/Notes column
□ Change from rounded-full to rounded-md
□ Verify object-fit: contain
□ Check all transaction types (shopping, food, etc)

Step 3: Fix Person Avatars
□ Find ALL person avatar renders in Flow column
□ Change to rounded-full (remove rounded-md)
□ Verify circles on all screen sizes
□ Check fallback initials also use rounded-full

Step 4: Fix Cycle Badges
□ Verify Flow column width is 480px
□ Test cycle badges don't wrap
□ Verify spacing between source and target
□ Check arrow alignment

Step 5: Remove Duplicate Badges
□ Search codebase for "Back" string
□ Find duplicate badge render
□ Remove it completely
□ Verify only Base Amount column shows Back badge

Step 6: Fix Reset Icon
□ Replace current icon with SVG code above
□ Test hover state
□ Verify alignment with other filter buttons

========================================================================
CODE VERIFICATION
Before committing, verify these exact patterns exist:

Grid layout:
✓ grid-template-columns: 40px 80px 280px 480px 180px 200px 120px

Shop icon in Details:
✓ className includes "rounded-md"
✓ className DOES NOT include "rounded-full"

Person avatar in Flow:
✓ className includes "rounded-full"
✓ className DOES NOT include "rounded-md"

Back badge:
✓ Only appears in Base Amount column
✓ Does NOT appear in Flow column
✓ Does NOT appear between columns

Cycle badges:
✓ Flow column is min 480px wide
✓ Badges don't wrap to multiple lines
✓ Text is readable

========================================================================
TESTING REQUIREMENTS
After implementing fixes, test ALL of these:

□ Desktop (1920px): All columns visible, no overflow
□ Laptop (1440px): Horizontal scroll works smoothly
□ Check ALL transaction types: debt, expense, income, rollover
□ Check shop icons: Shopee, Lazada, restaurants (all rounded-md)
□ Check person avatars: all circles (rounded-full)
□ Check cycle badges: no wrapping, readable
□ Check amount badges: only in Base column, no duplicates
□ Filter reset icon: clean look, hover effect works
□ No console errors

========================================================================
ROLLBACK PLAN IF NEEDED
If this becomes too complex, consider:

Revert to previous working commit

Apply ONLY the column width fixes

Apply ONLY the image shape fixes

Test after each small change

Don't make multiple changes at once

Use git:

bash
git log --oneline -10
git revert <commit-hash>
========================================================================
ABSOLUTE RULES - NEVER BREAK THESE
Flow column width >= 480px (NEVER less)

Shop icons = rounded-md (NEVER rounded-full)

Person avatars = rounded-full (NEVER rounded-md)

Back badges = Base column ONLY (NEVER duplicate)

Grid layout = fixed widths (NEVER flex that breaks)

========================================================================
END OF EMERGENCY FIX
>>>>>>> origin/main
