-- Lock down the Supabase REST (PostgREST) API: with RLS enabled and no policies,
-- the anon/authenticated roles can read or write nothing. The app accesses data
-- only through Prisma on the server (postgres role, which bypasses RLS).
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '\_prisma%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
