# 🎯 AGENT RESEARCH GUIDE - Money Flow 3 Transaction Table UI Fix

## 📌 Context
**Project:** Money Flow 3  
**File:** `/src/components/TransactionTable.tsx` (hoặc equivalent)  
**Issue Type:** UI Layout & Alignment  
**Priority:** Medium (Visual polish)  
**Status:** Research Phase

---

## 🔴 Issues to Fix

### Issue #1: People Avatar Styling
**Current State:**
- People avatar bị crop với `border-radius: 50%`
- Tạo effect border tròn không mong muốn
- Size không đồng nhất với Account avatar

**Expected State:**
- Giữ nguyên size avatar (không crop)
- Bỏ border-radius hoặc giảm đến mức tối thiểu
- Size bằng Account avatar (nếu khác 32px thì normalize)
- Alignment: Nằm giữa 2 entity icon

**Acceptance Criteria:**
- [ ] People avatar hiển thị full, không bị cắt
- [ ] Size đồng nhất: Account avatar = People avatar
- [ ] Spacing symmetrical: avatar nằm chính giữa 2 entity
- [ ] Visual không bị distorted, tỷ lệ giữ nguyên

---

### Issue #2: Shop Image Position & Sizing
**Current State:**
- Shop image không nằm giữa Notes và Shopping
- Position lệch, không symmetrical
- Size không match với Account/People avatar

**Expected State:**
- Shop image nằm chính giữa Notes và Shopping (như Account nằm giữa 2 entity)
- Size: 32px (match Account standard)
- Padding/margin: Balanced (8px or equal from left/right)
- Border: Giữ nguyên hoặc minimize (match Account style)

**Acceptance Criteria:**
- [ ] Shop image centered giữa Notes + Shopping
- [ ] Size: 32px (consistent with design system)
- [ ] Left margin = Right margin (symmetrical)
- [ ] Visual style match Account avatar approach

---

### Issue #3: Action Items Alignment
**Current State:**
- Action buttons/icons không align sát mép
- Dư thừa space bên phải (right padding quá lớn)
- Items bị float không chặt

**Expected State:**
- Items align chặt, no unnecessary padding
- Right edge gần mép container
- All action items (copy, clock, dots) align horizontally
- Consistent spacing: 4px or 8px between items

**Acceptance Criteria:**
- [ ] Right padding: remove hoặc set = 0
- [ ] Horizontal spacing between items: 4-8px
- [ ] All items align trong 1 row, no wrapping
- [ ] Visual edge clean, no dangling space

---

### Issue #4: Amount Column - Floating Header & Alignment
**Current State:**
- 2 giá trị amount (Base + Net Value) không có header riêng
- Alignment: possibly right-aligned nhưng không consistent
- Space bị dùa giữa chúng

**Expected State:**
- Floating header row (sticky) với:
  - Column 1: "BASE"
  - Column 2: "Net Value"
- Values align đúng dưới header tương ứng
- Font: Smaller (12px) cho header, consistent với giá trị (14px)
- Text alignment: Right-align cả header + value
- Padding: Consistent (8px left/right mỗi column)

**Acceptance Criteria:**
- [ ] Floating header visible khi scroll
- [ ] Header text: "BASE" và "Net Value"
- [ ] Header position: sticky/fixed
- [ ] Values align chính xác dưới header
- [ ] Right-aligned cả header + numbers
- [ ] Consistent padding 8px in each column

---

## 🔍 Research Tasks

### Task 1: Analyze Current Code Structure
**What to find:**
```
1. Locate TransactionTable component file
   - Find: people avatar rendering code
   - Find: shop image rendering code
   - Find: action items container
   - Find: amount column structure

2. Identify current CSS/styling:
   - Avatar: border-radius value
   - Avatar: width/height
   - Shop img: margin/padding
   - Actions: flex properties
   - Amount: column layout
```

**Questions to answer:**
- [ ] What's the current `border-radius` value for people avatar?
- [ ] Is shop image inside a wrapper div? What's its structure?
- [ ] How are action items positioned (flex-row/flex-col/absolute)?
- [ ] Current layout for amount: grid/flex/table?
- [ ] Is there already a header row for amount columns?

---

### Task 2: Identify Tailwind Classes
**Search for:**
```
People avatar:
- Search: `rounded-full`, `rounded-lg`, etc.
- Search: `w-[32px]`, `h-[32px]`
- Find: exact Tailwind classes applied

Shop image:
- Search: `mx-auto`, `ml-`, `mr-`
- Search: `absolute`, `relative`
- Find: parent container classes

Actions:
- Search: `flex`, `gap-`, `pr-`, `pl-`
- Find: flex-direction, justify-content
- Find: spacing between items

Amount:
- Search: `grid`, `flex`, `table`
- Find: column definitions
- Find: text alignment (text-right, etc.)
```

---

### Task 3: Design System Check
**Verify with design system:**
```
1. Avatar Standards:
   - Standard size: 32px? 40px?
   - Border radius: 0? 8px?
   - Should people avatar = Account avatar size?

2. Image Positioning:
   - How to center image between 2 elements?
   - Standard padding/gap: 8px? 12px?

3. Action Items:
   - Icon size: 16px? 20px?
   - Gap between items: 4px? 8px?
   - Should wrap or stay in 1 row?

4. Amount Column:
   - Header style: bold? uppercase?
   - Font size: 11px? 12px?
   - Number precision: 2 decimals
   - Should column width be fixed?
```

---

### Task 4: Component Structure Analysis
**Find and document:**

**A. People Avatar Component**
```
Current structure:
<div className="...">
  <img src={peopleAvatar} className="..." />
</div>

Find:
- Current className
- Wrapper div needed?
- Border-radius applied where?
- Size: inline style or Tailwind?
```

**B. Shop Image Component**
```
Current structure:
<div className="...">
  <img src={shopImage} className="..." />
  {/* Between Notes and Shopping */}
</div>

Find:
- Is it inside flex container?
- Parent's flex direction?
- Current margin/padding?
- Should use mx-auto for centering?
```

**C. Action Items Container**
```
Current structure:
<div className="flex gap-? pr-?">
  <button className="...">copy</button>
  <button className="...">clock</button>
  <button className="...">...</button>
</div>

Find:
- Current gap value
- Current pr (padding-right)
- Should be pr-0?
- Items wrapping behavior?
```

**D. Amount Column**
```
Current structure:
<div className="...">
  <span>2.622.589,67</span>
  <span>2.622.589,67</span>
</div>

Find:
- Is there a header row?
- Are values in separate columns?
- Column width distribution
- Text alignment
```

---

## 🛠️ Implementation Strategy

### Step 1: Fix People Avatar (Priority: High)
```
Action:
1. Remove border-radius: 50% (or set to 0)
2. Ensure width/height = 32px (consistent with Account)
3. If needed, add object-fit: cover (not crop, just fit)
4. Center vertically in Flow column
5. Remove any unnecessary wrapper styling
```

### Step 2: Fix Shop Image (Priority: High)
```
Action:
1. Find shop image rendering in Details/Flow section
2. Remove margin that causes position offset
3. Add mx-auto if in flex container
4. Ensure size = 32px (match others)
5. Add text-center to parent div if needed
6. Verify it's between Notes and Shopping visually
```

### Step 3: Fix Action Items Alignment (Priority: Medium)
```
Action:
1. Find actions container div
2. Set: pr-0 (remove right padding)
3. Set: gap-1 or gap-2 (tight spacing)
4. Ensure flex-row (horizontal layout)
5. Add justify-end if needed (align to right)
6. Remove any explicit width on actions container
```

### Step 4: Add Amount Column Headers (Priority: Medium)
```
Action:
1. Locate amount column rendering
2. Add header row above values:
   - Column 1: "BASE"
   - Column 2: "Net Value"
3. Make header sticky/floating:
   - thead role if table
   - Or position: sticky if div
4. Style:
   - Font: 11px, font-weight: 600
   - Text-align: right
   - Padding: 8px (match values)
5. Align values directly below headers
```

---

## 📸 Visual Reference

### Current Issues:
```
BEFORE (Current):
┌─────────────────────────────────────────────────────────────┐
│ Flow: [Acc]Avatar(Cropped)  Shop  Notes  Actions...Right │
│       (size mismatch)                     (too much gap)    │
│                                                              │
│ Amount: 2.622.589,67    2.622.589,67                        │
│         (no header)     (no header)                         │
└─────────────────────────────────────────────────────────────┘

AFTER (Expected):
┌─────────────────────────────────────────────────────────────┐
│ Flow: [Acc] People Shop Notes  Actions Right              │
│       (equal size)  (centered)         (tight)            │
│                                                              │
│ Amount:     BASE              Net Value                     │
│            2.622.589,67      2.622.589,67                  │
│            (header match)   (header match)                │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Testing Checklist

After implementing fixes:

- [ ] People avatar: No crop, full size, 32px
- [ ] Shop image: Centered between Notes & Shopping
- [ ] Shop image: Size 32px, matches Account avatar
- [ ] Actions: Right-aligned, tight spacing (no dangling space)
- [ ] Amount headers: Visible, sticky (optional floating)
- [ ] Amount values: Align under correct header
- [ ] All avatars/images: Consistent size throughout
- [ ] Responsive: Check mobile view (< 768px)
- [ ] Alignment: Use browser DevTools to verify pixel-perfect

---

## 🎯 Success Criteria (Definition of Done)

✅ Visual:
- People avatar = Account avatar (same size, no crop)
- Shop image centered & sized consistently
- Actions compact, right edge clean
- Amount column has floating header

✅ Code:
- Tailwind classes clean & consistent
- No inline styles for layout
- Responsive (mobile-first approach)
- No unnecessary wrappers

✅ Performance:
- No layout shift
- Sticky header doesn't cause jank
- Images lazy-loaded if needed

---

## 📝 Questions for Agent

1. **Avatar Styling**: Current `border-radius` on people avatar?
2. **Shop Position**: Is shop image currently using `mx-auto`?
3. **Actions Padding**: What's current `pr-` value on actions container?
4. **Amount Structure**: Are amount values in table cells or divs?
5. **Header Implementation**: Sticky header preferred or floating?

---

## 🔗 Related Files to Check

```
/src/components/TransactionTable.tsx
/src/components/TransactionRow.tsx
/src/components/FlowColumn.tsx        (if separate)
/src/components/ActionItems.tsx       (if separate)
/src/styles/table.css                 (if custom CSS)
tailwind.config.js                    (for customization)
```

---

## 📌 Notes for Agent

- **Design System**: Check if there's a standard avatar component size
- **Tailwind**: All styling should use Tailwind, no inline styles for layout
- **Responsive**: Consider mobile breakpoint (md: 768px)
- **Accessibility**: Ensure action items have proper `aria-label`
- **Performance**: Use `object-fit` wisely to avoid layout shift

---

## 🚀 Next Steps After Research

1. **Findings**: Document exact CSS classes currently applied
2. **Recommendations**: Propose Tailwind classes for each fix
3. **Code Changes**: Generate specific `className` updates
4. **Testing Plan**: Provide step-by-step testing instructions
5. **PR**: Create PR with all fixes + before/after screenshots

---

**Document Version:** 1.0  
**Created:** 2026-01-12  
**For:** Antigravity Agent Research  
**Status:** Ready for Agent Analysis

**Next Action:** Agent to analyze component structure and provide findings
