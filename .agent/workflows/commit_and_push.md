---
description: Dynamic Story Commit Flow
---

description: Dynamic Story Commit Flow

.agent/workflows/commit_and_push.md — Story Sprint

Purpose: Standardize git flow for Story Sprints.

Required Inputs

STORY_ID (example: M1.1)

SLUG (example: ui-polish-people)

MESSAGE (example: Update transaction badges and fix favicon)

Workflow

Switch/Create Branch

# Ensure we are on main and up to date
git checkout main
git pull origin main

# Create new story branch
git checkout -b story/${STORY_ID}-${SLUG}


Stage & Commit

git add .
git commit -m "STORY ${STORY_ID}: ${MESSAGE}"


Push

git push -u origin story/${STORY_ID}-${SLUG}


Notes

Keep PRs focused. If M1.1 gets too big, split it into M1.1a, M1.1b.

Always self-review diffs before committing.