# PATCH 3 — .agent/domain_logic.md
# Goal: lock tag format, naming consistency, and stop "legacy" columns/relationships from creeping back.

## Add this section under domain conventions (or create a "Data Format Standards" section):
## Data Format Standards (hard rules)
### Month tags
- The only allowed month tag format is: `YYYY-MM` (example: `2025-12`)
- Forbidden formats:
  - `DEC25`, `DEC 25`, `12-2025`, `2025/12`, etc.
- UI display:
  - Default display uses `YYYY-MM`.
  - If a localized display is needed later, it must be derived from `YYYY-MM` (do not store localized strings).

### Cycle vs Tag naming
- Use consistent naming across code:
  - `cycleTag` for monthly cycle keys (`YYYY-MM`)
  - Avoid ambiguous names like `tag` when the meaning is monthly cycle.
- If a legacy field is named `tag` but stores month cycles, treat it as `cycleTag` in code (mapper/adapter), and plan migration separately.

### Deprecation guardrails
- Do not reintroduce removed/legacy schema concepts:
  - `transaction_lines` is deprecated/removed — do not query it.
  - Image sources must use `image_url` (no `logo_url`).
- If you see references to deprecated columns/tables:
  - Replace usage with the current schema equivalents
  - Remove dead code paths when safe

### API behavior expectations
- Any create/update flows must be idempotent when possible.
- Avoid client-side secrets; sheet sync/creation must be server-side only.
# OPTIONAL: paste-once helper script to apply patches safely (no manual editing inside the files)
# Run from repo root. It appends patch blocks to the end of each file.
# If the file paths differ, adjust them before running.

apply_patch() {
  local file="$1"
  local marker="$2"
  local content="$3"

  mkdir -p "$(dirname "$file")"
  touch "$file"

  if grep -q "$marker" "$file"; then
    echo "SKIP: $file already has marker"
  else
    printf "\n\n%s\n%s\n" "$marker" "$content" >> "$file"
    echo "OK: patched $file"
  fi
}

GEMINI_MARKER="## PATCH_MARKER: Non-negotiable gates (must follow)"
GRAVITY_MARKER="## PATCH_MARKER: UI changes must be screenshot-locked"
DOMAIN_MARKER="## PATCH_MARKER: Data Format Standards (hard rules)"

apply_patch ".agent/gemini.md" "$GEMINI_MARKER" "$(cat <<'EOF'
### Non-negotiable gates (must follow)
- Before editing any code, you MUST read these files and restate (in 5 bullets max) how you will apply them:
  - ./.agent/gemini.md
  - ./.agent/gravityrules.md
  - ./.agent/domain_logic.md
  - ./README.md
- Every change must keep business logic intact unless the task explicitly says otherwise.
- Build gate is mandatory:
  - Run: `npm run build`
  - If it fails, fix it in the same PR. Do not leave build broken.

### UI refactor rule: mobile must be split, reusable
- When a page has complex desktop UI (badges, chips, sticky table, hover actions), DO NOT “make it responsive” by hiding columns inside the same component.
- Instead: create a dedicated, reusable mobile component and keep the desktop component clean.
- Prefer the Transactions refactor pattern:
  - A reusable mobile row/card component
  - A page-specific mapper file
  - A thin adapter component per domain (transactions/people/accounts)
- Naming convention:
  - `XxxDesktop.tsx`
  - `XxxMobile.tsx`
  - `xxxToMobileRow.ts` (mapper)
  - `MobileRecordRow.tsx` (reusable base)

### Definition of Done (DoD)
- UI matches the provided mock screenshots (spacing + structure), not “close enough”.
- Mobile:
  - No overlap
  - No horizontal scrolling
  - No missing columns / wrong data mapping
- Desktop:
  - Works on large (27") and laptop (13") screens without excessive empty margins
- Build passes: `npm run build`
- Provide:
  - files changed list
  - manual verification checklist
  - quick notes on tradeoffs
EOF
)"

apply_patch ".agent/gravityrules.md" "$GRAVITY_MARKER" "$(cat <<'EOF'
### UI changes must be screenshot-locked
- If the user provides mock screenshots or reference UI images, treat them as the source of truth.
- Do NOT introduce new sections, cards, or rearrange header layout unless explicitly requested.
- If something is ambiguous, choose the option that matches the screenshot layout.

### Do not mix desktop and mobile rendering logic in one table
- For complex tables or dense rows:
  - Desktop table layout remains desktop-first.
  - Mobile must use a dedicated list/card layout component.
- Mobile list/card must show correct data mapping (no shifted columns, no missing fields).

### Styling constraints
- Avoid “creative rounding”:
  - Do not force `rounded-full` on rectangular images/logos.
  - Only use rounding where the domain requires it:
    - People avatars can be rounded.
    - Card/account logos should remain rectangular with `object-contain`.
- Keep icon sizes consistent across a page (define a small set: 16/20/24/32/48).

### Change scope discipline
- Prefer small incremental refactors:
  - Create new components first
  - Switch consumers
  - Delete old code only after the new path is verified
- Do not refactor unrelated files “because it’s nicer”.
EOF
)"

apply_patch ".agent/domain_logic.md" "$DOMAIN_MARKER" "$(cat <<'EOF'
## Data Format Standards (hard rules)
### Month tags
- The only allowed month tag format is: `YYYY-MM` (example: `2025-12`)
- Forbidden formats:
  - `DEC25`, `DEC 25`, `12-2025`, `2025/12`, etc.
- UI display:
  - Default display uses `YYYY-MM`.
  - If a localized display is needed later, it must be derived from `YYYY-MM` (do not store localized strings).

### Cycle vs Tag naming
- Use consistent naming across code:
  - `cycleTag` for monthly cycle keys (`YYYY-MM`)
  - Avoid ambiguous names like `tag` when the meaning is monthly cycle.
- If a legacy field is named `tag` but stores month cycles, treat it as `cycleTag` in code (mapper/adapter), and plan migration separately.

### Deprecation guardrails
- Do not reintroduce removed/legacy schema concepts:
  - `transaction_lines` is deprecated/removed — do not query it.
  - Image sources must use `image_url` (no `logo_url`).
- If you see references to deprecated columns/tables:
  - Replace usage with the current schema equivalents
  - Remove dead code paths when safe

### API behavior expectations
- Any create/update flows must be idempotent when possible.
- Avoid client-side secrets; sheet sync/creation must be server-side only.
EOF
)"
