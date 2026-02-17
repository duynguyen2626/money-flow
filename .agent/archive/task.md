Agent Guide: Fix Cashback Modal UX (Year/Cycle + Rewards Column)

  Context:
    - Dự án: money-flow-3 (Next.js 15, TS, Tailwind, Supabase)
    - Màn hình: Accounts Page (cards Credit Cards) + Cashback Transactions Modal
    - Code liên quan chính: 
      - src/components/accounts/v2/AccountRowV2.tsx
      - src/components/accounts/v2/AccountCycleTransactionsModal.tsx
      - src/actions/cashback.actions.ts
      - src/services/cashback.service.ts
    - Đọc trước khi code:
      - .agent/handover.md
      - .agent/MANUAL_GUIDE_VI.md
      - .agent/test_guide_vi.md
      - .agent/implementation_plan.md (nếu có trong brain/context)

  Task 1: Dropdown Year trong Cashback Transactions Modal không xổ ra
    Mục tiêu:
      - Dropdown YEAR (bên trái dropdown CYCLE trong modal Cashback Transactions) phải luôn xổ menu được khi click, kể cả khi chỉ có 1 năm (ví dụ 2026).
      - Trường hợp chỉ có 1 option thì vẫn hiển thị menu (để user thấy rõ là có filter theo year), hoặc ít nhất là có trạng thái "disabled" rõ ràng (UI feedback), nhưng KHÔNG được ignore click mà không feedback gì.

    Hướng research:
      - Mở file:
        - src/components/accounts/v2/AccountCycleTransactionsModal.tsx
      - Xác định:
        - Component đang dùng gì cho YEAR dropdown (Shadcn Select hay custom Select).
        - Nguồn data years: props truyền từ AccountRowV2 hay fetch trong modal.
      - Kiểm tra logic:
        - Có điều kiện kiểu:
          - if (years.length === 1) thì không render <Select> / set disabled / không render <SelectContent>
        - Có đang dùng value cố định mà không truyền onOpenChange / không render children khi list length === 1.
      - Fix gợi ý:
        - Luôn render Select + SelectTrigger + SelectContent đầy đủ, kể cả khi years.length === 1.
        - Nếu product muốn: có thể set Select disabled khi chỉ có 1 option nhưng khi disabled thì:
          - UI phải rõ (màu mờ + cursor-not-allowed).
          - Nhưng requirement hiện tại là “nó phải xổ ra (trong trường hợp chỉ có năm nay)” ⇒ ưu tiên GIỮ enable, cho xổ menu.
        - Confirm:
          - Click vào YEAR dropdown hiển thị menu (ít nhất 1 option).
          - Không bị block bởi state nào (ví dụ isLoading, !years.length, v.v.).

    Acceptance Criteria:
      - Click YEAR dropdown luôn hiển thị menu lựa chọn year.
      - Không có lỗi console.
      - UI nhất quán với CYCLE dropdown (cùng style component, cùng behavior khi chỉ có 1 option).

  Task 2: Cashback Transactions Modal mất data sau khi load
    Mô tả bug:
      - Modal "Cashback Transactions" hiển thị text “No contributing transactions found in this cycle.”
      - Nhưng cycle label đang là “2026-02 · 13 N” ⇒ theo business, cycle có 13 giao dịch contributing, nên modal phải có data.
      - Quan sát: có lúc transactions được load lên rồi “biến mất ngay lập tức” (flash một cái rồi empty).

    Hướng research (data + UI):
      - Mở:
        - src/components/accounts/v2/AccountRowV2.tsx
        - src/components/accounts/v2/AccountCycleTransactionsModal.tsx
        - src/actions/cashback.actions.ts (đặc biệt các server actions fetchAccountCycleTransactions, fetchAccountCycles, v.v.)
        - src/services/cashback.service.ts
      - Bước 1: Xác minh flow data:
        - Khi click vào “Cashback Transactions”:
          - AccountRowV2 mở modal + pass accountId, year, cycleId / cycleKey gì?
          - Modal gọi server action / service nào để lấy transactions.
        - Log:
          - Trong server action / service, log ra:
            - year, cycleIdentifier, accountId.
            - Số lượng transactions trả về.
        - Kiểm tra:
          - Có 2 lần gọi API cho cùng modal không? (1 lần trả về data, 1 lần trả về empty và override state?)
          - Có effect nào trong modal useEffect([...deps]) làm clear state sau khi set?
            - Ví dụ: khi year / cycle change, hoặc khi refreshKey change, nó reset danh sách trước khi fetch nhưng fetch thứ hai fail.
      - Bước 2: Kiểm tra RLS / query:
        - Dùng log trong cashback.service.ts:
          - Query supabase cho cycle tương ứng (13N) có thực sự trả về rows không.
        - Confirm bằng cách:
          - Chạy query tương tự trong Supabase SQL editor với accountId + cycleKey = "2026-02-13N" (tùy implement).
      - Bước 3: Kiểm tra mapping UI:
        - Kiểm tra có filter nào sau khi fetch:
          - Ví dụ filter chỉ giữ transactions có cashback_share_percent > 0, hoặc một field nào đó => nếu mapping sai, có thể filter hết về 0 length.
        - Kiểm tra useMemo / state:
          - Có đang derive filteredTransactions từ transactions + selectedTab, và selectedTab default làm empty không?

    Hướng fix gợi ý:
      - Đảm bảo:
        - Gọi fetchAccountCycleTransactions (hoặc tương đương) đúng tham số: accountId, year, cycleIndex/cycleCode.
        - Không có effect thứ hai clear list sau khi set.
      - Nếu bug đến từ double-fetch:
        - Debounce / tách effect: 
          - Effect A: set filters.
          - Effect B: fetch chỉ khi deps đủ (accountId && year && cycle).
        - Hoặc gắn guard:
          - Nếu result mới === undefined / error thì giữ data cũ, không set empty ngay.
      - Nếu bug đến từ filter:
        - Sửa predicate filter để giữ đúng transactions contributing theo business (dựa trên cashback_share_percent, is_excluded_from_cashback, v.v.).

    Acceptance Criteria:
      - Với cycle hiển thị “13 N”, modal phải hiển thị 13 transactions (hoặc đúng số transactions contributing, nhưng chắc chắn không phải empty).
      - Không có hiện tượng flash data rồi biến mất.
      - Khi đổi cycle / year, list update đúng, không bị reset về empty nếu backend có data.

  Task 3: Enhance UI – Cột Rewards trên Accounts Table
    Mô tả hiện trạng:
      - Cột "REWARDS" trong Accounts table (thẻ Credit Cards) đang:
        - Bar progress mỗi row có chiều dài khác nhau (không align theo cùng width / anchor).
        - Text lộn xộn, spacing không đồng nhất.
        - Có dòng “available spend ...”, “spend more ...” nhiều chữ.

    Mục tiêu:
      - Làm cột Rewards clean, consistent, readability cao.
      - Giảm chữ, chuẩn hóa wording.
      - Bar progress cùng chiều dài, cùng alignment giữa các row.

    Hướng cụ thể:
      - Mở:
        - src/components/accounts/v2/AccountRowV2.tsx (hoặc component con render cột Rewards, thường là một subcomponent).
      - Audit UI:
        - Tách logic tính toán (spent, available, requiredSpend, percent) ra 1 hook / helper (nếu chưa).
        - Tạo 1 subcomponent ví dụ: <AccountRewardsCell /> để tái sử dụng cho các loại account (child/parent) nếu logic giống.
      - Wording:
        - “spend more 951.077” → đổi thành gì ngắn gọn hơn, suggest:
          - “Needs 951.077” hoặc “Need 951.077”.
        - “available spend 732.899” → có thể giữ hoặc rút gọn:
          - “Available 732.899”.
        - Claim line có thể giữ “CLAIM 226.7k / 300k 76%”.
      - Layout:
        - Đặt phần text theo pattern:
          - Line 1: Wording chính (Available... hoặc Needs...) + số highlight.
          - Line 2: Progress bar full-width cố định (vd width = 100% của ô, padding 0 16px chung).
          - Line 3: Dòng nhỏ: "25-12 to 24-01 • CLAIM 226.7k / 300k • 76%".
        - Sử dụng flexbox để:
          - Bar progress luôn bắt đầu và kết thúc cùng vị trí cho tất cả rows (không dựa vào text length).
        - Màu sắc:
          - Available: màu xanh / teal hiện tại.
          - Needs: màu cam/đỏ nhẹ (nhưng giữ consistent giữa các row).
      - Typography:
        - Số tiền và % nên in đậm.
        - Wording như “Needs” để regular.

    Acceptance Criteria:
      - Cột Rewards giữa các account nhìn thẳng hàng:
        - Progress bar same width, same position.
        - Text trên/dưới bar align giống nhau.
      - Wording rút gọn:
        - Dòng status dùng “Needs ...” thay cho “spend more...”.
      - Không làm thay đổi logic tính toán, chỉ thay đổi trình bày.

  Task 4: Enhance UI – Cột Due + Notes + Badges Parent/Child
    Mô tả hiện trạng:
      - Cột “DUE” hiện đang đứng riêng, text nhỏ “19 DAYS – Feb 10” khá lạc lõng, khó scan nhanh.
      - Badge “PARENT” / “CHILD” đang nằm ở cột account name, size chưa đồng nhất, màu chưa đủ contrast.

    Mục tiêu:
      - Gom thông tin Due vào một “notes area” rõ ràng, dễ nhìn.
      - Badge Parent/Child align gọn, cùng size, màu ấm, text dễ đọc.

    Hướng design:
      - Cấu trúc hàng:
        - Cột Account: 
          - [Card image] [Account name] [Badge Parent/Child]
        - Cột Notes (mới / tái dụng cột hiện có):
          - Hiển thị Due + các notes khác (ví dụ: "1 RULES", "available spend ...", v.v. nếu product owner đồng ý).
      - Badge Parent/Child:
        - Dùng cùng component (ví dụ <AccountRoleBadge />):
          - Size cố định (same padding, same border radius).
          - Font-size, font-weight consistent.
          - Màu sắc:
            - Parent: tone ấm (orange/gold) background, chữ đậm hơn, số / text rõ.
            - Child: tone mát hơn / neutral nhưng vẫn ấm (ví dụ tím nhạt / teal nhạt).
          - Chỉ in đậm phần số hoặc label chính nếu cần, nhưng yêu cầu: “text không in đậm, in đậm số” ⇒
            - Gợi ý: “PARENT” bình thường, số (nếu có) bold, hoặc ngược lại tùy spec, nhưng làm rõ trong code-comment.
      - Cột Notes + Due:
        - Thay vì để “19 DAYS – Feb 10” một mình, có thể:
          - Dòng 1: Badge nhỏ: “DUE IN 19 DAYS”.
          - Dòng 2: Text nhấn mạnh date: “Feb 10”.
        - Hoặc layout:
          - [DUE badge] [19 DAYS]  [•]  [Feb 10].
        - Tô màu DUE badge theo severity:
          - Gần đến hạn: màu đỏ/da cam.
          - Còn xa: màu vàng/nhạt.
        - Đảm bảo align ngang giữa các row: dùng flex, không phụ thuộc độ dài text.
      - Refactor:
        - Tách ra component ví dụ:
          - <AccountDueNote dueInDays={...} dueDate={...} />
          - <AccountRoleBadge role="PARENT" /> / <AccountRoleBadge role="CHILD" />

    Acceptance Criteria:
      - Badge Parent/Child:
        - Kích thước & style đồng nhất trên toàn bảng.
        - Màu ấm, text dễ đọc, số (hoặc label) rõ ràng hơn (bold selective).
      - Due:
        - Không nằm “trơ trọi” nữa, mà gộp vào vùng Notes với layout rõ ràng.
        - Dễ scan: nhìn dọc cột thấy các due info thẳng hàng, không lệch lung tung.

  Yêu cầu chung khi implement:
    - Không phá vỡ logic hiện có (đặc biệt các phần: cashback calculation, linked accounts, batch logic).
    - Giữ nguyên behavior business, chỉ chỉnh lại cách hiển thị trừ khi task yêu cầu behavior change rõ ràng.
    - Viết code theo Gravity Rules trong .agent/rules/gravityrules.md:
      - Không thêm console.log vào server actions commit cuối (chỉ dùng trong debug tạm, phải cleanup).
      - TypeScript strict, tránh any không cần thiết.
    - Sau khi sửa:
      - Chạy npm run lint, npm run build phải pass.
      - Nếu có thể, thêm test UI/logic tối thiểu (unit hoặc e2e) cho:
        - Year dropdown behavior.
        - Cashback Transactions data không biến mất sau khi load.

