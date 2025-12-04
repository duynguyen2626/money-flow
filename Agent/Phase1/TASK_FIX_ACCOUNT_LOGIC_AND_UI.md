# **TASK: FIX ACCOUNT LOGIC, UI BUGS & UNIFY DATA (REVISED V2)**

Status: PENDING

Created: 2025-11-29

Priority: CRITICAL (BLOCKER)

## **1\. Issues Analysis**

### **A. Credit Card Logic (Parent/Child) \- CRITICAL**

* **Hiện trạng:**  
  * Child Card hiển thị Balance: 0 (do không có giao dịch riêng hoặc chưa sync), trong khi đang link với Parent.  
  * Parent Card hiển thị Available sai (Cộng dồn thay vì trừ).  
  * User phàn nàn: "Tại sao lại tách Balance và Available? Balance phải là công thức Limit \+ In \- Out".  
* **Yêu cầu Logic Mới (Bắt buộc):**  
  * **Công thức duy nhất (Master Formula):**  
    * Net Balance (Thực tế) \= Total In (Trả nợ) \- Total Out (Chi tiêu). (Thường là số âm).  
    * **Available (Khả dụng) \= Credit Limit \+ Net Balance.**  
  * **Hiển thị trên Card:**  
    * **Số Chính (Big Display):** Hiển thị **Available** (Số tiền còn tiêu được). Đây là con số quan trọng nhất với User theo mental model "Asset".  
    * **Số Phụ (Small Info):** Hiển thị Debt: ... (Dư nợ hiện tại \= Abs(Net Balance)) và Limit: ....  
  * **Parent \- Child Logic:**  
    * **Child Card:**  
      * **TUYỆT ĐỐI KHÔNG** hiển thị 0 nếu đang link Shared Limit.  
      * Phải fetch data của Parent.  
      * **Hiển thị:**  
        * Shared Available: Tính toán dựa trên (Parent Balance \+ Child Balance).  
        * Badge: "Linked to \[Parent Name\]".  
    * **Parent Card:**  
      * Tính toán tổng nợ của cả Group (Parent \+ All Children) để ra con số Available chính xác.

### **B. UI/UX Bugs (Account Details)**

* **Wrong Components:** Trang /accounts/\[id\] đang dùng nhầm UI của Cashback cũ (Back Info, Initial Back, Profit...) gây rác UI.  
* **Table Overflow:** Bảng bị tràn ngang màn hình, thanh scroll nằm tít dưới đáy browser.  
* **Missing Scroll:** User yêu cầu "Freeze UI", bảng nếu dài quá thì scroll bên trong bảng (scroll inside table).

## **2\. Implementation Plan**

### **Step 1: Database & Data Unification**

* **Refactor:** Rename img\_url \-\> logo\_url toàn hệ thống (Migration \+ Code replace).

### **Step 2: Fix Logic AccountCard**

* **Update calculateAccountStats:**  
  * Áp dụng công thức: Available \= Limit \- |CurrentDebt| (hoặc Limit \+ NetBalance).  
  * Nếu type \=== 'credit\_card' và có sharedLimitParentId:  
    * Fetch Parent Account Data.  
    * Display Available \= Parent.Limit \- (|Parent.Debt| \+ |Child.Debt|).  
* **Clean UI:**  
  * Chỉ hiển thị 1 con số to nhất là **Available**.  
  * Dòng dưới hiển thị nhỏ: "Debt: \[Amount\] / Limit: \[Amount\]".  
  * Thêm nút (+) Quick Add.

### **Step 3: Rewrite src/app/accounts/\[id\]/page.tsx**

* **Remove:** Xóa sạch các component lạ (AccountStatsHeader kiểu cashback cũ).  
* **Implement:**  
  * Header đơn giản: Logo \+ Tên \+ Big Balance.  
  * Body: UnifiedTransactionTable bọc trong Container chuẩn.

### **Step 4: Fix Table CSS (UnifiedTransactionTable)**

* **Container Structure:**  
* \<div className="w-full max-w-\[calc(100vw-48px)\] mx-auto"\> {/\* Constrain width \*/}  
*     \<div className="border rounded-md overflow-hidden flex flex-col"\>  
*         \<div className="overflow-x-auto overflow-y-hidden"\> {/\* Horizontal Scroll Container \*/}  
*             \<Table\>...\</Table\>  
*         \</div\>  
*     \</div\>  
* \</div\>  
*   
* Đảm bảo không bao giờ xuất hiện thanh scroll ngang của Browser Window.

## **3\. Verification Checklist**

1. \[ \] Thẻ Child (Vcb Signature 2\) phải hiện Available \~120tr (giống Parent), không được hiện 0\.  
2. \[ \] Trang Account Details phải sạch sẽ, bảng transaction nằm gọn gàng, scroll ngang mượt mà ngay dưới header bảng.  
3. \[ \] Công thức Available đúng: 150tr (Limit) \- 30tr (Tiêu) \= 120tr (Available).  
*   
* 