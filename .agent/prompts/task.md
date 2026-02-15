# Role: Senior Fullstack Engineer & System Architect
   
   # Goal: Reboot Cashback System (Phase 16) - "Smart Cashback Input"
   
   We have cleaned the old code. Now we build the **Cashback Configuration UI** in `AccountSlideV2.tsx` from scratch.
   The goal is to support complex real-world credit card policies (like VPBank Lady, VCB Signature) using a user-friendly UI that maps to our new database columns.
   
   # Database Schema (Reference)
     - `cb_type`: 'simple' | 'tiered'
     - `cb_base_rate`: numeric (0-100)
     - `cb_max_budget`: numeric
     - `cb_is_unlimited`: boolean
     - `cb_rules_json`: JSONB (Stores specific category rules or tier definitions)
   
   # 1. Logic Strategy & Data Mapping
   
     You must implement two distinct UI modes based on `cb_type`:
   
     ## Mode A: "Simple Strategy" (e.g., VCB Signature)
     - **Concept:** A fixed base rate for everything, with specific overrides for certain categories.
     - **UI Inputs:**
       - Base Rate (e.g., 0.5%)
       - Monthly Cap (Global max cashback, or Unlimited).
       - **Category Rules List:** Allow user to add `(Category -> Rate -> Cap)`.
         - Example: "Education" -> 10% -> Max 300k.
     - **DB Mapping:**
       - `cb_type` = 'simple'
       - `cb_base_rate` = 0.5
       - `cb_rules_json` = `[{ "cat_id": "edu", "rate": 10, "max": 300000 }, ...]`
   
     ## Mode B: "Volume-Tiered Strategy" (e.g., VPBank Lady)
     - **Concept:** Cashback rates depend on the **Total Monthly Spend**.
     - **UI Inputs:**
       - Base Rate (Catch-all rate for non-special categories).
       - **Tier Definition:** Allow adding spending milestones.
         - *Tier 1 (Default < Threshold):* Define rates/caps for specific categories.
         - *Tier 2 (Spend >= X):* Define HIGHER rates/caps for those categories.
     - **DB Mapping:**
       - `cb_type` = 'tiered'
       - `cb_rules_json` =
         ```json
         {
           "base_rate": 0.1, // The catch-all rate
           "tiers": [
             {
               "min_spend": 0,
               "policies": [
                 { "cat_id": "insurance", "rate": 7.5, "max": 150000 },
                 { "cat_id": "supermarket", "rate": 2.5, "max": 150000 }
               ]
             },
             {
               "min_spend": 15000000, // 15 Million VND
               "policies": [
                 { "cat_id": "insurance", "rate": 15.0, "max": 300000 },
                 { "cat_id": "supermarket", "rate": 5.0, "max": 300000 }
               ]
             }
           ]
         }
         ```
   
   # 2. Implementation Requirements
   
     ## A. Component Structure
     Create a new component `src/components/accounts/v2/forms/CashbackConfigForm.tsx` to keep `AccountSlideV2` clean.
     - **Selector:** A clear Switch or Tabs for [ Simple Policy ] vs [ Tiered Policy ].
     - **Dynamic Form:**
       - If **Simple**: Show inputs for Base Rate + List of Category Overrides.
       - If **Tiered**: Show inputs for "Min Spend Thresholds" and separate category lists for each threshold.
   
     ## B. Smart UX Features
     - **Category Picker:** Use the existing `CategoryPicker` component (or similar) when adding rules.
     - **Currency Handling:** Use `SmartAmountInput` for "Max Cap" and "Min Spend" fields to handle VND formatting (e.g., 15,000,000).
     - **Visual Feedback:**
       - Display a small summary sentence at the bottom.
       - *Example:* "Spend < 15M: Insurance gets 7.5%. Spend > 15M: Insurance gets 15%."
   
     ## C. Type Definitions
     Update `src/types/cashback.types.ts` to strictly type the `cb_rules_json` structure so we don't have `any` types floating around.
   
   # 3. Execution Plan
   
     1.  **Define Types:** Create the Interfaces for `SimpleCashbackConfig` and `TieredCashbackConfig`.
     2.  **Build UI Component:** Create the `CashbackConfigForm` with the mode switcher.
     3.  **Integrate:** Mount this form into `AccountSlideV2.tsx` (replacing the placeholder SVG).
     4.  **State Management:** Ensure `AccountSlideV2` correctly reads/writes these values to the `account` object before saving to Supabase.
   
   Let's start by defining the **TypeScript Interfaces** for the JSON structure to ensure we can handle the VPBank Lady example perfectly.