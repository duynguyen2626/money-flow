# **TASK: PHASE 43 \- FIX ACCOUNT UI, LOGIC & LAYOUT (FINAL POLISH)**

Status: PENDING

Phase: 43

Priority: BLOCKER (CRITICAL UI/UX)

## **0\. Git & Workflow Enforcements (STRICT)**

* **Branch Name:** feature/phase-43-fix-account-ui  
* **PR Message:** feat(phase-43): fix account ui logic and layout  
* **Commit Prefix:** fix(ui): or refactor(accounts):

## **1\. Issues & Requirements**

### **A. UI Layout & Overflow (Trang Account Details)**

* **Problem:** Trang /accounts/\[id\] bị tràn chiều ngang (Horizontal Scroll của Browser) khi ở zoom 100%. Các cột hiển thị thông tin rác của Cashback cũ (Back Info, Profit...). Thiếu bộ lọc.  
* **Solution:**  
  * **Layout:** Sử dụng cấu trúc chuẩn của /transactions.  
    * Container chính: max-w-7xl mx-auto.  
    * **Table Wrapper:** div.overflow-x-auto nằm BÊN TRONG card/container.  
    * **Sticky Header:** Header của bảng phải cố định khi scroll.  
  * **Component:** Thay thế hoàn toàn bảng hiện tại bằng UnifiedTransactionTable.  
  * **Features:** Mang component TransactionFilters (Date, Type, Search) vào trang này.

### **B. Account Card Redesign (V3 \- Compact)**

* **Problem:** Card hiện tại lãng phí không gian bên phải. Nút "Details" thừa thãi.  
* **Solution (Mockup Pic 5):**  
  * **Layout:** Dọc (Vertical stacking). Bỏ cột action bên phải.  
  * **Actions:**  
    * Nút (+) Quick Add: Dời lên góc trên cùng bên phải (Top-Right absolute or flex). Xếp dọc nếu cần.  
    * **Click Behavior:**  
      * Click vào **Avatar** \-\> Mở Modal chỉnh sửa logo\_url (Upload/Link).  
      * Click vào **Body Card** \-\> Navigate sang /accounts/\[id\].  
  * **Format:** Bỏ ký tự đ trong hiển thị tiền tệ (chỉ hiện số \+ phân cách ngàn).

### **C. Parent \- Child Logic (Display)**

* **Problem:** Thẻ Child hiển thị Balance \= 0 (vô nghĩa) và thiếu liên kết với Parent.  
* **Logic Mới:**  
  * **Parent Card:**  
    * **Available (Số to):** Parent Limit \+ (Parent Debt \+ Sum(Child Debts)).  
    * **Own Debt:** Hiển thị dư nợ riêng của Parent.  
  * **Child Card:**  
    * **Shared Available (Số to):** Lấy giá trị Available của Parent. (Badge: "Shared").  
    * **Own Balance (Số nhỏ):** Hiển thị dư nợ riêng của thẻ Child này (Total In \- Total Out của riêng nó). **Tuyệt đối không hiện 0 nếu có nợ.**  
    * **Badge:** "Linked to \[Parent Name\]".

## **2\. Implementation Steps**

### **Step 1: Database Migration (Unify Logo)**

* Chạy SQL rename img\_url \-\> logo\_url.  
* Refactor code để dùng 1 biến duy nhất.

### **Step 2: Redesign AccountCard (V3)**

* Sửa layout JSX: Avatar click-to-edit, Quick Add button floating/top-right.  
* Update logic tính toán Parent/Child như mục C.  
* Remove đ symbol (custom formatter).

### **Step 3: Rebuild /accounts/\[id\]/page.tsx**

* Xóa toàn bộ code cũ.  
* Import: UnifiedTransactionTable, TransactionFilters.  
* Setup Layout:  
* \<div className="container mx-auto max-w-7xl h-\[calc(100vh-64px)\] flex flex-col"\>  
*     \<Header /\> {/\* Logo, Name, Big Balance \*/}  
*     \<Filters /\>  
*     \<div className="flex-1 overflow-hidden border rounded-lg"\>  
*         \<UnifiedTransactionTable className="h-full" /\>  
*     \</div\>  
* \</div\>  
* 

## **3\. Verification**

1. \[ \] Check thẻ Child: Phải thấy dòng "Own Debt: ..." (nếu có tiêu) và "Shared Available" (của Parent).  
2. \[ \] Check Account Details: Không còn scroll ngang của browser. Có Filter. Table giống hệt trang Transactions.  
3. \[ \] Click Avatar ra modal edit ảnh. Click Card ra details.  
*   
* 