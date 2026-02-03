[Bot Status] Updated service 95064279-8ce1-4217-88c8-d40aef2fbb94: completed, next run 2026-03-01T16:00:53.873Z
[AutoSync] Triggering auto-sync for 5 people from service Youtube
[AutoSync] Checking if auto-sync needed for 917455ba-16c0-42f9-9cea-264f81a3db66 / 2026-02
[Sheet] Profile lookup result {
  lookupId: '917455ba-16c0-42f9-9cea-264f81a3db66',
  profileId: '917455ba-16c0-42f9-9cea-264f81a3db66',
  sheet_link: null
}
Failed to fetch account for sheet sync: {
  code: 'PGRST201',
  details: [
    {
      cardinality: 'one-to-many',
      embedding: 'accounts with people',
      relationship: 'people_sheet_linked_bank_id_fkey using accounts(id) and people(sheet_linked_bank_id)'
    },
    {
      cardinality: 'many-to-one',
      embedding: 'accounts with people',
      relationship: 'accounts_owner_id_fkey using accounts(owner_id) and people(id)'
    }
  ],
  hint: "Try changing 'people' to one of the following: 'people!people_sheet_linked_bank_id_fkey', 'people!accounts_owner_id_fkey'. Find the desired relationship in the 'details' key.",
  message: "Could not embed because more than one relationship was found for 'accounts' and 'people'"
 Find the desired relationship in the 'details' key.",
  message: "Could not embed because more than one relationship was found for 'accounts' and 'people'"
}
[Sheet] No valid sheet link configured {
  lookupId: '917455ba-16c0-42f9-9cea-264f81a3db66',
  profileId: '917455ba-16c0-42f9-9cea-264f81a3db66'
}
[AutoSync] Skipping 917455ba-16c0-42f9-9cea-264f81a3db66: No sheet link configured
[AutoSync] Checking if auto-sync needed for eccde148-a84e-455f-ba96-c8aa0b149ac8 / 2026-02
[Sheet] Profile lookup result {
  lookupId: 'eccde148-a84e-455f-ba96-c8aa0b149ac8',
  profileId: 'eccde148-a84e-455f-ba96-c8aa0b149ac8',
  sheet_link: 'https://script.google.com/macros/s/AKfycbwI_Nvz5bd-qFROwgv5QPll5BgSCbrgm-aL2i4fXBGg-juKbliafo0ZVeNXBlvsNhC1/exec'   
}
[AutoSync] Triggering auto-sync for eccde148-a84e-455f-ba96-c8aa0b149ac8 / 2026-02
[Sheet] Profile lookup result {
  lookupId: 'eccde148-a84e-455f-ba96-c8aa0b149ac8',
  profileId: 'eccde148-a84e-455f-ba96-c8aa0b149ac8',
  sheet_link: 'https://script.google.com/macros/s/AKfycbwI_Nvz5bd-qFROwgv5QPll5BgSCbrgm-aL2i4fXBGg-juKbliafo0ZVeNXBlvsNhC1/exec'   
}
[Sheet] Profile lookup result {
  lookupId: 'eccde148-a84e-455f-ba96-c8aa0b149ac8',
  profileId: 'eccde148-a84e-455f-ba96-c8aa0b149ac8',
  profileId: 'eccde148-a84e-455f-ba96-c8aa0b149ac8',
  sheet_link: 'https://script.google.com/macros/s/AKfycbwI_Nvz5bd-qFROwgv5QPll5BgSCbrgm-aL2i4fXBGg-juKbliafo0ZVeNXBlvsNhC1/exec'   
}
[SheetSync] Sending batch of 1 transactions for 2026-02
[syncCycleTransactions] Person sheet preferences: {
  personId: 'eccde148-a84e-455f-ba96-c8aa0b149ac8',
  showBankAccount: true,
  resolvedBankInfo: '',
  showQrImage: false,
  qrImageUrl: '(not set)'
}
[syncCycleTransactions] Final payload: {
  action: 'syncTransactions',
  person_id: 'eccde148-a84e-455f-ba96-c8aa0b149ac8',
  cycle_tag: '2026-02',
  sheet_id: '1ZbrVMs4-HmDXpgrC6_NMicIwlVN5j5RLP4LqE-62y_Q',
  rows: '[1 rows]',
  bank_account: '',
  img: ''
}
[AutoSync] Successfully auto-synced eccde148-a84e-455f-ba96-c8aa0b149ac8 / 2026-02
[AutoSync] Checking if auto-sync needed for 7a54609d-d6bf-4692-aead-6432479b9cb1 / 2026-02
[Sheet] Profile lookup result {
  lookupId: '7a54609d-d6bf-4692-aead-6432479b9cb1',
  profileId: '7a54609d-d6bf-4692-aead-6432479b9cb1',
  sheet_link: null
}
Failed to fetch account for sheet sync: {
  code: 'PGRST201',
  details: [
    {
      cardinality: 'one-to-many',
      embedding: 'accounts with people',
      relationship: 'people_sheet_linked_bank_id_fkey using accounts(id) and people(sheet_linked_bank_id)'
    },
    {
      cardinality: 'many-to-one',
      embedding: 'accounts with people',
      relationship: 'accounts_owner_id_fkey using accounts(owner_id) and people(id)'
    }
  ],
  hint: "Try changing 'people' to one of the following: 'people!people_sheet_linked_bank_id_fkey', 'people!accounts_owner_id_fkey'. Find the desired relationship in the 'details' key.",
  message: "Could not embed because more than one relationship was found for 'accounts' and 'people'"
}
[Sheet] No valid sheet link configured {
  lookupId: '7a54609d-d6bf-4692-aead-6432479b9cb1',
  profileId: '7a54609d-d6bf-4692-aead-6432479b9cb1'
}
[AutoSync] Skipping 7a54609d-d6bf-4692-aead-6432479b9cb1: No sheet link configured
[AutoSync] Checking if auto-sync needed for 8ecc4548-1114-4352-a531-1544241da35e / 2026-02
[Sheet] Profile lookup result {
  lookupId: '8ecc4548-1114-4352-a531-1544241da35e',
  profileId: '8ecc4548-1114-4352-a531-1544241da35e',
  sheet_link: null
}
Failed to fetch account for sheet sync: {
  code: 'PGRST201',
  details: [
    {
      cardinality: 'one-to-many',
      embedding: 'accounts with people',
      relationship: 'people_sheet_linked_bank_id_fkey using accounts(id) and people(sheet_linked_bank_id)'
    },
    {
      cardinality: 'many-to-one',
      embedding: 'accounts with people',
      relationship: 'accounts_owner_id_fkey using accounts(owner_id) and people(id)'
    }
  ],
  hint: "Try changing 'people' to one of the following: 'people!people_sheet_linked_bank_id_fkey', 'people!accounts_owner_id_fkey'. Find the desired relationship in the 'details' key.",
  message: "Could not embed because more than one relationship was found for 'accounts' and 'people'"
}
[Sheet] No valid sheet link configured {
  lookupId: '8ecc4548-1114-4352-a531-1544241da35e',
  profileId: '8ecc4548-1114-4352-a531-1544241da35e'
}
[AutoSync] Skipping 8ecc4548-1114-4352-a531-1544241da35e: No sheet link configured
[AutoSync] Checking if auto-sync needed for d419fd12-ad21-4dfa-8054-c6205f6d6b02 / 2026-02
[Sheet] Profile lookup result {
  lookupId: 'd419fd12-ad21-4dfa-8054-c6205f6d6b02',
  profileId: 'd419fd12-ad21-4dfa-8054-c6205f6d6b02',
  sheet_link: 'https://script.google.com/macros/s/AKfycbx-9meyYDFzAk6Qth3hINqeOhQkATgRAp4mGsmiS0K6yUs0Orvh3DUDuwP7uNvrr4OT/exec'   
}
[AutoSync] Triggering auto-sync for d419fd12-ad21-4dfa-8054-c6205f6d6b02 / 2026-02
[Sheet] Profile lookup result {
  lookupId: 'd419fd12-ad21-4dfa-8054-c6205f6d6b02',
  profileId: 'd419fd12-ad21-4dfa-8054-c6205f6d6b02',
  sheet_link: 'https://script.google.com/macros/s/AKfycbx-9meyYDFzAk6Qth3hINqeOhQkATgRAp4mGsmiS0K6yUs0Orvh3DUDuwP7uNvrr4OT/exec'   
}
[Sheet] Profile lookup result {
  lookupId: 'd419fd12-ad21-4dfa-8054-c6205f6d6b02',
  profileId: 'd419fd12-ad21-4dfa-8054-c6205f6d6b02',
  sheet_link: 'https://script.google.com/macros/s/AKfycbx-9meyYDFzAk6Qth3hINqeOhQkATgRAp4mGsmiS0K6yUs0Orvh3DUDuwP7uNvrr4OT/exec'   
}
[SheetSync] Sending batch of 1 transactions for 2026-02
[syncCycleTransactions] Person sheet preferences: {
  personId: 'd419fd12-ad21-4dfa-8054-c6205f6d6b02',
  showBankAccount: false,
  resolvedBankInfo: 'Vpbank',
  showQrImage: false,
  qrImageUrl: '(not set)'
}
[syncCycleTransactions] Final payload: {
  action: 'syncTransactions',
  person_id: 'd419fd12-ad21-4dfa-8054-c6205f6d6b02',
  cycle_tag: '2026-02',
  sheet_id: '1VuAzJYvoybqqyA8pHWGKfatNkVXZoeALqTY8Kf9ADs8',
  rows: '[1 rows]',
  bank_account: '',
  img: ''
}
 GET /transactions 200 in 18.6s (compile: 10ms, proxy.ts: 181ms, render: 18.4s)
[AutoSync] Successfully auto-synced d419fd12-ad21-4dfa-8054-c6205f6d6b02 / 2026-02
Distributing service: f0fd840f-aac8-4865-875b-53373de3496d
Service found: {
  id: 'f0fd840f-aac8-4865-875b-53373de3496d',
  name: 'iCloud',
  price: 246000,
  currency: 'VND',
  cycle_interval: 1,
  next_billing_date: null,
  shop_id: 'ade4442f-aa79-4333-be62-a63e500c75bf',
  default_category_id: null,
  note_template: '{date} {service} Slot: {slots} - {initialPrice}/{total_slots}',
  is_active: true,
  created_at: '2025-12-03T14:47:05.522061+00:00',
  max_slots: 6,
  last_distribution_date: '2026-02-03T15:36:09.66+00:00',
  next_distribution_date: '2026-03-01T15:36:09.66+00:00',
  distribution_status: 'completed'
}
Unit cost: 41000
Creating new transaction for member: Me (Mine) person_id: 917455ba-16c0-42f9-9cea-264f81a3db66
[Sheet Sync] Distribute syncing (create) for 917455ba-16c0-42f9-9cea-264f81a3db66
[Sheet] Profile lookup result {
  lookupId: '917455ba-16c0-42f9-9cea-264f81a3db66',
  profileId: '917455ba-16c0-42f9-9cea-264f81a3db66',
  sheet_link: null
}
Failed to fetch account for sheet sync: {
  code: 'PGRST201',
  details: [
    {
      cardinality: 'one-to-many',
      embedding: 'accounts with people',
      relationship: 'people_sheet_linked_bank_id_fkey using accounts(id) and people(sheet_linked_bank_id)'
    },
    {
      cardinality: 'many-to-one',
      embedding: 'accounts with people',
      relationship: 'accounts_owner_id_fkey using accounts(owner_id) and people(id)'
    }
  ],
  hint: "Try changing 'people' to one of the following: 'people!people_sheet_linked_bank_id_fkey', 'people!accounts_owner_id_fkey'. Find the desired relationship in the 'details' key.",
  message: "Could not embed because more than one relationship was found for 'accounts' and 'people'"
}
[Sheet] No valid sheet link configured {
  lookupId: '917455ba-16c0-42f9-9cea-264f81a3db66',
  profileId: '917455ba-16c0-42f9-9cea-264f81a3db66'
}
Creating new transaction for member: My person_id: 1f4f286e-d24f-47f3-ab04-14bce424f89a
[Sheet Sync] Distribute syncing (create) for 1f4f286e-d24f-47f3-ab04-14bce424f89a
[Sheet] Profile lookup result {
  lookupId: '1f4f286e-d24f-47f3-ab04-14bce424f89a',
  profileId: '1f4f286e-d24f-47f3-ab04-14bce424f89a',
  sheet_link: 'https://script.google.com/macros/s/AKfycbzzp_guXvz4SWqW7yX2fdOa2aSib5x2lTpujaLRoW1LRT8X6vFvm_1h6d8HPw9dM70Otg/exec' 
}
[syncTransactionToSheet] Person sheet preferences: {
  personId: '1f4f286e-d24f-47f3-ab04-14bce424f89a',
  showBankAccount: false,
  resolvedBankInfo: '',
  showQrImage: false,
  qrImageUrl: '(not set)'
}
Syncing to sheet for Person: 1f4f286e-d24f-47f3-ab04-14bce424f89a Payload: {
  action: 'create',
  id: 'a35a4ef8-3977-4192-bca1-4984ff3ab966',
  type: 'Debt',
  date: '2026-02-03T16:01:32.000Z',
  shop: 'iCloud',
  notes: '2026-02 iCloud Slot: 1 - 246,000/6',
  amount: 41000,
  percent_back: 0,
  fixed_back: 0,
  total_back: 0,
  tag: '2026-02',
  img: '',
  person_id: '1f4f286e-d24f-47f3-ab04-14bce424f89a',
  cycle_tag: '2026-02',
  bank_account: ''
}
Creating new transaction for member: Thảo person_id: dac6c157-2719-48a5-b42b-c1c1ac64cb06
[Sheet Sync] Distribute syncing (create) for dac6c157-2719-48a5-b42b-c1c1ac64cb06
[Sheet] Profile lookup result {
  lookupId: 'dac6c157-2719-48a5-b42b-c1c1ac64cb06',
  profileId: 'dac6c157-2719-48a5-b42b-c1c1ac64cb06',
  sheet_link: null
}
Failed to fetch account for sheet sync: {
  code: 'PGRST201',
  details: [
    {
      cardinality: 'one-to-many',
      embedding: 'accounts with people',
      relationship: 'people_sheet_linked_bank_id_fkey using accounts(id) and people(sheet_linked_bank_id)'
    },
    {
      cardinality: 'many-to-one',
      embedding: 'accounts with people',
      relationship: 'accounts_owner_id_fkey using accounts(owner_id) and people(id)'
    }
  ],
  hint: "Try changing 'people' to one of the following: 'people!people_sheet_linked_bank_id_fkey', 'people!accounts_owner_id_fkey'. Find the desired relationship in the 'details' key.",
  message: "Could not embed because more than one relationship was found for 'accounts' and 'people'"
}
[Sheet] No valid sheet link configured {
  lookupId: 'dac6c157-2719-48a5-b42b-c1c1ac64cb06',
  profileId: 'dac6c157-2719-48a5-b42b-c1c1ac64cb06'
}
Creating new transaction for member: Ngọc person_id: dcb5f10f-37e9-4ea1-86f4-fe2c51b0a248
[Sheet Sync] Distribute syncing (create) for dcb5f10f-37e9-4ea1-86f4-fe2c51b0a248
[Sheet] Profile lookup result {
  lookupId: 'dcb5f10f-37e9-4ea1-86f4-fe2c51b0a248',
  profileId: 'dcb5f10f-37e9-4ea1-86f4-fe2c51b0a248',
  sheet_link: null
}
Failed to fetch account for sheet sync: {
  code: 'PGRST201',
  details: [
    {
      cardinality: 'one-to-many',
      embedding: 'accounts with people',
      relationship: 'people_sheet_linked_bank_id_fkey using accounts(id) and people(sheet_linked_bank_id)'
    },
    {
      cardinality: 'many-to-one',
      embedding: 'accounts with people',
      relationship: 'accounts_owner_id_fkey using accounts(owner_id) and people(id)'
    }
  ],
  hint: "Try changing 'people' to one of the following: 'people!people_sheet_linked_bank_id_fkey', 'people!accounts_owner_id_fkey'. Find the desired relationship in the 'details' key.",
  message: "Could not embed because more than one relationship was found for 'accounts' and 'people'"
}
[Sheet] No valid sheet link configured {
  lookupId: 'dcb5f10f-37e9-4ea1-86f4-fe2c51b0a248',
  profileId: 'dcb5f10f-37e9-4ea1-86f4-fe2c51b0a248'
}
Creating new transaction for member: Lâm person_id: eccde148-a84e-455f-ba96-c8aa0b149ac8
[Sheet Sync] Distribute syncing (create) for eccde148-a84e-455f-ba96-c8aa0b149ac8
[Sheet] Profile lookup result {
  lookupId: 'eccde148-a84e-455f-ba96-c8aa0b149ac8',
  profileId: 'eccde148-a84e-455f-ba96-c8aa0b149ac8',
  sheet_link: 'https://script.google.com/macros/s/AKfycbwI_Nvz5bd-qFROwgv5QPll5BgSCbrgm-aL2i4fXBGg-juKbliafo0ZVeNXBlvsNhC1/exec'   
}
[syncTransactionToSheet] Person sheet preferences: {
  personId: 'eccde148-a84e-455f-ba96-c8aa0b149ac8',
  showBankAccount: true,
  resolvedBankInfo: '',
  showQrImage: false,
  qrImageUrl: '(not set)'
}
Syncing to sheet for Person: eccde148-a84e-455f-ba96-c8aa0b149ac8 Payload: {
  action: 'create',
  id: '8be6bc24-0584-41dc-9f6c-529a7d4ee0df',
  type: 'Debt',
  date: '2026-02-03T16:01:32.000Z',
  shop: 'iCloud',
  notes: '2026-02 iCloud Slot: 2 - 246,000/6',
  amount: 82000,
  percent_back: 0,
  fixed_back: 0,
  total_back: 0,
  tag: '2026-02',
  img: '',
  person_id: 'eccde148-a84e-455f-ba96-c8aa0b149ac8',
  cycle_tag: '2026-02',
  bank_account: ''
}
 GET /transactions 200 in 21.9s (compile: 9ms, proxy.ts: 198ms, render: 21.7s)
Error deleting transaction: {
  code: '23503',
  details: 'Key (id)=(fd6682e4-fa3f-4989-8ee8-2ff977dbb0ef) is still referenced from table "cashback_entries".',
  hint: null,
  message: 'update or delete on table "transactions" violates foreign key constraint "cashback_entries_transaction_id_fkey" on table "cashback_entries"'
}
 POST /transactions 200 in 1622ms (compile: 14ms, proxy.ts: 203ms, render: 1405ms)
 GET /transactions 200 in 22.9s (compile: 63ms, proxy.ts: 352ms, render: 22.4s)
[Bot Status] Updated service f0fd840f-aac8-4865-875b-53373de3496d: completed, next run 2026-03-01T16:02:07.279Z
[AutoSync] Triggering auto-sync for 5 people from service iCloud
[AutoSync] Checking if auto-sync needed for 917455ba-16c0-42f9-9cea-264f81a3db66 / 2026-02
[Sheet] Profile lookup result {
  lookupId: '917455ba-16c0-42f9-9cea-264f81a3db66',
  profileId: '917455ba-16c0-42f9-9cea-264f81a3db66',
  sheet_link: null
}
Failed to fetch account for sheet sync: {
  code: 'PGRST201',
  details: [
    {
      cardinality: 'one-to-many',
      embedding: 'accounts with people',
      relationship: 'people_sheet_linked_bank_id_fkey using accounts(id) and people(sheet_linked_bank_id)'
    },
    {
      cardinality: 'many-to-one',
      embedding: 'accounts with people',
      relationship: 'accounts_owner_id_fkey using accounts(owner_id) and people(id)'
    }
  ],
  hint: "Try changing 'people' to one of the following: 'people!people_sheet_linked_bank_id_fkey', 'people!accounts_owner_id_fkey'. Find the desired relationship in the 'details' key.",
  message: "Could not embed because more than one relationship was found for 'accounts' and 'people'"
}
[Sheet] No valid sheet link configured {
  lookupId: '917455ba-16c0-42f9-9cea-264f81a3db66',
  profileId: '917455ba-16c0-42f9-9cea-264f81a3db66'
}
[AutoSync] Skipping 917455ba-16c0-42f9-9cea-264f81a3db66: No sheet link configured
[AutoSync] Checking if auto-sync needed for 1f4f286e-d24f-47f3-ab04-14bce424f89a / 2026-02
[Sheet] Profile lookup result {
  lookupId: '1f4f286e-d24f-47f3-ab04-14bce424f89a',
  profileId: '1f4f286e-d24f-47f3-ab04-14bce424f89a',
  sheet_link: 'https://script.google.com/macros/s/AKfycbzzp_guXvz4SWqW7yX2fdOa2aSib5x2lTpujaLRoW1LRT8X6vFvm_1h6d8HPw9dM70Otg/exec' 
}
[AutoSync] Triggering auto-sync for 1f4f286e-d24f-47f3-ab04-14bce424f89a / 2026-02
[Sheet] Profile lookup result {
  lookupId: '1f4f286e-d24f-47f3-ab04-14bce424f89a',
  profileId: '1f4f286e-d24f-47f3-ab04-14bce424f89a',
  sheet_link: 'https://script.google.com/macros/s/AKfycbzzp_guXvz4SWqW7yX2fdOa2aSib5x2lTpujaLRoW1LRT8X6vFvm_1h6d8HPw9dM70Otg/exec' 
}
 GET /transactions 200 in 22.8s (compile: 12ms, proxy.ts: 208ms, render: 22.5s)
 GET /transactions 200 in 22.2s (compile: 60ms, proxy.ts: 275ms, render: 21.8s)
 GET /transactions 200 in 22.1s (compile: 14ms, proxy.ts: 367ms, render: 21.7s)
[Sheet] Profile lookup result {
  lookupId: '1f4f286e-d24f-47f3-ab04-14bce424f89a',
  profileId: '1f4f286e-d24f-47f3-ab04-14bce424f89a',
  sheet_link: 'https://script.google.com/macros/s/AKfycbzzp_guXvz4SWqW7yX2fdOa2aSib5x2lTpujaLRoW1LRT8X6vFvm_1h6d8HPw9dM70Otg/exec' 
}
[SheetSync] Sending batch of 1 transactions for 2026-02
[syncCycleTransactions] Person sheet preferences: {
  personId: '1f4f286e-d24f-47f3-ab04-14bce424f89a',
  showBankAccount: false,
  resolvedBankInfo: '',
  showQrImage: false,
  qrImageUrl: '(not set)'
}
[syncCycleTransactions] Final payload: {
  action: 'syncTransactions',
  person_id: '1f4f286e-d24f-47f3-ab04-14bce424f89a',
  cycle_tag: '2026-02',
  sheet_id: '1-56IPBtp_DPiThKZYv026uQAKx5X4hAX5rB9zPyR1z4',
  rows: '[1 rows]',
  bank_account: '',
  img: ''
}
[AutoSync] Successfully auto-synced 1f4f286e-d24f-47f3-ab04-14bce424f89a / 2026-02
[AutoSync] Checking if auto-sync needed for dac6c157-2719-48a5-b42b-c1c1ac64cb06 / 2026-02
[Sheet] Profile lookup result {
  lookupId: 'dac6c157-2719-48a5-b42b-c1c1ac64cb06',
  profileId: 'dac6c157-2719-48a5-b42b-c1c1ac64cb06',
  sheet_link: null
}
Failed to fetch account for sheet sync: {
  code: 'PGRST201',
  details: [
    {
      cardinality: 'one-to-many',
      embedding: 'accounts with people',
      relationship: 'people_sheet_linked_bank_id_fkey using accounts(id) and people(sheet_linked_bank_id)'
    },
    {
      cardinality: 'many-to-one',
      embedding: 'accounts with people',
      relationship: 'accounts_owner_id_fkey using accounts(owner_id) and people(id)'
    }
  ],
  hint: "Try changing 'people' to one of the following: 'people!people_sheet_linked_bank_id_fkey', 'people!accounts_owner_id_fkey'. Find the desired relationship in the 'details' key.",
  message: "Could not embed because more than one relationship was found for 'accounts' and 'people'"
}
[Sheet] No valid sheet link configured {
  lookupId: 'dac6c157-2719-48a5-b42b-c1c1ac64cb06',
  profileId: 'dac6c157-2719-48a5-b42b-c1c1ac64cb06'
}
[AutoSync] Skipping dac6c157-2719-48a5-b42b-c1c1ac64cb06: No sheet link configured
[AutoSync] Checking if auto-sync needed for dcb5f10f-37e9-4ea1-86f4-fe2c51b0a248 / 2026-02
[Sheet] Profile lookup result {
  lookupId: 'dcb5f10f-37e9-4ea1-86f4-fe2c51b0a248',
  profileId: 'dcb5f10f-37e9-4ea1-86f4-fe2c51b0a248',
  sheet_link: null
}
Failed to fetch account for sheet sync: {
  code: 'PGRST201',
  details: [
    {
      cardinality: 'one-to-many',
      embedding: 'accounts with people',
      relationship: 'people_sheet_linked_bank_id_fkey using accounts(id) and people(sheet_linked_bank_id)'
    },
    {
      cardinality: 'many-to-one',
      embedding: 'accounts with people',
      relationship: 'accounts_owner_id_fkey using accounts(owner_id) and people(id)'
    }
  ],
  hint: "Try changing 'people' to one of the following: 'people!people_sheet_linked_bank_id_fkey', 'people!accounts_owner_id_fkey'. Find the desired relationship in the 'details' key.",
  message: "Could not embed because more than one relationship was found for 'accounts' and 'people'"
}
[Sheet] No valid sheet link configured {
  lookupId: 'dcb5f10f-37e9-4ea1-86f4-fe2c51b0a248',
  profileId: 'dcb5f10f-37e9-4ea1-86f4-fe2c51b0a248'
}
[AutoSync] Skipping dcb5f10f-37e9-4ea1-86f4-fe2c51b0a248: No sheet link configured
[AutoSync] Checking if auto-sync needed for eccde148-a84e-455f-ba96-c8aa0b149ac8 / 2026-02
[AutoSync] Checking if auto-sync needed for eccde148-a84e-455f-ba96-c8aa0b149ac8 / 2026-02
[Sheet] Profile lookup result {
  lookupId: 'eccde148-a84e-455f-ba96-c8aa0b149ac8',
  profileId: 'eccde148-a84e-455f-ba96-c8aa0b149ac8',
  sheet_link: 'https://script.google.com/macros/s/AKfycbwI_Nvz5bd-qFROwgv5QPll5BgSCbrgm-aL2i4fXBGg-juKbliafo0ZVeNXBlvsNhC1/exec'   
}
[AutoSync] Skipping eccde148-a84e-455f-ba96-c8aa0b149ac8: Cycle sheet already exists
Batch distribution completed. Success: 2, Failed: 0, Skipped: 0