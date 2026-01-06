
## Scope 4: Split Bill & Debt Enhancements

- [x] **Scope 4.1: Split Bill UX & Copy Combined**
    - [x] Remove legacy `[SplitBill]` prefix from automated notes.
    - [x] **Edit Split Bill**: Dialog to manage amount, title, and participants (Add/Remove/Void).
    - [x] **Copy Combined**: Manual Canvas implementation for "Bill + QR" image.
        - [x] High-DPI canvas (2x scale).
        - [x] Dynamic sizing (QR min-width 350px).
        - [x] "Lab" color fix (Style freezing).
    - [x] UI Polish: Larger text size for bill readability (36px Title, 22px Body).

- [ ] **Scope 4.2: Consolidated Debt Repayment (Cascading)**
    - [ ] **Goal**: Allow single "Lump Sum" repayment to settle multiple past debt months.
    - [ ] **Logic (Surplus Cascading)**:
        - [ ] Calculate `Surplus` in current repayment month (Repay > Debt).
        - [ ] Find older `Active` debt months.
        - [ ] "Pour" surplus into oldest months first -> settle them.
        - [ ] UI visual indicator: "Settled via Surplus T[Date]".
    - [ ] **Implementation**: Service-level logic in `getDebtByTags` (No DB schema change).