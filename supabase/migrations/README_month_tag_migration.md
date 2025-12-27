# Month Tag Migration: Legacy `MMMYY` -> `YYYY-MM`

This repo now treats `YYYY-MM` (e.g. `2025-12`) as the only canonical month tag for DB, UI, and sheet sync.

If your database still contains legacy month tags in `MMMYY` format, use the SQL snippets below to migrate them.

## 0) Inspect legacy tags

```sql
select tag, count(*)
from transactions
where tag ~ '^[A-Z]{3}[0-9]{2}$'
group by tag
order by count(*) desc;
```

## 1) Migrate `transactions.tag`

```sql
update transactions
set tag = concat(
  '20',
  right(tag, 2),
  '-',
  case left(tag, 3)
    when 'JAN' then '01'
    when 'FEB' then '02'
    when 'MAR' then '03'
    when 'APR' then '04'
    when 'MAY' then '05'
    when 'JUN' then '06'
    when 'JUL' then '07'
    when 'AUG' then '08'
    when 'SEP' then '09'
    when 'OCT' then '10'
    when 'NOV' then '11'
    when 'DEC' then '12'
  end
)
where tag ~ '^[A-Z]{3}[0-9]{2}$';
```

## 2) Migrate `transactions.persisted_cycle_tag` (cashback cycle tag)

```sql
update transactions
set persisted_cycle_tag = concat(
  '20',
  right(persisted_cycle_tag, 2),
  '-',
  case left(persisted_cycle_tag, 3)
    when 'JAN' then '01'
    when 'FEB' then '02'
    when 'MAR' then '03'
    when 'APR' then '04'
    when 'MAY' then '05'
    when 'JUN' then '06'
    when 'JUL' then '07'
    when 'AUG' then '08'
    when 'SEP' then '09'
    when 'OCT' then '10'
    when 'NOV' then '11'
    when 'DEC' then '12'
  end
)
where persisted_cycle_tag ~ '^[A-Z]{3}[0-9]{2}$';
```

## 3) Migrate `cashback_cycles.cycle_tag`

```sql
update cashback_cycles
set cycle_tag = concat(
  '20',
  right(cycle_tag, 2),
  '-',
  case left(cycle_tag, 3)
    when 'JAN' then '01'
    when 'FEB' then '02'
    when 'MAR' then '03'
    when 'APR' then '04'
    when 'MAY' then '05'
    when 'JUN' then '06'
    when 'JUL' then '07'
    when 'AUG' then '08'
    when 'SEP' then '09'
    when 'OCT' then '10'
    when 'NOV' then '11'
    when 'DEC' then '12'
  end
)
where cycle_tag ~ '^[A-Z]{3}[0-9]{2}$';
```

## 4) Optional: Migrate `transactions.metadata.month_tag`

If you used `metadata.month_tag` for idempotency in service automation, you may also want to normalize it:

```sql
update transactions
set metadata = jsonb_set(
  metadata,
  '{month_tag}',
  to_jsonb(concat(
    '20',
    right(metadata->>'month_tag', 2),
    '-',
    case left(metadata->>'month_tag', 3)
      when 'JAN' then '01'
      when 'FEB' then '02'
      when 'MAR' then '03'
      when 'APR' then '04'
      when 'MAY' then '05'
      when 'JUN' then '06'
      when 'JUL' then '07'
      when 'AUG' then '08'
      when 'SEP' then '09'
      when 'OCT' then '10'
      when 'NOV' then '11'
      when 'DEC' then '12'
    end
  )),
  true
)
where metadata ? 'month_tag'
  and (metadata->>'month_tag') ~ '^[A-Z]{3}[0-9]{2}$';
```

## 5) Verify

```sql
select count(*) from transactions where tag ~ '^[A-Z]{3}[0-9]{2}$';
select count(*) from transactions where persisted_cycle_tag ~ '^[A-Z]{3}[0-9]{2}$';
select count(*) from cashback_cycles where cycle_tag ~ '^[A-Z]{3}[0-9]{2}$';
```
