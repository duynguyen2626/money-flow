# **AGENT TASK: FIX TYPESCRIPT BUILD ERRORS & SETUP CI**

Context:  
The Vercel deployment is failing due to TypeScript Strict Mode errors.  
Specific Error: Argument of type 'Partial\<...\>' is not assignable to parameter of type 'never' in account.service.ts.  
This usually happens when the Supabase Client typing conflicts with the manual payload type.  
**Objective:**

1. Fix the type error in account.service.ts.  
2. Run a full project type check (tsc \--noEmit) to find other hidden errors.  
3. Create a GitHub Action to prevent future bad commits.

## **1\. Fix src/services/account.service.ts**

Problem: The update() method is inferring never for the payload.  
Solution: We need to cast the payload to any temporarily to bypass the strict check, OR match the type exactly.  
Recommendation: Since we are in a rush, use any casting for the update payload to unblock the build, but add a TODO to fix strict types later.  
**Code Fix:**

// Find the update function  
const { error } \= await supabase  
  .from('accounts')  
  .update(payload as any) // \<--- FORCE CAST TO ANY TO FIX BUILD  
  .eq('id', accountId);

*Repeat this "as any" cast for any other service (Transaction, Debt, Subscription) if they have similar "type 'never'" errors during build.*

## **2\. Setup CI/CD (The Quality Gate)**

Action: Create a GitHub Workflow file.  
File: .github/workflows/ci.yml  
name: Type Check & Build

on:  
  push:  
    branches: \[ main, master \]  
  pull\_request:  
    branches: \[ main, master \]

jobs:  
  build:  
    runs-on: ubuntu-latest

    steps:  
    \- uses: actions/checkout@v3  
      
    \- name: Setup Node.js  
      uses: actions/setup-node@v3  
      with:  
        node-version: '18'  
          
    \- name: Install Dependencies  
      run: npm install  
        
    \- name: Run Type Check (TSC)  
      run: npx tsc \--noEmit  
        
    \- name: Run Build  
      run: npm run build

## **3\. Execution Steps**

1. **Apply Fix:** Modify account.service.ts (and others if needed) to cast update payloads to any.  
2. **Run Local Check:** Execute command npm run build locally. **Do not stop until it says "Compiled successfully".**  
3. **Create CI File:** Add the .github/workflows/ci.yml.