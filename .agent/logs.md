## Error Type
Console Error

## Error Message
The final argument passed to useEffect changed size between renders.The order and size of this array must remain constant.

  Previous: [false, () => {
    if (initialData) {
      return {
        type: initialData.type || "expense",
        category_id: initialData.category_id || "",
        occurred_at: initialData.occurred_at || new Date(),
        amount: initialData.amount || 0,
        note: initialData.note || "",
        source_account_id: initialData.source_account_id || accounts[0]?.id || "",
        target_account_id: initialData.target_account_id,
        shop_id: initialData.shop_id,
        person_id: initialData.person_id,
        tag: initialData.tag,
        cashback_mode: initialData.cashback_mode || "none_back",
        cashback_share_percent: initialData.cashback_share_percent,
        cashback_share_fixed: initialData.cashback_share_fixed,
        ui_is_cashback_expanded: false
      };
    }
    return {
      type: "expense",
      category_id: "",
      occurred_at: new Date(),
      amount: 0,
      note: "",
      source_account_id: accounts[0]?.id || "",
      cashback_mode: "none_back",
      ui_is_cashback_expanded: false
    };
  }, [object Object]]
Incoming: [false, () => {
  if (initialData) {
    return {
      type: initialData.type || "expense",
      category_id: initialData.category_id || "",
      occurred_at: initialData.occurred_at || new Date(),
      amount: initialData.amount || 0,
      note: initialData.note || "",
      source_account_id: initialData.source_account_id || accounts[0]?.id || "",
      target_account_id: initialData.target_account_id,
      shop_id: initialData.shop_id,
      person_id: initialData.person_id,
      tag: initialData.tag,
      cashback_mode: initialData.cashback_mode || "none_back",
      cashback_share_percent: initialData.cashback_share_percent,
      cashback_share_fixed: initialData.cashback_share_fixed,
      ui_is_cashback_expanded: false
    };
  }
  return {
    type: "expense",
    category_id: "",
    occurred_at: new Date(),
    amount: 0,
    note: "",
    source_account_id: accounts[0]?.id || "",
    cashback_mode: "none_back",
    ui_is_cashback_expanded: false
  };
}, [object Object], function () { [native code] }]


    at TransactionSlideV2(../../../../ Mobile Documents / com~apple~CloudDocs / Github Nov25 / money - flow - 3 / src / components / transaction / slide - v2 / transaction - slide - v2.tsx: 112: 14)
    at UnifiedTransactionsPage(../../../../ Mobile Documents / com~apple~CloudDocs / Github Nov25 / money - flow - 3 / src / components / transactions / UnifiedTransactionsPage.tsx: 317: 13)
    at TransactionsPage(../../../../ Mobile Documents / com~apple~CloudDocs / Github Nov25 / money - flow - 3 / src / app / transactions / page.tsx: 29: 7)

## Code Frame
110 |
  111 |     // Reset form when initialData changes or slide opens
> 112 | useEffect(() => {
      |              ^
      113 |         if (open) {
        114 |             const values = getDefaultValues();
        115 | singleForm.reset(values);

        Next.js version: 16.0.10(Turbopack)
## Error Type
Console Error

## Error Message
The final argument passed to useEffect changed size between renders.The order and size of this array must remain constant.

          Previous: [[object Object], function () { [native code] }]
        Incoming: [false, [object Object], function () { [native code] }, () => {
          if (initialData) {
            return {
              type: initialData.type || "expense",
              category_id: initialData.category_id || "",
              occurred_at: initialData.occurred_at || new Date(),
              amount: initialData.amount || 0,
              note: initialData.note || "",
              source_account_id: initialData.source_account_id || accounts[0]?.id || "",
              target_account_id: initialData.target_account_id,
              shop_id: initialData.shop_id,
              person_id: initialData.person_id,
              tag: initialData.tag,
              cashback_mode: initialData.cashback_mode || "none_back",
              cashback_share_percent: initialData.cashback_share_percent,
              cashback_share_fixed: initialData.cashback_share_fixed,
              ui_is_cashback_expanded: false
            };
          }
          return {
            type: "expense",
            category_id: "",
            occurred_at: new Date(),
            amount: 0,
            note: "",
            source_account_id: accounts[0]?.id || "",
            cashback_mode: "none_back",
            ui_is_cashback_expanded: false
          };
        }]


    at TransactionSlideV2(../../../../ Mobile Documents / com~apple~CloudDocs / Github Nov25 / money - flow - 3 / src / components / transaction / slide - v2 / transaction - slide - v2.tsx: 122: 14)
    at UnifiedTransactionsPage(../../../../ Mobile Documents / com~apple~CloudDocs / Github Nov25 / money - flow - 3 / src / components / transactions / UnifiedTransactionsPage.tsx: 317: 13)
    at TransactionsPage(../../../../ Mobile Documents / com~apple~CloudDocs / Github Nov25 / money - flow - 3 / src / app / transactions / page.tsx: 29: 7)

## Code Frame
        120 |
          121 |     // Track form changes by comparing with initial values
> 122 | useEffect(() => {
      |              ^
              123 |         if (!open) return; // Don't track when closed
            124 |
              125 |         const subscription = singleForm.watch((currentValues) => {

                Next.js version: 16.0.10(Turbopack)
