# **VIBE CODING: PHASE 78.5 \- ACCOUNT CARD POLISH & LOGIC REFINEMENT**

**Role:** Senior Frontend Engineer (React/Tailwind/UX).

Context:

We are refining the AccountCard component (src/components/moneyflow/account-card.tsx). The previous implementation has visual accessibility issues, interaction bugs, and needs smarter logic for the "KPI" section (Progress vs. Cashback).

Task:

Refactor AccountCard to meet the following specific requirements.

### **1\. Visual Improvements (Badges & Image)**

* **Badges Styling & Interaction:**  
  * **Size:** Increase Badge size (use px-2 py-0.5 text-xs font-semibold).  
  * **Hover Interaction (Tooltips):**  
    * **Requirement:** Hovering over Parent/Child badges must trigger a **Custom UI Tooltip** (do not use native browser title).  
    * **Content:** Show a list of linked Parent/Child names.  
    * **Display Logic:**  
      * If 1 Child: Show Child Name/Icon directly.  
      * If \>1 Child: Show count (e.g., "Child \+2") on the badge, list names in the Tooltip.  
  * **Standalone Badge:**  
    * *Logic:* Only show for Credit Card types. Hide for others.  
    * *Style:* **Glassmorphism/Blur**. Use backdrop-blur-md bg-black/40 text-white font-bold. **Crucial:** Ensure text is **BOLD** and stands out clearly against complex backgrounds; ensure it does not blend into the image.  
  * **Parent/Child Badges:**  
    * Add Icons inside the badge, size equal to text.  
    * **Parent:** \<Users size={12} /\> (or similar) \+ Text. Color: bg-indigo-100 text-indigo-700.  
    * **Child:** Use Baby Icon (e.g., 🚼 or Lucide \<Baby /\>) \+ Text.  
  * **Due Date Badge:** High alert color if near due (e.g., bg-red-100 text-red-700).  
* **Card Image (Left Section \- Vertical Layout):**  
  * **CRITICAL CONSISTENCY FIX:** The Left Image Section MUST look **identical** for BOTH "Action Required" cards (due soon/need spend) and standard "Credit Cards".  
    * *Current Bug:* The "Action Required" variant is rendering differently (squares vs rectangles, borders, etc.).  
    * *Fix:* Rewrite the Left Column rendering logic to use a **single, unified structure** regardless of card state. Do not branch the layout logic for the container; only change the content if absolutely necessary.  
  * **Constraint:** The Left Media section must be a **Vertical Rectangle** (Portrait aspect ratio).  
  * **Rotation Logic:**  
    * If the image is naturally Landscape (standard credit card 4:3), **rotate it 90 degrees clockwise** (rotate-90) so it fills the vertical column.  
    * Object fit: cover.  
    * *Note:* If image is already Portrait, do not rotate.

### **2\. Logic Refinement: "Need to Spend" vs. "Cashback Info" vs. "Cycle"**

* **KPI Area Logic (Middle/Bottom Right):**  
  * **Condition A (Has Min Spend & Not Met):**  
    * Show **"Need to spend"** Progress Bar.  
  * **Condition B (No Min Spend OR Met, Has Cashback):**  
    * *Format:* Use Icon 💰. Split into clear readable text.  
    * *Display:* 💰 Share: \[shared\_amt\] | Remains: \[max\_back\]  
    * *Style:* Use distinct spans or a split badge to make numbers easy to read.  
  * **Condition C (No Cashback):**  
    * Show text: "No cashback for this".  
* **Cycle Display (Timeline):**  
  * **Month Cycle:** If cycleType \=== 'calendar\_month' (or start/end matches full month), display badge: **"Month Cycle"** (pick a distinct color, e.g., Teal).  
  * **Statement Cycle:** If it's a date range (e.g., 25th to 24th), display format: **"Dec 25 \- Jan 24"** (Short Month \+ Day).  
    * *Alignment:* **Center** aligned text.

### **3\. Interaction & Footer Overhaul**

* **Global Click Disabled:**  
  * **CRITICAL:** Remove onClick from the main Card container. Clicking the "white space" or "image" should **DO NOTHING**.  
* **Navigation Triggers:**  
  * **Details/Edit:** Only clicking specific buttons (e.g., "Details" button or "Edit" icon) triggers navigation.  
* **"Secured By" (Linked Saving):**  
  * **Location:** Move this element to the **Bottom/Footer** of the card (Below Details/Edit buttons if stacked, or distinct in footer).  
  * **Style:** Change to a Badge style.  
  * **Content:** \[PiggyBank Icon\] Secured.  
  * **Action:** Clickable \-\> Navigates to Parent Account.

### **4\. Action Logic (Quick Pay / Transaction Defaults)**

When triggering specific actions from the Card (e.g., "Transfer" or "Shopping" buttons), apply these defaults:

* **Transfer / Quick Pay:**  
  * **Category:** Auto-select "Money Transfer" (ID: e0000000-0000-0000-0000-000000000091 \- *Note: This ID was provided as 'Credit Payment' in your reference, verify which one implies 'Money Transfer'. If 'Credit Payment' is the intent for paying off the card, use that.*).  
  * *Correction based on user data:*  
    * **Credit Payment Category ID:** e0000000-0000-0000-0000-000000000091  
    * **Note:** If the action is paying off the credit card, label it "Credit Pay".  
* **Lend / Shopping:**  
  * **Category:** Auto-select "Shopping" (ID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99).  
  * **Shop:** Auto-select "Shopee" (ID: ea3477cb-30dd-4b7f-8826-a89a1b919661).

### **5\. Code Structure**

* Refer to cashback\_config JSON for all logic.  
* Ensure responsive layout:  
  * **Desktop:** Left Image (Vertical) | Right Content.  
  * **Mobile:** Stacked or Compact Row.

Deliverable:

Updated src/components/moneyflow/account-card.tsx.

*   
* 