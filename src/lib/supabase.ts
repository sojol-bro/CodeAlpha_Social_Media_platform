import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Profile } from './types';

// Storage keys
const SUPABASE_URL_KEY = 'mio_supabase_url';
const SUPABASE_KEY_KEY = 'mio_supabase_anon_key';

export const getSupabaseConfig = () => {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  const localUrl = localStorage.getItem(SUPABASE_URL_KEY) || envUrl || 'https://lopljazpsnykyfhdjowt.supabase.co';
  const localKey = localStorage.getItem(SUPABASE_KEY_KEY) || envKey || 'sb_publishable_kNiNl6i-YTun0flfE8YYSw_N7SDEy2P';
  return {
    url: localUrl,
    key: localKey,
    isConfigured: Boolean(localUrl && localKey),
  };
};

export const saveSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem(SUPABASE_URL_KEY, url.trim());
  localStorage.setItem(SUPABASE_KEY_KEY, key.trim());
  window.location.reload();
};

const config = getSupabaseConfig();

// Default project credentials
const defaultUrl = config.url || 'https://lopljazpsnykyfhdjowt.supabase.co';
const defaultKey = config.key || 'sb_publishable_kNiNl6i-YTun0flfE8YYSw_N7SDEy2P';

export const supabase: SupabaseClient = createClient(defaultUrl, defaultKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Storage bucket names configured in Supabase
export const SUPABASE_BUCKET_DP = 'DP';
export const SUPABASE_BUCKET_POSTS = 'posts';
export const SUPABASE_BUCKET_MESSAGES = 'Message';

// ─── Per-user localStorage key helpers ───────────────────────────────────────
// Keys are scoped to the user's Supabase UUID so multiple users on the same
// browser never share or overwrite each other's cached profile data.
const ACTIVE_USER_ID_KEY = 'mio_active_user_id';
const AVATAR_STORAGE_KEY = 'mio_current_user_avatar';
const PROFILE_STORAGE_KEY = 'mio_current_user_profile';

const avatarKey = (uid?: string) => uid ? `mio_avatar_${uid}` : AVATAR_STORAGE_KEY;
const profileKey = (uid?: string) => uid ? `mio_profile_${uid}` : PROFILE_STORAGE_KEY;

/** Returns the user ID that was last written to localStorage by initProfileFromSession. */
export const getActiveUserId = (): string =>
  (typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_USER_ID_KEY) : null) || '';

/** Clears this user's cached profile from localStorage (call on sign-out). */
export const clearUserProfileCache = (userId?: string) => {
  const uid = userId || getActiveUserId();
  if (uid) {
    localStorage.removeItem(avatarKey(uid));
    localStorage.removeItem(profileKey(uid));
  }
  // Also clear the legacy non-scoped keys used before this fix
  localStorage.removeItem(AVATAR_STORAGE_KEY);
  localStorage.removeItem(PROFILE_STORAGE_KEY);
  localStorage.removeItem(ACTIVE_USER_ID_KEY);
};

export const getCurrentUserAvatar = (userId?: string): string => {
  const uid = userId || getActiveUserId();
  if (uid) {
    const scoped = localStorage.getItem(avatarKey(uid));
    if (scoped !== null) return scoped;
  }
  return localStorage.getItem(AVATAR_STORAGE_KEY) || '';
};

export const setCurrentUserAvatar = (url: string, userId?: string) => {
  const uid = userId || getActiveUserId();
  if (uid) {
    localStorage.setItem(avatarKey(uid), url);
  }
  // Keep legacy key in sync for any code not yet migrated
  localStorage.setItem(AVATAR_STORAGE_KEY, url);
  DEFAULT_CURRENT_USER.avatar_url = url;
  setCurrentUserProfile({ avatar_url: url }, uid);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mio:avatar-updated', { detail: { avatar_url: url } }));
  }
};

// Neutral empty profile used when no authenticated user has been identified yet
const EMPTY_PROFILE: Profile = {
  id: '',
  username: '',
  full_name: '',
  headline: '',
  bio: '',
  avatar_url: '',
  location: '',
  followers_count: 0,
  following_count: 0,
  created_at: new Date().toISOString(),
};

export const getCurrentUserProfile = (userId?: string): Profile => {
  try {
    const uid = userId || getActiveUserId();
    // Try the per-user scoped key first
    const scopedRaw = uid && typeof window !== 'undefined' ? localStorage.getItem(profileKey(uid)) : null;
    if (scopedRaw) {
      const parsed = JSON.parse(scopedRaw) as Profile;
      if (!parsed.avatar_url) parsed.avatar_url = getCurrentUserAvatar(uid);
      return parsed;
    }
    // Fallback to legacy non-scoped key (migration path)
    const legacyRaw = typeof window !== 'undefined' ? localStorage.getItem(PROFILE_STORAGE_KEY) : null;
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw) as Profile;
      // Only use the legacy cache if it belongs to the current uid
      if (parsed.id && parsed.id === uid) {
        if (!parsed.avatar_url) parsed.avatar_url = getCurrentUserAvatar(uid);
        return parsed;
      }
    }
  } catch (e) {
    // fallback
  }
  return { ...EMPTY_PROFILE };
};

/**
 * Build and persist a profile for a freshly-authenticated user from their
 * Supabase session user_metadata. Called once after successful signIn / signUp.
 */
export const initProfileFromSession = (user: { id: string; email?: string; user_metadata?: Record<string, any> }): Profile => {
  const meta = user.user_metadata || {};
  const email = user.email || '';
  const usernameFromMeta = meta.username || meta.preferred_username || '';
  const usernameFromEmail = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
  const username = usernameFromMeta || usernameFromEmail || `user_${user.id.slice(0, 8)}`;

  const profile: Profile = {
    id: user.id,
    username,
    full_name: meta.full_name || meta.name || username,
    headline: meta.headline || 'Network Member',
    bio: meta.bio || '',
    avatar_url: meta.avatar_url || getCurrentUserAvatar(user.id) || '',
    location: meta.location || '',
    industry: meta.industry || 'Artificial Intelligence',
    interests: meta.interests || ['Distributed Systems', 'Machine Learning'],
    website: meta.website || '',
    followers_count: 0,
    following_count: 0,
    created_at: new Date().toISOString(),
  };

  // Persist using the per-user scoped key and record the active user ID
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACTIVE_USER_ID_KEY, user.id);
    localStorage.setItem(profileKey(user.id), JSON.stringify(profile));
    // Keep legacy key for backward compatibility with other code paths
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }
  Object.assign(DEFAULT_CURRENT_USER, profile);
  return profile;
};

/**
 * Upserts the authenticated user's profile row into public.profiles using
 * their own Supabase session. This works because the RLS INSERT policy is
 * `auth.uid() = id`, so each user can write exactly their own row.
 *
 * Call this after signIn or signUp to guarantee the row exists even if
 * the on_auth_user_created trigger hasn't been deployed yet.
 *
 * Uses ignoreDuplicates so existing profiles are never overwritten by defaults.
 */
export const ensureProfileInDB = async (
  user: { id: string; email?: string; user_metadata?: Record<string, any> }
): Promise<{ username: string; existed: boolean }> => {
  const profile = initProfileFromSession(user);

  try {
    // First try to read the existing profile from Supabase
    const { data: existing, error: readErr } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, headline')
      .eq('id', user.id)
      .maybeSingle();

    if (!readErr && existing) {
      // Profile already exists in DB — sync it back to localStorage so the UI shows DB data
      const merged: Profile = {
        ...profile,
        ...existing,
        followers_count: (existing as any).followers_count ?? profile.followers_count,
        following_count: (existing as any).following_count ?? profile.following_count,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(profileKey(user.id), JSON.stringify(merged));
        // Also keep legacy key in sync
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(merged));
      }
      Object.assign(DEFAULT_CURRENT_USER, merged);
      return { username: existing.username, existed: true };
    }

    // Profile not in DB yet — insert it (trigger may not be deployed)
    const { error: insertErr } = await supabase.from('profiles').insert({
      id: profile.id,
      username: profile.username,
      full_name: profile.full_name,
      headline: profile.headline,
      bio: profile.bio || '',
      avatar_url: profile.avatar_url || '',
      location: profile.location || '',
      industry: profile.industry || 'Artificial Intelligence',
      interests: profile.interests || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertErr) {
      // Conflict = row was just created by the trigger racing us — that's fine
      if (insertErr.code === '23505') {
        return { username: profile.username, existed: true };
      }
      console.warn('ensureProfileInDB insert error:', insertErr.message);
    }
  } catch (err) {
    console.warn('ensureProfileInDB: could not sync with Supabase, using local profile', err);
  }

  return { username: profile.username, existed: false };
};


export const setCurrentUserProfile = (updates: Partial<Profile>, userId?: string): Profile => {
  const uid = userId || getActiveUserId() || updates.id || '';
  const current = getCurrentUserProfile(uid);
  const updated: Profile = {
    ...current,
    ...updates,
  };
  if (typeof window !== 'undefined') {
    if (uid) {
      localStorage.setItem(profileKey(uid), JSON.stringify(updated));
    }
    // Also keep legacy key in sync
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
    if (updates.avatar_url !== undefined) {
      if (uid) localStorage.setItem(avatarKey(uid), updates.avatar_url);
      localStorage.setItem(AVATAR_STORAGE_KEY, updates.avatar_url);
    }
  }
  Object.assign(DEFAULT_CURRENT_USER, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mio:profile-updated', { detail: { profile: updated } }));
    if (updates.avatar_url !== undefined) {
      window.dispatchEvent(new CustomEvent('mio:avatar-updated', { detail: { avatar_url: updates.avatar_url } }));
    }
  }
  return updated;
};

// Mutable reference to the currently authenticated user's profile.
// Starts empty and is populated once a session is established.
export const DEFAULT_CURRENT_USER: Profile = getCurrentUserProfile();

/**
/**
 * Helper to upload files to Supabase Storage trying multiple candidate bucket names
 * and file paths, with automatic bucket creation if possible.
 */
async function uploadWithBucketCandidates(
  candidateBuckets: string[],
  filePathCandidates: string[],
  file: File,
  options: { cacheControl?: string; upsert?: boolean } = { cacheControl: '3600', upsert: true }
): Promise<{ url: string; path: string; bucket: string; error?: string } | null> {
  const currentConfig = getSupabaseConfig();
  if (!currentConfig.isConfigured) return null;

  let lastError: any = null;

  for (const bucketName of candidateBuckets) {
    for (const path of filePathCandidates) {
      try {
        let { data, error } = await supabase.storage
          .from(bucketName)
          .upload(path, file, options);

        // If bucket is not found, attempt to dynamically create public bucket
        if (error && (
          error.message?.toLowerCase().includes('bucket not found') ||
          (error as any).statusCode === 404 ||
          (error as any).status === 404
        )) {
          try {
            await supabase.storage.createBucket(bucketName, { public: true });
            const retryRes = await supabase.storage
              .from(bucketName)
              .upload(path, file, options);
            if (!retryRes.error) {
              error = null;
              data = retryRes.data;
            }
          } catch (createErr) {
            // Ignore creation errors and proceed to next candidate
          }
        }

        if (!error && data) {
          const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(path);

          if (publicUrlData?.publicUrl) {
            return {
              url: publicUrlData.publicUrl,
              path: path,
              bucket: bucketName,
            };
          }
        } else if (error) {
          lastError = error;
        }
      } catch (err) {
        lastError = err;
      }
    }
  }

  if (lastError) {
    console.warn('Supabase storage upload failed across all candidate buckets:', lastError);
  }
  return null;
}

/**
 * Uploads a profile picture (DP) to Supabase Storage.
 * Checks candidate buckets: 'DP', 'dp', 'avatars', 'Avatars', 'profiles'.
 */
export async function uploadProfilePicture(
  file: File
): Promise<{ url: string; path: string; error?: string }> {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `dp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const pathCandidates = [`avatars/${fileName}`, fileName];
  const bucketCandidates = Array.from(new Set([SUPABASE_BUCKET_DP, 'dp', 'avatars', 'Avatars', 'profiles']));

  const uploaded = await uploadWithBucketCandidates(bucketCandidates, pathCandidates, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (uploaded) {
    setCurrentUserAvatar(uploaded.url);
    return {
      url: uploaded.url,
      path: uploaded.path,
    };
  }

  // Graceful fallback to Object URL for preview
  const localUrl = URL.createObjectURL(file);
  setCurrentUserAvatar(localUrl);
  return {
    url: localUrl,
    path: `DP/avatars/${fileName}`,
  };
}

/**
 * Uploads media attachments for messages directly to Supabase Storage.
 * Checks candidate buckets: 'Message', 'message', 'messages', 'chat'.
 */
export async function uploadMessageMedia(file: File): Promise<{
  url: string;
  path: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'audio';
  size: string;
  bucket: string;
  error?: string;
}> {
  const fileExt = file.name.split('.').pop() || 'bin';
  const fileName = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const pathCandidates = [`chat/${fileName}`, fileName];
  const bucketCandidates = Array.from(new Set([SUPABASE_BUCKET_MESSAGES, 'message', 'messages', 'chat']));

  let detectedType: 'image' | 'video' | 'document' | 'audio' = 'document';
  if (file.type.startsWith('image/')) detectedType = 'image';
  else if (file.type.startsWith('video/')) detectedType = 'video';
  else if (file.type.startsWith('audio/')) detectedType = 'audio';

  const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
  const sizeFormatted = Number(sizeMb) < 0.1 ? `${Math.round(file.size / 1024)} KB` : `${sizeMb} MB`;

  const uploaded = await uploadWithBucketCandidates(bucketCandidates, pathCandidates, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (uploaded) {
    return {
      url: uploaded.url,
      path: uploaded.path,
      name: file.name,
      type: detectedType,
      size: sizeFormatted,
      bucket: uploaded.bucket,
    };
  }

  // Graceful Object URL fallback with local storage integration
  const localUrl = URL.createObjectURL(file);
  return {
    url: localUrl,
    path: `${SUPABASE_BUCKET_MESSAGES}/chat/${file.name}`,
    name: file.name,
    type: detectedType,
    size: sizeFormatted,
    bucket: SUPABASE_BUCKET_MESSAGES,
  };
}

/**
 * Uploads post data (images, videos, documents, benchmarks) to the Supabase Storage.
 */
export async function uploadPostMedia(
  file: File
): Promise<{ url: string; path: string; error?: string }> {
  return uploadToSupabaseStorage(file, SUPABASE_BUCKET_POSTS);
}

/**
 * Uploads any media to Supabase Storage.
 * Checks candidate buckets: 'posts', 'Posts', 'post-media', 'post_media', 'uploads'.
 */
export async function uploadToSupabaseStorage(
  file: File,
  bucketName: string = SUPABASE_BUCKET_POSTS
): Promise<{ url: string; path: string; error?: string }> {
  const fileExt = file.name.split('.').pop() || 'bin';
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const pathCandidates = [`uploads/${fileName}`, fileName];
  const bucketCandidates = Array.from(new Set([bucketName, 'posts', 'Posts', 'post-media', 'post_media', 'uploads']));

  const uploaded = await uploadWithBucketCandidates(bucketCandidates, pathCandidates, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (uploaded) {
    return {
      url: uploaded.url,
      path: uploaded.path,
    };
  }

  // Graceful in-browser Object URL fallback for the preview runtime
  const localUrl = URL.createObjectURL(file);
  return {
    url: localUrl,
    path: `${bucketName}/uploads/${file.name}`,
  };
}

/**
 * Client-side Authentication Helpers with Supabase Auth
 */
export async function getActiveJwtToken(): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return session.access_token;
    }
  } catch (err) {
    // ignore
  }
  // Standard signed mock JWT for local Django DRF dev
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImVsZW5hQG1pby5haSIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyNTI0NjA4MDAwfQ.mio-signature-token';
}
