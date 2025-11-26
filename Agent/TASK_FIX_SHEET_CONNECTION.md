# **AGENT TASK: FIX BROKEN SHEET LINK SAVING & TESTING**

Context:  
User reports "Test failed: No valid sheet link configured" even after saving the Webhook URL in the Person Form.  
Root Cause Diagnosis:  
Likely regression in people.service.ts (update function) or PersonForm (submit handler) where sheet\_link is ignored/dropped during the save process.  
Objective:  
Ensure sheet\_link is correctly Saved to DB and Read by the Test service.

## **1\. Audit & Fix src/services/people.service.ts**

**A. Check updatePerson**

* Look at the update payload construction.  
* **Fix:** Ensure sheet\_link is included in the SQL update payload.  
  // Make sure this line exists:  
  if (data.sheet\_link \!== undefined) updates.sheet\_link \= data.sheet\_link;

**B. Check getPersonDetails (used by Test Connection)**

* Ensure the select query includes the sheet\_link column.

## **2\. Audit & Fix src/components/moneyflow/person-form.tsx**

**Action:** Check the Form Submit Handler.

* Ensure the form field name matches the service expectation (sheet\_link).  
* Verify that the value is passed to updatePerson.

## **3\. Audit & Fix src/services/sheet.service.ts**

**Action:** Add detailed logging to testConnection.

* Log the retrieved profile object to see if sheet\_link is null or undefined.  
* **Validation:** Trim the link before checking (remove whitespace).

## **4\. Execution Steps**

1. **Fix Backend:** Update people.service.ts to explicitly handle sheet\_link saving.  
2. **Test:**  
   * Go to UI \-\> Edit Person \-\> Re-paste Link \-\> Save.  
   * Click "Test Connection".  
   * Check Database (Supabase Table profiles) to confirm column is not null.