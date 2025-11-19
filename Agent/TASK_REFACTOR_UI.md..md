# **AGENT TASK: REFACTOR UI TO MULTI-PAGE LAYOUT & POLISH**

**Objective:**

1. Move from a single-page dashboard to a **Multi-page App** with a Sidebar Navigation.  
2. Fix specific UI feedbacks (Currency formatting, Button labels).

## **1\. App Structure & Navigation**

**Action:** Create a Layout component with a Sidebar.

**New File Structure:**

* src/components/moneyflow/app-layout.tsx: Contains the Sidebar \+ Header.  
* src/app/layout.tsx: Wrap the content with \<AppLayout\>.  
* src/app/transactions/page.tsx: Move the full Transaction List here.  
* src/app/debt/page.tsx: Move the full Debt Manager here.  
* src/app/page.tsx: Keep ONLY the "Account List" and a "Summary Widget" (e.g., Top 5 recent transactions).

**Navigation Menu Items:**

1. **Tổng quan** (Dashboard) \-\> /  
2. **Sổ Giao dịch** (Transactions) \-\> /transactions  
3. **Sổ Nợ** (Debts) \-\> /debt

## **2\. Component Polish (Specific User Requests)**

### **A. Currency Formatting Fix**

Context: User finds the negative sign (-) visually redundant because the text is already Red.  
Action: Update RecentTransactions and DebtList components.

* **Rule:**  
  * If amount \< 0: Class text-red-600, Text: Math.abs(amount) (No minus sign).  
  * If amount \> 0: Class text-green-600, Text: \+ Math.abs(amount) (Keep plus sign).

### **B. Debt List UI Updates**

**File:** src/components/moneyflow/debt-list.tsx

* **Rename Button:** Change "Settle" text to **"Tất toán"** (or use a Check Icon Verified from lucide-react).  
* **Tooltip:** Add a title to the button: "Xác nhận đã trả hết nợ".

## **3\. Implementation Steps for Agent**

1. **Create AppLayout**: Use Shadcn components (Sheet/Sidebar) or a simple Tailwind Flex layout (Left Sidebar 64/250px, Right Content).  
2. **Create Pages**: Move logic from current page.tsx to src/app/transactions/page.tsx and src/app/debt/page.tsx.  
3. **Refactor Components**: Apply the Currency Formatting rules (Math.abs) to all lists.  
4. **Update page.tsx**: Simplify the dashboard. It should now look like a "Control Center" rather than a long report.