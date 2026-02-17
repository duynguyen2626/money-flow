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

## 🚀 Current Milestone: Phase 15 (Feb 2026)
**Focus**: Account Intelligence & UI Refinements

### Key Deliverables:
- ✅ **Account Table Intelligence**: Implemented Intelligence Legend row with amount color-coding (Red > 100M, Orange 50-100M, Green < 50M).
- ✅ **Coverage Insight**: Added "Coverage" hover-card to track external credit exposure (total limit vs. debt for non-primary holders).
- ✅ **UX Refinements**: Fixed all sticky header offsets and scroll blurring. Added "Reset Sort" and "Clear Search" functionality.
- ✅ **Sanitized Documentation**: Moved all legacy phase plans and handovers to `.agent/archive/`.
- ✅ **Standardized Workflows**: Implemented dynamic context-loading prompts for smarter AI agent onboarding.

---

## 📚 Documentation System

### 🤖 For AI Agents (MANDATORY)
1. **[MASTER_CONTEXT_LOAD.md](./.agent/prompts/MASTER_CONTEXT_LOAD.md)**: Run this first to initialize your session with full repo context.
2. **[TASK_TEMPLATE.md](./.agent/prompts/TASK_TEMPLATE.md)**: Use this template for defining and executing specific tasks.
3. **[ONBOARDING.md](./.agent/prompts/ONBOARDING.md)**: Core onboarding guide and reading list.

### 📖 For Developers & Users
- **[AGENT_CONTEXT.md](./.agent/AGENT_CONTEXT.md)**: Single source of truth for current project state and technical architecture.
- **[Cashback Guide](./.agent/workflows/cashback-config-guide.md)**: JSON samples for complex card rules (Diamond/Lady).
- **[Vietnamese User Manual](./.agent/MANUAL_GUIDE_ADVANCED_VI.md)**: Hướng dẫn hạch toán và quy tắc cashback nâng cao.

---

## 🏗️ Project Structure
- `src/app`: Page routes and layouts.
- `src/components`: UI components (moneyflow, people, etc).
- `src/services`: Core business logic (Single source of truth).
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

**Version**: 3.1.0 (Phase 15)  
**Last Updated**: Feb 17, 2026  
**License**: Internal project - Money Flow 3
