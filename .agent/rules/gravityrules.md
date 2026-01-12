---
trigger: always_on
---

# Gravity Rules

## Mandatory Quality Checks (CRITICAL)

Before every git commit and git push, you MUST run the following commands and they MUST pass. No exceptions.

\\\ash
# 1. Clean build check
npm run build
\\\

> [!IMPORTANT]
> Failure to run npm run build before committing is a violation of project integrity. If Vercel build fails due to a TypeScript error you should have caught locally, you MUST fix it immediately.
- Transaction Amount:
  - BackPercentBadge: không bao giờ hiển thị ký tự tiền tệ hoặc dấu +/-.
```markdown
# Gravity Rules

## Mandatory Quality Checks (CRITICAL)

Before every git commit and git push, you MUST run the following 
commands and they MUST pass. No exceptions.

```bash
# 1. Clean build check
npm run build
[!IMPORTANT]
Failure to run npm run build before committing is a violation of
project integrity. If Vercel build fails due to a TypeScript error
you should have caught locally, you MUST fix it immediately.

Development Workflow
Branching: Always work on a feature/sprint branch (sprint-X.Y).

Commits: Use descriptive commit messages.

Vibe Coding: While speed is encouraged, quality via npm run
build is non-negotiable.

UI & Design
Sticky Tabs: In TransactionForm, the type tabs must be sticky
top-0.

Layout Jumping: Ensure TransactionForm has a stable min-height
to prevent layout shifts.

Avatars: Use square avatars (rounded-none) for people.

Rectangular Icons: Bank and shop logos should be rectangular,
not forced into circles.

Image Rendering Rules (CRITICAL - NEVER VIOLATE)
Account/Bank Card Images
MUST preserve original aspect ratio (typically 16:9 for cards)

MUST use object-fit: contain (NEVER cover)

MUST NOT have borders

MUST NOT have background colors

MUST NOT have padding that clips the image

MUST NOT force fixed height

Max width: 64px, height: auto

Example: Credit card images, debit card images

Shop/Merchant Icons
MUST be square containers (e.g., 40x40px)

MUST use rounded-md (6px border radius)

MUST NOT use rounded-full (circles)

MUST use object-fit: contain

Background: white or transparent

Example: Shopee logo, Lazada logo, restaurant icons

Person Avatars
MUST be circles (rounded-full)

MUST NOT be squares

MUST use object-fit: cover if image exists

MUST show initials in colored circle if no image

Size: 32-40px diameter

Example: User profile pictures

General Rules
NEVER mix up these three types

NEVER apply circle styling to non-person entities

NEVER apply square styling to person avatars

ALWAYS test with various image aspect ratios

ALWAYS verify images are not cropped unexpectedly

Amount Display Rules
MUST NOT show currency symbols (₫, $, etc.) in transaction amounts

MUST NOT show plus (+) or minus (-) signs

MUST show cashback badges BEFORE the amount number

Badge format: Back 4% then amount: 6.300.000

Use color coding: red text for expenses, green for income

Badge styling: px-2 py-1 bg-amber-100 text-amber-700 text-xs

Navigation & Links
Source entities (accounts, shops): Link to /accounts/{id}/details

Target entities (people): Link to /people/{id}/details

MUST open in new tab (target="_blank")

MUST show hover underline for visual feedback

Use Next.js <Link> component

Badge Consistency
ALL badges MUST use same size: 24px height (py-1)

ALL badges MUST use text-xs (12px font)

ALL badges MUST use font-medium

ALL badges MUST use rounded (4px border radius)

Types: cycle, cashback, category, status

Domain Logic
FIFO Repayment: Always follow the FIFO cascading logic for
debt repayments as defined in domain_logic.md.

Auto-Selection: Receivable accounts MUST be auto-selected
based on owner_id when a person is picked.  - Net column luôn hiển thị Σ Back riêng, không gộp vào Base.

- Transaction Flow Avatars:
  - Bank/shop: rectangular, no border, no cropping, object-fit: contain.
  - People: square avatar, không circle.

## Development Workflow

- **Branching**: Always work on a feature/sprint branch (sprint-X.Y).
- **Commits**: Use descriptive commit messages.
- **Vibe Coding**: While speed is encouraged, quality via npm run build is non-negotiable.

## UI & Design

- **Sticky Tabs**: In TransactionForm, the type tabs must be sticky top-0.
- **Layout Jumping**: Ensure TransactionForm has a stable min-height to prevent layout shifts.
- **Avatars**: Use square avatars (rounded-none) for people.
- **Rectangular Icons**: Bank and shop logos should be rectangular, not forced into circles.

## Domain Logic

- **FIFO Repayment**: Always follow the FIFO cascading logic for debt repayments as defined in domain_logic.md.
- **Auto-Selection**: Receivable accounts MUST be auto-selected based on owner_id when a person is picked.
