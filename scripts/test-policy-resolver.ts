
import { resolveCashbackPolicy } from '../src/services/cashback/policy-resolver';
import { ParsedCashbackConfig } from '../src/lib/cashback';

// Mock Config: VPBank Lady Style (Simulated)
// Default 0.3%
// Education (CatID: 'edu'): 
//   - Spend < 15M: 7.5%, Max 100k
//   - Spend >= 15M: 15%, Max 300k
const mockConfig = {
    program: {
        defaultRate: 0.003,
        levels: [
            {
                id: 'lvl1',
                name: 'Low Spend',
                minTotalSpend: 0,
                defaultRate: 0.003,
                rules: [
                    {
                        categoryIds: ['edu'],
                        rate: 0.075,
                        maxReward: 100000
                    }
                ]
            },
            {
                id: 'lvl2',
                name: 'High Spend',
                minTotalSpend: 15000000,
                defaultRate: 0.003,
                rules: [
                    {
                        categoryIds: ['edu'],
                        rate: 0.15,
                        maxReward: 300000
                    }
                ]
            }
        ]
    }
};

const account = {
    cashback_config: mockConfig,
    cb_type: 'tiered' as const,
    cb_base_rate: 0.003,
    cb_rules_json: mockConfig.program.levels
};

console.log('--- TEST 1: Low Spend, Non-Category ---');
const res1 = resolveCashbackPolicy({
    account: account as any,
    categoryId: 'other',
    amount: 100000,
    cycleTotals: { spent: 5000000 }
});
console.log('Expected: 0.3%, level_default. Got:', res1.rate, res1.metadata.policySource);
if (res1.rate === 0.003 && res1.metadata.policySource === 'level_default') console.log('PASS'); else console.error('FAIL');

console.log('--- TEST 2: Low Spend, Education ---');
const res2 = resolveCashbackPolicy({
    account: account as any,
    categoryId: 'edu',
    amount: 1000000,
    cycleTotals: { spent: 5000000 }
});
console.log('Expected: 7.5%, Cap 100k. Got:', res2.rate, res2.metadata.ruleMaxReward);
if (res2.rate === 0.075 && res2.metadata.ruleMaxReward === 100000) console.log('PASS'); else console.error('FAIL');

console.log('--- TEST 3: High Spend, Education ---');
const res3 = resolveCashbackPolicy({
    account: account as any,
    categoryId: 'edu',
    amount: 1000000,
    cycleTotals: { spent: 20000000 } // > 15M
});
console.log('Expected: 15%, Cap 300k. Got:', res3.rate, res3.metadata.ruleMaxReward);
if (res3.rate === 0.15 && res3.metadata.ruleMaxReward === 300000) console.log('PASS'); else console.error('FAIL');

console.log('--- TEST 4: High Spend, Non-Category ---');
const res4 = resolveCashbackPolicy({
    account: account as any,
    categoryId: 'other',
    amount: 1000000,
    cycleTotals: { spent: 20000000 }
});
console.log('Expected: 0.3%, level_default (or program_default if same). Got:', res4.rate, res4.metadata.policySource);
if (res4.rate === 0.003) console.log('PASS'); else console.error('FAIL');

console.log('--- Metadata Verification ---');
console.log(JSON.stringify(res3.metadata, null, 2));

console.log('ALL TESTS COMPLETED');
