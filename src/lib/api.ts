import { Post, Comment, Profile, NotificationItem, Conversation, MessageItem, MessageAttachment, BenchmarkData } from './types';
import { getActiveJwtToken, DEFAULT_CURRENT_USER, getCurrentUserProfile, setCurrentUserProfile } from './supabase';
import { INITIAL_POSTS, INITIAL_NOTIFICATIONS, INITIAL_CONVERSATIONS, PROFILES } from './mockData';

// API configuration
const DJANGO_API_BASE_KEY = 'mio_django_api_url';
export const getDjangoApiUrl = () => {
  return localStorage.getItem(DJANGO_API_BASE_KEY) || (import.meta as any).env?.VITE_DJANGO_API_URL || '/api';
};

export const setDjangoApiUrl = (url: string) => {
  localStorage.setItem(DJANGO_API_BASE_KEY, url.trim());
};

// In-browser fallback state store with localStorage persistence
const LOCAL_POSTS_KEY = 'mio_persisted_posts';
const LOCAL_NOTIFS_KEY = 'mio_persisted_notifs';

export function getLocalPosts(): Post[] {
  try {
    const raw = localStorage.getItem(LOCAL_POSTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return INITIAL_POSTS;
}

export function saveLocalPosts(posts: Post[]) {
  localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
}

export function getLocalNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return INITIAL_NOTIFICATIONS;
}

export function saveLocalNotifications(notifs: NotificationItem[]) {
  localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(notifs));
}

// Comments store by post ID
const LOCAL_COMMENTS_KEY = 'mio_persisted_comments';

const SEED_COMMENTS: Record<string, Comment[]> = {
  'post-001': [
    {
      id: 'cmt-101',
      post_id: 'post-001',
      user: {
        id: 'user-marcus',
        username: 'marcus_vance',
        full_name: 'Marcus Vance',
        headline: 'Principal Distributed Systems Architect at NVIDIA • High-Performance Computing',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
        followers_count: 9800,
        following_count: 320,
        created_at: '2023-03-10T12:00:00Z',
      },
      content: 'Exceptional findings on the memory tier quantization. Did you observe any cache thrashing when scaling past 256 nodes on heterogeneous clusters?',
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      likes_count: 5,
      has_liked: false,
      replies: [
        {
          id: 'cmt-101-r1',
          post_id: 'post-001',
          parent_comment_id: 'cmt-101',
          user: DEFAULT_CURRENT_USER,
          content: 'Great question Marcus. We mitigated thrashing by pinning intermediate KV caches into high-bandwidth HBM3e channels with zero-copy DMA buffers. Overhead dropped to sub-1.2%.',
          created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          likes_count: 4,
          has_liked: true,
          replies: [],
        },
      ],
    },
    {
      id: 'cmt-102',
      post_id: 'post-001',
      user: {
        id: 'user-sarah',
        username: 'sarah_chen',
        full_name: 'Dr. Sarah Jenkins',
        headline: 'Head of Foundational ML Research at DeepMind • Neural Architecture Lead',
        avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=256',
        followers_count: 18200,
        following_count: 610,
        created_at: '2023-02-18T10:00:00Z',
      },
      content: 'The audit trail validation matches the formal RFC guidelines we reviewed last week. Looking forward to reviewing the sub-agent telemetry metrics in production.',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      likes_count: 3,
      has_liked: false,
      replies: [],
    },
  ],
  'post-002': [
    {
      id: 'cmt-201',
      post_id: 'post-002',
      user: {
        id: 'user-david',
        username: 'david_chen',
        full_name: 'David Chen',
        headline: 'Director of AI Infrastructure at Anthropic • Cluster Reliability & Scaling',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256',
        followers_count: 12400,
        following_count: 440,
        created_at: '2023-04-05T09:00:00Z',
      },
      content: 'These throughput numbers on Triton kernels correlate directly with what we saw in our pre-training cluster runs. Have you tested FP8 tensor cores under heavy concurrency?',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      likes_count: 6,
      has_liked: false,
      replies: [],
    },
  ],
};

export function getLocalComments(postId: string): Comment[] {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_COMMENTS_KEY) || '{}');
    if (all[postId]) return all[postId];
  } catch (e) {
    // ignore
  }

  if (SEED_COMMENTS[postId]) {
    try {
      const all = JSON.parse(localStorage.getItem(LOCAL_COMMENTS_KEY) || '{}');
      all[postId] = SEED_COMMENTS[postId];
      localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(all));
    } catch (e) {}
    return SEED_COMMENTS[postId];
  }

  return [];
}

export function saveLocalComment(postId: string, comment: Comment, parentCommentId?: string) {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_COMMENTS_KEY) || '{}');
    if (!all[postId]) {
      all[postId] = SEED_COMMENTS[postId] ? [...SEED_COMMENTS[postId]] : [];
    }

    if (parentCommentId) {
      let inserted = false;
      for (const parent of all[postId]) {
        if (parent.id === parentCommentId) {
          if (!parent.replies) parent.replies = [];
          parent.replies.push(comment);
          inserted = true;
          break;
        }
        if (parent.replies) {
          for (const r of parent.replies) {
            if (r.id === parentCommentId) {
              if (!parent.replies) parent.replies = [];
              parent.replies.push(comment);
              inserted = true;
              break;
            }
          }
        }
        if (inserted) break;
      }
      if (!inserted) {
        all[postId].unshift(comment);
      }
    } else {
      all[postId].unshift(comment);
    }

    localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(all));
  } catch (e) {
    // ignore
  }
}

export function toggleLocalCommentLike(postId: string, commentId: string): { has_liked: boolean; likes_count: number } {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_COMMENTS_KEY) || '{}');
    const commentsList: Comment[] = all[postId] || SEED_COMMENTS[postId] || [];

    let target: Comment | null = null;
    for (const c of commentsList) {
      if (c.id === commentId) {
        target = c;
        break;
      }
      if (c.replies) {
        for (const r of c.replies) {
          if (r.id === commentId) {
            target = r;
            break;
          }
        }
      }
      if (target) break;
    }

    if (target) {
      target.has_liked = !target.has_liked;
      target.likes_count = target.has_liked
        ? (target.likes_count || 0) + 1
        : Math.max(0, (target.likes_count || 1) - 1);

      all[postId] = commentsList;
      localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(all));
      return { has_liked: target.has_liked, likes_count: target.likes_count };
    }
  } catch (e) {}

  return { has_liked: true, likes_count: 1 };
}

export function updateLocalCommentLike(postId: string, commentId: string, has_liked: boolean, likes_count: number) {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_COMMENTS_KEY) || '{}');
    const commentsList: Comment[] = all[postId] || [];

    for (const c of commentsList) {
      if (c.id === commentId) {
        c.has_liked = has_liked;
        c.likes_count = likes_count;
        break;
      }
      if (c.replies) {
        for (const r of c.replies) {
          if (r.id === commentId) {
            r.has_liked = has_liked;
            r.likes_count = likes_count;
            break;
          }
        }
      }
    }
    all[postId] = commentsList;
    localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(all));
  } catch (e) {}
}

// Conversations store
const LOCAL_CONVERSATIONS_KEY = 'mio_persisted_conversations';

export function getLocalConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return INITIAL_CONVERSATIONS;
}

export function saveLocalConversations(convs: Conversation[]) {
  try {
    localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(convs));
  } catch (e) {
    // ignore
  }
}

/**
 * Fetch wrapper that attaches the Supabase JWT token to all Django REST requests
 */
async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const jwt = await getActiveJwtToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (jwt) {
    headers.set('Authorization', `Bearer ${jwt}`);
  }

  const url = `${getDjangoApiUrl()}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  // Timeout controller for offline / unconnected Django server detection
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * MIO API Client:
 * Attempts to call live Django REST Framework backend with Supabase JWT.
 * Seamlessly falls back to local high-fidelity state if Django is not locally running.
 */
export const api = {
  // Feed & Posts
  async getFeed(page = 1, tag?: string, query?: string): Promise<{ results: Post[]; count: number }> {
    try {
      let endpoint = `/posts/?page=${page}`;
      if (tag) endpoint += `&tag=${encodeURIComponent(tag)}`;
      if (query) endpoint += `&q=${encodeURIComponent(query)}`;

      const res = await fetchWithAuth(endpoint);
      if (res.ok) {
        const data = await res.json();
        return {
          results: data.results || data,
          count: data.count || data.length,
        };
      }
    } catch (err) {
      // Local engine fallback
    }

    let posts = getLocalPosts();
    if (tag) {
      posts = posts.filter(p => p.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
    }
    if (query) {
      const q = query.toLowerCase();
      posts = posts.filter(p => 
        p.caption.toLowerCase().includes(q) || 
        p.user.full_name.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return { results: posts, count: posts.length };
  },

  async createPost(postData: {
    title?: string;
    caption: string;
    tags: string[];
    post_type: 'standard' | 'benchmark' | 'research' | 'article';
    media_items?: { media_url: string; media_type: string; filename?: string; file_size?: string }[];
    benchmark_data?: BenchmarkData;
    metadata?: any;
  }): Promise<Post> {
    try {
      const res = await fetchWithAuth('/posts/', {
        method: 'POST',
        body: JSON.stringify(postData),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Local engine fallback
    }

    const newPost: Post = {
      id: `post-${Date.now()}`,
      user: getCurrentUserProfile(),
      title: postData.title,
      caption: postData.caption,
      tags: postData.tags,
      post_type: postData.post_type,
      metadata: postData.benchmark_data
        ? { benchmark: postData.benchmark_data, ...(postData.metadata || {}) }
        : postData.metadata,
      media: (postData.media_items || []).map((m, idx) => ({
        id: `media-${Date.now()}-${idx}`,
        media_url: m.media_url,
        media_type: m.media_type as any,
        position_index: idx,
        filename: m.filename,
        file_size: m.file_size,
      })),
      likes_count: 0,
      comments_count: 0,
      reposts_count: 0,
      has_liked: false,
      has_saved: false,
      created_at: new Date().toISOString(),
      time_ago: 'Just now',
    };

    const currentPosts = getLocalPosts();
    const updated = [newPost, ...currentPosts];
    saveLocalPosts(updated);
    return newPost;
  },

  async toggleLike(postId: string): Promise<{ has_liked: boolean; likes_count: number }> {
    try {
      const res = await fetchWithAuth(`/posts/${postId}/like/`, { method: 'POST' });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Local engine fallback
    }

    const posts = getLocalPosts();
    let result = { has_liked: false, likes_count: 0 };
    const updated = posts.map(p => {
      if (p.id === postId) {
        const nextLiked = !p.has_liked;
        const nextCount = nextLiked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1);
        result = { has_liked: nextLiked, likes_count: nextCount };
        return { ...p, has_liked: nextLiked, likes_count: nextCount };
      }
      return p;
    });
    saveLocalPosts(updated);
    return result;
  },

  async toggleSave(postId: string): Promise<{ has_saved: boolean }> {
    try {
      const res = await fetchWithAuth(`/posts/${postId}/save/`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        // Also update local cache so both live & fallback stay in sync
        const posts = getLocalPosts();
        saveLocalPosts(posts.map(p => p.id === postId ? { ...p, has_saved: data.has_saved } : p));
        return data;
      }
    } catch (err) {
      // Local engine fallback
    }

    const posts = getLocalPosts();
    let result = { has_saved: false };
    const updated = posts.map(p => {
      if (p.id === postId) {
        const nextSaved = !p.has_saved;
        result = { has_saved: nextSaved };
        return { ...p, has_saved: nextSaved };
      }
      return p;
    });
    saveLocalPosts(updated);
    return result;
  },

  async getSavedPosts(): Promise<{ results: Post[]; count: number }> {
    try {
      const res = await fetchWithAuth('/posts/saved/');
      if (res.ok) {
        const data = await res.json();
        return {
          results: data.results || data,
          count: data.count || data.length,
        };
      }
    } catch (err) {
      // Local engine fallback
    }

    const posts = getLocalPosts();
    const saved = posts.filter(p => Boolean(p.has_saved));
    return {
      results: saved,
      count: saved.length,
    };
  },

  async getComments(postId: string): Promise<Comment[]> {
    try {
      const res = await fetchWithAuth(`/posts/${postId}/comments/`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (err) {
      // Local engine fallback
    }
    return getLocalComments(postId);
  },

  async addComment(postId: string, content: string, parentCommentId?: string): Promise<Comment> {
    try {
      const res = await fetchWithAuth(`/posts/${postId}/comments/`, {
        method: 'POST',
        body: JSON.stringify({ content, parent_comment_id: parentCommentId }),
      });
      if (res.ok) {
        const added = await res.json();
        saveLocalComment(postId, added, parentCommentId);
        // Increment post comments count
        const posts = getLocalPosts();
        saveLocalPosts(posts.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
        return added;
      }
    } catch (err) {
      // Local engine fallback
    }

    const newComment: Comment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      post_id: postId,
      parent_comment_id: parentCommentId || null,
      user: getCurrentUserProfile(),
      content,
      created_at: new Date().toISOString(),
      likes_count: 0,
      has_liked: false,
      replies: [],
    };
    saveLocalComment(postId, newComment, parentCommentId);

    // Update post comments count
    const posts = getLocalPosts();
    const updated = posts.map(p => {
      if (p.id === postId) {
        return { ...p, comments_count: p.comments_count + 1 };
      }
      return p;
    });
    saveLocalPosts(updated);

    return newComment;
  },

  async toggleLikeComment(postId: string, commentId: string): Promise<{ has_liked: boolean; likes_count: number }> {
    try {
      const res = await fetchWithAuth(`/comments/${commentId}/like/`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        updateLocalCommentLike(postId, commentId, data.has_liked, data.likes_count);
        return data;
      }
    } catch (err) {
      // Local engine fallback
    }

    return toggleLocalCommentLike(postId, commentId);
  },

  async getProfile(usernameOrId?: string): Promise<Profile> {
    const currentUser = getCurrentUserProfile();
    if (!usernameOrId || usernameOrId === currentUser.username || usernameOrId === currentUser.id || usernameOrId === 'me') {
      return currentUser;
    }

    try {
      const res = await fetchWithAuth(`/profiles/${encodeURIComponent(usernameOrId)}/`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Local engine fallback
    }
    
    if (PROFILES[usernameOrId]) {
      return PROFILES[usernameOrId];
    }
    const found = Object.values(PROFILES).find(p => p.username === usernameOrId || p.id === usernameOrId);
    if (found) {
      return found;
    }

    return {
      id: `user-${usernameOrId}`,
      username: usernameOrId,
      full_name: usernameOrId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      headline: 'AI Systems Engineer & Network Member',
      bio: 'Member of the Nexus Network platform.',
      location: 'San Francisco, CA',
      industry: 'Artificial Intelligence',
      avatar_url: '',
      followers_count: 420,
      following_count: 150,
      created_at: new Date().toISOString(),
    };
  },

  async getCurrentProfile(): Promise<Profile> {
    try {
      const res = await fetchWithAuth('/profiles/me/');
      if (res.ok) {
        const data = await res.json();
        return setCurrentUserProfile(data);
      }
    } catch (err) {
      // Local engine fallback
    }
    return getCurrentUserProfile();
  },

  async updateProfile(updates: Partial<Profile>): Promise<Profile> {
    try {
      const res = await fetchWithAuth('/profiles/me/', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        return setCurrentUserProfile(data);
      }
    } catch (err) {
      // Local engine fallback
    }
    return setCurrentUserProfile(updates);
  },

  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const res = await fetchWithAuth('/notifications/');
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Local engine fallback
    }
    return getLocalNotifications();
  },

  async markAllNotificationsRead(): Promise<void> {
    try {
      await fetchWithAuth('/notifications/mark_all_read/', { method: 'POST' });
    } catch (err) {
      // Local engine fallback
    }
    const notifs = getLocalNotifications().map(n => ({ ...n, is_read: true }));
    saveLocalNotifications(notifs);
  },

  async markNotificationRead(id: string): Promise<void> {
    try {
      await fetchWithAuth(`/notifications/${id}/mark_read/`, { method: 'POST' });
    } catch (err) {
      // Local engine fallback
    }
    const notifs = getLocalNotifications().map(n => (n.id === id ? { ...n, is_read: true } : n));
    saveLocalNotifications(notifs);
  },

  async searchProfiles(query: string): Promise<Profile[]> {
    const q = query.trim();
    if (!q) return [];
    try {
      const res = await fetchWithAuth(`/profiles/search/?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (err) {
      // Local fallback
    }

    const lower = q.toLowerCase();
    const all = Object.values(PROFILES);
    return all.filter(p =>
      p.username.toLowerCase().includes(lower) ||
      p.full_name.toLowerCase().includes(lower) ||
      (p.headline && p.headline.toLowerCase().includes(lower)) ||
      (p.industry && p.industry.toLowerCase().includes(lower)) ||
      (p.interests && p.interests.some(i => i.toLowerCase().includes(lower)))
    ).slice(0, 10);
  },

  async getRecommendations(): Promise<Profile[]> {
    try {
      const res = await fetchWithAuth('/profiles/recommendations/');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (err) {
      // Local fallback
    }

    const currentUser = getCurrentUserProfile();
    const userInterests = currentUser.interests || ['Distributed Systems', 'Machine Learning', 'AI Infrastructure', 'Web Development'];
    const userIndustry = (currentUser.industry || 'Artificial Intelligence').toLowerCase();

    const candidates = Object.values(PROFILES).filter(p =>
      p.id !== currentUser.id && p.username !== currentUser.username && !p.is_following
    );

    const scored = candidates.map(p => {
      const candInterests = p.interests || [];
      const overlap = userInterests.filter(i => candInterests.some(ci => ci.toLowerCase() === i.toLowerCase()));

      let sharedLabel = 'Recommended in Network';
      let score = 0;

      if (overlap.length > 0) {
        sharedLabel = `Also in ${overlap[0]}`;
        score = overlap.length * 3;
      } else if (p.industry && p.industry.toLowerCase() === userIndustry) {
        sharedLabel = `Also in ${p.industry}`;
        score = 2;
      } else if (candInterests.length > 0) {
        sharedLabel = `Specialist in ${candInterests[0]}`;
        score = 1;
      }

      return {
        profile: {
          ...p,
          shared_interest: sharedLabel,
        },
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 5).map(s => s.profile);
  },

  async followProfile(profileIdOrUsername: string): Promise<{ is_following: boolean; followers_count: number }> {
    try {
      const res = await fetchWithAuth(`/profiles/${profileIdOrUsername}/follow/`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (err) {
      // Local fallback
    }

    const all = Object.values(PROFILES);
    const target = all.find(p => p.id === profileIdOrUsername || p.username === profileIdOrUsername);
    if (target) {
      target.is_following = !target.is_following;
      target.followers_count = target.is_following
        ? (target.followers_count || 0) + 1
        : Math.max(0, (target.followers_count || 1) - 1);
      return { is_following: target.is_following, followers_count: target.followers_count };
    }
    return { is_following: true, followers_count: 100 };
  },

  // Direct Messaging API with Supabase 'Message' Bucket Integration
  async getConversations(): Promise<Conversation[]> {
    try {
      const res = await fetchWithAuth('/messages/conversations/');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          saveLocalConversations(data);
          return data;
        }
      }
    } catch (err) {
      // Local engine fallback
    }
    return getLocalConversations();
  },

  async getConversationById(id: string): Promise<Conversation | null> {
    const convs = await this.getConversations();
    return convs.find(c => c.id === id) || null;
  },

  async getOrCreateConversationWithUser(usernameOrProfile: string | Profile): Promise<Conversation> {
    const convs = await this.getConversations();
    let targetProfile: Profile;

    if (typeof usernameOrProfile === 'object') {
      targetProfile = usernameOrProfile;
    } else {
      const found = Object.values(PROFILES).find(p => p.username === usernameOrProfile) ||
        (PROFILES as Record<string, Profile>)[usernameOrProfile];
      
      if (found) {
        targetProfile = found;
      } else {
        targetProfile = {
          id: `user-${usernameOrProfile}`,
          username: usernameOrProfile,
          full_name: usernameOrProfile.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          headline: 'AI Systems Engineer & Network Member',
          followers_count: 520,
          following_count: 180,
          created_at: new Date().toISOString(),
        };
      }
    }

    const existing = convs.find(
      c => c.participant.username === targetProfile.username || c.participant.id === targetProfile.id
    );
    if (existing) {
      return existing;
    }

    const newConv: Conversation = {
      id: `conv-${targetProfile.username || Date.now()}`,
      participant: targetProfile,
      last_message: 'Started new direct channel',
      last_message_time: 'Just now',
      unread_count: 0,
      messages: [],
    };

    const updated = [newConv, ...convs];
    saveLocalConversations(updated);

    try {
      await fetchWithAuth('/messages/conversations/', {
        method: 'POST',
        body: JSON.stringify({
          participant_id: targetProfile.id,
          username: targetProfile.username,
        }),
      });
    } catch (e) {
      // local fallback works seamlessly
    }

    return newConv;
  },

  async sendMessage(params: {
    conversation_id: string;
    content: string;
    media_url?: string;
    media_type?: 'image' | 'video' | 'document' | 'audio';
    media_name?: string;
    media_size?: string;
    bucket?: string;
  }): Promise<MessageItem> {
    const currentUser = getCurrentUserProfile();
    const newMessage: MessageItem = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender_id: currentUser.id,
      conversation_id: params.conversation_id,
      content: params.content,
      media_url: params.media_url,
      media_type: params.media_type,
      media_name: params.media_name,
      media_size: params.media_size,
      bucket: params.bucket || 'Message',
      created_at: new Date().toISOString(),
      time_formatted: 'Just now • Delivered',
      is_current_user: true,
    };

    const convs = getLocalConversations();
    const updated = convs.map(c => {
      if (c.id === params.conversation_id) {
        const lastTxt = params.content || (params.media_name ? `Attachment: ${params.media_name}` : 'Sent media');
        return {
          ...c,
          last_message: lastTxt,
          last_message_time: 'Just now',
          messages: [...(c.messages || []), newMessage],
        };
      }
      return c;
    });
    saveLocalConversations(updated);

    try {
      await fetchWithAuth('/messages/', {
        method: 'POST',
        body: JSON.stringify(newMessage),
      });
    } catch (err) {
      // Local fallback
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mio:message-sent', {
          detail: { message: newMessage, conversation_id: params.conversation_id },
        })
      );
    }

    return newMessage;
  },

  getAllNetworkUsers(): Profile[] {
    return Object.values(PROFILES);
  },
};
