# Cashback System Refactor: Implementation Plan

This plan outlines the steps for refactoring the cashback system to separate core data into first-class columns and improve the UI/UX.

## 🚀 Phase 1: Database Migration (Structural Changes)
- **Goal**: Add explicit columns to `accounts` table and migrate existing JSON data.
- **Tasks**:
  1. Create SQL migration:
     - Add `cb_type` (ENUM: `none`, `simple`, `tiered`).
     - Add `cb_base_rate` (NUMERIC).
     - Add `cb_max_budget` (NUMERIC).
     - Add `cb_is_unlimited` (BOOLEAN).
     - Add `cb_rules_json` (JSONB) for keeping complex tiered rules.
  2. Implement data migration query:
     - Parse `cashback_config` and populate new columns.
     - Ensure data integrity (VCB Signature, VPBank Lady cases).
- **Status**: [PENDING]

## 🧠 Phase 2: Service & Logic Refactor
- **Goal**: Update the backend services to read from/write to the new columns.
- **Tasks**:
  1. Update `src/types/moneyflow.types.ts` & `src/types/database.types.ts` (if manually maintained).
  2. Modify `src/lib/cashback.ts`:
     - Update `normalizeCashbackConfig` to prioritize new columns.
  3. Modify `src/services/cashback/policy-resolver.ts`:
     - Clean up resolution logic to avoid JSON parsing overhead.
  4. Modify `src/services/account.service.ts`:
     - Update `updateAccountConfig` to handle new fields.
- **Status**: [PENDING]

## 🎨 Phase 3: UI/UX Redesign (AccountSlideV2)
- **Goal**: New, intuitive input interface with clear modes and guidance.
- **Tasks**:
  1. **Mode Selection**: Big cards or a clear toggle between "Flat Rate" and "Tiered/Advanced".
  2. **Simplified Inputs**:
     - Simple Mode: Multi-stage inputs (Base % -> Monthly Cap).
     - Advanced Mode: Clean list of levels with inline rule editing.
  3. **Vietnamese Tooltips**:
     - `cb_base_rate`: "Tỷ lệ hoàn tiền mặc định cho mọi giao dịch."
     - `cb_max_budget`: "Hạn mức hoàn tiền tối đa mỗi chu kỳ (thường là mỗi tháng)."
     - `cb_type`: "Chọn cách tính hoàn tiền: Cố định hoặc theo bậc/danh mục."
     - `Category Restriction`: "Chỉ hoàn tiền cho các danh mục được chọn. Các danh mục khác sẽ là 0%."
  4. **Visual Feedback**: Dynamic preview of the cashback logic tree.
- **Status**: [PENDING]

## 🧪 Phase 4: Verification & Cleanup
- **Goal**: Ensure everything works and remove legacy JSON parsing where possible.
- **Tasks**:
  1. Test with VCB Signature (Fallback logic).
  2. Test with VPBank Lady (Multi-tier logic).
  3. Remove deprecated fields/logic in Phase 16.
- **Status**: [PENDING]
