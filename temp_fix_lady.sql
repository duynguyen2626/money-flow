UPDATE accounts 
SET cashback_config = jsonb_set(
    jsonb_set(
        cashback_config,
        '{program,levels,0,minTotalSpend}',
        '15000000'
    ),
    '{program,levels,1,minTotalSpend}',
    '100000'
)
WHERE name = 'Vpbank Lady';

SELECT 
    name,
    cashback_config->'program'->'levels'->0->>'minTotalSpend' as premium_min,
    cashback_config->'program'->'levels'->1->>'minTotalSpend' as standard_min
FROM accounts
WHERE name = 'Vpbank Lady';
