# Money Flow 3

Money Flow 3 is a comprehensive personal finance application focused on transaction management, debt tracking, and spending analytics.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Shadcn UI
- **Database:** Supabase (PostgreSQL)
- **State/Data:** React Server Components, Server Actions
- **Package Manager:** pnpm (Recommended)

---

## 🚀 Current Milestone: Phase 17 (March 2026)
**Focus**: PocketBase Data Migration & ID Stabilization

### Key Deliverables:
- ✅ **PocketBase Integration**: Implemented server-side services for PocketBase (Server-side & Client-side clients).
- ✅ **ID Unification**: Solved fragmentation between Slug (8 chars), UUID (Supabase), and Native ID (PocketBase).
- ✅ **Transaction Listing Fix**: Resolved 400 Bad Request errors in transaction fetching caused by invalid 'expand' fields.
- ✅ **Data Quality**: Re-migrated Categories, Shops, and People data for visual consistency.

---

## 📚 Documentation System

### 🤖 For AI Agents (MANDATORY)
1. **[MASTER_CONTEXT_LOAD.md](./.agent/prompts/MASTER_CONTEXT_LOAD.md)**: Run this first to initialize your session with full repo context.
2. **[TASK_TEMPLATE.md](./.agent/prompts/TASK_TEMPLATE.md)**: Use this template for defining and executing specific tasks.
3. **[ONBOARDING.md](./.agent/prompts/ONBOARDING.md)**: Core onboarding guide and reading list.
4. **[handover_pocketbase_fix.md](./.agent/handovers/handover_pocketbase_fix.md)**: CRITICAL handover notes for PocketBase migration state.


### 📖 For Developers & Users
- **[AGENT_CONTEXT.md](./.agent/AGENT_CONTEXT.md)**: Single source of truth for current project state and technical architecture.
- **[Cashback Guide](./.agent/workflows/cashback-config-guide.md)**: JSON samples for complex card rules (Diamond/Lady).
- **[Vietnamese User Manual](./.agent/MANUAL_GUIDE_ADVANCED_VI.md)**: Hướng dẫn hạch toán và quy tắc cashback nâng cao.

---

## 🏗️ Project Structure
- `src/app`: Page routes and layouts.
- `src/components`: UI components (moneyflow, people, etc).
- `src/services/pocketbase`: New PocketBase service layer.
- `src/services`: Core business logic (Transitioning from Supabase to PocketBase).
- `src/actions`: Server actions for data mutation.
- `src/types`: TypeScript definitions.

---

## 🚨 Development Standards (CRITICAL)

### 1. UI Strict Rules
- **FORCE SQUARE**: Icons and avatars MUST use `rounded-none`. NO cropping or borders.
- **NO MONOSPACE**: Do not use monospace fonts (`font-mono`) for UI text.
- **DROPDOWNS**: Always test scrollable visibility for popovers and selects.

### 2. Quality Gates
Before committing code, you **MUST** ensure:
```bash
# 1. Update lockfile (Critical for Vercel)
pnpm install

# 2. Check for linting errors
pnpm lint

# 3. Verify build succeeds
pnpm build
```

**Do not commit if build or lint fails.**

---

**Version**: 3.3.0 (Phase 17)  
**Last Updated**: March 7, 2026  
**License**: Internal project - Money Flow 3
