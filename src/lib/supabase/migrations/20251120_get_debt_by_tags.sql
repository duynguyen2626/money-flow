-- Drop the function if it exists
drop function if exists get_debt_by_tags(uuid);

-- Create the function with correct syntax
create or replace function get_debt_by_tags(person_id uuid)
returns table (
  tag text,
  balance numeric,
  status text,
  last_activity timestamptz
)
language sql
as $$
  select
    coalesce(t.tag, 'UNTAGGED') as tag,
    sum(tl.amount) as balance,
    case
      when abs(sum(tl.amount)) < 0.01 then 'settled'
      else 'active'
    end as status,
    max(t.occurred_at) as last_activity
  from transaction_lines tl
  join transactions t on tl.transaction_id = t.id
  where tl.account_id = person_id
  group by t.tag
  order by last_activity desc;
$$;