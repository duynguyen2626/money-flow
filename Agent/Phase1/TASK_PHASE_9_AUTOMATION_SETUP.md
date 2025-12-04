# **AGENT TASK: SETUP PLAYWRIGHT AUTOMATION FRAMEWORK**

**Context:** The project currently lacks automated testing. We need to establish a robust E2E testing framework using **Playwright** to ensure core features (Transactions, Debt, Cashback) work correctly before deployment.

**Current Stack:** Next.js 15, Supabase, Shadcn UI.

**Objective:** Initialize a Playwright project structure implementing the **Page Object Model (POM)** pattern.

## **1\. Folder Structure Design (e2e/)**

Create a new directory e2e at the root level (separate from src).

**Proposed Structure:**

money-flow-3/  
├── e2e/  
│   ├── fixtures/         \# Custom test fixtures (e.g., authenticatedUser)  
│   ├── pages/            \# Page Object Models (POM)  
│   │   ├── base.page.ts  \# Shared methods (goto, waitForUrl)  
│   │   ├── login.page.ts \# Supabase Auth interactions  
│   │   ├── dashboard.page.ts  
│   │   ├── transaction-modal.ts \# The "Add Transaction" Dialog logic  
│   │   └── debt.page.ts  
│   ├── tests/            \# Actual spec files  
│   │   ├── auth.spec.ts  
│   │   ├── transaction.spec.ts  
│   │   └── debt.spec.ts  
│   └── utils/            \# Helpers (date generators, random data)  
├── playwright.config.ts  \# Configuration  
└── ...

## **2\. Configuration Logic (playwright.config.ts)**

* **Base URL:** Use http://localhost:3000 as default.  
* **Browsers:** Configure for Chromium, Firefox, Webkit (Mobile viewports are critical since this is a personal finance app).  
* **Auth Handling:** Configure global-setup or storageState to handle Supabase Authentication (bypass login for feature tests).

## **3\. Page Objects Definition**

**A. TransactionModal (e2e/pages/transaction-modal.ts)**

* This is a critical component. It must handle:  
  * Selectors for Tabs (Expense/Income/Debt).  
  * Selectors for Combobox (Account/Category/Person) \- *Note: These are Shadcn Popovers, require specific handling.*  
  * Input for Amount and Note.  
  * Smart Tag Input logic (checking if tag auto-generates).

**B. DashboardPage (e2e/pages/dashboard.page.ts)**

* Methods to verify "Total Balance".  
* Methods to check if "Recent Transactions" list updates after addition.

## **4\. Implementation Steps for Agent**

1. **Install:** Run playright init command (simulate or instruct user).  
2. **Scaffold:** Create the directory structure defined in Section 1\.  
3. **Config:** Create playwright.config.ts tailored for Next.js.  
4. **Coding:** Implement base.page.ts and transaction-modal.ts first (Highest Priority).  
5. **Smoke Test:** Write tests/transaction.spec.ts that:  
   * Logs in.  
   * Opens Modal.  
   * Adds an Expense (50k).  
   * Verifies it appears on the Dashboard.

**Safety Check:**

* Ensure .gitignore includes playwright-report/ and test-results/.  
* Ensure tests do not run against the Production Database (Use a separate env or clean up data after tests).