# Cashback System Refactor Plan - Money Flow 3

## 🚨 Current Issues (Context) - Phase 15
The current implementation (MF5.4) has a high-complexity logic gap between "Simple Config" (Base Rate/Max Budget) and "Level-based Config" (Rules/Tiers).
- **Conflict**: When "Category Restriction" is ON, the system ignores the base rate, but the UI might still show it, leading to inconsistent saves.
- **UI Confusion**: One "Level" has both a `Level Base Rate` and `Category Rules`. Users often get confused which rate applies.
- **Data Integrity**: VCB Signature (0.5% base + 10% Edu) and VPBank Lady (Multiple tiers with varying rates per category) are currently difficult to input without collisions.

## 🎯 Target Architecture (Backend & Database)

### 1. Database Schema Migration
Split core fields out of the JSON blob into first-class columns in the `accounts` table for better indexing and AI reasoning:
- `cb_type`: `none` | `simple` | `tiered`.
- `cb_base_rate`: Global catch-all rate (e.g., 0.005).
- `cb_max_budget`: Monthly/Cycle cap (e.g., 300000).
- `cb_is_unlimited`: Boolean to ignore cap.
- `cb_rules_json`: Cleaned rules (no nested levels if not tiered).

### 2. Enhanced Account Ownership (Future Plan)
- **Migrate DB**: Add `is_family_member_account` or `shared_with_id` to distinguish between Personal vs. Family accounts.
- **Calculation**: Total credit limits and spending should be grouped by owner to avoid skewing personal net worth.

## 🎨 Frontend & UX Redesign Plan
The UI must be simplified and "forgiving":
- **Friendly Mode Switch**: Big cards to choose between "Flat Rate" (Simple) and "Spend Levels/Categories" (Advanced).
- **Tooltips & Hints**: 
  - Each Field in English but Tooltips/Guide in Vietnamese (Tiếng Việt).
  - Add icons with `i` info circle that explains: "Rules này sẽ ghi đè Base Rate nếu danh mục trùng khớp".
- **Dynamic Previews**: As user types, show a "Visual Logic Tree" (e.g., Else 0.5% -> If Edu -> 10%).

## 📊 Sample Data (Use for Testing)

### Case 1: VCB Signature (High Base + Specific Rule)
- **Base Rate**: 0.5%
- **Education/Health Rule**: 10%
- **Cap**: Unlimited

### Case 2: VPBank Lady (Complex Tiered)
- **Tier 1 (Spend < 15M)**:
  - Base: 0.3%
  - Edu/Health/Insurance: 7.5% (Max 150k)
- **Tier 2 (Spend >= 15M)**:
  - Base: 0.3%
  - Edu/Health/Insurance: 15% (Max 300k)

```sql
-- INSERT Sample for Research
INSERT INTO "public"."accounts" ("id", "name", "type", "credit_limit", "cashback_config", "receiver_name", "account_number") 
VALUES 
('83a27121-0e34-4231-b060-2818da672eca', 'Vpbank Lady', 'credit_card', '38000000.00', '{"program": {"levels": [{"name": "Premium Tier ≥15M", "minTotalSpend": 15000000, "rules": [{"rate": 0.15, "maxReward": 300000, "categoryIds": ["aac49051-7231", "e0000000-0001"]}]}, {"name": "Standard (<15M)", "minTotalSpend": 100000, "rules": [{"rate": 0.075, "maxReward": 150000, "categoryIds": ["aac49051-7231"]}]}], "defaultRate": 0.003}}', 'NGUYEN THI THAO TRANG', '0362790199'),
('40c3998b-7550-414c-be42-fe93ed767a06', 'Vcb Signature', 'credit_card', '150000000.00', '{"program": {"levels": [{"name": "Default", "rules": [{"rate": 0.005, "categoryIds": ["aac49051-7231", "410604b1-d2ac"]}]}], "defaultRate": 0}}', 'NGUYEN THANH NAM', '9389191959');
```

## 📝 Implementation Notes (What we did today)
- Fixed "Restricted Mode" bug where 0.5% base was being wiped out because it was incorrectly detected as a restricted-only card.
- Fixed a Javascript type coercion bug where `null` remains_cap was treated as 0 (Over Budget).
- Added `revalidatePath` to `account.service.ts` to ensure UI updates instantly after saving.
- Identified that the current nested state (`defaultRate` vs `levels`) is the primary source of user error and save failures.

## 🚀 Hand-over Prompt for Next Session
1. **Context Loading**: "Read `.agent/CASHBACK_REFACTOR_PLAN.md` and understand the conflict between `defaultRate` and `rules` in the current `AccountSlideV2.tsx`. Analyze why VCB Signature 0.5% fallback is failing in single-mode preview."
2. **Implementation**: "Proposed to start the DB migration first by adding `cb_base_rate` and `cb_type` to the Supabase schema, then refactoring the resolver in `src/lib/cashback.ts`."

---
**Status**: Hand-over Ready.
**Date**: 2026-02-14
