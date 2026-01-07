# Sprint 5.1 Handover Context

## Rules for Next Agent
- **Fix Build First:** Priority #1.
- **Verification:** Do not mark as "Fixed" until auto-pick is verified in browser.

## 🎯 Prompts dành cho Agent tiếp theo

### Prompt 1: Tìm hiểu dự án và bối cảnh (Onboarding)
> "Hãy đọc kỹ các file `README.md`, `.agent/workflows/task.md` và `.agent/context/sprint_5_1_handover.md` để nắm bắt kiến trúc và tiến độ hiện tại của dự án Money Flow 3. Sau đó, hãy scan qua file `src/components/moneyflow/transaction-form.tsx` để hiểu logic auto-pick `debt_account_id` và UI 'Auto-Linked' vừa được triển khai. Mục tiêu của bạn là tiếp tục Sprint 5.1, giải quyết các blocker về build và verify tính năng."

### Prompt 2: Sửa lỗi Receivable Account (Fixing)
> "Vấn đề: Khi edit giao dịch Repayment, 'Receivable Account' (debt_account_id) không tự động chọn và dropdown đang bị lỗi không tương tác được.
> Nhiệm vụ của bạn:
> 1. Tìm và xóa lỗi cú pháp `d })` đang làm hỏng build (kiểm tra các thay đổi gần đây trong `transaction-form.tsx`).
> 2. Debug `useEffect` đồng bộ `debt_account_id` (khoảng dòng 2470-2540) và logic `isAutoLinked`. Đảm bảo `debtAccountByPerson` trả về đúng account dựa trên `owner_id`.
> 3. Verify UI `DestinationAccountInput` đảm bảo nó không bị unmount bất ngờ và nút 'Change' hoạt động để hiện lại Combobox."

## Objective
Forcing `debt_account_id` (Receivable Account) auto-selection in the `TransactionForm.tsx` component when a person is selected in repayment/debt/transfer modes.

## Current State
- **Logic Implemented:**
    - `debtAccountByPerson` memo (lines 320-339) updated to search by `owner_id`.
    - `useEffect` for synchronization (lines 2470-2540) separated into:
        - Aggressive auto-pick (forces the value).
        - Fallback search (finds likely candidates).
        - Asynchronous "ensure" (creates if missing).
- **UI Implemented:**
    - Read-only display (badge) replaces the dropdown when an account is auto-linked.
    - "Change" button added to allow manual override.
- **Blocker:**
    - The build is failing with `Type error: Declaration or statement expected. d })` at `.next/dev/types/routes.d.ts:115:3`.
    - Because of the build failure, the latest UI changes haven't been verified in the browser.
    - The user reports "vẫn không tự pick" (still not auto-picking), likely due to the build failure or a subtle logic flaw that needs debugging once the build is fixed.

## Next Steps for the Next Agent
1. **Fix the Build:** Identify the source of the `d })` syntax error. It might be a stray character in `src/components/moneyflow/transaction-form.tsx` or a corrupted cache.
2. **Verify Auto-Pick:** Once the build is fixed, test if selecting "Ngọc" auto-fills the "Receivable - Ngọc" account.
3. **Debug Logic:** If it still doesn't auto-pick, check the console logs (lots of `[Form Sync]` logs were added) to see where it's failing.
