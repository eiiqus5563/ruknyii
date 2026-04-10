INSERT INTO "Subscription" (id, "userId", plan, status, "createdAt", "updatedAt")
SELECT gen_random_uuid(), u.id, 'FREE', 'ACTIVE', NOW(), NOW()
FROM "User" u
WHERE NOT EXISTS (SELECT 1 FROM "Subscription" s WHERE s."userId" = u.id);
