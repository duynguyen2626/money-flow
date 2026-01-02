-- Create RPC function to get year cashback summary matrix
CREATE OR REPLACE FUNCTION get_year_cashback_summary(year_input int) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE result JSONB;
BEGIN WITH parsed_cycles AS (
    SELECT c.id,
        c.account_id,
        c.cycle_tag,
        c.real_awarded,
        c.spent_amount,
        CASE
            -- YYYY-MM
            WHEN c.cycle_tag ~ '^\d{4}-\d{2}$' THEN substring(c.cycle_tag, 1, 4)::int -- MONYY
            WHEN c.cycle_tag ~ '^[A-Z]{3}\d{2}$' THEN ('20' || substring(c.cycle_tag, 4, 2))::int
            ELSE NULL
        END as cycle_year,
        CASE
            -- YYYY-MM
            WHEN c.cycle_tag ~ '^\d{4}-\d{2}$' THEN substring(c.cycle_tag, 6, 2)::int -- MONYY
            WHEN c.cycle_tag ~ '^[A-Z]{3}\d{2}$' THEN CASE
                substring(c.cycle_tag, 1, 3)
                WHEN 'JAN' THEN 1
                WHEN 'FEB' THEN 2
                WHEN 'MAR' THEN 3
                WHEN 'APR' THEN 4
                WHEN 'MAY' THEN 5
                WHEN 'JUN' THEN 6
                WHEN 'JUL' THEN 7
                WHEN 'AUG' THEN 8
                WHEN 'SEP' THEN 9
                WHEN 'OCT' THEN 10
                WHEN 'NOV' THEN 11
                WHEN 'DEC' THEN 12
                ELSE 0
            END
            ELSE NULL
        END as cycle_month
    FROM cashback_cycles c
),
cycle_estimates AS (
    SELECT e.cycle_id,
        SUM(
            COALESCE((e.metadata->>'cashback_amount')::numeric, 0)
        ) as estimated_amount
    FROM cashback_entries e
    WHERE e.metadata->>'cashback_amount' IS NOT NULL
    GROUP BY e.cycle_id
),
aggregated_cycles AS (
    SELECT pc.account_id,
        pc.cycle_month,
        COALESCE(ce.estimated_amount, 0) as estimated,
        COALESCE(pc.real_awarded, 0) as real_val
    FROM parsed_cycles pc
        LEFT JOIN cycle_estimates ce ON ce.cycle_id = pc.id
    WHERE pc.cycle_year = year_input
),
account_stats AS (
    SELECT a.id,
        a.name,
        a.image_url,
        COALESCE(a.annual_fee, 0) as annual_fee,
        COALESCE(SUM(ac.real_val), 0) as total_real
    FROM accounts a
        LEFT JOIN aggregated_cycles ac ON ac.account_id = a.id
    WHERE a.is_active = true
    GROUP BY a.id,
        a.name,
        a.image_url,
        a.annual_fee
),
json_output AS (
    SELECT ast.id,
        ast.name,
        ast.image_url,
        ast.annual_fee,
        ast.total_real,
        (ast.total_real - ast.annual_fee) as profit,
        COALESCE(
            (
                SELECT jsonb_object_agg(
                        ac.cycle_month,
                        jsonb_build_object(
                            'estimated',
                            ac.estimated,
                            'real',
                            ac.real_val
                        )
                    )
                FROM aggregated_cycles ac
                WHERE ac.account_id = ast.id
            ),
            '{}'::jsonb
        ) as months
    FROM account_stats ast
    ORDER BY ast.name
)
SELECT jsonb_agg(row_to_json(jo)) INTO result
FROM json_output jo;
RETURN COALESCE(result, '[]'::jsonb);
END;
$$;