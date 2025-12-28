# Sheet Sync Dev Notes

- Safe delete shifts cells only inside the table (A:J plus the Shop raw column) so Summary columns (L:N) never move.
- Sorting is range-limited to the table data; Summary columns are intentionally left untouched.
