# Agent Handover Prompts

## Prompt A: Repository Analysis & Preparation

```
Tôi đang có 1 feature sidebar navigation bị lỗi. Trước khi fix, hãy research và chuẩn bị:

1. Đọc file SIDEBAR_FIX_HANDOVER.md để hiểu 3 critical issues đang gặp
2. Đọc .github/copilot-instructions.md để hiểu tech stack (Next.js 16, React 19, TypeScript)
3. Đọc README.md để hiểu project structure
4. Kiểm tra các files liên quan:
   - src/components/navigation/sidebar-nav-v2.tsx (flyout logic)
   - src/components/navigation/page-transition-overlay.tsx (spinner issues)
   - src/components/navigation/app-layout-v2.tsx (layout wrapper)
   - src/components/navigation/unified-recent-sidebar.tsx (recent items)
   - src/components/navigation/RecentAccountsList.tsx (data fetching in flyout)

5. Phân tích root cause của 3 issues:
   - Flyout menu xuất hiện dưới nav thay vì bên phải
   - removeChild error khi navigate
   - Page transition spinner không hoạt động

Sau khi đọc xong, tóm tắt cho tôi:
- Root cause chính xác của từng issue
- Files nào cần sửa
- Approach để fix (theo priority từ handover doc)
- Có cần rollback hay đơn giản hóa design không

KHÔNG fix gì cả, chỉ research và report.
```

---

## Prompt B: Take Handover & Fix Issues

```
Tôi cần fix 3 critical issues trong sidebar navigation feature. Đã có handover file sẵn.

**Context**:
- Branch: feat/sidebar-enhancement-v2
- PR #232 (DO NOT MERGE yet)
- Last commit: 97f0074

**Tasks**:
1. Đọc SIDEBAR_FIX_HANDOVER.md để hiểu tình trạng hiện tại
2. Fix theo priority order từ handover doc:
   - Priority 1: Flyout positioning (use React Portal + getBoundingClientRect)
   - Priority 2: removeChild crash (prevent unmount during navigation)
   - Priority 3: Page transition overlay (hook into click events hoặc remove)

**Yêu cầu**:
- Follow coding standards từ .github/copilot-instructions.md
- Mỗi fix phải test ngay, KHÔNG move sang issue tiếp theo nếu chưa verify
- Sau mỗi fix thành công, commit với descriptive message
- Nếu fix không được sau 2 attempts, báo ngay và đề xuất alternative approach
- Ưu tiên working solution hơn là perfect code

**Verification checklist** (từ handover doc):
- [ ] Hover "Accounts" → flyout xuất hiện bên phải (không bị che)
- [ ] Click item trong flyout → navigate không bị crash
- [ ] Click "Dashboard" → spinner hiện
- [ ] Build pass: pnpm build (no TS errors)
- [ ] No console errors khi navigate

Nếu gặp blockers, đề xuất alternative solutions:
- Option A: Inline expansion thay vì hover flyout
- Option B: Click-to-open thay vì hover
- Option C: Rollback về stable version

Bắt đầu với Priority 1 fix. Report status sau mỗi attempt.
```

---

## Prompt C: Alternative — Simplify & Ship

```
Sidebar navigation feature đang blocked với 3 critical issues. Thay vì debug tiếp, hãy đơn giản hóa để ship nhanh:

**Approach**:
1. Đọc SIDEBAR_FIX_HANDOVER.md section "Alternative: Rollback & Simplify"
2. Implement Option A: Inline expansion (không dùng hover flyout nữa)
   - Remove flyout logic từ sidebar-nav-v2.tsx
   - Thay bằng click-to-expand inline (như design cũ)
   - Giữ search highlight và recent items section
3. Remove PageTransitionOverlay component (không work, không cần thiết)
4. Cleanup duplicate files theo handover doc
5. Test thoroughly:
   - Click "Accounts" → expand inline, show recent accounts
   - Click "People" → expand inline, show recent people
   - Search "dashboard" → highlight yellow
   - Navigate between pages → no crashes, no removeChild errors
6. Update PR description với changes và why we simplified
7. Ready to merge

**Goal**: Ship stable sidebar trong 1-2 hours thay vì debug thêm 1 ngày.

KHÔNG fix hover flyout nữa. Focus on working, simple solution.
```

---

## Quick Command Reference

```bash
# Check current branch
git status

# See what's changed
git diff SIDEBAR_FIX_HANDOVER.md

# Build and check errors
pnpm build

# Dev server (auto port)
pnpm dev

# Lint before commit
pnpm lint

# Clean up duplicate files
rm -f build*.txt push_output*.txt 'src/**/route 2.ts' 'src/**/page 2.tsx'

# Rollback if needed
git checkout main -- src/components/navigation/
git checkout main -- src/components/moneyflow/app-layout.tsx
```

---

## Files to Focus On

| File | Lines | Purpose |
|------|-------|---------|
| `SIDEBAR_FIX_HANDOVER.md` | 382 | Complete issue analysis & solutions |
| `sidebar-nav-v2.tsx` | 198 | Main nav logic (lines 82-107: flyout) |
| `page-transition-overlay.tsx` | 108 | Spinner (lines 60-86: broken logic) |
| `app-layout-v2.tsx` | 188 | Layout wrapper (may affect stacking context) |
| `RecentAccountsList.tsx` | 86 | Data fetch in flyout (may cause removeChild) |

---

## Critical Context

- **User frustration level**: Very high ("lần cuối nhá", "thực sự bạn có fix không vậy?")
- **Previous attempts**: 6 different CSS approaches for flyout → all failed
- **Build status**: ✅ Passes, no TS errors
- **Runtime status**: ❌ 3 critical bugs (see handover doc)
- **Recommendation**: Consider simplifying instead of complex fixes

---

## Success Criteria

**Option 1 (Fix)**: All 3 issues resolved, no new bugs, ready to merge  
**Option 2 (Simplify)**: Working navigation with inline expansion, stable, ready to merge  
**Option 3 (Rollback)**: Revert to main branch navigation, focus on other priorities

Pick one approach and execute. Don't get stuck in debug loop.
