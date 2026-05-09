/*
  Pre-check script for migration: StabilizeConstraintsAndExpensePayer
  Goal:
    1) detect duplicates that block unique indexes on Users.Email/Users.Username
    2) detect expenses that would become invalid for new PayerId requirements
*/

-- 1) Duplicate emails (case-insensitive, trimmed)
SELECT
    LOWER(LTRIM(RTRIM(Email))) AS NormalizedEmail,
    COUNT(*) AS DuplicateCount
FROM Users
GROUP BY LOWER(LTRIM(RTRIM(Email)))
HAVING COUNT(*) > 1
ORDER BY DuplicateCount DESC, NormalizedEmail;

-- 2) Duplicate usernames (case-insensitive, trimmed)
SELECT
    LOWER(LTRIM(RTRIM(Username))) AS NormalizedUsername,
    COUNT(*) AS DuplicateCount
FROM Users
GROUP BY LOWER(LTRIM(RTRIM(Username)))
HAVING COUNT(*) > 1
ORDER BY DuplicateCount DESC, NormalizedUsername;

-- 3) Expenses that have no valid payer candidate (currently no PayerId in old schema)
-- If this returns rows, decide a business rule before running migration:
--   - either assign a valid existing user as payer
--   - or delete/fix corrupted records
SELECT e.Id, e.Description, e.Amount, e.GroupId, e.[Date]
FROM Expenses e
WHERE NOT EXISTS (SELECT 1 FROM Users u);

/*
 Optional helper cleanup snippets (review manually before use):

 -- Keep oldest user per normalized email, remove others (example only)
 -- WITH ranked AS (
 --   SELECT Id,
 --          ROW_NUMBER() OVER (
 --            PARTITION BY LOWER(LTRIM(RTRIM(Email)))
 --            ORDER BY Id
 --          ) AS rn
 --   FROM Users
 -- )
 -- DELETE FROM Users WHERE Id IN (SELECT Id FROM ranked WHERE rn > 1);
*/
