AGENT TASK: FIX COMBOBOX SEARCH BUGContext:The Combobox (Command) in TransactionForm is not filtering correctly.When the user types "Exim", no results appear, even though "Exim Violet" exists.Root Cause Analysis:In Shadcn UI (cmdk), the <CommandItem> component filters results based on its value prop.Currently, the code is likely passing the ID (UUID) into the value prop:// WRONG
<CommandItem value={account.id} onSelect={...}> {account.name} </CommandItem>
Because the UUID doesn't contain the word "Exim", the filter fails.Objective: Fix the filtering logic to search by Name.1. Fix TransactionForm (src/components/moneyflow/transaction-form.tsx)Action: Update the CommandItem rendering logic for both Account and Category selectors.Code Correction:Pass account.name (or a combination of name + keywords) to the value prop. Handle the ID selection inside the closure.{/* CORRECT PATTERN */}
<CommandItem
  value={account.name} // Search/Filter based on this string
  key={account.id}     // React Key uses ID
  onSelect={() => {
    form.setValue("account_id", account.id); // Set ID to form
    setOpen(false);
  }}
>
  <Check
    className={cn(
      "mr-2 h-4 w-4",
      account.id === field.value ? "opacity-100" : "opacity-0"
    )}
  />
  {/* Display Content */}
  <div className="flex items-center gap-2">
     {/* Icon if exists */}
     <span>{account.name}</span>
  </div>
</CommandItem>
Important Note:Apply the same fix for Categories (value={category.name}).Ensure value passed to CommandItem is unique enough or handled correctly if duplicates exist (though rare for account names).2. Improve Search UX (Optional but Recommended)If cmdk version is strict, normalize the input.Ideally, add a keywords prop if you have a custom CommandItem wrapper, OR just ensure the value prop is the user-friendly text.3. ExecutionRead src/components/moneyflow/transaction-form.tsx.Locate the CommandItem mappings.Swap the value prop from id to name.