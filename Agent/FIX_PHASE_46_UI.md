# PHASE 46 - UI FIX: Category Rules Table Layout

## 🐛 Vấn đề đã phát hiện

Khi mở Edit Account Dialog, phần "Category Rules" chỉ hiển thị nút "+ Add Rule" nhưng khi thêm rule mới:
- ❌ Không thấy các trường **Max Reward** và **MCC Codes** rõ ràng
- ❌ Layout không rõ ràng, khó nhìn
- ❌ Các trường bị ẩn hoặc không được khởi tạo đúng

## ✅ Giải pháp đã áp dụng

### 1. **Sửa hàm `addRule()`** 
**File**: `src/components/moneyflow/edit-account-dialog.tsx`

**Trước:**
```typescript
const addRule = () => {
  const draftKey = `DRAFT_${Math.random().toString(36).substr(2, 9)}`
  const newCategories = { ...tier.categories, [draftKey]: { rate: 0 } }
  onChange({ categories: newCategories })
}
```

**Sau:**
```typescript
const addRule = () => {
  const draftKey = `DRAFT_${Math.random().toString(36).substr(2, 9)}`
  const newCategories = { 
    ...tier.categories, 
    [draftKey]: { 
      rate: 0,
      max_reward: undefined,
      mcc_codes: undefined
    } 
  }
  onChange({ categories: newCategories })
}
```

**Lý do**: Đảm bảo tất cả các trường được khởi tạo khi tạo rule mới.

---

### 2. **Redesign Category Rules UI thành dạng bảng**

**Layout mới:**
- ✅ **Table Header** với 4 cột rõ ràng: Category | Rate | Max Reward | MCC Codes
- ✅ **Table Rows** sử dụng CSS Grid (12 columns) để căn chỉnh đều
- ✅ Hiển thị message khi chưa có rule: "No category rules. Click '+ Add Rule' to add specific rates for categories."
- ✅ Mỗi row có nút Delete (X) ở cuối

**Cấu trúc Grid:**
```
| Category (4 cols) | Rate (2 cols) | Max Reward (3 cols) | MCC (2 cols) | Delete (1 col) |
```

**Code mới:**
```tsx
{rules.length > 0 && (
  <div className="space-y-2">
    {/* Table Header */}
    <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-slate-500 uppercase px-2">
      <div className="col-span-4">Category</div>
      <div className="col-span-2">Rate</div>
      <div className="col-span-3">Max Reward</div>
      <div className="col-span-3">MCC Codes</div>
    </div>

    {/* Table Rows */}
    {rules.map((rule, rIndex) => (
      <div key={rIndex} className="grid grid-cols-12 gap-2 items-start rounded bg-white border border-slate-200 p-2 text-xs">
        {/* Category Column */}
        <div className="col-span-4">
          <CategoryMultiSelect ... />
        </div>

        {/* Rate Column */}
        <div className="col-span-2">
          <input type="number" ... />
          <span>%</span>
        </div>

        {/* Max Reward Column */}
        <div className="col-span-3">
          <input type="text" placeholder="No Limit" ... />
        </div>

        {/* MCC Codes Column */}
        <div className="col-span-2">
          <input type="text" placeholder="5411,5812" ... />
        </div>

        {/* Delete Button */}
        <div className="col-span-1 flex justify-end">
          <button><X /></button>
        </div>
      </div>
    ))}
  </div>
)}
```

---

## 📊 Kết quả

### Trước khi sửa:
- Category Rules chỉ hiển thị Category và Rate
- Max Reward và MCC bị ẩn hoặc không rõ ràng
- Layout lộn xộn, khó sử dụng

### Sau khi sửa:
- ✅ **Header rõ ràng** với 4 cột: Category | Rate | Max Reward | MCC Codes
- ✅ **Tất cả các trường đều hiển thị** ngay khi thêm rule mới
- ✅ **Layout dạng bảng** dễ nhìn, dễ sử dụng
- ✅ **Placeholder hữu ích**: "No Limit", "5411,5812"
- ✅ **Empty state**: Hiển thị message khi chưa có rule

---

## 🧪 Cách test

1. Mở Edit Account Dialog cho một Credit Card
2. Scroll xuống phần "Cashback configuration"
3. Scroll xuống phần "Advanced Tiers"
4. Click "Add Tier" (nếu chưa có)
5. Click "+ Add Rule" trong phần "Category Rules"
6. **Kiểm tra**: Bạn sẽ thấy một row mới với 4 cột:
   - **Category**: Dropdown để chọn categories
   - **Rate**: Input số với dấu %
   - **Max Reward**: Input text với placeholder "No Limit"
   - **MCC Codes**: Input text với placeholder "5411,5812"
   - **Delete**: Nút X để xóa rule

---

## ✅ Build Status

- ✅ **TypeScript**: No errors
- ✅ **Build**: Passed successfully
- ✅ **UI**: Table layout hiển thị đầy đủ 4 cột

---

## 📝 Ví dụ cấu hình VPBank Lady

Sau khi sửa, bạn có thể dễ dàng cấu hình:

**Tier 1 (Spend > 15M):**
- Min Total Spend: 15,000,000
- Default Rate: 1%

**Category Rules:**

| Category | Rate | Max Reward | MCC Codes |
|----------|------|------------|-----------|
| Education | 15% | 200,000 | 8211,8220 |
| Medical | 10% | 150,000 | 8011,8021 |
| Utilities | 5% | 100,000 | - |
| Dining | 3% | 50,000 | 5812,5814 |

---

**Fix Date**: 2025-11-30
**Status**: ✅ Complete & Tested
