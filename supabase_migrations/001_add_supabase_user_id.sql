-- Migration: Add supabase_user_id to app_users
-- Purpose: Replace nullable email as identity key with stable Supabase auth UUID.
--
-- HOW TO APPLY:
--   1. Open Supabase dashboard → SQL Editor for your project.
--   2. Paste and run the statements below.
--   3. Redeploy your API functions after applying.
--
-- NOTES:
--   - Existing rows will have supabase_user_id = NULL until users sign in again
--     and /api/user/upsert is called. This is acceptable for a dev/early-stage app.
--   - The NOT NULL constraint uses DEFERRABLE so existing rows are not immediately
--     rejected; tighten to NOT NULL after backfilling if required.

-- Step 1: Add the new column (nullable first to allow backfill of existing rows)
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS supabase_user_id uuid;

-- Step 2: Add unique constraint on supabase_user_id
--         (used by upsert onConflict: 'supabase_user_id')
ALTER TABLE app_users
  ADD CONSTRAINT app_users_supabase_user_id_key UNIQUE (supabase_user_id);

-- Step 3: (Optional) After all existing users have signed in and been upserted,
--         enforce NOT NULL to prevent new rows without supabase_user_id:
--
-- ALTER TABLE app_users
--   ALTER COLUMN supabase_user_id SET NOT NULL;

-- Step 4: (Recommended) Row Level Security — restrict each table to its owner.
--         Enable RLS first if not already enabled:
--
-- ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chess_games ENABLE ROW LEVEL SECURITY;
--
-- Policies (adjust service-role bypass as needed):
--
-- CREATE POLICY "Users can manage own app_users row"
--   ON app_users FOR ALL
--   USING (supabase_user_id = auth.uid())
--   WITH CHECK (supabase_user_id = auth.uid());
--
-- CREATE POLICY "Users can manage own chat sessions"
--   ON chat_sessions FOR ALL
--   USING (user_id IN (SELECT id FROM app_users WHERE supabase_user_id = auth.uid()))
--   WITH CHECK (user_id IN (SELECT id FROM app_users WHERE supabase_user_id = auth.uid()));
--
-- CREATE POLICY "Users can manage own chat messages"
--   ON chat_messages FOR ALL
--   USING (session_id IN (
--     SELECT cs.id FROM chat_sessions cs
--     JOIN app_users au ON au.id = cs.user_id
--     WHERE au.supabase_user_id = auth.uid()
--   ))
--   WITH CHECK (session_id IN (
--     SELECT cs.id FROM chat_sessions cs
--     JOIN app_users au ON au.id = cs.user_id
--     WHERE au.supabase_user_id = auth.uid()
--   ));
--
-- CREATE POLICY "Users can manage own chess games"
--   ON chess_games FOR ALL
--   USING (user_id IN (SELECT id FROM app_users WHERE supabase_user_id = auth.uid()))
--   WITH CHECK (user_id IN (SELECT id FROM app_users WHERE supabase_user_id = auth.uid()));
