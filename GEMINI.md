AGENT TASK: FIX BROKEN SUBSCRIPTION/SERVICE REFERENCES

CRITICAL BUG:

Error: PGRST205: Could not find the table 'public.subscription_members'.

Cause: We migrated to service_members table in Phase 62, but the codebase (services/components) is still querying the old table name.

OBJECTIVE:
Search and replace all legacy references to subscription_members with service_members in the entire codebase.

I. BACKEND FIXES (src/services/*.ts)

1. subscription.service.ts (or service-manager.ts)

Search: from('subscription_members')

Replace: from('service_members')

Search: select('..., subscription_members(...)')

Replace: select('..., service_members(...)')

2. people.service.ts

Function: getPeople / getPersonDetails.

Fix: The query joining subscriptions likely uses the old relation name. Update it to service_members.

3. dashboard.service.ts

Check if any dashboard stats rely on member counts from the old table.

II. FRONTEND FIXES (src/components/**/*.tsx)

1. ServiceCard.tsx / ServicePage

The component expects a subscription_members array property.

Action: Update the TypeScript interface Subscription (in moneyflow.types.ts) to rename the property to service_members (or map it in the transformer).

Fix Render: Update the map loop: service.service_members.map(...).

2. PersonCard.tsx

Check where it counts "Active Subs". Ensure it reads from the correct joined table.

III. TYPE DEFINITIONS (src/types/database.types.ts)

Action:

If you are using a generated types file, run supabase gen types (or manually update it if you maintain it).

Ensure Tables['service_members'] exists and Tables['subscription_members'] is removed/deprecated.

IV. EXECUTION STEPS

Global Search: Find "subscription_members".

Replace: Logic update to "service_members".

Types: Update moneyflow.types.ts.

Verify: Run npm run build to catch type errors.