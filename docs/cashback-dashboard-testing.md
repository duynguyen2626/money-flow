# Cashback Dashboard QA Checklist

Scope: cashback detail, matrix, and volunteer views after net-profit and config fixes.

## Data setup
- Ensure credit cards in Supabase have `cashback_config`; Vpbank Lady sample: account id `83a27121-0e34-4231-b060-2818da672eca` (see supabase/sample.sql) with two levels and category rule.
- Annual fee comes from `accounts.annual_fee`; bank back/give away from cashback engine totals (`getCashbackProgress`).
- Volunteer data query filters: `cashback_mode = 'voluntary'`, `status != 'void'`, date range `${year}-01-01`..`${year}-12-31`.

## Detail tab
- Net Profit = Bank Back (cashbackRedeemedYearTotal) - Give Away (sum of monthly totalGivenAway) - Annual Fee; negative if fee exceeds earnings.
- Annual Fee shows as positive value (no leading minus); Bank Back uses engine totals, not stale netProfit.
- Advanced Rules popover: parses `cashback_config.program.levels` (or `levels`), shows tier names, min spend, rates; flat-rate fallback when no levels. Vpbank Lady should display both tiers.
- Give Away per month comes from `totalGivenAway`; clicking opens Month Detail modal with transactions and totals.
- Search in sidebar filters cards; excludes names containing DUPLICATE/DO NOT USE and zero-activity cards.

## Matrix tab
- Derived net per row/total uses Bank Back - Give Away - Annual Fee (same as detail tab).
- Annual Fee column displays positive values; totals sum across visible cards.
- Month cells show Give Away amounts; click opens Month Detail modal with correct card/month.

## Volunteer tab
- Rows show per-account volunteer cashback given per month; totals sum per month and grand total.
- Clicking a month opens modal showing volunteer transactions; Σ Back equals cashbackGiven; %/Fixed Back shown as "-" (not available for volunteer).

## Regression smoke
- Year selector preserves chosen tab via query params (`detail|matrix|volunteer`).
- Tabs: default tab is `detail` unless `tab=matrix` or `tab=volunteer`.
- UI typography: no mono/strikethrough in sidebar amounts; square avatars/thumbnails.

## Commands
```
pnpm lint
pnpm build
```
(Repo has no `pnpm test` script.)
