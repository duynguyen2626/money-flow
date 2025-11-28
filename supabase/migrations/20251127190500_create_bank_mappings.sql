-- Create bank_mappings table for auto-filling bank information
CREATE TABLE IF NOT EXISTS bank_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_code TEXT NOT NULL UNIQUE, -- e.g., "970436", "970422"
  bank_name TEXT NOT NULL, -- e.g., "Vietcombank", "MB Bank"
  short_name TEXT NOT NULL, -- e.g., "VCB", "MSB" (for note generation)
  logo_url TEXT, -- Optional bank logo
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE bank_mappings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read bank mappings
CREATE POLICY "Allow authenticated users to read bank mappings"
  ON bank_mappings FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert/update/delete bank mappings
CREATE POLICY "Allow authenticated users to manage bank mappings"
  ON bank_mappings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert common Vietnamese banks
INSERT INTO bank_mappings (bank_code, bank_name, short_name, logo_url) VALUES
  ('970436', 'Ngân hàng TMCP Ngoại thương Việt Nam', 'VCB', null),
  ('970422', 'Ngân hàng TMCP Quân đội', 'MSB', null),
  ('970415', 'Ngân hàng TMCP Công thương Việt Nam', 'VietinBank', null),
  ('970418', 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', 'BIDV', null),
  ('970407', 'Ngân hàng TMCP Kỹ thương Việt Nam', 'Techcombank', null),
  ('970423', 'Ngân hàng TMCP Tiên Phong', 'TPBank', null),
  ('970432', 'Ngân hàng TMCP Việt Nam Thịnh Vượng', 'VPBank', null),
  ('970405', 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam', 'Agribank', null),
  ('970416', 'Ngân hàng TMCP Á Châu', 'ACB', null),
  ('970403', 'Ngân hàng TMCP Sài Gòn Thương Tín', 'Sacombank', null)
ON CONFLICT (bank_code) DO NOTHING;
