# Handover: Sheet Button UI Enhancement (Round 12)

## Issue
-   User report: Khó biết đang Sync cho Cycle nào. Chuyển Cycle rồi nhưng sợ Sync nhầm.
-   Yêu cầu: Hiển thị tên Target Sheet ngay trên nút Button.

## Fix Applied (`src/components/people/manage-sheet-button.tsx`)
-   Thay đổi label nút Sync:
    -   Hành động: `Sheet` -> `2025-12` (Cycle Tag).
    -   Format: Font Mono, Medium weight để dễ nhìn.
    -   Trạng thái:
        -   Normal: `[Icon] 2025-12`
        -   Syncing: `[Spin] Syncing`

## Verification
-   Check UI trên Page Detail.
-   Khi switch qua các tháng (Pill), nút Sheet phải đổi tên theo (VD: 2025-11, 2025-10...).
-   Ấn Sync ở tháng nào -> Sync đúng cho tháng đó.

## Note
-   Logic Sync vốn dĩ đã đúng (nhận prop `cycleTag` từ parent), chỉ là UI chưa hiển thị nên User hoang mang.
