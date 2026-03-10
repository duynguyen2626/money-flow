import dotenv from 'dotenv';
dotenv.config({ path: '/Users/namnguyen/Library/Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/.env.local' });

const PB_URL = process.env.POCKETBASE_URL || 'https://api-db.reiwarden.io.vn';
const PB_EMAIL = process.env.POCKETBASE_DB_EMAIL!;
const PB_PASSWORD = process.env.POCKETBASE_DB_PASSWORD!;

async function test() {
  console.log('\n✅ FINAL TEST - Accounts Collection Health Check\n');

  // Step 1: Authenticate
  console.log('1️⃣  Authenticating...');
  const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
  });
  const authData = await authRes.json();
  const token = authData.token;
  console.log('   ✅ Authenticated\n');

  // Step 2: Test basic list
  console.log('2️⃣  Testing basic list query...');
  const basicRes = await fetch(`${PB_URL}/api/collections/pvl_acc_001/records`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const basicData = await basicRes.json();
  console.log(`   ✅ Found ${basicData.items?.length || 0} accounts\n`);

  // Step 3: Test with sort (the problematic query)
  console.log('3️⃣  Testing list query with sort parameter (THE FIX)...');
  const sortRes = await fetch(`${PB_URL}/api/collections/pvl_acc_001/records?sort=-created`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (sortRes.ok) {
    const sortData = await sortRes.json();
    console.log(`   ✅ Sort query works! Found ${sortData.items?.length || 0} accounts\n`);
    console.log('📊 Sample accounts:\n');
    sortData.items?.slice(0, 5).forEach((acc: any) => {
      console.log(`   - ${acc.id}: ${acc.name} (type: ${acc.type})`);
    });
    console.log('\n🎉 SUCCESS - Accounts collection is healthy!\n');
  } else {
    const errorText = await sortRes.text();
    console.log(`   ❌ FAILED: ${sortRes.status} - ${errorText.slice(0, 100)}\n`);
  }
}

test().catch(console.error);
