-- Add toggle fields for sheet sync behavior per person
-- This replaces the hardcoded ANH_SCRIPT environment variable approach

alter table "public"."profiles" 
  add column if not exists "sheet_show_bank_account" boolean default false;

alter table "public"."profiles" 
  add column if not exists "sheet_show_qr_image" boolean default false;

comment on column "public"."profiles"."sheet_show_bank_account" is 
  'When true, sends bank account display to Google Sheet at L6:N6 (merged cells)';

comment on column "public"."profiles"."sheet_show_qr_image" is 
  'When true, sends QR image URL to Google Sheet at cell L6';
