# **PROJECT CONTEXT: MONEY FLOW 3.0 (FINANCE MANAGEMENT)**

## **1\. Overview**

We are building a Personal Finance App using Next.js 14 (App Router), Supabase (PostgreSQL), and TailwindCSS.  
The core philosophy is Modified Double-Entry Bookkeeping.

## **2\. Tech Stack Structure**

* **Frontend**: Next.js 14, Shadcn UI, TailwindCSS.  
* **Backend/Data**: Supabase.  
* **Logic Layer**: All business logic MUST be placed in src/services/.  
  * UI Components should ONLY call functions from src/services/, never query DB directly if complex logic is involved.

## **3\. Core Business Logic (The "Services")**

### **A. Transaction Service (src/services/transaction.service.ts)**

* **Double-Entry Rule**: Every user action (create transaction) must result in creating **multiple rows** in transaction\_lines.  
* **Validation**: sum(debit) must equal sum(credit).  
* **Example**: Spending 50k from VCB for Food.  
  * Line 1: Account VCB, Amount \-50k (Credit).  
  * Line 2: Category Food, Amount \+50k (Debit).

### **B. Debt Service (src/services/debt.service.ts)**

* **Debt is an Account**: We treat "Debt with Person A" as an Asset Account.  
* **Lending Money**: Credit Bank / Debit Debt Account (Increase Asset).  
* **Repayment**: Credit Debt Account (Decrease Asset) / Debit Bank.

### **C. Cashback Service (src/services/cashback.service.ts)**

* **Logic**: Calculate cashback based on accounts.cashback\_config JSON field.  
* **Tracking**: Real-time tracking via Database Views (already set up in Supabase).

## **4\. Database Schema (Reference)**

*Agent should check src/types/database.types.ts for exact types.*

* profiles: Users.  
* accounts: Bank accounts, Credit cards, and DEBT accounts.  
* transactions: Headers.  
* transaction\_lines: The actual money movement.  
* subscriptions: Recurring bills configs.

## **5\. Your Job**

When I ask you to code a feature (e.g., "Create Transaction Form"), please:

1. Use Shadcn UI for the form.  
2. Write the submission logic in src/services/transaction.service.ts first.  
3. Connect the UI to the Service.