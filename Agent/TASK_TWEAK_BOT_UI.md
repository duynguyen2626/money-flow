# **AGENT TASK: IMPROVE AUTOMATION BOT UI**

Context:  
The "Lazy Bot" indicator is currently just a static text label ("Sẵn sàng") which confuses the user.  
We want to make it unobtrusive but functional.  
Objective:  
Turn the Automation Checker into a small, discreet "Refresh/Check" icon button in the Header, or hide it completely until it has work to do.

## **1\. UI Update: src/components/moneyflow/automation-checker.tsx**

**Change Requirements:**

1. **Default State:** Hidden (return null) OR a very small generic icon (e.g., Bot or Zap icon) in the corner.  
2. **Processing State:** Show a spinning loader icon 🔄.  
3. **Success State:** Show the Toast Notification (Keep existing logic).  
4. **Manual Trigger:**  
   * If we keep the icon, make it clickable.  
   * onClick \-\> Force call checkAndProcessSubscriptions().  
   * Tooltip: "Kiểm tra dịch vụ đến hạn".

**Code Suggestion:**

// Return null to make it invisible background worker  
// OR render a small Ghost Button  
return (  
  \<Button variant="ghost" size="icon" onClick={runCheck} title="Quét dịch vụ định kỳ"\>  
    {loading ? \<Loader2 className="animate-spin" /\> : \<Zap className="text-yellow-500" /\>}  
  \</Button\>  
);

## **2\. Integration**

* Place this component inside the AppLayout header (near the User Avatar or Notification Bell), instead of floating randomly on the page.

## **3\. Execution**

1. Update AutomationChecker component.  
2. Move it to the Header in AppLayout.