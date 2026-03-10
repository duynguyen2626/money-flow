# PocketBase API Reference

## Base Configuration

**Base URL:** `https://api-db.reiwarden.io.vn`  
**Environment Variables:**
```bash
POCKETBASE_URL=https://api-db.reiwarden.io.vn
POCKETBASE_DB_EMAIL=[your-email]
POCKETBASE_DB_PASSWORD=[your-password]
```

---

## Authentication

### Admin Login
```typescript
import { pbAuth } from '@/lib/pocketbase/server'

// Auto-authenticates using env vars
const pb = await pbAuth()
```

**Implementation:**
```typescript
// src/lib/pocketbase/server.ts
export async function pbAuth() {
  const baseUrl = process.env.POCKETBASE_URL || 'https://api-db.reiwarden.io.vn'
  const email = process.env.POCKETBASE_DB_EMAIL
  const password = process.env.POCKETBASE_DB_PASSWORD

  const authData = await fetch(`${baseUrl}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password }),
  }).then(res => res.json())

  return {
    baseUrl,
    token: authData.token,
    headers: {
      'Authorization': `Bearer ${authData.token}`,
      'Content-Type': 'application/json',
    }
  }
}
```

---

## Core Helper Functions

### 1. List Records (Paginated)

```typescript
import { pocketbaseList } from '@/services/pocketbase/server'

const response = await pocketbaseList<RecordType>('collection_name', {
  page: 1,
  perPage: 200,
  filter: 'field="value"',
  sort: '-created_at',
  expand: 'relation1,relation2',
  fields: 'id,name,email',
})

// Response structure:
{
  page: number,
  perPage: number,
  totalPages: number,
  totalItems: number,
  items: RecordType[],
}
```

**Filter Syntax:**
```javascript
// Equals
filter: 'name="John"'

// Not equals
filter: 'name!="John"'

// Greater than / Less than
filter: 'amount>1000'
filter: 'amount<=500'

// AND
filter: 'name="John" && age>18'

// OR
filter: 'name="John" || name="Jane"'

// IN
filter: 'status="active" || status="pending"'

// LIKE (substring match)
filter: 'name~"john"'

// Multiple conditions
filter: '(status="active" || status="pending") && amount>0'
```

**Sort Syntax:**
```javascript
// Ascending
sort: 'created_at'

// Descending (prefix with -)
sort: '-created_at'

// Multiple fields
sort: '-created_at,name'
```

### 2. Get Single Record

```typescript
import { pocketbaseGetById } from '@/services/pocketbase/server'

const record = await pocketbaseGetById<RecordType>('collection_name', 'record_id', {
  expand: 'relation1,relation2',
  fields: 'id,name,email',
})
```

### 3. Create Record

```typescript
import { pocketbaseRequest } from '@/services/pocketbase/server'

const newRecord = await pocketbaseRequest<RecordType>('/api/collections/collection_name/records', {
  method: 'POST',
  body: {
    id: 'optional_custom_id',
    field1: 'value1',
    field2: 'value2',
  },
})
```

### 4. Update Record

```typescript
const updated = await pocketbaseRequest<RecordType>(`/api/collections/collection_name/records/${id}`, {
  method: 'PATCH',
  body: {
    field1: 'new_value',
  },
})
```

### 5. Delete Record

```typescript
await pocketbaseRequest(`/api/collections/collection_name/records/${id}`, {
  method: 'DELETE',
})
```

---

## Advanced Patterns

### List All Records (Auto-pagination)

```typescript
async function listAllRecords(
  collection: string,
  params: Record<string, any> = {}
): Promise<PocketBaseRecord[]> {
  let page = 1
  let totalPages = 1
  const allItems: PocketBaseRecord[] = []

  while (page <= totalPages) {
    const response = await pocketbaseList(collection, {
      page,
      perPage: 200,
      ...params,
    })

    allItems.push(...(response.items || []))
    totalPages = response.totalPages || 1
    page += 1
  }

  return allItems
}

// Usage:
const allAccounts = await listAllRecords('accounts', {
  filter: 'is_active=true',
  sort: 'name',
})
```

### ID Resolution (Supabase UUID → PocketBase ID)

```typescript
import { toPocketBaseId } from '@/lib/pocketbase/utils'

async function resolvePocketBaseAccountRecord(
  sourceOrPocketBaseId: string
): Promise<PocketBaseRecord | null> {
  // Try 1: Direct PocketBase ID lookup
  try {
    return await pocketbaseGetById('accounts', sourceOrPocketBaseId)
  } catch {
    // Not a valid PB ID, continue
  }

  // Try 2: Hash Supabase UUID to PocketBase ID
  const hashedId = toPocketBaseId(sourceOrPocketBaseId, 'accounts')
  if (hashedId !== sourceOrPocketBaseId) {
    try {
      return await pocketbaseGetById('accounts', hashedId)
    } catch {
      // Hash didn't match, continue
    }
  }

  // Try 3: Query by slug field (slug = original Supabase UUID)
  try {
    const response = await pocketbaseList('accounts', {
      filter: `slug='${sourceOrPocketBaseId}'`,
      perPage: 1,
    })
    return response.items?.[0] || null
  } catch {
    console.error('[PB] Failed to resolve account by slug')
  }

  return null
}
```

### Expand Relations

```typescript
// Single expand
const account = await pocketbaseGetById('accounts', id, {
  expand: 'owner_id',  // Expands owner_id relation
})
// Access: account.expand.owner_id

// Multiple expands
const transaction = await pocketbaseGetById('transactions', id, {
  expand: 'account_id,category_id,shop_id,person_id',
})
// Access: transaction.expand.account_id, transaction.expand.category_id, etc.

// Nested expands (PocketBase supports up to 6 levels)
const transaction = await pocketbaseGetById('transactions', id, {
  expand: 'account_id,account_id.owner_id',
})
// Access: transaction.expand.account_id.expand.owner_id
```

### Batch Operations

```typescript
// Parallel creates
const promises = items.map(item =>
  pocketbaseRequest('/api/collections/collection_name/records', {
    method: 'POST',
    body: item,
  })
)
const results = await Promise.allSettled(promises)

// Parallel updates
const updates = ids.map(id =>
  pocketbaseRequest(`/api/collections/collection_name/records/${id}`, {
    method: 'PATCH',
    body: { is_archived: true },
  })
)
await Promise.all(updates)
```

---

## Error Handling

### Standard Error Pattern

```typescript
import { isPocketBase400Or404 } from '@/lib/pocketbase/fallback-helpers'

try {
  const data = await pocketbaseGetById('accounts', id)
  return data
} catch (error) {
  if (isPocketBase400Or404(error)) {
    console.log('[PB] Record not found, trying fallback...')
    // Fall back to Supabase or alternative
    return await getSupabaseAccount(id)
  }
  throw error
}
```

### Fallback Pattern with Helper

```typescript
import { executeWithFallback } from '@/lib/pocketbase/fallback-helpers'

const accounts = await executeWithFallback(
  () => getPocketBaseAccounts(),
  () => getSupabaseAccounts(),
  'accounts'
)
```

**Implementation:**
```typescript
export async function executeWithFallback<T>(
  pbCall: () => Promise<T>,
  supabaseCall: () => Promise<T>,
  entityName: string
): Promise<T> {
  try {
    console.log(`[DB:PB] ${entityName}.execute`)
    const result = await pbCall()
    console.log(`[DB:PB] ${entityName}.execute - success`)
    return result
  } catch (error) {
    if (isPocketBase400Or404(error)) {
      console.log(`[DB:PB] ${entityName}.execute - fallback to Supabase`)
      return await supabaseCall()
    }
    throw error
  }
}
```

### Network Error Recovery

```typescript
export function isPocketBase400Or404(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    // PocketBase HTTP errors
    if (message.includes('[400]') || message.includes('[404]')) {
      return true
    }
    
    // Network/fetch errors (recoverable)
    if (message.includes('fetch failed')) {
      return true
    }
    
    // Node.js socket errors
    if ('code' in error && error.code === 'UND_ERR_SOCKET') {
      return true
    }
    
    if ('cause' in error && error.cause && typeof error.cause === 'object') {
      if ('code' in error.cause && error.cause.code === 'UND_ERR_SOCKET') {
        return true
      }
    }
  }
  return false
}
```

---

## Field Mapping Patterns

### Basic Mapping

```typescript
function mapAccount(record: PocketBaseRecord): Account {
  return {
    id: record.slug || record.id,  // Prefer source ID
    name: record.name,
    type: record.type,
    current_balance: Number(record.current_balance || 0),
    credit_limit: Number(record.credit_limit || 0),
    is_active: Boolean(record.is_active ?? true),
    // ... other fields
  }
}
```

### Mapping with Relations (Expand)

```typescript
function mapTransaction(
  record: PocketBaseRecord,
  currentAccountSourceId: string
): TransactionWithDetails {
  const expandedAccount = record.expand?.account_id
  const expandedCategory = record.expand?.category_id
  const expandedShop = record.expand?.shop_id
  const expandedPerson = record.expand?.person_id

  return {
    id: record.metadata?.source_id || record.id,
    occurred_at: record.occurred_at,
    amount: Number(record.amount || 0),
    
    // Use slug if available, otherwise use ID
    account_id: expandedAccount?.slug || record.account_id,
    category_id: expandedCategory?.slug || record.category_id,
    shop_id: expandedShop?.slug || record.shop_id,
    person_id: expandedPerson?.slug || record.person_id,
    
    // Expanded details
    account: expandedAccount ? {
      id: expandedAccount.slug || expandedAccount.id,
      name: expandedAccount.name,
      type: expandedAccount.type,
    } : null,
    
    category: expandedCategory ? {
      id: expandedCategory.slug || expandedCategory.id,
      name: expandedCategory.name,
      type: expandedCategory.type,
    } : null,
    
    // ... other fields
  }
}
```

---

## Performance Optimization

### Field Selection

```typescript
// Fetch only needed fields to reduce payload size
const accounts = await pocketbaseList('accounts', {
  fields: 'id,slug,name,type,current_balance',
})
```

### Pagination Configuration

```typescript
// Use smaller perPage for quick initial load
const firstPage = await pocketbaseList('transactions', {
  perPage: 20,  // Quick first load
  sort: '-occurred_at',
})

// Then load more in background
const allTransactions = await listAllRecords('transactions', {
  perPage: 200,  // Max allowed
})
```

### Caching Strategy

```typescript
// Cache in React Server Component
import { cache } from 'react'

export const getCachedAccounts = cache(async () => {
  return await getPocketBaseAccounts()
})

// Use in multiple places without re-fetching
const accounts1 = await getCachedAccounts()
const accounts2 = await getCachedAccounts()  // Returns cached result
```

---

## Common Use Cases

### 1. Get Account with Transactions

```typescript
async function getAccountWithTransactions(accountId: string) {
  const accountRecord = await resolvePocketBaseAccountRecord(accountId)
  if (!accountRecord) return null
  
  const pbAccountId = accountRecord.id
  
  const transactions = await listAllRecords('transactions', {
    filter: `(account_id='${pbAccountId}' || target_account_id='${pbAccountId}')`,
    sort: '-occurred_at',
    expand: 'category_id,shop_id,person_id',
    perPage: 200,
  })
  
  return {
    account: mapAccount(accountRecord),
    transactions: transactions.map(t => mapTransaction(t, accountId)),
  }
}
```

### 2. Get Cashback Stats for Cycle

```typescript
async function getCashbackStats(accountId: string, cycleTag: string) {
  const accountRecord = await resolvePocketBaseAccountRecord(accountId)
  if (!accountRecord) return null
  
  const pbAccountId = accountRecord.id
  
  const cycleResponse = await pocketbaseList('cashback_cycles', {
    filter: `account_id='${pbAccountId}' && cycle_tag='${cycleTag}'`,
    perPage: 1,
  })
  
  const cycle = cycleResponse.items[0]
  if (!cycle) return null
  
  return {
    spent_amount: Number(cycle.spent_amount || 0),
    real_awarded: Number(cycle.real_awarded || 0),
    virtual_profit: Number(cycle.virtual_profit || 0),
    net_profit: Number(cycle.net_profit || 0),
  }
}
```

### 3. Create Transaction with Cashback

```typescript
async function createTransactionWithCashback(data: TransactionInput) {
  // 1. Create transaction
  const transaction = await pocketbaseRequest('/api/collections/transactions/records', {
    method: 'POST',
    body: {
      occurred_at: data.occurred_at,
      amount: data.amount,
      account_id: toPocketBaseId(data.account_id, 'accounts'),
      category_id: data.category_id ? toPocketBaseId(data.category_id, 'categories') : null,
      // ... other fields
    },
  })
  
  // 2. Create cashback entry if applicable
  if (data.cashback_amount > 0) {
    await pocketbaseRequest('/api/collections/cashback_entries/records', {
      method: 'POST',
      body: {
        transaction_id: transaction.id,
        account_id: toPocketBaseId(data.account_id, 'accounts'),
        base_amount: data.amount,
        cashback_amount: data.cashback_amount,
        rate: data.cashback_rate,
      },
    })
  }
  
  return transaction
}
```

---

## Testing & Debugging

### Enable Request Logging

```typescript
// In pocketbaseRequest function:
console.log('[PB:Request]', method, path)
console.log('[PB:Body]', JSON.stringify(body))
console.log('[PB:Response]', response.status, await response.text())
```

### Test Connection

```typescript
async function testPocketBaseConnection() {
  try {
    const accounts = await pocketbaseList('accounts', { perPage: 1 })
    console.log('✓ PocketBase connected:', accounts.totalItems, 'accounts')
    return true
  } catch (error) {
    console.error('✗ PocketBase connection failed:', error)
    return false
  }
}
```

### Verify ID Resolution

```typescript
async function testIdResolution(supabaseId: string) {
  console.log('Testing ID:', supabaseId)
  
  const record = await resolvePocketBaseAccountRecord(supabaseId)
  if (record) {
    console.log('✓ Resolved to PB ID:', record.id)
    console.log('✓ Slug:', record.slug)
    console.log('✓ Name:', record.name)
  } else {
    console.log('✗ Failed to resolve')
  }
}
```

---

## Quick Reference

### Import Paths
```typescript
import { pocketbaseList, pocketbaseGetById, pocketbaseRequest } from '@/services/pocketbase/server'
import { pbAuth } from '@/lib/pocketbase/server'
import { toPocketBaseId } from '@/lib/pocketbase/utils'
import { executeWithFallback, isPocketBase400Or404 } from '@/lib/pocketbase/fallback-helpers'
```

### Collection Names
- `accounts` - Financial accounts
- `transactions` - Transaction records
- `cashback_cycles` - Cycle aggregates
- `cashback_entries` - Transaction-level cashback
- `people` - People/contacts
- `shops` - Merchants/vendors
- `categories` - Transaction categories

### Max Limits
- `perPage`: 200 (hard limit)
- Expand depth: 6 levels
- Filter length: ~1000 chars (recommended)

---

**Last Updated:** March 10, 2026  
**Related:** `POCKETBASE_COLLECTIONS_SCHEMA.md`, `POCKETBASE_MIGRATION_PROGRESS.md`
