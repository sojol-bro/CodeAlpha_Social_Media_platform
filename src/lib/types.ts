export type PostType = 'standard' | 'benchmark' | 'research' | 'article';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  headline: string;
  bio?: string;
  avatar_url?: string;
  website?: string;
  location?: string;
  industry?: string;
  interests?: string[];
  shared_interest?: string;
  is_private?: boolean;
  followers_count: number;
  following_count: number;
  is_following?: boolean;
  created_at: string;
}

export interface PostMedia {
  id: string;
  media_url: string;
  media_type: 'image' | 'video' | 'document' | 'pdf';
  position_index: number;
  filename?: string;
  file_size?: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user: Profile;
  parent_comment_id?: string | null;
  content: string;
  created_at: string;
  likes_count?: number;
  has_liked?: boolean;
  replies?: Comment[];
}

export interface BenchmarkData {
  title: string;
  subtitle: string;
  throughput: string;
  throughput_sub: string;
  latency: string;
  latency_sub: string;
  datapoints: number[];
  optimal_label: string;
}

export interface DocumentData {
  title: string;
  fileType: string;
  pageCount: number;
  fileSize: string;
}

export interface Post {
  id: string;
  user: Profile;
  title?: string;
  caption: string;
  location?: string;
  tags: string[];
  post_type: PostType;
  metadata?: {
    benchmark?: BenchmarkData;
    document?: DocumentData;
    code_snippet?: {
      filename: string;
      language: string;
      code: string;
    };
    efficiency_chart?: {
      title: string;
      source: string;
      primary_label: string;
      primary_val: number;
      secondary_label: string;
      secondary_val: number;
    };
  };
  media?: PostMedia[];
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  has_liked?: boolean;
  has_saved?: boolean;
  created_at: string;
  updated_at?: string;
  time_ago?: string;
}

export interface NotificationItem {
  id: string;
  type: 'profile_view' | 'mention' | 'endorsement' | 'opportunity' | 'repost' | 'connect_invite' | 'like' | 'comment' | 'follow';
  user_id: string;
  actor?: Profile;
  title: string;
  subtitle?: string;
  content?: string;
  quote?: string;
  time_ago: string;
  is_read: boolean;
  tags?: string[];
  cta_type?: 'analytics' | 'reply' | 'thanks' | 'job' | 'repost' | 'connect';
  target_tab?: 'home' | 'messaging' | 'profile' | 'explore' | 'notifications';
  target_id?: string;
  post_id?: string;
  comment_id?: string;
  job_data?: {
    title: string;
    company: string;
    location: string;
    compensation: string;
  };
}

export interface MessageAttachment {
  url: string;
  type: 'image' | 'video' | 'document' | 'audio';
  name?: string;
  size?: string;
  bucket?: string;
}

export interface MessageItem {
  id: string;
  sender_id: string;
  receiver_id?: string;
  conversation_id?: string;
  content: string;
  created_at: string;
  time_formatted: string;
  is_current_user: boolean;
  media_items?: MessageAttachment[];
  media_url?: string;
  media_type?: 'image' | 'video' | 'document' | 'audio';
  media_name?: string;
  media_size?: string;
  bucket?: string;
  telemetry_card?: {
    title: string;
    badge: string;
    columns: { label: string; height: number; highlighted?: boolean }[];
  };
}

export interface Conversation {
  id: string;
  participant: Profile;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_active?: boolean;
  messages: MessageItem[];
}

export interface ExploreArticle {
  id: string;
  category: string;
  badge?: string;
  title: string;
  excerpt: string;
  author: Profile;
  read_time: string;
  read_count?: string;
  created_at: string;
  has_chart?: 'retention' | 'tokens' | 'funding' | 'focus';
  chart_data?: {
    metric: string;
    value: string;
    trend: string;
  };
}
