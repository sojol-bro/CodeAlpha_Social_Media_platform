-- ==============================================================================
-- AUTO-PROFILE CREATION TRIGGER (on_auth_user_created)
-- Run this in the Supabase SQL Editor to activate automatic profile creation.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    base_username TEXT;
    final_username TEXT;
    short_id TEXT;
    counter INT := 0;
BEGIN
    -- Derive username from metadata or email, sanitised to [a-zA-Z0-9_]
    base_username := COALESCE(
        NULLIF(TRIM(new.raw_user_meta_data->>'username'), ''),
        NULLIF(TRIM(new.raw_user_meta_data->>'preferred_username'), ''),
        REGEXP_REPLACE(SPLIT_PART(COALESCE(new.email, ''), '@', 1), '[^a-zA-Z0-9_]', '_', 'g'),
        'user'
    );
    base_username := LEFT(base_username, 30);
    short_id := LEFT(REPLACE(new.id::TEXT, '-', ''), 8);

    -- Ensure uniqueness with a counter suffix
    final_username := base_username;
    LOOP
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username);
        counter := counter + 1;
        final_username := base_username || '_' || short_id
            || CASE WHEN counter > 1 THEN counter::TEXT ELSE '' END;
        EXIT WHEN counter > 10;
    END LOOP;

    -- Last-resort fallback
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
        -- Never block signup even if profile creation fails
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
