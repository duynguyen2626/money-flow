# **AGENT TASK: FIX SUBSCRIPTION BI-DIRECTIONAL SYNC & UI ENHANCEMENT**

**Context:**

1. **Sync Issue:** Currently, linking works from PersonForm (Person \-\> Services), but editing a Service doesn't allow managing its Members (Service \-\> People). The data needs to be consistent.  
2. **UI Request:** Show the number of active subscriptions on each Person Card in /people.

**Objective:**

1. Implement "Manage Members" inside ServiceDialog.  
2. Update PeopleCard to show subscription counts.

## **1\. Backend Logic (src/services/subscription.service.ts)**

**A. Update updateSubscription**

* **Input:** Accept a list of memberIds (e.g., \['person-1-id', 'person-2-id'\]).  
* **Logic:**  
  1. Update basic service info (Name, Price...).  
  2. **Sync Members:**  
     * Delete existing rows in subscription\_members for this subscription\_id.  
     * Insert new rows for the selected memberIds.  
* *Note:* This ensures that if I uncheck "Lâm" in the Service Dialog, the link is removed database-wide.

**B. Update getSubscriptions**

* Ensure it returns the subscription\_members array so the UI knows who is currently checked.

## **2\. UI: Upgrade ServiceDialog (src/components/moneyflow/service-dialog.tsx)**

**Action:** Add a "Members" selection section (Mirroring the logic in PersonForm).

**UI Layout:**

* **Tab 1: Info:** Name, Price, Cycle, Icon...  
* **Tab 2: Members (New):**  
  * Fetch list of People (from people.service).  
  * Render list with Checkboxes \+ Avatar \+ Name.  
  * **State:** Pre-check the boxes based on service.subscription\_members.

## **3\. UI: Update PeopleCard (src/app/people/page.tsx)**

**Backend (people.service.ts):**

* Update getPeople() to join/count subscription\_members.  
  * *Result:* person.subscription\_count (number).

**Frontend (PersonCard component):**

* **Visual:** Add a small badge or icon row.  
* **Display:**  
  * Icon: Tv or Zap (Lucide).  
  * Text: {person.subscription\_count} Subscribes.  
  * *Style:* Small text, gray or blue badge at the bottom of the card.

## **4\. Execution Steps**

1. **Backend:** Update subscription.service.ts to handle member updates.  
2. **Backend:** Update people.service.ts to fetch counts.  
3. **Frontend:** Add Member Picker to ServiceDialog.  
4. **Frontend:** Add Count Badge to PeopleCard.