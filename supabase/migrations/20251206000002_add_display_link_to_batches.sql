-- Add display_link to batches for the user-facing sheet link
alter table batches add column if not exists display_link text;

-- Migrate existing sheet_link to display_link if it looks like a Google Sheet (docs.google.com)
-- and keep sheet_link as webhook if it looks like a Script (script.google.com)
-- If it's a docs.google.com link in sheet_link, move it to display_link and clear sheet_link (since it's not a webhook)
UPDATE batches
SET display_link = sheet_link,
    sheet_link = NULL
WHERE sheet_link LIKE '%docs.google.com%';
