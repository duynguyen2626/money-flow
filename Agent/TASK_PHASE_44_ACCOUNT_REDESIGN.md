# **TASK: PHASE 44 \- ACCOUNT UI REDESIGN V3 & LOGIC FIXES**

Status: PENDING

Phase: 44

Priority: BLOCKER (CRITICAL UI/UX)

## **0\. Git & Workflow Enforcements (STRICT)**

* **Branch Name:** feature/phase-44-account-redesign  
* **PR Message:** feat(phase-44): redesign account card v3 and fix details page  
* **Commit Prefix:** ui(accounts): or fix(logic):

## **1\. Issues & Requirements**

### **A. Account Details Page (/accounts/\[id\]) \- FIX OVERFLOW**

* **Problem:** \* UI bị tràn chiều ngang (Horizontal Scroll của Browser) khi ở zoom 100%.  
  * Các cột rác của Cashback cũ (Back Info, Profit...) vẫn tồn tại.  
  * Thiếu bộ lọc Filter.  
* **Solution (Target: Match /transactions style):**  
  * **Layout:** Sử dụng cấu trúc Container max-w-7xl mx-auto.  
  * **Table Wrapper:** BẮT BUỘC bọc UnifiedTransactionTable trong div.overflow-x-auto.  
  * **Columns:** Chỉ hiển thị các cột chuẩn: Date, Notes (Logo), Type (Badge), Amount. **Xóa sạch** các cột Back/Profit.  
  * **Features:** Mang component TransactionFilters (Date, Type, Search) vào trang này.

### **B. Account Card Redesign (V3 \- Compact & Vertical)**

* **Design Philosophy:** "Less is More". Tối ưu không gian ngang.  
* **Layout Structure:**  
  * **Orientation:** Vertical (Dọc). Bỏ cột action riêng bên phải.  
  * **Avatar:** Click vào Avatar \-\> Mở Modal **Edit Logo URL**.  
  * **Body (Clickable):** Click vào vùng thông tin \-\> Navigate sang /accounts/\[id\].  
  * **Quick Add (+):** Button tròn, Floating ở góc **Trên-Phải (Top-Right)** của Card.  
* **Display Format:**  
  * **Currency:** Bỏ ký tự đ. Chỉ hiển thị số \+ phân cách ngàn (VD: 29.866.667).  
  * **Color:** Balance Âm (Nợ) \-\> Màu đỏ/cam. Balance Dương \-\> Xanh/Đen.

### **C. Parent \- Child Logic (Display Fix)**

* **Problem:** Thẻ Child hiển thị Balance \= 0 (vô nghĩa) dù có link với Parent.  
* **New Logic:**  
  * **Child Card:**  
    * **Dòng 1 (To):** Shared Available (Lấy từ Parent). Badge "Shared Limit".  
    * **Dòng 2 (Nhỏ):** Own Debt: ... (Hiển thị dư nợ riêng của thẻ con này, tính từ Total In \- Total Out của chính nó). **Tuyệt đối không hiện 0 nếu thực tế có nợ.**  
  * **Parent Card:**  
    * **Available:** Tính toán tổng thể Parent Limit \+ (Parent Debt \+ Sum(Child Debts)).

## **2\. Implementation Steps**

### **Step 1: Database Migration (Unify Logo)**

* Chạy SQL rename img\_url \-\> logo\_url.  
* Refactor code để dùng 1 biến duy nhất logo\_url.

### **Step 2: Redesign AccountCard (V3)**

* Viết lại JSX AccountCard:  
  * Chuyển layout sang Vertical.  
  * Thêm Button icon Plus ở absolute top-3 right-3.  
  * Thêm onClick handler cho Avatar (Edit) và Card Body (Navigate).  
  * Áp dụng formatter mới (bỏ đ).

### **Step 3: Rebuild /accounts/\[id\]/page.tsx**

* **Delete:** Xóa toàn bộ code cũ.  
* **Rebuild:**  
  * Import UnifiedTransactionTable, TransactionFilters.  
  * Layout:  
* \<div className="container mx-auto max-w-7xl h-\[calc(100vh-64px)\] flex flex-col p-4 space-y-4"\>  
*     \<Header /\> {/\* Logo, Name, Big Balance \*/}  
*     \<TransactionFilters /\>  
*     \<div className="flex-1 border rounded-lg overflow-hidden bg-background"\>  
*         \<div className="h-full overflow-auto"\> {/\* Scroll bên trong này \*/}  
*             \<UnifiedTransactionTable /\>  
*         \</div\>  
*     \</div\>  
* \</div\>  
  * 

## **3\. Verification Checklist**

1. \[ \] **Thẻ Child:** Phải thấy dòng "Own Debt: \[Số tiền\]" (không có chữ đ) và "Shared Available".  
2. \[ \] **Account Details:** Không còn scroll ngang của browser. Table gọn gàng, giống hệt trang Transactions.  
3. \[ \] **Actions:** Click Avatar ra modal edit ảnh. Click Card ra details. Nút (+) nằm góc trên phải.  
*   
* 