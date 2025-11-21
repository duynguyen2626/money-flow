# **AGENT TASK: ENHANCE PEOPLE MODAL (AVATAR, SHEET LINK, SUBSCRIPTIONS)**

Context:  
The current "Create Person" modal is too basic (Name/Email only).  
The User wants a comprehensive onboarding form that includes Avatar URL, Tracking Sheet Link, and Subscription Assignments.  
**Objective:**

1. Upgrade CreatePersonDialog and EditPersonDialog (Unified Form).  
2. Add "Avatar Preview" functionality.  
3. Add "Subscription Picker" (Manage subscription\_members directly from this form).

## **1\. Backend Updates (src/services/people.service.ts)**

**A. Update createPerson / updatePerson**

* Accept new fields: avatar\_url, sheet\_link.  
* **Crucial:** Accept an array of subscriptionIds (e.g., \['sub-youtube-id', 'sub-icloud-id'\]).  
* **Transaction Logic (Subscription Linking):**  
  * After creating/updating the profile...  
  * Delete existing rows in subscription\_members for this user (Clean slate approach is easiest, or diffing).  
  * Insert new rows into subscription\_members for the selected IDs.

**B. getPersonWithSubs(id)**

* Fetch profile \+ list of subscription\_ids they are currently part of.

## **2\. UI: Enhanced Person Form (src/components/moneyflow/person-form.tsx)**

**Layout Design:**

**Column 1: Identity**

* **Name:** Input.  
* **Email:** Input.  
* **Avatar URL:** Input.  
  * *Feature:* Display a circular **Image Preview** (Thumbnail) immediately when URL is pasted. Use a placeholder icon if empty.  
* **Link Sheet:** Input (Icon: Table/Sheet). "Link Google Sheet theo dõi".

**Column 2: Subscriptions (The "Slots")**

* **Title:** "Đăng ký dịch vụ".  
* **List:** Fetch all available subscriptions from DB.  
* **Interaction:** Render as a list of **Switches/Checkboxes**.  
  * \[x\] Youtube Premium (166k)  
  * \[ \] iCloud 2TB (156k)  
* *Advanced (Optional):* If checked, show a small input for "Fixed Amount" (defaults to auto-split if empty, but let's keep it simple for now: just join/leave).

## **3\. Execution Steps**

1. **Refactor Service:** Update the create/update functions to handle the relational data (subscriptions).  
2. **Create Component:** Build PersonForm with the 2-column layout.  
3. **Integrate:** Replace the simple dialog in PeoplePage with this new form.