-- Delete transaction lines first (FK constraints)
DELETE FROM transaction_lines 
WHERE transaction_id IN (
  SELECT id FROM transactions WHERE note LIKE 'Auto:%'
);

-- Delete the transactions
DELETE FROM transactions 
WHERE note LIKE 'Auto:%';
