# **TASK: REDESIGN ACCOUNTS PAGE UI (CLEAN CARD V2)**

Status: PENDING

Created: 2025-11-29

Priority: High

Reference: /cashback Clean Card V2 Style.

## **1\. Objective**

Build lại giao diện trang danh sách tài khoản (/accounts) và component AccountCard. Loại bỏ thiết kế cũ rối rắm, thay thế bằng layout hiện đại, thoáng đãng, đồng bộ với trang Cashback mới.

## **2\. Visual & Layout Requirements**

* **Grid System:**  
  * Desktop (lg/xl): **4 cards/row** (grid-cols-4).  
  * Tablet (md): 2 cards/row.  
  * Mobile (sm): 1 card/row.  
  * Spacing: gap-4.  
* **Card Structure (Split Layout):**  
  * **Section 1: Identity (Top/Avatar Section)**  
    * Background: Nhẹ nhàng (Subtle gradient hoặc solid light color).  
    * Content:  
      * **Avatar/Icon:** Logo ngân hàng hoặc Icon loại tài khoản (To, rõ ràng, căn giữa hoặc trái).  
      * **Account Name:** Tên tài khoản (Font medium).  
      * **Context Info:** Loại tài khoản (VD: Credit Card, Savings) hoặc 4 số cuối.  
  * **Section 2: Info & Stats (Body Section)**  
    * **Balance:** Số dư hiện tại (Font to, đậm, màu sắc theo quy tắc: Dương xanh/Âm đỏ hoặc Neutral).  
    * **Secondary Stats (Nếu có):**  
      * Credit Card: Due Date, Statement Date, Remaining Limit.  
      * Savings: Interest Rate, Maturity Date.  
  * **Section 3: Actions (Footer Section)**  
    * **Quick Actions:** Nút "Quick Add" (Icon Plus nhỏ gọn) để thêm giao dịch nhanh.  
    * **Navigation:** Nút "Details" (Ghost button/Link style) nằm dưới cùng (như trang Cashback).

## **3\. Implementation Steps**

1. **Refactor src/components/moneyflow/account-card.tsx:**  
   * Giữ lại logic tính toán số dư.  
   * Viết lại hoàn toàn JSX theo cấu trúc Split Layout ở trên.  
   * Sử dụng shadcn/ui components (Card, Badge, Button, Separator).  
2. **Update src/app/accounts/page.tsx:**  
   * Áp dụng Grid Layout grid-cols-1 md:grid-cols-2 lg:grid-cols-4.  
   * Đảm bảo responsive.

## **4\. Constraint**

* **Minimalism:** Không hiển thị quá nhiều badges. Chỉ hiện những gì thực sự cần thiết (VD: "Main Account").  
* **English:** Chuyển đổi các label sang tiếng Anh (Balance, Available, Due...).  
* **Consistency:** Padding và Margin phải đồng bộ với CashbackCard.  
* 