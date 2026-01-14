# 🚀 TASK: Reboot `/cashback` Dashboard (Card Cashback Analytics)

> [!IMPORTANT]
> **HANDOVER NOTE (Jan 14, 2026)**: Please read [.agent/handover.md](file:///c:/Users/nam.thanhnguyen/Github/money-flow-3/.agent/handover.md) for critical context regarding reverted features (Volunteer Cashback) and current project status.

## 🎯 Goal

Build a new `/cashback` page to **analyze cashback performance per card by year**.

Focus **ONLY** on cashback dashboard in this task.  
Statement reconciliation / đối soát sao kê sẽ làm ở task khác (KHÔNG implement / KHÔNG thiết kế trong task này).

---

## 🧩 Business Requirements (High Level)

### 1. Scope dữ liệu

- Chỉ consider **cards / accounts** thỏa **ít nhất một** trong hai điều kiện:
  - Có transaction share‑back (tiền chủ thẻ back cho người khác từ một txn).
  - Hoặc có transaction với **category**:  
    - `Hoàn tiền (Cashback)`  
    - Đã tồn tại trong DB:
      ```sql
      INSERT INTO "public"."categories" ("id", "name", "type", "icon", "mcc_codes", "image_url", "parent_id", "created_at")
      VALUES ('e0000000-0000-0000-0000-000000000092', 'Hoàn tiền (Cashback)', 'income', '💰', null, null, null, '2025-12-23 08:42:31.330567+00');
      ```

- Dữ liệu nguồn:
  - **Tổng chi / cashback analytic per card** đã có logic trong `/account` (cashback analytic cũ).  
  → Reuse / generalize analytic logic thành API/service dùng chung cho `/cashback`.

### 2. Đơn vị thời gian & view

- Dashboard hoạt động **theo năm**:
  - Có **Year selector**: 2024 / 2025 / 2026… (default: năm hiện tại).
- Layout chính: **bảng 6 + 6 tháng**:
  - Nhóm 1: `Jan–Jun` (6 tháng đầu).
  - Nhóm 2: `Jul–Dec` (6 tháng cuối).
  - Mỗi tháng là 1 cột; sử dụng **ngày transaction**, KHÔNG dựa vào cycle billing.

### 3. Các chỉ số chính

#### 3.1. Per‑month metrics (12 cột)

Cho card đang chọn trong 1 năm:

- Row **Total Spend for Cashback**  
  - Tổng chi các txn card đó trong tháng **được xem là tạo cashback**  
  - Áp dụng logic filter giống `/account` cashback analytic (VD: categories / flags hiện có).
- Row **Cashback Given (Share‑back)**  
  - Tổng số tiền chủ thẻ đã chia lại cho mọi người từ các txn trong tháng đó.  
  - Dựa trên cấu trúc share‑back đã tồn tại (split per person per txn).

> Hai row này có 12 ô (Jan → Dec). Mỗi ô có thể click để mở chi tiết.

#### 3.2. Year‑level metrics (cột tổng năm)

Các row chỉ có **1 ô tổng năm** (không chia 12 tháng):

- Row **Cashback Redeemed (Income)**  
  - SUM tất cả txn của card, năm đó, category = `Hoàn tiền (Cashback)` (type income).  
  - Nếu có nhiều lần redeem cover nhiều kỳ chi trước đó → **vẫn tính toàn bộ vào năm nhận**.
- Row **Annual Fee**  
  - Tổng fee năm đó cho card (dựa vào txn fee, hoặc field riêng nếu có).
- Row **Interest / Lãi khác (optional)**  
  - Income liên quan đến card hoặc pool đó (lãi gửi tiết kiệm, interest, v.v.).  
- Row **Net Profit**  
  - Formula gợi ý (please implement as reusable util, dễ chỉnh sau):
    ```ts
    profit = cashbackRedeemed + interest - annualFee - cashbackGiven
    ```
  - `cashbackGiven` = tổng share‑back cả năm của card.
  - Đây cũng là **điểm chính để đánh giá hiệu quả card**.

---

## 🖥️ UX / UI Requirements

### 1. Layout tổng thể `/cashback`

- URL: `/cashback`
- Page structure (desktop):

  ```text
  ┌───────────────────────────────────────────────┐
  │ Header: Title + Year Selector + View Toggle  │
  ├───────────────────────────────────────────────┤
  │ Sidebar (Cards & Pools)  │  Main Dashboard   │
  │ (left, fixed width)      │  (right, flexible)│
  └───────────────────────────────────────────────┘
Header
Title: Cashback Dashboard.

Year selector (dropdown):

Values: các năm có data + năm hiện tại.

View toggle (giai đoạn 1 optional, nhưng design ready):

6+6 months (default, phải có).

Quarter (Q1–Q4) – chưa cần implement logic riêng nếu phức tạp, nhưng hãy design component sao future dễ mở rộng.

Sidebar Left: Card & Volunteer List
Data: chỉ show cards / volunteer pools có cashback liên quan trong năm được chọn.

Mỗi item:

Card icon / logo + tên account/card.

Subtitle: short summary, VD:

Total cashback: 1.234.567 (cashbackRedeemed).

Màu chữ:

Xanh nếu netProfit > 0.

Đỏ nếu netProfit < 0.

Interaction:

Click chọn 1 card → main dashboard load data của card đó.

Có section Volunteer Pools riêng (xem bên dưới).

2. Bảng 6+6 tháng cho từng card
Main card dashboard hiển thị theo layout:

text
Group header: [Jan–Jun] | [Jul–Dec]

Row 1: Total Spend for Cashback (12 ô)
Row 2: Cashback Given (Share‑back) (12 ô)
Row 3: Cashback Redeemed (1 ô: Full Year)
Row 4: Annual Fee (1 ô: Full Year)
Row 5: Interest (1 ô: Full Year)
Row 6: Net Profit (1 ô: Full Year)
Styling gợi ý (Tailwind/Design System):

Header group Jan–Jun / Jul–Dec: subtle background, uppercase.

Per‑month cells:

Number right‑aligned.

Color:

Neutral gray cho Spend.

Blue cho Cashback Given.

Hover: underline + cursor pointer (clickable).

Year‑total cells:

Có icon nhỏ (Σ) hoặc label Year Total.

Net Profit cell:

Green background/focus when > 0.

Red background/focus when < 0.

3. Drill‑down modal / side panel
Khi user click vào một ô tháng của row Total Spend hoặc Cashback Given:

Open side panel hoặc modal (tùy design của app, nhưng nên reuse pattern hiện có, nếu đã có ở transaction list):

text
Title: "Chi tiết Cashback – [CardName] – [Month/YYYY]"

Tabs:
- Eligible Spend
- Share Back
Tab Eligible Spend:

Bảng txn dùng làm base tạo cashback:

Columns: Date, Description/Note, Amount, Category, People (nếu có).

Tab Share Back:

Bảng txn share‑back:

Columns: Date, From Txn, Person, Percent/Amount share, Note.

Có tổng mỗi tab ở footer modal.

4. Volunteer tab / pools
Trong sidebar, dưới group cards, có group Volunteer Pools:

Mỗi pool là một “card logic” riêng, nhưng không có Cashback Redeemed vì không phải hoàn tiền từ bank.

Dashboard cho volunteer pool (reuse component card dashboard, nhưng ẩn row không dùng):

text
Row 1: Capital / Contribution (12 tháng, nếu cần; hoặc 1 ô total, tùy data)
Row 2: Interest Received (lãi) (12 tháng hoặc total)
Row 3: Interest Shared (cho volunteer) (12 tháng hoặc total)
Row 4: Net (Interest Received - Interest Shared)
Giai đoạn 1: keep it simple:

Cho phép show theo năm với các row:

Interest Received (12 cột tháng).

Interest Shared (12 cột tháng).

Net (1 cột total năm).

Nếu data hiện tại chưa đầy, Agent có thể tạo API skeleton với TODO comment.

🧮 Data & Backend Requirements
1. Tái sử dụng analytic hiện có
Trong codebase /account đã có “cashback analytic” (aggregate theo card & period).

Yêu cầu: không viết lại từ đầu, mà:

Identify functions / SQL / RPC hiện có để:

Lấy tổng chi tạo cashback theo card + month + year.

Lấy tổng cashbackRedeemed (Hoàn tiền (Cashback) income).

Refactor thành service/API reusable:

VD: GET /api/cashback/summary?year=2026&card_id=...

Response shape gợi ý:

ts
type CashbackMonthSummary = {
  month: number; // 1-12
  totalSpendForCashback: number;
  cashbackGiven: number;
};

type CashbackYearSummary = {
  cardId: string;
  year: number;
  months: CashbackMonthSummary[];
  cashbackRedeemedYearTotal: number;
  annualFeeYearTotal: number;
  interestYearTotal: number;
  cashbackGivenYearTotal: number;
  netProfit: number;
};
Supabase / SQL side:

Có thể dùng view/materialized view, hoặc RPC to aggregate.

2. Net profit calculation
Implement 1 util function trong shared domain:

ts
export function computeCardCashbackProfit(input: {
  cashbackRedeemed: number;
  cashbackGiven: number;
  annualFee?: number;
  interest?: number;
}) {
  const fee = input.annualFee ?? 0;
  const interest = input.interest ?? 0;
  return input.cashbackRedeemed + interest - fee - input.cashbackGiven;
}
Frontend chỉ render netProfit từ API; tuy nhiên util giúp đảm bảo logic đồng nhất.

🧱 Implementation Plan (Agent)
Step 1 – Analyze existing code
Locate cashback analytic logic used in /account:

Search for keywords: cashback, Hoàn tiền, cashback analytic, existing Supabase RPC/views.

Document:

Where total spend & cashback hiện được tính.

Data model cho share‑back, category Hoàn tiền.

Step 2 – Design API layer
Create backend API / server function để trả về CashbackYearSummary cho 1 card:

Input: card_id, year.

Output: dữ liệu như schema ở trên.

Create API for list cards with cashback in selected year:

Input: year.

Output: list { cardId, name, totalCashbackRedeemed, netProfit, hasVolunteerPoolFlag? }.

Step 3 – Build /cashback page
New route/page: /cashback (Next.js page or app route, theo project structure).

Components chính:

CashbackPage – container, fetch initial data, handle year/card selection.

CashbackSidebar – render list cards + volunteer pools.

CashbackYearTable – render bảng 6+6 tháng với rows đã mô tả.

CashbackMonthDetailModal – drill‑down khi click ô tháng.

State:

selectedYear, selectedCardId, viewMode ("6x6" / "quarter").

Fetched data cached per (card,year).

Step 4 – UX details & polishing
Loading & empty states:

Khi không có card nào cho năm đó → show blank state với link về /account hoặc hướng dẫn.

Number formatting:

Dùng formatter đang dùng ở transaction list (VD: 2.622.589,67).

Colors:

Use existing design tokens (Tailwind classes) để match toàn app.

Step 5 – Testing
Scenarios cần test bằng seed thực tế:

text
- Card có nhiều txn share-back trong năm, 0 redeem → CashbackGiven lớn, Redeemed = 0 → Profit âm.
- Card có nhiều redeem, ít share-back → Profit dương.
- Card có fee cao → Profit có thể âm.
- Volunteer pool: chỉ interest, không redeem.
- Nhiều năm dữ liệu: chuyển year selector phải đúng.
✅ Definition of Done
/cashback page tồn tại, load được.

Sidebar chỉ hiển thị cards/pools có cashback hoặc share‑back trong năm chọn.

Bảng 6+6 tháng hiển thị đúng:

Total Spend for Cashback per month.

Cashback Given per month.

Year totals: Redeemed, Fee, Interest, Net Profit.

Click vào ô tháng mở modal/side panel, hiển thị list txn chi tiết (even if chỉ bản đơn giản, miễn có list & pagination/loading OK).

API/SQL reuse được analytic hiện có, không duplicate logic.

Code tuân thủ patterns của project (TypeScript strict, hooks, Supabase clients, UI components).


### Completed Tasks (Jan 14, 2026)
- [x] Refine People Detail Metrics (Single line, Formula fix)
- [x] Restore Net Value Column in People Details
- [x] Remove Volunteer Feature Code (Reverted per request)
- [x] Create Handover Note & Update Docs (README, Handover.md)
