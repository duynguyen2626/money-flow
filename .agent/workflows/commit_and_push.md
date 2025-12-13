---
description: Commit and Push Changes
---

# .agent/workflows/commit_and_push.md — Dynamic (Template)

> Purpose: avoid rewriting branch/commit instructions each phase.
> This workflow uses placeholders.

## Required Inputs

* `PHASE_ID` (example: `78.1`)
* `SCOPE_SLUG` (example: `ACCOUNT-UI-POLISH-LOGIC-FIXES`)
* `COMMIT_TITLE` (example: `ACCOUNT UI POLISH & LOGIC FIXES`)
* `BASE_BRANCH` (default: `main`)

## Derived

* `BRANCH_NAME=PHASE-${PHASE_ID}-${SCOPE_SLUG}`
* `COMMIT_MSG=PHASE ${PHASE_ID} - ${COMMIT_TITLE}`

## Workflow

1. Create Branch

```bash
git checkout ${BASE_BRANCH}
git pull --rebase
git checkout -b ${BRANCH_NAME}
```

2. Add All

```bash
git add .
```

3. Commit

```bash
git commit -m "${COMMIT_MSG}"
```

4. Push

```bash
git push -u origin ${BRANCH_NAME}
```

## Notes

* If multiple commits are needed, keep commit messages consistent:

  * `PHASE ${PHASE_ID} - <SUBTITLE>`
* Never push directly to `main`; use PR flow.
