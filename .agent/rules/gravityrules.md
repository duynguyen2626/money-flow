# PATCH 2 — .agent/gravityrules.md
# Goal: tighten execution behavior so the agent doesn't "invent" layout, and enforces screenshot-driven UI.

## Add this section under rules (preferably under "Workflow" / "Execution" / "UI Rules"):
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
