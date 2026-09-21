-- 260909 batch: delete Seed Product prod (test fixture never removed from prod).
-- Run backup first, verify counts, then run delete section.

-- BACKUP (run and capture output before delete)
\x on
SELECT * FROM public.products WHERE id='00000000-0000-4000-8000-000000000002';
SELECT * FROM public.categories WHERE id='00000000-0000-4000-8000-000000000001';
SELECT * FROM public.platform_skus WHERE "productId"='00000000-0000-4000-8000-000000000002';
\x off

-- DELETE (only these rows; category is orphaned after product delete, confirmed 1-to-1)
BEGIN;
DELETE FROM public.platform_skus WHERE "productId"='00000000-0000-4000-8000-000000000002';
DELETE FROM public.products WHERE id='00000000-0000-4000-8000-000000000002';
DELETE FROM public.categories WHERE id='00000000-0000-4000-8000-000000000001';
COMMIT;
