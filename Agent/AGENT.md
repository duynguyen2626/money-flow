PROJECT: MONEY FLOW 3.0

PHASE: 58 - PEOPLE UI HIGH-DENSITY & LAYOUT SPLIT

WORKFLOW:

Branch: feat/phase-58-people-density

Safety: Run npm run build.

OBJECTIVE:
The current People Grid is inefficient and ugly due to varying card heights.
Solution: Split the view into two distinct sections with different card designs.

Active Debtors: Standard Cards (Detailed Debt Breakdown).

Settled / Friends: Mini Cards (Square, Avatar-centric).

I. UI: REDESIGN PeopleGrid (src/components/people/people-grid.tsx)

Logic:

Filter people by Search query.

Split into debtors (total_debt !== 0) and others (total_debt === 0).

Layout:

Filter Bar: Search Input + [Add Person Button].

Section 1: "⚠️ Outstanding Debtors"

Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.

Render: PersonCard (Detailed Variant).

Section 2: "✅ Friends & Family (Settled)"

Grid: grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3. (Higher density).

Render: PersonCard (Compact Variant).

II. UI: REDESIGN PersonCard (src/components/moneyflow/person-card.tsx)

Props: variant?: 'detailed' | 'compact'

Variant A: DETAILED (For Debtors)

Header: Avatar (40px) | Name (Bold) | Total Debt Badge (Red).

Body (Debt List):

Background bg-red-50/50 rounded-md p-2.

List top 3 debt tags (e.g., "NOV25: 50k").

Action: Small check button to settle specific tag.

Footer:

Services: Row of small Service Icons (Youtube, etc.). Label "No Services" if empty.

Actions: Icon Buttons (Lend 💸, Repay 🤝). No text labels. Tooltip only.

Variant B: COMPACT (For Settled)

Style: Square-ish Card, Center Aligned content.

Layout:

Top: Large Avatar (56px) centered.

Middle: Name (Truncate) centered.

Bottom: Row of Actions (Lend Button only basically, or Edit).

Service Indicators: Tiny dots or mini icons at the top-right corner.

III. UI: ICONS & TOOLTIPS

Replace Text Buttons: Use Lucide icons for everything in the card footer.

Lend: HandCoins (Color: Rose-500).

Settle/Repay: Banknote (Color: Emerald-500).

Edit: Pencil (Gray-400).

Tooltips: Wrap all icons in <Tooltip> to explain functionality.

IV. EXECUTION STEPS

Component: Refactor PersonCard to support variant prop and new styles.

Page: Update PeopleGrid to implement the Split Layout strategy.

Verify: Check mobile responsiveness (stack grids).