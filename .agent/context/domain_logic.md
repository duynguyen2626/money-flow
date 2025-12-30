# .agent/context/domain_logic.md
# Purpose: data format standards and deprecation guardrails.

## Data Format Standards (hard rules)

### Month tags

- The only allowed month tag format is: `YYYY-MM` (example: `2025-12`).
- Forbidden formats: `DEC25`, `DEC 25`, `12-2025`, `2025/12`, etc.
- UI display uses `YYYY-MM`. If a localized display is needed later, derive it from `YYYY-MM`.

### Cycle vs Tag naming

- Use consistent naming across code:
  - `cycleTag` for monthly cycle keys (`YYYY-MM`).
- Avoid ambiguous names like `tag` when the meaning is monthly cycle.
- If a legacy field is named `tag` but stores month cycles, treat it as `cycleTag` in code and plan migration separately.

### Deprecation guardrails

- Do not reintroduce removed/legacy schema concepts:
  - `transaction_lines` is deprecated/removed; do not query it.
  - Image sources must use `image_url` (no `logo_url`).
- If references to deprecated columns/tables exist:
  - Replace usage with the current schema equivalents.
  - Remove dead code paths when safe.

### Quick Add Templates

- Templates live in `quick_add_templates` and are scoped by `profile_id = auth.uid()`.
- Template names are normalized to lowercase for uniqueness.
- RLS policies must allow select/insert/update/delete for the owning profile.

### Temp Transaction View

- Temporary transaction view uses `/transactions/temp-<transaction_id>`.
- The view is ephemeral; refresh/close should warn users that state is lost.

### API behavior expectations

- Any create/update flows must be idempotent when possible.
- Avoid client-side secrets; sheet sync/creation must be server-side only.
