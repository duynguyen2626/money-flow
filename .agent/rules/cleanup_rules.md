# Agent Cleanup Rules

> **Purpose**: Rules to prevent agents from creating temporary files that clutter the repository.

---

## 🚫 DO NOT Create These Files

### Build/Lint Logs
**NEVER** create these files in the project root:
- `build_error.txt`, `build_error_utf8.txt`
- `build_output.txt`, `build_output_utf8.txt`
- `build.log`
- `lint_output.txt`, `lint_filtered.txt`, `lint_final.txt`
- `lint_phase*.txt`, `lint_results_*.txt`
- `lint_restore.txt`

**Why**: These files clutter the repository and are not needed in version control.

**Alternative**: If you need to save build/lint output for debugging:
1. Create a file in `.logs/` folder (e.g., `.logs/build_error.txt`)
2. The `.logs/` folder is gitignored and will not be committed
3. **Clean up** the `.logs/` folder before completing your task

---

### Temporary Debug Files
**NEVER** create these files in the project root:
- `changes.txt`
- `debug.txt`, `test.txt`
- `temp.txt`, `tmp.txt`
- `image.png` (unless it's a legitimate asset in `public/` or `.agent/`)
- `categories_*.csv` (unless it's test data in a proper location)
- `handover_*.md` (unless it's in `.agent/` with proper naming)

**Why**: These are temporary files that should not be committed.

**Alternative**: 
- Use `.logs/` folder for temporary files
- Use proper naming and location for legitimate files

---

### Random Markdown Files
**NEVER** create these files in the project root:
- `notes.md`, `scratch.md`
- `todo.md` (use `.agent/task.md` instead)
- `plan.md` (use `.agent/PHASE_X_PLAN.md` instead)

**Why**: Proper documentation belongs in `.agent/` with structured naming.

**Alternative**:
- Use `.agent/` folder for documentation
- Follow naming conventions (e.g., `HANDOVER_PHASE_X.md`, `PHASE_X_PLAN.md`)

---

## ✅ Proper File Locations

### Documentation
- **Onboarding**: `.agent/prompts/onboarding.md`
- **Handovers**: `.agent/HANDOVER_PHASE_X.md`
- **Plans**: `.agent/PHASE_X_PLAN.md`
- **Rules**: `.agent/rules/`
- **Workflows**: `.agent/workflows/`

### Temporary Files
- **Build logs**: `.logs/build_*.txt` (gitignored)
- **Lint logs**: `.logs/lint_*.txt` (gitignored)
- **Debug files**: `.logs/debug_*.txt` (gitignored)

### Assets
- **Images**: `public/` or `.agent/` (for documentation screenshots)
- **CSV data**: `public/data/` or test fixtures in `src/__tests__/fixtures/`

---

## 🧹 Cleanup Checklist

**Before completing your task**, ensure:
- [ ] No `build_*.txt` or `lint_*.txt` files in project root
- [ ] No temporary files (`changes.txt`, `debug.txt`, etc.) in project root
- [ ] `.logs/` folder is empty or contains only relevant debug files
- [ ] All documentation is in `.agent/` with proper naming
- [ ] All assets are in proper locations (`public/`, `.agent/`)

**How to clean up**:
```bash
# Move temporary files to .logs/
mv build_*.txt lint_*.txt changes.txt .logs/ 2>/dev/null || true

# Or delete them if not needed
rm -f build_*.txt lint_*.txt changes.txt

# Check for other temporary files
ls -la | grep -E "\.txt$|\.log$|\.csv$"
```

---

## 📝 Commit Message Guidelines

When cleaning up files, use this commit message format:
```
chore: cleanup temporary files

- Move build/lint logs to .logs/
- Remove temporary debug files
- Ensure .gitignore is up to date
```

---

## 🚨 Enforcement

**Git Pre-commit Hook** (Optional):
You can add a pre-commit hook to prevent committing these files:

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Check for temporary files
if git diff --cached --name-only | grep -E "^(build_|lint_|changes\.txt)"; then
  echo "ERROR: Temporary files detected. Please move to .logs/ or delete."
  exit 1
fi
```

---

## 🎯 Summary

**Golden Rule**: If it's temporary, put it in `.logs/`. If it's documentation, put it in `.agent/`.

**Before completing any task**:
1. Check project root for temporary files
2. Move to `.logs/` or delete
3. Clean up `.logs/` if needed
4. Commit cleanup changes

---

**Last Updated**: 2026-02-01  
**Version**: 1.0  
**Maintained By**: Money Flow 3 Team
