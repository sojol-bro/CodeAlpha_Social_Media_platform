/**
 * Executes the on_auth_user_created trigger SQL directly against Supabase
 * using the postgres connection (requires SUPABASE_DB_URL or falls back to REST)
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lopljazpsnykyfhdjowt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_kNiNl6i-YTun0flfE8YYSw_N7SDEy2P';

const sql = `
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    base_username TEXT;
    final_username TEXT;
    short_id TEXT;
    counter INT := 0;
BEGIN
    base_username := COALESCE(
        NULLIF(TRIM(new.raw_user_meta_data->>'username'), ''),
        NULLIF(TRIM(new.raw_user_meta_data->>'preferred_username'), ''),
        REGEXP_REPLACE(SPLIT_PART(COALESCE(new.email, ''), '@', 1), '[^a-zA-Z0-9_]', '_', 'g'),
        'user'
    );
    base_username := LEFT(base_username, 30);
    short_id := LEFT(REPLACE(new.id::TEXT, '-', ''), 8);
    final_username := base_username;
    LOOP
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username);
        counter := counter + 1;
        final_username := base_username || '_' || short_id
            || CASE WHEN counter > 1 THEN counter::TEXT ELSE '' END;
        EXIT WHEN counter > 10;
    END LOOP;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
        final_username := 'user_' || short_id;
    END IF;
    INSERT INTO public.profiles (id, username, full_name, avatar_url, headline, created_at, updated_at)
    VALUES (
        new.id,
        final_username,
        COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''), final_username),
        COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'avatar_url'), ''), ''),
        COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'headline'), ''), 'Network Member'),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_auth_user: could not create profile for %: %', new.id, SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO supabase_auth_admin;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();
`;

async function run() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('Attempting to execute trigger SQL via Supabase RPC...');

  // Try via rpc first (requires exec_sql function to exist)
  const { data, error } = await (supabase as any).rpc('exec_sql', { query: sql });

  if (error) {
    console.error('RPC exec_sql failed (expected if not set up):', error.message);
    console.log('\n--- MANUAL STEPS ---');
    console.log('Since the anon key cannot execute DDL directly, please:');
    console.log('1. Go to: https://supabase.com/dashboard/project/lopljazpsnykyfhdjowt/sql/new');
    console.log('2. Paste the contents of: supabase/trigger_on_auth_user_created.sql');
    console.log('3. Click Run');
    console.log('\nThe SQL file is at: supabase/trigger_on_auth_user_created.sql');
    process.exit(1);
  }

  console.log('✅ Trigger created successfully!', data);
}

run().catch(console.error);
