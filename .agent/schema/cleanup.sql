-- Delete legacy-tagged transactions
DELETE FROM transactions 
WHERE tag ~ '^[A-Z]{3}[0-9]{2}$' OR note LIKE 'Auto:%';
