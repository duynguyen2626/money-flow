 Phase 1 – Icon Tab Browser
  Mục tiêu:
   Thay favicon đám mây Vercel bằng hệ thống icon liên quan tài chính, ưu tiên đơn giản trước, dynamic sau.
  Yêu cầu chung:
   Tạo favicon độ phân giải chuẩn (32×32 hoặc 64×64), nền trong suốt, rõ ràng ở kích thước nhỏ.
   Phong cách icon: đơn giản, flat, màu chủ đạo xanh lá / xanh teal để khớp tông Money Flow.
  Task 1 – Default favicon (ưu tiên triển khai trước)
   Mô tả:
    Thay favicon mặc định bằng một icon duy nhất cho toàn bộ app.
   Yêu cầu:
    Thiết kế icon túi tiền xanh hoặc cọc tiền xanh, đơn giản, dễ nhận dạng.
    Đảm bảo hiển thị tốt trên nền sáng và nền tối.
    Áp dụng favicon này cho mọi route nếu chưa sẵn sàng dynamic.
   Pros:
    Thực hiện nhanh, giảm cảm giác “app demo” do icon Vercel.
    Không đụng tới logic router, ít risk.
   Cons:
    Không phân biệt được tab Accounts, People, Txn khi mở nhiều tab.
  Task 2 – Dynamic favicon theo page (triển khai sau khi routing ổn định)
   Mô tả:
    Mỗi nhóm page có favicon riêng, giúp người dùng định hướng tốt hơn khi mở nhiều tab:
     Accounts list: icon ngân hàng / tòa nhà bank.
     Accounts details (/accounts/v2/details): icon thẻ tín dụng.
     People: icon 1 người.
     People details: icon nhiều người / group.
     Transactions (Txn): icon 2 mũi tên in/out.
     Category: icon tag.
   Dev note (Next.js + Vercel):
    Sử dụng next/head hoặc layout theo segment để set <link rel="icon"> theo route.
    Kiểm tra behavior khi chuyển route client-side để đảm bảo favicon update mượt, không flicker.
   Pros:
    UX cao, nhìn tab là biết đang ở phần nào của app.
    Cảm giác sản phẩm “polished”, giống SaaS mature.
   Cons:
    Cần thêm thời gian vẽ bộ icon nhỏ + wiring logic theo router.
    Có thể phát sinh bug nếu cấu trúc layout/route phức tạp.
  Guideline:
   Nếu dynamic gặp vấn đề, fallback về 1 favicon túi tiền xanh, nhưng giữ code structure sẵn cho future upgrade.

 Phase 2 – Header /accounts/v2/details (“Tổng quan tài khoản”)
  Mục tiêu:
   Làm header account details nhất quán với Accounts V2: rõ trạng thái, hạn mức, số dư nổi bật, phong cách tối giản.
  Bố cục:
   Header dạng card ngang, chia 2–3 cột, responsive:
    Cột trái: thông tin thẻ + trạng thái.
    Cột giữa: hạn mức tín dụng.
    Cột phải: số dư nổi bật.
   Desktop: 3 cột trên 1 hàng.
   Mobile: stack dọc 3 card, giữ hierarchy từ trái sang phải → trên xuống dưới.
  Nội dung chi tiết:
   Khối trái – Thông tin thẻ:
    Hiển thị:
     Logo thẻ (thumbnail nhỏ).
     Tên tài khoản: “Msb Online”.
     Badge trạng thái: ACTIVE (màu xám/xanh nhẹ, không quá chói, thể hiện stable).
    Phong cách:
     Text chính: đậm, dễ đọc.
     Badge ACTIVE: rounded pill, nền xám nhạt, text xanh lá đậm nhẹ.
   Khối giữa – Hạn mức tín dụng:
    Label: “Hạn mức tín dụng”.
    Giá trị: ví dụ “30.000.000”.
    Style:
     Label chữ nhỏ, màu xám trung tính.
     Value màu xám đậm, font lớn hơn 1–2 cấp so với label.
   Khối phải – Số dư nổi bật:
    Label: “Số dư hiện tại” hoặc “Balance”.
    Giá trị: số tiền hiển thị màu xanh lá (nhất quán với cột Balance ở Accounts V2).
    Nếu cần thêm thông tin phụ:
     Hiển thị Net value hoặc Available credit dạng text nhỏ bên dưới.
  Màu sắc:
   Xanh lá: dùng cho số dư dương / trạng thái tốt.
   Cam: dùng cho cảnh báo (gần chạm limit, unpaid bill, v.v.).
   Xám: dùng cho trạng thái trung tính/chưa hoàn thành.
  Phong cách:
   Tối giản, nhiều khoảng trắng, border mỏng, bo góc nhẹ.
   Không dùng quá nhiều icon trong header để tránh rối.
   Responsive: tránh text wrap lung tung, ưu tiên truncate với tooltip nếu tên tài khoản quá dài.

 Phase 3 – Goal Cards (“Mục tiêu tài chính”)
  Mục tiêu:
   Gom “Qualifying Status” + “Potential Profit” thành một khối Mục tiêu tài chính, dùng progress bar thể hiện tiến độ tới 3.000.000, consistent với cột Rewards ở Accounts V2.
  Bố cục:
   Một card lớn phía dưới header, tiêu đề: “Mục tiêu tài chính”.
   Bên trong chia 2 phần:
    Phần trên: thông tin tổng quan mục tiêu.
    Phần dưới: progress bar + status text.
  Nội dung:
   Header card:
    Title: “Mục tiêu tài chính”.
    Sub-label nhỏ: “Target: 3.000.000”.
   Thông tin chi tiết:
    Hàng 1:
     Badge trạng thái: “Qualified” / “Needs 951.077” (giữ logic như Accounts V2).
      Qualified: nền xanh lá nhạt, chữ xanh đậm.
      Needs: nền cam nhạt, chữ cam đậm.
     Text bên phải: “Est. reward: 204.9k” hoặc “Potential profit: …”.
    Hàng 2:
     Progress bar full width:
      Fill màu cam hoặc xanh tùy trạng thái:
       Đạt đủ/quá target: fill xanh lá 100%.
       Chưa đủ: fill cam, số % ở giữa bar.
      Bên dưới progress: text nhỏ:
       “2.048.923 / 3.000.000 (68%)”.
   Micro copy gợi ý:
    Khi Qualified:
     “Bạn đã đủ điều kiện nhận thưởng.”.
    Khi Needs:
     “Cần thêm 951.077 chi tiêu đủ điều kiện để đạt thưởng.”.
  Tông màu:
   Tương thích với Rewards cột bên Accounts V2:
    Bar nền nhạt, fill cam/xanh, value text rõ ràng.
   Sử dụng cam cho “đang tiến tới mục tiêu”, xanh cho “đã đạt”.
  UX notes:
   Click toàn bộ card “Mục tiêu tài chính” có thể mở modal/slide hiển thị breakdown chi tiết cashback/rewards (phase sau).
   Đảm bảo card trông rõ ràng cả trên desktop và mobile; trên mobile có thể stack:
    Title + Target.
    Status + Potential profit.
    Progress bar + text %.

 Phase 4 - Transaction Header Date Picker Fix
  Mục tiêu:
   Fix và điều chỉnh date picker trong Transaction Header theo yêu cầu (check branch fix/txn-header-date-picker).
  Tasks:
   [x] Fetch & Checkout branch
   [ ] Verify Date Picker logic (MonthYearPickerV2)
   [x] Fix issues if any

 Phase 5 - Date Picker & Cycle Interaction Refinement
  Mục tiêu:
   Điều chỉnh hành vi đóng modal của Date Picker và ràng buộc logic giữa Cycle Filter và Date Picker.
  Tasks:
   [ ] MonthYearPickerV2: Remove auto-close on selection (Date/Month/Range).
   [ ] MonthYearPickerV2: Implement 'locked' mode when Cycle is selected (show toast on click).
   [x] TransactionHeader: Pass locked state to MonthYearPickerV2.

 Phase 6 - Transaction Interaction Refactor
  Mục tiêu:
   Chuyển đổi từ Real-time filtering sang Manual filtering (Apply/Clear).
   Viết lại Date Picker với UI/UX mới (Tabs, OK button, no auto-close).
   Thêm logic Confirm khi Clear filters.
  Tasks:
  - [x] Refine Transaction Badges & duplication Logic
- [x] Replace `AddTransactionDialog` with `TransactionSlideV2`
- [/] Fix Runtime Errors & Verify Build
    - [x] Fix `handleOptimisticUpdate` initialization order in `unified-transaction-table.tsx`
    - [ ] Run dev server and verify with browser tool
    - [ ] Run build to ensure no other regressions
- [ ] Final Walkthrough updater Clear action.

 Phase 7 - Filter UX Enhancements
  Mục tiêu:
   "Hybrid Filter Mode": Filter realtime nếu đang ở chế độ Filter (hasActiveFilters=true).
   Strict Date/Cycle Rules: Visually disable Date Picker keys when Cycle is active.
  Tasks:
   [ ] TransactionHeader: Create wrapper handlers for realtime updates if active.
   [x] MonthYearPickerV2: Add visual disabled state (opacity, cursor) when locked.

 Phase 8 - Dynamic Filter Options
  Mục tiêu:
   Dropdowns (Account, People) chỉ hiển thị options available trong current filter result.
  Tasks:
   [ ] UnifiedTransactionsPage: Calculate availableAccountIds & availablePersonIds from filtered transactions.
   [x] TransactionHeader: Accept availableIds props and filter dropdown options accordingly.

 Phase 9 - UI Redesign & Modernization (New Branch)
  Mục tiêu:
   Modernize Transaction Header (Shadcn/Tailwind, fix scrollbar).
   Refactor Flow & Entity Column (Cycle as Date Range, Type Badge replaces Arrow).
   Simplify Category Column (Remove Type).
   Redesign Action Column.
  Tasks:
   [ ] Header: Fix container layout & scrollbar styling.
   [ ] Table: Update "Flow & Entity" column definition (Cycle Range 01-01 to 30-01, Type Badge in middle).
   [ ] Table: Update "Category" column definition (Remove Type).
   [ ] Table: Redesign "Action" layout.



 Phase 11 - Visual Refinement & Logic Fixes
  Mục tiêu:
   Fix visual discrepancies in Flow column and restore context-aware hiding logic.
  Tasks:
   [x] Adjust Single Flow width to match Double Flow alignment.
   [x] Standardize Cycle & Debt badges to h-6 (compact).
   [x] Restore Context Hiding logic (UnifiedTransactionsTable) for Details pages.
   [x] Fix table build error (missing closing tags).
   [x] Update Flow Legend (FROM = Orange, TO = Sky).

  Phase 16 - Cashback Reboot & Logic Stabilization
   Mục tiêu:
    Re-implement Cashback Section trong Transaction Slide V2 với logic mới, chính xác và dynamic.
   Tasks:
    [ ] Research branch `fix/categories-ui-optimization` để lấy logic display chuẩn.
    [ ] Xây dựng lại CashbackSection: dynamic theo amount, cycle, account, và category.
    [ ] Đảm bảo đồng nhất logic tính toán giữa Table (View) và Slide (Edit).
    [ ] Xử lý triệt để bài toán % vs decimal (0.5% = 0.005).
