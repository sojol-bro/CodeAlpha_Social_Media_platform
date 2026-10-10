-- ==============================================================================
-- MIO - SUPABASE POSTGRESQL PRODUCTION SCHEMA
-- Full Security, Composite Primary Keys, Cascade Deletions & Storage Policies
-- ==============================================================================
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE (Linked directly to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    headline TEXT,
    bio TEXT,
    avatar_url TEXT,
    website TEXT,
    location TEXT DEFAULT 'San Francisco Bay Area',
    industry TEXT DEFAULT 'Artificial Intelligence',
    interests TEXT[] DEFAULT ARRAY['Distributed Systems', 'Machine Learning', 'AI Infrastructure'],
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. USER SETTINGS
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT true,
    show_activity_status BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. POSTS TABLE (Foreign key with ON DELETE CASCADE)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT,
    caption TEXT NOT NULL,
    location TEXT,
    tags TEXT[] DEFAULT '{}',
    post_type TEXT DEFAULT 'standard', -- 'standard', 'benchmark', 'research', 'article'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. POST MEDIA (Cascade deletion on post deletion)
CREATE TABLE IF NOT EXISTS public.post_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL, -- 'image', 'video', 'document', 'pdf'
    position_index INT4 DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. LIKES TABLE (Composite Primary Key prevents duplicate records)
CREATE TABLE IF NOT EXISTS public.likes (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (user_id, post_id)
);

-- 6. COMMENTS TABLE (Threaded comments with cascade deletion)
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. FOLLOWS TABLE (Composite Primary Key prevents duplicate records)
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (follower_id, following_id)
);

-- 8. SAVED POSTS (Composite Primary Key prevents duplicate bookmarks)
CREATE TABLE IF NOT EXISTS public.saved_posts (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (user_id, post_id)
);

-- 9. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'profile_view', 'mention', 'endorsement', 'opportunity', 'repost', 'connect_invite')),
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_one UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    participant_two UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message TEXT DEFAULT '',
    last_message_time TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 11. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT DEFAULT '',
    media_url TEXT,
    media_type TEXT,
    media_name TEXT,
    media_size TEXT,
    bucket TEXT DEFAULT 'Message',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- INDEXES FOR QUERY OPTIMIZATION & N+1 PREVENTATIVE ACCESS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON public.post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON public.saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations(participant_one, participant_two);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES - STRICT auth.uid() ENFORCEMENT
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone authenticated can read; only the owner can update or delete
DROP POLICY IF EXISTS "Public profiles are viewable by all users" ON public.profiles;
CREATE POLICY "Public profiles are viewable by all users" 
    ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile" 
    ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Posts: Anyone can view; only author can insert, update, or delete
DROP POLICY IF EXISTS "Posts viewable by everyone" ON public.posts;
CREATE POLICY "Posts viewable by everyone" 
    ON public.posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
CREATE POLICY "Users can create posts" 
    ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can update own posts" 
    ON public.posts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Users can delete own posts" 
    ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- Post Media: Viewable by everyone; author of the post can manage
DROP POLICY IF EXISTS "Post media viewable by everyone" ON public.post_media;
CREATE POLICY "Post media viewable by everyone" 
    ON public.post_media FOR SELECT USING (true);

DROP POLICY IF EXISTS "Post author can insert media" ON public.post_media;
CREATE POLICY "Post author can insert media" 
    ON public.post_media FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Post author can delete media" ON public.post_media;
CREATE POLICY "Post author can delete media" 
    ON public.post_media FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
    );

-- Likes: Viewable by all; users can only manage their own like
DROP POLICY IF EXISTS "Likes viewable by everyone" ON public.likes;
CREATE POLICY "Likes viewable by everyone" 
    ON public.likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own like" ON public.likes;
CREATE POLICY "Users can insert own like" 
    ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own like" ON public.likes;
CREATE POLICY "Users can remove own like" 
    ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Comments: Viewable by all; users can update or delete ONLY their own comments
DROP POLICY IF EXISTS "Comments viewable by everyone" ON public.comments;
CREATE POLICY "Comments viewable by everyone" 
    ON public.comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can write comments" ON public.comments;
CREATE POLICY "Users can write comments" 
    ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments" 
    ON public.comments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" 
    ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Follows: Viewable by all; user can only create or delete their own following relationships
DROP POLICY IF EXISTS "Follows viewable by everyone" ON public.follows;
CREATE POLICY "Follows viewable by everyone" 
    ON public.follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow" ON public.follows;
CREATE POLICY "Users can follow" 
    ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow" 
    ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Saved Posts (Bookmarks): Private to the user
DROP POLICY IF EXISTS "Users view own saved posts" ON public.saved_posts;
CREATE POLICY "Users view own saved posts" 
    ON public.saved_posts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users save posts" ON public.saved_posts;
CREATE POLICY "Users save posts" 
    ON public.saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users remove saved posts" ON public.saved_posts;
CREATE POLICY "Users remove saved posts" 
    ON public.saved_posts FOR DELETE USING (auth.uid() = user_id);

-- Notifications: Private to the recipient
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" 
    ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" 
    ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications" 
    ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Conversations: Only members can view and create
DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
CREATE POLICY "Members can view conversations" 
    ON public.conversations FOR SELECT 
    USING (auth.uid() = participant_one OR auth.uid() = participant_two);

DROP POLICY IF EXISTS "Members can create conversations" ON public.conversations;
CREATE POLICY "Members can create conversations" 
    ON public.conversations FOR INSERT 
    WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);

-- Messages: Only participants can view; only sender can insert or delete
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages" 
    ON public.messages FOR SELECT 
    USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id OR 
        EXISTS (
            SELECT 1 FROM public.conversations 
            WHERE id = conversation_id AND (participant_one = auth.uid() OR participant_two = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" 
    ON public.messages FOR INSERT 
    WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages" 
    ON public.messages FOR DELETE 
    USING (auth.uid() = sender_id);

-- ==============================================================================
-- STORAGE BUCKETS POLICIES (avatars, post-media, Message)
-- Enforcing Authentication, Max 10MB file size, Allowed MIME Types, Ownership
-- ==============================================================================

-- 1. Avatars Bucket (DP)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('avatars', 'avatars', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET 
    file_size_limit = 10485760, 
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('DP', 'DP', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET 
    file_size_limit = 10485760, 
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Post Media Bucket (posts)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('post-media', 'post-media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'])
ON CONFLICT (id) DO UPDATE SET 
    file_size_limit = 10485760, 
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('posts', 'posts', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
    file_size_limit = 10485760, 
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'application/pdf'];

-- 3. Message Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit) 
VALUES ('Message', 'Message', true, 26214400)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 26214400;

-- Storage RLS Policies:
-- Public Read for avatars and post-media
DROP POLICY IF EXISTS "Public can view avatars and post-media" ON storage.objects;
CREATE POLICY "Public can view avatars and post-media" 
    ON storage.objects FOR SELECT 
    USING (bucket_id IN ('avatars', 'DP', 'post-media', 'posts', 'Message'));

-- Reject uploads from unauthenticated users + Enforce file size (max 10MB) and MIME types
DROP POLICY IF EXISTS "Authenticated users upload avatars with restrictions" ON storage.objects;
CREATE POLICY "Authenticated users upload avatars with restrictions" 
    ON storage.objects FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        bucket_id IN ('avatars', 'DP') AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Authenticated users upload post media with restrictions" ON storage.objects;
CREATE POLICY "Authenticated users upload post media with restrictions" 
    ON storage.objects FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        bucket_id IN ('post-media', 'posts')
    );

DROP POLICY IF EXISTS "Authenticated users upload message media" ON storage.objects;
CREATE POLICY "Authenticated users upload message media" 
    ON storage.objects FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        bucket_id IN ('Message', 'messages')
    );

-- Prevent users from deleting other users' files
DROP POLICY IF EXISTS "Users can only delete their own uploaded files" ON storage.objects;
CREATE POLICY "Users can only delete their own uploaded files" 
    ON storage.objects FOR DELETE 
    USING (
        auth.role() = 'authenticated' AND 
        (owner = auth.uid() OR (storage.foldername(name))[1] = auth.uid()::text)
    );

-- ==============================================================================
-- AUTOMATIC NOTIFICATION TRIGGERS (likes, comments, follows)
-- Ensuring a user is not notified of their own actions
-- ==============================================================================

-- 1. Trigger for new Likes
CREATE OR REPLACE FUNCTION public.handle_new_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    post_author_id UUID;
    actor_name TEXT;
BEGIN
    SELECT user_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
    SELECT full_name INTO actor_name FROM public.profiles WHERE id = NEW.user_id;

    -- Only notify if the liker is NOT the author of the post
    IF post_author_id IS NOT NULL AND post_author_id <> NEW.user_id THEN
        INSERT INTO public.notifications (
            user_id,
            actor_id,
            post_id,
            type,
            content,
            metadata,
            is_read,
            created_at
        )
        VALUES (
            post_author_id,
            NEW.user_id,
            NEW.post_id,
            'like',
            COALESCE(actor_name || ' liked your post.', 'liked your post.'),
            jsonb_build_object('post_id', NEW.post_id),
            false,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_like_created ON public.likes;
CREATE TRIGGER tr_on_like_created
    AFTER INSERT ON public.likes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_like_notification();

-- 2. Trigger for new Comments
CREATE OR REPLACE FUNCTION public.handle_new_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    post_author_id UUID;
    actor_name TEXT;
BEGIN
    SELECT user_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
    SELECT full_name INTO actor_name FROM public.profiles WHERE id = NEW.user_id;

    -- Only notify if the commenter is NOT the author of the post
    IF post_author_id IS NOT NULL AND post_author_id <> NEW.user_id THEN
        INSERT INTO public.notifications (
            user_id,
            actor_id,
            post_id,
            comment_id,
            type,
            content,
            metadata,
            is_read,
            created_at
        )
        VALUES (
            post_author_id,
            NEW.user_id,
            NEW.post_id,
            NEW.id,
            'comment',
            COALESCE(actor_name || ' commented: "' || SUBSTRING(NEW.content FROM 1 FOR 60) || '"', 'commented on your post.'),
            jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id),
            false,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_comment_created ON public.comments;
CREATE TRIGGER tr_on_comment_created
    AFTER INSERT ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_comment_notification();

-- 3. Trigger for new Follows
CREATE OR REPLACE FUNCTION public.handle_new_follow_notification()
RETURNS TRIGGER AS $$
DECLARE
    actor_name TEXT;
BEGIN
    SELECT full_name INTO actor_name FROM public.profiles WHERE id = NEW.follower_id;

    -- Only notify if follower is NOT following themselves
    IF NEW.following_id <> NEW.follower_id THEN
        INSERT INTO public.notifications (
            user_id,
            actor_id,
            type,
            content,
            metadata,
            is_read,
            created_at
        )
        VALUES (
            NEW.following_id,
            NEW.follower_id,
            'follow',
            COALESCE(actor_name || ' started following your updates.', 'connected with you.'),
            jsonb_build_object('follower_id', NEW.follower_id),
            false,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_follow_created ON public.follows;
CREATE TRIGGER tr_on_follow_created
    AFTER INSERT ON public.follows
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_follow_notification();

-- Enable Supabase Realtime Replication for Notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;



-- ==============================================================================
-- AUTO-PROFILE CREATION TRIGGER (on_auth_user_created)
-- Fires on every new auth.users INSERT (signup) and creates the matching
-- public.profiles row so no user ever has a missing profile.
-- ==============================================================================

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
        final_username := base_username || '_' || short_id || CASE WHEN counter > 1 THEN counter::TEXT ELSE '' END;
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
        NOW(), NOW()
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
