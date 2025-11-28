-- Fix bank_mappings table - recreate with correct schema
-- Drop and recreate to ensure clean state

-- Drop existing table if it exists
DROP TABLE IF EXISTS bank_mappings CASCADE;

-- Create bank_mappings table with correct schema
CREATE TABLE bank_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_code TEXT NOT NULL UNIQUE, -- e.g., "970436", "970422", "314", "203"
  bank_name TEXT NOT NULL, -- e.g., "Ngân hàng TMCP Ngoại thương Việt Nam"
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
INSERT INTO bank_mappings (bank_code, bank_name, short_name) VALUES
  -- Standard bank codes (970xxx)
  ('970436', 'Ngân hàng TMCP Ngoại thương Việt Nam', 'VCB'),
  ('970422', 'Ngân hàng TMCP Quân đội', 'MSB'),
  ('970415', 'Ngân hàng TMCP Công thương Việt Nam', 'VietinBank'),
  ('970418', 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', 'BIDV'),
  ('970407', 'Ngân hàng TMCP Kỹ thương Việt Nam', 'Techcombank'),
  ('970423', 'Ngân hàng TMCP Tiên Phong', 'TPBank'),
  ('970432', 'Ngân hàng TMCP Việt Nam Thịnh Vượng', 'VPBank'),
  ('970405', 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam', 'Agribank'),
  ('970416', 'Ngân hàng TMCP Á Châu', 'ACB'),
  ('970403', 'Ngân hàng TMCP Sài Gòn Thương Tín', 'Sacombank'),
  
  -- Additional banks from new import format
  ('314', 'NH TMCP Quốc tế Việt Nam', 'VIB'),
  ('203', 'VCB - Ngoại Thương (Vietcombank)', 'VCB'),
  ('204', 'AGRIBANK - Nông nghiệp & PTNT Việt Nam', 'AGRIBANK')
ON CONFLICT (bank_code) DO NOTHING;
