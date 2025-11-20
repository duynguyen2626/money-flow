1/4
Console Error
Server


Error fetching debt by tags: {}
src\services\debt.service.ts (109:13) @ getDebtByTags


  107 |
  108 |   if (error) {
> 109 |     console.error('Error fetching debt by tags:', error);
      |             ^
  110 |     console.error('Error code:', error.code);
  111 |     console.error('Error message:', error.message);
  112 |     console.error('Error details:', error.details);
Call Stack
13

Show 9 ignore-listed frame(s)
getDebtByTags
src\services\debt.service.ts (109:13)
Function.all
<anonymous>
PeopleDetailPage
src\app\people\[id]\page.tsx (39:58)
PeopleDetailPage
<anonymous>

2/4
Error code: "PGRST100"
src\services\debt.service.ts (110:13) @ getDebtByTags


  108 |   if (error) {
  109 |     console.error('Error fetching debt by tags:', error);
> 110 |     console.error('Error code:', error.code);
      |             ^
  111 |     console.error('Error message:', error.message);
  112 |     console.error('Error details:', error.details);
  113 |     return []
Call Stack
13

Show 9 ignore-listed frame(s)
getDebtByTags
src\services\debt.service.ts (110:13)
Function.all
<anonymous>
PeopleDetailPage
src\app\people\[id]\page.tsx (39:58)
PeopleDetailPage
<anonymous>
3/4
Console Error
Server


Error message: "\"failed to parse order (transactions.occurred_at.desc)\" (line 1, column 14)"
src\services\debt.service.ts (111:13) @ getDebtByTags


  109 |     console.error('Error fetching debt by tags:', error);
  110 |     console.error('Error code:', error.code);
> 111 |     console.error('Error message:', error.message);
      |             ^
  112 |     console.error('Error details:', error.details);
  113 |     return []
  114 |   }
Call Stack
13

Show 9 ignore-listed frame(s)
getDebtByTags
src\services\debt.service.ts (111:13)
Function.all
<anonymous>
PeopleDetailPage
src\app\people\[id]\page.tsx (39:58)
PeopleDetailPage
<anonymous>
1
2

4/4
Console Error
Server


Error message: "\"failed to parse order (transactions.occurred_at.desc)\" (line 1, column 14)"
src\services\debt.service.ts (111:13) @ getDebtByTags


  109 |     console.error('Error fetching debt by tags:', error);
  110 |     console.error('Error code:', error.code);
> 111 |     console.error('Error message:', error.message);
      |             ^
  112 |     console.error('Error details:', error.details);
  113 |     return []
  114 |   }
Call Stack
13

Show 9 ignore-listed frame(s)
getDebtByTags
src\services\debt.service.ts (111:13)
Function.all
<anonymous>
PeopleDetailPage
src\app\people\[id]\page.tsx (39:58)
PeopleDetailPage
<anonymous>
1
2
