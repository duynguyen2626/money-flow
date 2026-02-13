This PR addresses multiple user requests:

1. **Cycle Filtering Fix**: Updated filtering logic to use calculated (`derived_cycle_tag`) cycle tags when `persisted_cycle_tag` is missing, ensuring Income/Cashback transactions appear in the correct billing cycle view even if they predate the persistence fix.
2. **Amount Input Formatting**: Improved `SmartAmountInput` to correctly format numbers within math expressions (e.g., `12,345-1,234`), preserving decimal points and user input flow.
3. **Shops Page Rewrite**: Replaced the `/shops` page grid layout with a modern `DataTable` and `Slide-Over` management interface (similar to Categories), fixing the "create new" issue and adding image thumbnail previews.
4. **Image Thumbnails**: Added image thumbnail previews to both Category and Shop slide-overs for better UX when pasting URLs.
