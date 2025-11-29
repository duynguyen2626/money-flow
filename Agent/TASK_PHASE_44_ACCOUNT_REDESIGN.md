# **TASK: PHASE 44 \- ACCOUNT UI REDESIGN V3 & LOGIC FIXES**

Status: PENDING

Phase: 44

Priority: BLOCKER (CRITICAL UI/UX & DATA INTEGRITY)

## **0\. Git & Workflow Enforcements (STRICT)**

* **Branch Name:** feature/phase-44-account-redesign  
* **PR Message:** feat(phase-44): redesign account card v3 and fix data logic  
* **Commit Prefix:** ui(accounts): or fix(logic):

## **1\. Issues & Requirements**

### **A. Data Integrity (CRITICAL \- NEW)**

* **Problem:** Số liệu trên Card đang sai lệch.  
  * Ví dụ: Thẻ Limit 150tr, nhưng Total In lại hiển thị 150tr (có thể do hiểu nhầm Limit là dòng tiền vào, hoặc lỗi Initial Balance).  
  * Giao dịch từ Batch (BATCH\_AUTO) có thể chưa cập nhật đúng vào total\_out (chi tiêu).  
* **Requirement:**  
  * **Credit Card Logic:**  
    * Credit Limit: Là hạn mức tĩnh (Static Config), **KHÔNG** được cộng vào Total In.  
    * Total In: Chỉ tăng khi có giao dịch **Repayment** (Trả nợ thẻ) hoặc **Income**.  
    * Total Out: Tăng khi có giao dịch **Expense** (Chi tiêu).  
    * Current Balance (Debt): Total In \- Total Out (Thường là số âm).  
  * **Batch Processing:** Kiểm tra lại Trigger/Service khi confirm batch item, đảm bảo nó update đúng field amount vào transaction\_lines.

### **B. Account Details Page (/accounts/\[id\]) \- FIX OVERFLOW**

* **Problem:** UI bị tràn chiều ngang, cột rác, thiếu filter.  
* **Solution:**  
  * **Layout:** max-w-7xl mx-auto.  
  * **Table:** Bọc UnifiedTransactionTable trong div.overflow-x-auto.  
  * **Clean:** Xóa cột Back/Profit. Thêm TransactionFilters.

### **C. Account Card Redesign (V3 \- Compact & Vertical)**

* **Design:** Vertical Layout.  
* **Avatar:** Click \-\> Edit Logo.  
* **Actions:** Quick Add (+) button ở góc Top-Right.  
* **Format:** Bỏ ký tự đ. Balance Âm \-\> Màu đỏ.

### **D. Parent \- Child Logic**

* **Child Card:**  
  * **Shared Available:** Lấy từ Parent (Badge: Shared Limit).  
  * **Own Debt:** Hiển thị dư nợ riêng (Total In \- Total Out của chính nó). **Không hiện 0 nếu có nợ.**  
* **Parent Card:**  
  * **Available:** Limit \+ (Parent Balance \+ Sum(Child Balances)).

## **2\. Implementation Steps**

### **Step 1: Database Migration & Data Fix**

* Run Migration rename img\_url \-\> logo\_url.  
* **AUDIT DATA:** Viết script hoặc check trigger để đảm bảo Credit Limit không bị tính vào Total In.  
* **Resync:** Tạo cơ chế tính lại total\_in và total\_out từ bảng transaction\_lines để sửa lại các account đang bị sai số.

### **Step 2: Redesign AccountCard (V3)**

* Update JSX layout Vertical.  
* Thêm nút (+).  
* Format tiền tệ (No 'đ').

### **Step 3: Rebuild /accounts/\[id\]/page.tsx**

* Clean UI, Fix Overflow.  
* Filter Integration.

## **3\. Verification Checklist**

1. \[ \] **Data Check:** Thẻ Limit 150tr, nếu chưa trả nợ gì thì Total In phải bằng 0 (hoặc số nhỏ), không phải 150tr.  
2. \[ \] **Transactions:** Giao dịch từ Batch (BATCH\_AUTO) phải làm tăng Total Out.  
3. \[ \] **UI:** Card đẹp, gọn, không lỗi scroll ngang ở trang chi tiết.  
*   
* 