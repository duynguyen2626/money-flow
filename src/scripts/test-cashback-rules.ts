import { resolveCashbackPolicy } from '../services/cashback/policy-resolver';

const mockAccount = {
    cashback_config: {
        program: {
            rate: 0.01,
            minSpend: 5000000,
            levels: [
                {
                    id: 'lvl_1',
                    name: 'Silver',
                    minTotalSpend: 10000000,
                    defaultRate: 0.02,
                    categoryRules: [
                        {
                            categoryIds: ['cat_education'],
                            rate: 0.10,
                            maxReward: 300000
                        }
                    ]
                },
                {
                    id: 'lvl_2',
                    name: 'Gold',
                    minTotalSpend: 20000000,
                    defaultRate: 0.05,
                    categoryRules: [
                        {
                            categoryIds: ['cat_education'],
                            rate: 0.15,
                            maxReward: 500000
                        }
                    ]
                }
            ]
        }
    }
};

async function test() {
    console.log('--- Testing MF5.3 Cashback Rules ---');

    // Test Case 1: Below all levels -> Program Default
    const res1 = resolveCashbackPolicy({
        account: mockAccount,
        amount: 1000000,
        cycleTotals: { spent: 5000000 }
    });
    console.log('Case 1 (Spent 5M):', res1.rate === 0.01 ? 'PASS' : 'FAIL', '| Rate:', res1.rate, '| Reason:', res1.metadata.reason);

    // Test Case 2: Silver Level -> Level Default
    const res2 = resolveCashbackPolicy({
        account: mockAccount,
        amount: 1000000,
        cycleTotals: { spent: 15000000 }
    });
    console.log('Case 2 (Spent 15M):', res2.rate === 0.02 ? 'PASS' : 'FAIL', '| Rate:', res2.rate, '| Reason:', res2.metadata.reason);

    // Test Case 3: Silver Level + Education -> Category Rule
    const res3 = resolveCashbackPolicy({
        account: mockAccount,
        categoryId: 'cat_education',
        amount: 1000000,
        cycleTotals: { spent: 15000000 }
    });
    console.log('Case 3 (Spent 15M, Education):', res3.rate === 0.10 ? 'PASS' : 'FAIL', '| Rate:', res3.rate, '| Reason:', res3.metadata.reason);

    // Test Case 4: Gold Level -> Level Default
    const res4 = resolveCashbackPolicy({
        account: mockAccount,
        amount: 1000000,
        cycleTotals: { spent: 25000000 }
    });
    console.log('Case 4 (Spent 25M):', res4.rate === 0.05 ? 'PASS' : 'FAIL', '| Rate:', res4.rate, '| Reason:', res4.metadata.reason);

    // Test Case 5: Gold Level + Education -> Higher Category Rule
    const res5 = resolveCashbackPolicy({
        account: mockAccount,
        categoryId: 'cat_education',
        amount: 1000000,
        cycleTotals: { spent: 25000000 }
    });
    console.log('Case 5 (Spent 25M, Education):', res5.rate === 0.15 ? 'PASS' : 'FAIL', '| Rate:', res5.rate, '| Reason:', res5.metadata.reason);

    // Test Case 6: Legacy Config Fallback
    const legacyAccount = {
        cashback_config: {
            rate: 0.015,
            min_spend: 1000000
        }
    };
    const res6 = resolveCashbackPolicy({
        account: legacyAccount as any,
        amount: 1000000,
        cycleTotals: { spent: 5000000 }
    });
    console.log('Case 6 (Legacy):', res6.rate === 0.015 ? 'PASS' : 'FAIL', '| Rate:', res6.rate, '| Reason:', res6.metadata.reason);
}

test().catch(console.error);
