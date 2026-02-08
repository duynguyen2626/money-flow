# Money Flow 3 - Glossary & Abbreviations

This document provides a mapping of long terms used in the codebase to their corresponding abbreviations for efficiency and consistency.

| Full Term | Abbreviation | Use Case |
|-----------|--------------|----------|
| **Transactions** | `txn` | Filenames, variables, URLs (e.g., `txn-actions.ts`) |
| **People** | `pp` | Quick references, internal states |
| **Accounts** | `acc` | Loop variables, mapping keys |
| **Categories** | `cat` | Loop variables, selection IDs |
| **Subscriptions / Services** | `sub` / `svc` | Variable names (e.g., `activeSubs`) |
| **Unified Transaction Table** | `UTT` | Internal documentation, component discussions |
| **Transaction Slide V2** | `TSV2` | Internal documentation |
| **Internationalization** | `i18n` | Localization logic |
| **Google Sheets** | `GS` | Sync logic, external links |
| **Bulk Selection** | `bulk` | Batch actions, selection sets |
| **Final Price** | `fp` | Calculation logic |
| **Cashback** | `cb` | Rewards tracking |

---
**Standard Usage**:
- Use full terms for UI labels (e.g., "Transactions").
- Use abbreviations for technical implementations (e.g., `txnId`, `ppList`).
