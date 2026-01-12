# UI Standards

## Transaction Table Layout
The Transaction Table uses a **Strict Fixed-Width Grid** to ensuring alignment and preventing layout shifts.

### Grid Definition
```css
display: grid;
grid-template-columns: 40px 80px 280px 480px 180px 200px 120px;
gap: 16px; /* gap-4 */
align-items: center;
```

### Columns
1. **Checkbox**: `40px` (Center aligned)
2. **Date**: `80px` (Left aligned)
3. **Details**: `280px` (Left aligned, contains Shop/Category Icon + Note)
4. **Flow**: `480px` (Left aligned, CRITICAL MIN WIDTH for Source -> Target flow)
5. **Base Amount**: `180px` (Right aligned, contains "Back %" badge)
6. **Net Amount**: `200px` (Right aligned, contains final settlement)
7. **Actions**: `120px` (Right aligned, contains Edit/Copy/History buttons)

## Image Rendering Standards

| Entity Type | Shape Shape | Tailwind Class | Object Fit | Notes |
|-------------|-------------|----------------|------------|-------|
| **Person** | Circle | `rounded-full` | `object-cover` | Fallback: Colored circle with initials |
| **Shop/Merchant** | Rounded Square | `rounded-md` | `object-contain` | Container: 40x40px, White background |
| **Account/Bank** | Original Rect | *None* | `object-contain` | no border, no padding, max-w-[64px] |

## Component Standards

### Badges
All badges (Category, Status, Cycle, Cashback) must follow these metrics:
- **Height**: `24px` (`h-[24px]` or `py-1`)
- **Padding**: `px-2`
- **Font**: `text-xs` (`12px`), `font-medium`
- **Radius**: `rounded` (`4px`)

### Icons
- **Action Icons**: `h-4 w-4` (Standard size for Edit, Copy, Delete)
- **Shop Icons**: `h-6 w-6` (Inside Details column)
- **Account Icons**: Standard bank card ratio (approx 1.6)

## Typography
- **Amounts**: No currency symbols (`₫`), no +/- signs.
- **Colors**:
  - Expense/Debt: `text-red-500`
  - Income/Repayment: `text-green-600`
  - Notes: `font-medium text-foreground`
