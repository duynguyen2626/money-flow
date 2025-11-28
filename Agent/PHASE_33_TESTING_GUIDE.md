# Phase 33: Testing Guide

## 🚀 Quick Start

### 1. Apply Database Migration

Run this SQL in your Supabase Dashboard (SQL Editor):

```sql
-- Create bank_mappings table
CREATE TABLE IF NOT EXISTS bank_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_code TEXT NOT NULL UNIQUE,
  bank_name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bank_mappings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated users to read bank mappings"
  ON bank_mappings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage bank mappings"
  ON bank_mappings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert common Vietnamese banks
INSERT INTO bank_mappings (bank_code, bank_name, short_name) VALUES
  ('970436', 'Ngân hàng TMCP Ngoại thương Việt Nam', 'VCB'),
  ('970422', 'Ngân hàng TMCP Quân đội', 'MSB'),
  ('970415', 'Ngân hàng TMCP Công thương Việt Nam', 'VietinBank'),
  ('970418', 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', 'BIDV'),
  ('970407', 'Ngân hàng TMCP Kỹ thương Việt Nam', 'Techcombank'),
  ('970423', 'Ngân hàng TMCP Tiên Phong', 'TPBank'),
  ('970432', 'Ngân hàng TMCP Việt Nam Thịnh Vượng', 'VPBank'),
  ('970405', 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam', 'Agribank'),
  ('970416', 'Ngân hàng TMCP Á Châu', 'ACB'),
  ('970403', 'Ngân hàng TMCP Sài Gòn Thương Tín', 'Sacombank')
ON CONFLICT (bank_code) DO NOTHING;
```

### 2. Test Batch Import from Excel

#### Step 1: Prepare Test Data
Copy this to Excel or Google Sheets:

| Name | Account Number | Amount | Bank Code |
|------|---------------|--------|-----------|
| Nguyễn Văn A | 1234567890 | 5000000 | 970436 |
| Trần Thị B | 0987654321 | 3000000 | 970422 |
| Lê Văn C | 5555666677 | 7500000 | 970415 |

#### Step 2: Import to App
1. Go to `/batch` page
2. Click on any batch (or create a new one)
3. Click **"Import Excel"** button
4. In the dialog:
   - Enter Batch Tag: `DEC25`
   - Select the 3 rows from Excel and paste into the text area
5. Click **"Import"**

#### Step 3: Verify
- Check that 3 items were created
- Notes should be auto-generated (e.g., "VCB DEC25", "MSB DEC25")
- Bank names should be filled in

### 3. Test Confirm Money Received

#### Step 1: Create Test Batch Items
1. Create a batch with items targeting a specific account (e.g., your VCB account)
2. Make sure items have `status = 'pending'`

#### Step 2: View on Account Card
1. Go to `/accounts` page
2. Find the VCB account card
3. You should see a green badge: **"💰 [Amount] đang về"**

#### Step 3: Confirm Receipt
1. Click the **"Xác nhận"** button on the badge
2. The item should be confirmed
3. Badge should disappear
4. Account balance should update

### 4. Test Tabs in Batch Detail

1. Go to any batch detail page
2. You should see two tabs:
   - **Pending** - Shows items with status 'pending'
   - **Confirmed** - Shows items with status 'confirmed'
3. Click between tabs to filter items

## 📊 Expected Workflow

### Complete Salary Payment Flow:

1. **Prepare Data** (Excel)
   ```
   Name            Account         Amount      Bank
   Nguyễn Văn A    1234567890     5000000     970436
   Trần Thị B      0987654321     3000000     970422
   ```

2. **Import to Batch**
   - Click "Import Excel"
   - Paste data
   - Tag: "DEC25"
   - Result: Items created with notes "VCB DEC25", "MSB DEC25"

3. **Send to Bank**
   - Click "Send to Sheet"
   - Google Sheet receives formatted data
   - Upload to bank portal

4. **Confirm Receipt**
   - Bank sends notification
   - Open app → Accounts page
   - See "💰 5tr đang về" on VCB card
   - Click "Xác nhận"
   - Done!

## 🐛 Troubleshooting

### Import not working?
- Check that data is tab-separated (copy from Excel, not manually typed)
- Verify bank codes are correct (970436, 970422, etc.)
- Check browser console for errors

### Confirm button not showing?
- Verify batch items have `target_account_id` set
- Check item status is 'pending'
- Refresh the page

### Notes not auto-generated?
- Make sure bank code column is included
- Verify bank_mappings table has data
- Check batch tag was entered

## 📝 Sample Test Data

### Test Batch Import (Copy this):
```
Nguyễn Văn A	1234567890	5000000	970436
Trần Thị B	0987654321	3000000	970422
Lê Văn C	5555666677	7500000	970415
Phạm Thị D	8888999900	4200000	970418
Hoàng Văn E	1111222233	6800000	970407
```

### Bank Codes Reference:
- 970436 = VCB (Vietcombank)
- 970422 = MSB (MB Bank)
- 970415 = VietinBank
- 970418 = BIDV
- 970407 = Techcombank
- 970423 = TPBank
- 970432 = VPBank
- 970405 = Agribank
- 970416 = ACB
- 970403 = Sacombank

## ✅ Success Criteria

- [ ] Bank mappings table created and populated
- [ ] Can import Excel data successfully
- [ ] Notes are auto-generated correctly
- [ ] Tabs show correct filtered items
- [ ] Pending items appear on account cards
- [ ] Can confirm items from account cards
- [ ] Balance updates after confirmation

## 🎯 Next Phase Suggestions

1. Add bank logo URLs to bank_mappings
2. Add bulk confirm for all pending items on an account
3. Add notification when money is received
4. Export batch items to Excel
5. Batch templates with auto-clone settings
