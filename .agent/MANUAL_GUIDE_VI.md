# Hướng Dẫn Sử Dụng Cashback Section - TransactionSlideV2

## Tổng Quan

Cashback Section trong TransactionSlideV2 cho phép bạn quản lý cashback khi tạo/sửa giao dịch. Có 3 chế độ chính:

1. **Claim** (Nhận cashback cho bản thân)
2. **Give Away** (Cho người khác)
3. **Voluntary** (Đóng góp tự nguyện)

## Workflow Sử Dụng

### 1. Tạo Giao Dịch Mới Với Cashback

**Bước 1:** Mở Transaction Slide
- Click nút "Expense" hoặc "Income" từ Account Row
- Hoặc click "Edit" từ danh sách giao dịch

**Bước 2:** Chọn Thẻ Tín Dụng
- Trong dropdown "Pay With", chọn thẻ có cashback (ví dụ: MSB mDigi)
- Cashback section sẽ tự động hiện với badge "Active"

**Bước 3:** Mở Rộng Cashback Section
- Click vào icon ⚙️ (Settings) bên phải "Cashback"
- Section sẽ mở ra với 3 tabs

**Bước 4:** Chọn Chế Độ Cashback

#### Chế Độ "Claim" (Mặc định)
- Dùng khi bạn muốn nhận cashback cho chính mình
- Hệ thống tự động điền tỷ lệ cashback từ cấu hình thẻ
- Ví dụ: MSB mDigi có 20% → tự động điền "20" vào ô "% Rate"

**Lưu ý quan trọng về giá trị:**
- **UI hiển thị:** Số nguyên (ví dụ: 20 = 20%, 0.5 = 0.5%)
- **Database lưu:** Số thập phân (0.2 = 20%, 0.005 = 0.5%)
- Hệ thống tự động chuyển đổi khi lưu/load

#### Chế Độ "Give Away"
- **Chỉ bật khi đã chọn Person** (External Debt)
- Dùng khi bạn cho người khác cashback
- Nhập tỷ lệ hoặc số tiền cố định

#### Chế Độ "Voluntary"
- **Chỉ bật khi đã chọn Person**
- Dùng cho đóng góp tự nguyện
- Nhập số tiền cố định

**Bước 5:** Kiểm Tra Thông Tin
- **Match Policy:** Hiển thị loại policy đang áp dụng
- **Applied Rate:** Tỷ lệ thực tế được áp dụng
- **Budget Left:** Số tiền còn lại trong ngân sách cashback
- **Min Spend Progress:** Tiến độ chi tiêu tối thiểu (nếu có)

**Bước 6:** Lưu Giao Dịch
- Click "Save Transaction"
- Hệ thống tự động:
  - Chuyển đổi % Rate từ UI (20) sang DB (0.2)
  - Tính toán cashback amount
  - Cập nhật budget và progress

### 2. Sửa Giao Dịch Có Cashback

**Bước 1:** Mở Edit
- Từ Account Row → Click "Advanced Settings" → "View Transactions"
- Click icon ✏️ (Edit) trên giao dịch cần sửa

**Bước 2:** Chờ Loading
- Slide header sẽ hiện "Edit Transaction" + spinner "Loading..."
- Hệ thống đang fetch dữ liệu và chuyển đổi giá trị

**Bước 3:** Kiểm Tra Giá Trị
- **Đúng:** % Rate hiển thị "20" (cho 20% cashback)
- **Sai:** Nếu hiển thị "0.2" → Có lỗi conversion

**Bước 4:** Chỉnh Sửa và Lưu
- Thay đổi các giá trị cần thiết
- Click "Save Transaction"
- Modal danh sách giao dịch sẽ **tự động refresh** (không cần đóng/mở lại)

### 3. Xem Danh Sách Giao Dịch Cashback

**Bước 1:** Mở Modal
- Từ Account Row → Click vào số "Spent" trong cột "Spent/Budget"
- Modal "Transactions contributing to Cashback" sẽ mở

**Bước 2:** Xem Chi Tiết
- Danh sách hiển thị tất cả giao dịch có cashback trong cycle hiện tại
- Mỗi dòng có:
  - Ngày giao dịch
  - Mô tả
  - Số tiền
  - Tỷ lệ cashback
  - Số tiền cashback nhận được
  - Nút "Copy ID" và "Edit"

**Bước 3:** Quick Edit
- Click icon ✏️ để sửa nhanh
- TransactionSlideV2 mở với dữ liệu đã load
- Sau khi save, modal tự động refresh

## Xử Lý Lỗi Thường Gặp

### Lỗi 1: "numeric field overflow"
**Nguyên nhân:** Nhập sai định dạng (nhập 20 thay vì 0.2 vào database)
**Giải pháp:** Đã fix - hệ thống tự động chuyển đổi

### Lỗi 2: Applied Rate hiển thị 10% thay vì 20%
**Nguyên nhân:** 
- Cấu hình thẻ có `defaultRate: 0` nhưng có rule với `rate: 0.2`
- Logic chưa đọc đúng từ tiered config

**Cách kiểm tra:**
1. Mở Browser Console (F12)
2. Tìm log: `[CashbackSection] Auto-fill rate: { account: "Msb mDigi", bestRate: 0.2, config: {...} }`
3. Kiểm tra `bestRate` có đúng 0.2 không
4. Kiểm tra ô "% Rate" có hiển thị 20 không

### Lỗi 3: Edit hiển thị 0.2 thay vì 20
**Nguyên nhân:** Thiếu conversion khi load dữ liệu
**Giải pháp:** Đã fix - multiply by 100 khi load

### Lỗi 4: Modal không refresh sau khi save
**Nguyên nhân:** Thiếu trigger refresh
**Giải pháp:** Đã fix - dùng refreshKey state

## Cấu Trúc Dữ Liệu

### Database Schema
```sql
-- transactions table
cashback_mode: text (percent, fixed, real_percent, real_fixed, voluntary, none_back)
cashback_share_percent: numeric(5,4) -- Lưu dạng thập phân: 0.2 = 20%
cashback_share_fixed: numeric
```

### Account Cashback Config
```json
{
  "program": {
    "defaultRate": 0,
    "maxBudget": 300000,
    "levels": [
      {
        "id": "lvl_1",
        "name": "Default",
        "defaultRate": 0,
        "rules": [
          {
            "id": "rule_1",
            "rate": 0.2,  // 20%
            "categoryIds": ["shopping_category_id"]
          }
        ]
      }
    ]
  }
}
```

## Công Thức Chuyển Đổi

### UI → Database (Khi Save)
```typescript
// User nhập: 20 (%)
// Database lưu: 20 / 100 = 0.2
cashback_share_percent: data.cashback_share_percent ? data.cashback_share_percent / 100 : null
```

### Database → UI (Khi Load/Edit)
```typescript
// Database có: 0.2
// UI hiển thị: 0.2 * 100 = 20 (%)
cashback_share_percent: txn.cashback_share_percent ? txn.cashback_share_percent * 100 : undefined
```

### Config → UI (Auto-fill)
```typescript
// Config có: 0.2 (trong rule.rate)
// UI điền: 0.2 * 100 = 20 (%)
form.setValue('cashback_share_percent', bestRate * 100)
```

## Checklist Kiểm Tra

Khi test tính năng cashback, kiểm tra:

- [ ] Chọn thẻ MSB mDigi → Cashback section hiện "Active"
- [ ] Click "Claim" tab → % Rate tự động điền "20" (không phải 0.2)
- [ ] Applied Rate hiển thị "20%" (không phải 10%)
- [ ] Nhập số tiền → Budget Left giảm tương ứng
- [ ] Save transaction → Không có lỗi "numeric field overflow"
- [ ] Click Edit → Loading indicator hiện
- [ ] Edit slide mở → % Rate hiển thị "20" (không phải 0.2)
- [ ] Sửa và save → Modal tự động refresh
- [ ] "Give Away" và "Voluntary" tabs disabled khi không chọn Person
- [ ] Chọn Person → Tabs được enable

## Tài Liệu Tham Khảo

- **Implementation Plan:** `.agent/brain/.../implementation_plan.md`
- **Walkthrough:** `.agent/brain/.../walkthrough.md`
- **Task Tracking:** `.agent/brain/.../task.md`
- **Source Code:**
  - `src/components/transaction/slide-v2/transaction-slide-v2.tsx`
  - `src/components/transaction/slide-v2/single-mode/cashback-section.tsx`
  - `src/components/accounts/v2/AccountRowV2.tsx`
  - `src/components/accounts/v2/AccountCycleTransactionsModal.tsx`
