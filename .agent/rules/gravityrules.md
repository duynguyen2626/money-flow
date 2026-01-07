# Gravity Rules

## Mandatory Quality Checks (CRITICAL)

Before every git commit and git push, you MUST run the following commands and they MUST pass. No exceptions.

\\\ash
# 1. Clean build check
npm run build
\\\

> [!IMPORTANT]
> Failure to run npm run build before committing is a violation of project integrity. If Vercel build fails due to a TypeScript error you should have caught locally, you MUST fix it immediately.

## Development Workflow

- **Branching**: Always work on a feature/sprint branch (sprint-X.Y).
- **Commits**: Use descriptive commit messages.
- **Vibe Coding**: While speed is encouraged, quality via npm run build is non-negotiable.

## UI & Design

- **Sticky Tabs**: In TransactionForm, the type tabs must be sticky top-0.
- **Layout Jumping**: Ensure TransactionForm has a stable min-height to prevent layout shifts.
- **Avatars**: Use square avatars (rounded-none) for people.
- **Rectangular Icons**: Bank and shop logos should be rectangular, not forced into circles.

## Domain Logic

- **FIFO Repayment**: Always follow the FIFO cascading logic for debt repayments as defined in domain_logic.md.
- **Auto-Selection**: Receivable accounts MUST be auto-selected based on owner_id when a person is picked.
