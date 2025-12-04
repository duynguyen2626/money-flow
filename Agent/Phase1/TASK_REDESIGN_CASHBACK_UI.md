# **TASK: REDESIGN CASHBACK PAGE UI (CLEAN CARD V2)**

Status: PENDING  
Created: 2025-11-29  
Priority: High  
Reference: /accounts page styling, User Mockups.

## **1\. Objective**

Build lại giao diện trang danh sách Cashback (/cashback) sử dụng style **Clean Card V2** (giống Account Card) nhưng tối ưu layout cho thông tin hoàn tiền.

## **2\. Visual & Layout Requirements**

* **Grid System:**  
  * Desktop (lg/xl): **4 cards/row** (Grid cols 4).  
  * Tablet (md): 2 cards/row.  
  * Mobile (sm): 1 card/row.  
  * Spacing: gap-4.  
* **Card Style (Clean Card V2):**  
  * Background: White/Card background.  
  * Border: Thin, subtle.  
  * Shadow: hover:shadow-md transition.  
  * **Structure (Mockup Pic 3 Style):**  
    * **Top:** Avatar/Icon của Bank/Account (Centered or Prominent).  
    * **Middle:** Account Name & Cashback Program Name.  
    * **Stats Area:**  
      * **Earned:** Tổng tiền đã hoàn trong kỳ.  
      * **Remaining:** Số tiền còn lại có thể hoàn (Limit \- Earned).  
      * *(Optional)* Progress Bar nhỏ thể hiện % đã đạt giới hạn.  
    * **Bottom:** Nút "Details" (Ghost or Outline variant) \-\> Navigate to /cashback/\[id\].

## **3\. Component Implementation**

* **New Component:** src/components/moneyflow/cashback-card.tsx  
  * Props: account: Account, stats: CashbackStats.  
  * Logic:  
    * Tính Remaining \= Cap \- Earned.  
    * Format currency: VND/USD.  
    * Language: **English** labels (e.g., "Earned", "Remaining", "Cycle").  
* **Page Update:** src/app/cashback/page.tsx  
  * Fetch accounts có cashback\_config.  
  * Map data vào CashbackCard.  
  * Xóa bỏ UI cũ (các card to, rời rạc).

## **4\. Constraint**

* Không dùng alert.  
* Tuân thủ quy tắc Separation of Concerns (Logic tính toán nên nằm ở helper/service nếu phức tạp).  
* Đảm bảo responsive.