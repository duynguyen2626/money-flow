# Database Migration: Add card_name to batch_items

## Instructions

Run this SQL command in your Supabase SQL Editor to add the `card_name` column to the `batch_items` table:

```sql
ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS card_name TEXT;
```

## What this does

- Adds a new optional `card_name` column to the `batch_items` table
- This allows users to specify a card name (e.g., "Amex", "Visa") for each batch item
- The note will be automatically generated as: `BankName CardName MMMYY` (e.g., "VCB Amex NOV25")

## Changes Made

1. **Database Schema**: Added `card_name` column to `batch_items` table
2. **TypeScript Types**: Updated `database.types.ts` to include `card_name` in Row, Insert, and Update types
3. **UI Components**: 
   - Added "Card Name" field to Add Item Dialog
   - Added "Card Name" field to Edit Item Dialog
   - Updated Items Table to display card name alongside bank name
4. **Business Logic**:
   - Fixed note generation to use the part BEFORE the dash (e.g., "VCB" from "VCB - Ngoại Thương")
   - Updated note generation to include card name: `BankName [CardName] MMMYY`
   - Updated batch cloning to preserve card_name field
