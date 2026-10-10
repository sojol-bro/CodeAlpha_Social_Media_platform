-- ==============================================================================
-- FIX SUPABASE STORAGE POLICIES FOR 'DP', 'posts', AND 'Message' BUCKETS
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Allow Public / Anonymous SELECT (Reading & Viewing Files)
DROP POLICY IF EXISTS "Allow Public Read on App Buckets" ON storage.objects;
CREATE POLICY "Allow Public Read on App Buckets" 
ON storage.objects FOR SELECT 
USING (bucket_id IN ('DP', 'dp', 'posts', 'Posts', 'Message', 'message', 'avatars'));

-- 3. Allow Public / Authenticated INSERT (Uploading Files)
DROP POLICY IF EXISTS "Allow Public Upload on App Buckets" ON storage.objects;
CREATE POLICY "Allow Public Upload on App Buckets" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id IN ('DP', 'dp', 'posts', 'Posts', 'Message', 'message', 'avatars'));

-- 4. Allow Public / Authenticated UPDATE (Overwriting & Updating Files)
DROP POLICY IF EXISTS "Allow Public Update on App Buckets" ON storage.objects;
CREATE POLICY "Allow Public Update on App Buckets" 
ON storage.objects FOR UPDATE 
USING (bucket_id IN ('DP', 'dp', 'posts', 'Posts', 'Message', 'message', 'avatars'))
WITH CHECK (bucket_id IN ('DP', 'dp', 'posts', 'Posts', 'Message', 'message', 'avatars'));

-- 5. Allow Public / Authenticated DELETE (Removing Files)
DROP POLICY IF EXISTS "Allow Public Delete on App Buckets" ON storage.objects;
CREATE POLICY "Allow Public Delete on App Buckets" 
ON storage.objects FOR DELETE 
USING (bucket_id IN ('DP', 'dp', 'posts', 'Posts', 'Message', 'message', 'avatars'));
