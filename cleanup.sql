-- Delete transaction lines first (FK constraints)
DELETE FROM transaction_lines 
WHERE transaction_id IN (
  SELECT id FROM transactions WHERE tag ~ '^[A-Z]{3}[0-9]{2}$' OR note LIKE 'Auto:%'
);

-- Delete the transactions
DELETE FROM transactions 
WHERE tag ~ '^[A-Z]{3}[0-9]{2}$' OR note LIKE 'Auto:%';
