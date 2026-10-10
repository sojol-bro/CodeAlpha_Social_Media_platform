import React, { useState } from 'react';
import { 
  ThumbsUp, 
  MessageSquare, 
  Repeat2, 
  Send, 
  MoreHorizontal, 
  Globe, 
  FileText, 
  Copy, 
  Check, 
  Download,
  Share2,
  Bookmark
} from 'lucide-react';
import { Post } from '../../lib/types';
import { api } from '../../lib/api';
import { CommentThread } from './CommentThread';

interface PostCardProps {
  post: Post;
  onSelectUser?: (username: string) => void;
  onTagClick?: (tag: string) => void;
  onSaveChange?: (postId: string, isSaved: boolean) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onSelectUser,
  onTagClick,
  onSaveChange,
}) => {
  const [hasLiked, setHasLiked] = useState(Boolean(post.has_liked));
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [hasSaved, setHasSaved] = useState(Boolean(post.has_saved));
  const [repostsCount, setRepostsCount] = useState(post.reposts_count);
  const [hasReposted, setHasReposted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  React.useEffect(() => {
    setHasSaved(Boolean(post.has_saved));
  }, [post.has_saved]);

  React.useEffect(() => {
    setHasLiked(Boolean(post.has_liked));
    setLikesCount(post.likes_count);
  }, [post.has_liked, post.likes_count]);

  const handleLikeToggle = async () => {
    // Optimistic UI
    const nextLiked = !hasLiked;
    setHasLiked(nextLiked);
    setLikesCount(prev => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    try {
      const res = await api.toggleLike(post.id);
      setHasLiked(res.has_liked);
      setLikesCount(res.likes_count);
    } catch (e) {
      // rollback if failed
      setHasLiked(!nextLiked);
      setLikesCount(prev => (nextLiked ? prev - 1 : prev + 1));
    }
  };

  const handleSaveToggle = async () => {
    const nextSaved = !hasSaved;
    setHasSaved(nextSaved);
    onSaveChange?.(post.id, nextSaved);
    try {
      const res = await api.toggleSave(post.id);
      setHasSaved(res.has_saved);
      if (res.has_saved !== nextSaved) {
        onSaveChange?.(post.id, res.has_saved);
      }
    } catch (e) {
      setHasSaved(!nextSaved);
      onSaveChange?.(post.id, !nextSaved);
    }
  };

  const handleRepost = () => {
    if (!hasReposted) {
      setHasReposted(true);
      setRepostsCount(prev => prev + 1);
    } else {
      setHasReposted(false);
      setRepostsCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleShare = () => {
    setCopiedLink(true);
    navigator.clipboard?.writeText?.(window.location.origin + `#post-${post.id}`);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText?.(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Avatar initials and gradient
  const initials = post.user.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2);

  const getGradient = (name: string) => {
    if (name.includes('Marcus')) return 'from-blue-700 to-sky-600';
    if (name.includes('Sarah')) return 'from-teal-700 to-emerald-600';
    if (name.includes('Elena')) return 'from-[#7BD1FA] to-sky-700';
    if (name.includes('David')) return 'from-slate-700 to-zinc-600';
    return 'from-[#7BD1FA] to-blue-600';
  };

  return (
    <article 
      id={`post-${post.id}`} 
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition-all scroll-mt-20"
    >
      {/* Post Author Header */}
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <button
            onClick={() => onSelectUser?.(post.user.username)}
            className="w-11 h-11 rounded-full bg-gradient-to-tr text-white flex items-center justify-center font-semibold text-sm shadow-2xs shrink-0 cursor-pointer ring-1 ring-slate-100 overflow-hidden"
          >
            {post.user.avatar_url ? (
              <img
                src={post.user.avatar_url}
                alt={post.user.full_name}
                className="w-full h-full object-cover aspect-square rounded-full"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span className={`w-full h-full rounded-full bg-gradient-to-tr ${getGradient(post.user.full_name)} flex items-center justify-center`}>
                {initials}
              </span>
            )}
          </button>

            <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => onSelectUser?.(post.user.username)}
                className="font-semibold text-slate-900 text-[15px] hover:text-[#0284c7] hover:underline cursor-pointer transition-colors"
              >
                {post.user.full_name}
              </button>
              <span className="text-xs text-slate-600 font-normal">
                • {post.user.username === 'elena_rostova' ? 'Author' : '2nd'}
              </span>
            </div>
            <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
              {post.user.headline}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-1">
              <span>{post.time_ago || 'Recently'}</span>
              <span>•</span>
              <Globe className="w-3 h-3 text-slate-600" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleSaveToggle}
            className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${
              hasSaved ? 'text-[#0284c7]' : 'text-slate-600'
            }`}
            title={hasSaved ? 'Saved to bookmarks' : 'Save post'}
          >
            <Bookmark className={`w-4 h-4 ${hasSaved ? 'fill-[#7BD1FA] text-[#0284c7]' : ''}`} />
          </button>
          <button 
            onClick={handleShare}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Copy link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <MoreHorizontal className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Post Title if available */}
      {post.title && (
        <h3 className="text-base font-semibold text-slate-900 mt-3.5 mb-1.5">
          {post.title}
        </h3>
      )}

      {/* Post Caption Body */}
      <div className="mt-3 text-sm text-slate-800 leading-relaxed whitespace-pre-line">
        {post.caption}
      </div>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {post.tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick?.(tag)}
              className="text-xs font-semibold text-[#0284c7] hover:text-[#0369a1] hover:underline cursor-pointer"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Attached Media from Supabase Storage */}
      {post.media && post.media.length > 0 && (
        <div className="mt-4 space-y-2">
          {post.media.map((m) => (
            <div key={m.id} className="rounded-lg overflow-hidden border border-slate-200">
              {m.media_type === 'image' ? (
                <img
                  src={m.media_url}
                  alt="Post visual"
                  className="w-full max-h-96 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="p-4 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-[#0284c7]" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {m.filename || 'Attached Specification Document'}
                      </div>
                      <div className="text-xs text-slate-600">
                        Supabase Storage Object • {m.file_size || 'Verified Asset'}
                      </div>
                    </div>
                  </div>
                  <a
                    href={m.media_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 text-xs font-semibold text-[#0284c7] bg-white border border-slate-200 rounded-lg hover:bg-sky-50"
                  >
                    View File
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Interactive Benchmark Card (Screenshot 4) */}
      {post.metadata?.benchmark && (
        <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          {/* Card Header */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7BD1FA]" />
              <span className="text-xs font-bold text-slate-900 tracking-wider">
                {post.metadata.benchmark.title}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-sky-800 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md">
              {post.metadata.benchmark.subtitle}
            </span>
          </div>

          {/* Metric Sub-cards */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50/50 border-b border-slate-100">
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-600 font-medium">Throughput Improvement</div>
              <div className="text-2xl font-bold text-[#0284c7] mt-0.5 tracking-tight tabular-nums">
                {post.metadata.benchmark.throughput}
              </div>
              <div className="text-[10px] text-slate-600 mt-1">
                {post.metadata.benchmark.throughput_sub}
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-600 font-medium">Inter-Node Overhead</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight tabular-nums">
                {post.metadata.benchmark.latency}
              </div>
              <div className="text-[10px] text-slate-600 mt-1">
                {post.metadata.benchmark.latency_sub}
              </div>
            </div>
          </div>

          {/* Interactive Memory Bandwidth Curve */}
          <div className="p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">
                Memory Bandwidth Saturation (GB/s)
              </span>
              <span className="text-xs font-bold text-[#0284c7]">
                {post.metadata.benchmark.optimal_label}
              </span>
            </div>

            {/* SVG Curve chart with #7BD1FA */}
            <div className="relative h-20 w-full pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 400 60">
                {/* Dotted target line */}
                <line
                  x1="0"
                  y1="12"
                  x2="400"
                  y2="12"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                {/* Latency curve */}
                <path
                  d="M 10 48 Q 120 46 220 30 T 380 14"
                  fill="none"
                  stroke="#7BD1FA"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {/* Datapoints */}
                <circle cx="10" cy="48" r="3" fill="#0284c7" />
                <circle cx="130" cy="45" r="3" fill="#0284c7" />
                <circle cx="250" cy="26" r="3" fill="#0284c7" />
                <circle cx="380" cy="14" r="5" fill="#7BD1FA" stroke="#0284c7" strokeWidth="2" />
              </svg>
            </div>

            {/* X Axis labels */}
            <div className="flex justify-between text-[10px] text-slate-600 border-t border-slate-100 pt-2 font-mono">
              <span>Batch Size 1</span>
              <span>Batch Size 16</span>
              <span>Batch Size 64</span>
              <span className="font-semibold text-slate-700">Batch Size 256 (Peak)</span>
            </div>
          </div>
        </div>
      )}

      {/* Document Attachment Card (Screenshot 4) */}
      {post.metadata?.document && (
        <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-100 border border-sky-200 text-[#0284c7] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 line-clamp-1">
                {post.metadata.document.title}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {post.metadata.document.fileType} • {post.metadata.document.pageCount} Pages • {post.metadata.document.fileSize}
              </div>
            </div>
          </div>

          <button
            onClick={() => alert(`Opening research preprint: ${post.metadata?.document?.title}`)}
            className="px-3.5 py-1.5 text-xs font-semibold text-[#0284c7] bg-white border border-slate-200 rounded-lg hover:bg-sky-50 hover:border-sky-200 transition-all cursor-pointer whitespace-nowrap"
          >
            Read Paper
          </button>
        </div>
      )}

      {/* Interactive Code Snippet Card (Screenshot 6) */}
      {post.metadata?.code_snippet && (
        <div className="mt-4 rounded-xl border border-slate-300 overflow-hidden bg-slate-950 font-mono text-xs text-slate-200 shadow-sm">
          <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-slate-300 font-medium ml-2">
                {post.metadata.code_snippet.filename}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-600">
                {post.metadata.code_snippet.language}
              </span>
              <button
                onClick={() => handleCopyCode(post.metadata?.code_snippet?.code || '')}
                className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Copy code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed text-sky-200">
            <code>{post.metadata.code_snippet.code}</code>
          </pre>
        </div>
      )}

      {/* Cluster Efficiency Comparative Bar Chart (Screenshot 6) */}
      {post.metadata?.efficiency_chart && (
        <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-900">
              {post.metadata.efficiency_chart.title}
            </span>
            <span className="text-[11px] font-medium text-slate-600">
              {post.metadata.efficiency_chart.source}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">
                  {post.metadata.efficiency_chart.primary_label}
                </span>
                <span className="font-bold text-[#0284c7] tabular-nums">
                  {post.metadata.efficiency_chart.primary_val}% sustained
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#7BD1FA] rounded-full transition-all duration-500"
                  style={{ width: `${post.metadata.efficiency_chart.primary_val}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">
                  {post.metadata.efficiency_chart.secondary_label}
                </span>
                <span className="font-bold text-slate-600 tabular-nums">
                  {post.metadata.efficiency_chart.secondary_val}% sustained
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-500 rounded-full transition-all duration-500"
                  style={{ width: `${post.metadata.efficiency_chart.secondary_val}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reactions Count Bar */}
      <div className="flex items-center justify-between text-xs text-slate-600 mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1">
            <span className="w-4 h-4 rounded-full bg-[#7BD1FA] text-[#073247] flex items-center justify-center text-[9px] shadow-xs font-bold">
              👍
            </span>
            <span className="w-4 h-4 rounded-full bg-[#7BD1FA] text-[#073247] flex items-center justify-center text-[9px] shadow-xs font-bold">
              💡
            </span>
          </div>
          <span className="tabular-nums">{likesCount} reactions</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowComments(prev => !prev)}
            className="hover:underline cursor-pointer tabular-nums"
          >
            {commentsCount} comments
          </button>
          <span>•</span>
          <span className="tabular-nums">{repostsCount} reposts</span>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="grid grid-cols-5 gap-1 mt-2 pt-1 border-t border-slate-100 text-xs font-medium text-slate-600">
        <button
          onClick={handleLikeToggle}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors cursor-pointer ${
            hasLiked
              ? 'text-sky-800 bg-sky-50 font-semibold'
              : 'hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <ThumbsUp className={`w-4 h-4 ${hasLiked ? 'fill-[#7BD1FA] stroke-[#0284c7]' : ''}`} />
          <span className="hidden sm:inline">Like</span>
        </button>

        <button
          onClick={() => setShowComments((prev) => !prev)}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors cursor-pointer ${
            showComments
              ? 'text-[#0284c7] bg-sky-50 font-semibold'
              : 'hover:bg-slate-50 hover:text-slate-900'
          }`}
          title={showComments ? 'Hide comments' : 'View and reply to comments'}
        >
          <MessageSquare className={`w-4 h-4 ${showComments ? 'stroke-[#0284c7]' : ''}`} />
          <span className="hidden sm:inline">Comment</span>
          {commentsCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 rounded-full font-bold text-slate-700">
              {commentsCount}
            </span>
          )}
        </button>

        <button
          onClick={handleRepost}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors cursor-pointer ${
            hasReposted
              ? 'text-emerald-600 bg-emerald-50/60 font-semibold'
              : 'hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Repeat2 className="w-4 h-4" />
          <span className="hidden sm:inline">Repost</span>
        </button>

        {/* Save Bookmark Button */}
        <button
          onClick={handleSaveToggle}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
            hasSaved
              ? 'text-[#0284c7] bg-sky-50 font-bold border border-[#7BD1FA]/40 shadow-2xs'
              : 'hover:bg-slate-50 hover:text-slate-900'
          }`}
          title={hasSaved ? 'Remove from saved' : 'Save post for later'}
        >
          <Bookmark className={`w-4 h-4 ${hasSaved ? 'fill-[#7BD1FA] stroke-[#0284c7]' : ''}`} />
          <span>{hasSaved ? 'Saved' : 'Save'}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </div>

      {/* Interactive Thread Viewer */}
      {showComments && (
        <CommentThread
          postId={post.id}
          onCommentCountChange={(count) => setCommentsCount(count)}
        />
      )}
    </article>
  );
};
