import React, { useState, useEffect } from 'react';
import { 
  Bookmark, 
  Search, 
  Filter, 
  FolderArchive, 
  Layers, 
  Sparkles, 
  ArrowRight,
  Database,
  Tag,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { Post } from '../../lib/types';
import { api } from '../../lib/api';
import { PostCard } from '../feed/PostCard';

interface SavedViewProps {
  onNavigateToFeed: () => void;
  onSelectUser?: (username: string) => void;
  onTagClick?: (tag: string) => void;
  onSavedCountChange?: (count: number) => void;
}

export const SavedView: React.FC<SavedViewProps> = ({
  onNavigateToFeed,
  onSelectUser,
  onTagClick,
  onSavedCountChange,
}) => {
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'article' | 'benchmark' | 'code'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSavedPosts();
  }, []);

  const loadSavedPosts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSavedPosts();
      setSavedPosts(data.results);
      onSavedCountChange?.(data.count);
    } catch (err) {
      console.error('Failed to load saved posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostSaveToggle = (postId: string, isSaved: boolean) => {
    if (!isSaved) {
      // Remove from saved list
      setSavedPosts((prev) => {
        const next = prev.filter((p) => p.id !== postId);
        onSavedCountChange?.(next.length);
        return next;
      });
    }
  };

  // Filter saved posts by category/type and search query
  const filteredPosts = savedPosts.filter((post) => {
    const matchesSearch =
      !searchQuery ||
      post.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.title && post.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      post.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.tags && post.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchesSearch) return false;

    if (selectedFilter === 'article') {
      return post.post_type === 'article' || Boolean(post.metadata?.document);
    }
    if (selectedFilter === 'benchmark') {
      return post.post_type === 'benchmark' || Boolean(post.metadata?.benchmark) || Boolean(post.metadata?.efficiency_chart);
    }
    if (selectedFilter === 'code') {
      return Boolean(post.metadata?.code_snippet);
    }

    return true;
  });

  // Extract unique tags from saved posts
  const allSavedTags = Array.from(
    new Set(savedPosts.flatMap((p) => p.tags || []))
  ).slice(0, 8);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {/* Cover backdrop - Skyblue gradient */}
        <div className="h-28 sm:h-32 bg-[#7BD1FA] bg-gradient-to-r from-sky-400 via-[#38bdf8] to-[#7BD1FA] relative p-6 flex flex-col justify-end text-white">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-950 tracking-wider uppercase mb-1">
              <Bookmark className="w-3.5 h-3.5 fill-[#073247] text-[#073247]" />
              <span>Executive Bookmarks • Personal Archive</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#073247] tracking-tight flex items-center gap-3">
              <span>Saved Posts & Research</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white text-[#073247] shadow-2xs">
                {savedPosts.length} Bookmarks
              </span>
            </h1>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Persisted across your devices via Supabase PostgreSQL (<code>public.saved_posts</code>). Revisit verified benchmarks, tensor compiler specs, and papers.
            </p>

            <button
              onClick={onNavigateToFeed}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-50 hover:bg-sky-100 text-[#0284c7] rounded-lg text-xs font-semibold transition-colors cursor-pointer self-start md:self-auto border border-sky-200"
            >
              <span>Explore Live Feed</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search & Filter Bar */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved captions, authors, tags, or papers..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#7BD1FA]/30 focus:border-[#7BD1FA] focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-[#7BD1FA] text-[#073247] font-bold shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              All ({savedPosts.length})
            </button>
            <button
              onClick={() => setSelectedFilter('article')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === 'article'
                  ? 'bg-[#7BD1FA] text-[#073247] font-bold shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              Research & Papers
            </button>
            <button
              onClick={() => setSelectedFilter('benchmark')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === 'benchmark'
                  ? 'bg-[#7BD1FA] text-[#073247] font-bold shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              Benchmarks
            </button>
            <button
              onClick={() => setSelectedFilter('code')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === 'code'
                  ? 'bg-[#7BD1FA] text-[#073247] font-bold shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              Code Snippets
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Main Grid: Left Posts Stream + Right Meta Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Bookmarked Posts */}
        <div className="lg:col-span-8 space-y-4">
          {isLoading ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-600">
              Loading bookmarked items from Supabase & Django API...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 text-[#0284c7] flex items-center justify-center mx-auto shadow-2xs">
                <Bookmark className="w-7 h-7 stroke-[1.8]" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-900">
                  {savedPosts.length === 0 ? 'No saved posts yet' : 'No matching saved posts'}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {savedPosts.length === 0
                    ? 'Bookmark research papers, cluster benchmarks, or technical blueprints by tapping the "Save" button on any post card.'
                    : 'Try clearing your search query or switching categories to see other saved items.'}
                </p>
              </div>
              <button
                onClick={onNavigateToFeed}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#7BD1FA] hover:bg-[#62c7f8] text-[#073247] rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <span>Browse Live Feed</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onSelectUser={onSelectUser}
                onTagClick={onTagClick}
                onSaveChange={handlePostSaveToggle}
              />
            ))
          )}
        </div>

        {/* Right Rail (4 cols): Archive Details & Topic Tags */}
        <div className="lg:col-span-4 space-y-4">
          {/* Archive Status Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <Database className="w-4 h-4 text-[#0284c7]" />
              <span>Storage & Architecture</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every save triggers <code>POST /api/posts/&#123;id&#125;/save/</code> in Django REST Framework and toggles the composite key row in Supabase PostgreSQL.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 space-y-1">
              <div className="flex items-center justify-between">
                <span>Total Bookmarks:</span>
                <strong className="text-[#0369a1]">{savedPosts.length}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Database Table:</span>
                <span>public.saved_posts</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sync Status:</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Bookmarked Topics Card */}
          {allSavedTags.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <Tag className="w-4 h-4 text-[#0284c7]" />
                <span>Saved Topics</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allSavedTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSearchQuery(tag);
                      onTagClick?.(tag);
                    }}
                    className="text-xs px-2.5 py-1 rounded-md bg-sky-50 hover:bg-[#7BD1FA] hover:text-[#073247] text-[#0369a1] border border-sky-100 transition-colors cursor-pointer font-medium"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Tip Card */}
          <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-4 text-xs text-[#073247] flex items-start gap-2.5 shadow-2xs">
            <Sparkles className="w-4 h-4 text-[#0284c7] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Offline Resilient:</strong> Saved bookmarks are mirrored locally so your bookmarks remain instantly accessible even when disconnected.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
