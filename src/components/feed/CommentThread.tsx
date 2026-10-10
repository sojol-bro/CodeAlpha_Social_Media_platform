import React, { useState, useEffect } from 'react';
import { 
  Send, 
  ThumbsUp, 
  MessageSquare, 
  CornerDownRight, 
  X, 
  Check, 
  Heart,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Comment } from '../../lib/types';
import { api } from '../../lib/api';
import { getCurrentUserProfile, DEFAULT_CURRENT_USER } from '../../lib/supabase';

interface CommentThreadProps {
  postId: string;
  onCommentCountChange?: (count: number) => void;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  postId,
  onCommentCountChange,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Active reply target state: holds the comment ID user is replying to
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const currentUser = getCurrentUserProfile() || DEFAULT_CURRENT_USER;

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const list = await api.getComments(postId);
      setComments(list);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalComments = (items: Comment[]): number => {
    let total = items.length;
    for (const c of items) {
      if (c.replies && c.replies.length > 0) {
        total += c.replies.length;
      }
    }
    return total;
  };

  const handleMainCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const added = await api.addComment(postId, newCommentText.trim());
      const updated = [added, ...comments];
      setComments(updated);
      setNewCommentText('');
      if (onCommentCountChange) {
        onCommentCountChange(calculateTotalComments(updated));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (parentCommentId: string, replyRecipientName: string) => {
    if (!replyText.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    try {
      const added = await api.addComment(postId, replyText.trim(), parentCommentId);

      // Optimistically update replies under parent comment
      const updated = comments.map((c) => {
        if (c.id === parentCommentId) {
          const currentReplies = c.replies || [];
          return {
            ...c,
            replies: [...currentReplies, added],
          };
        }
        // Check if replying inside nested replies
        if (c.replies && c.replies.some((r) => r.id === parentCommentId)) {
          return {
            ...c,
            replies: [...c.replies, added],
          };
        }
        return c;
      });

      setComments(updated);
      setReplyText('');
      setReplyingToCommentId(null);
      if (onCommentCountChange) {
        onCommentCountChange(calculateTotalComments(updated));
      }
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    // Optimistic toggle
    let previousLikedState = false;
    let previousLikesCount = 0;

    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          previousLikedState = Boolean(c.has_liked);
          previousLikesCount = c.likes_count || 0;
          const nextLiked = !previousLikedState;
          const nextCount = nextLiked ? previousLikesCount + 1 : Math.max(0, previousLikesCount - 1);
          return { ...c, has_liked: nextLiked, likes_count: nextCount };
        }
        if (c.replies) {
          const updatedReplies = c.replies.map((r) => {
            if (r.id === commentId) {
              previousLikedState = Boolean(r.has_liked);
              previousLikesCount = r.likes_count || 0;
              const nextLiked = !previousLikedState;
              const nextCount = nextLiked ? previousLikesCount + 1 : Math.max(0, previousLikesCount - 1);
              return { ...r, has_liked: nextLiked, likes_count: nextCount };
            }
            return r;
          });
          return { ...c, replies: updatedReplies };
        }
        return c;
      })
    );

    try {
      const res = await api.toggleLikeComment(postId, commentId);
      // Ensure sync with server response
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return { ...c, has_liked: res.has_liked, likes_count: res.likes_count };
          }
          if (c.replies) {
            const updatedReplies = c.replies.map((r) =>
              r.id === commentId ? { ...r, has_liked: res.has_liked, likes_count: res.likes_count } : r
            );
            return { ...c, replies: updatedReplies };
          }
          return c;
        })
      );
    } catch (e) {
      // Revert if call failed
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return { ...c, has_liked: previousLikedState, likes_count: previousLikesCount };
          }
          if (c.replies) {
            const updatedReplies = c.replies.map((r) =>
              r.id === commentId ? { ...r, has_liked: previousLikedState, likes_count: previousLikesCount } : r
            );
            return { ...c, replies: updatedReplies };
          }
          return c;
        })
      );
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'EX';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
      {/* 1. Main Comment Composer */}
      <form onSubmit={handleMainCommentSubmit} className="flex gap-2.5 items-start">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0284c7] to-[#7BD1FA] flex items-center justify-center text-[#073247] font-bold text-xs shrink-0 shadow-2xs mt-0.5 overflow-hidden aspect-square">
          {currentUser.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              alt={currentUser.full_name}
              className="w-full h-full object-cover aspect-square"
            />
          ) : (
            <span>{getInitials(currentUser.full_name)}</span>
          )}
        </div>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Add an executive review, critique, or technical inquiry..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7BD1FA]/40 focus:border-[#7BD1FA] focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={!newCommentText.trim() || isSubmitting}
            className="px-4 py-2 bg-[#7BD1FA] hover:bg-[#62c7f8] disabled:opacity-40 text-[#073247] rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <span>Comment</span>
                <Send className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* 2. Loading State */}
      {isLoading && (
        <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0284c7]" />
          <span>Loading discussion thread...</span>
        </div>
      )}

      {/* 3. Existing Comments Thread */}
      {!isLoading && comments.length > 0 && (
        <div className="space-y-3 pt-1">
          {comments.map((cmt) => (
            <div key={cmt.id} className="space-y-2">
              {/* Top-Level Comment Card */}
              <div className="flex gap-3 bg-slate-50/90 hover:bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 transition-all">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-sky-700 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs overflow-hidden aspect-square">
                  {cmt.user.avatar_url ? (
                    <img
                      src={cmt.user.avatar_url}
                      alt={cmt.user.full_name}
                      className="w-full h-full object-cover aspect-square"
                    />
                  ) : (
                    <span>{getInitials(cmt.user.full_name)}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 hover:text-[#0284c7] transition-colors">
                        {cmt.user.full_name}
                      </span>
                      {cmt.user.headline && (
                        <span className="text-[11px] text-slate-500 truncate max-w-[240px]">
                          • {cmt.user.headline}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">
                      Recently
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 mt-1.5 leading-relaxed whitespace-pre-line">
                    {cmt.content}
                  </p>

                  {/* Actions Row: Like & Reply */}
                  <div className="flex items-center gap-4 mt-2.5 text-xs">
                    <button
                      type="button"
                      onClick={() => handleLikeComment(cmt.id)}
                      className={`inline-flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
                        cmt.has_liked
                          ? 'text-[#0284c7] font-semibold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title={cmt.has_liked ? 'Liked' : 'Like comment'}
                    >
                      <ThumbsUp
                        className={`w-3.5 h-3.5 ${
                          cmt.has_liked ? 'fill-[#7BD1FA] text-[#0284c7]' : ''
                        }`}
                      />
                      <span>
                        {cmt.likes_count && cmt.likes_count > 0 ? cmt.likes_count : 'Like'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (replyingToCommentId === cmt.id) {
                          setReplyingToCommentId(null);
                        } else {
                          setReplyingToCommentId(cmt.id);
                          setReplyText(`@${cmt.user.full_name.split(' ')[0]} `);
                        }
                      }}
                      className={`inline-flex items-center gap-1 text-slate-500 hover:text-[#0284c7] font-medium transition-colors cursor-pointer ${
                        replyingToCommentId === cmt.id ? 'text-[#0284c7] font-semibold' : ''
                      }`}
                    >
                      <CornerDownRight className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Inline Reply Composer for this Comment */}
              {replyingToCommentId === cmt.id && (
                <div className="ml-6 sm:ml-9 p-3 bg-white rounded-xl border border-sky-200/90 shadow-sm animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 font-medium">
                    <span className="flex items-center gap-1 text-[#0284c7]">
                      <CornerDownRight className="w-3 h-3" />
                      <span>Replying to <strong>{cmt.user.full_name}</strong></span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingToCommentId(null);
                        setReplyText('');
                      }}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      autoFocus
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleReplySubmit(cmt.id, cmt.user.full_name);
                        }
                      }}
                      placeholder={`Reply to ${cmt.user.full_name}...`}
                      className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7BD1FA]/40 focus:border-[#7BD1FA] focus:bg-white"
                    />
                    <button
                      type="button"
                      disabled={!replyText.trim() || isSubmittingReply}
                      onClick={() => handleReplySubmit(cmt.id, cmt.user.full_name)}
                      className="px-3.5 py-2 bg-[#7BD1FA] hover:bg-[#62c7f8] disabled:opacity-40 text-[#073247] rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                    >
                      {isSubmittingReply ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <span>Reply</span>
                          <Send className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Threaded Nested Replies */}
              {cmt.replies && cmt.replies.length > 0 && (
                <div className="ml-5 sm:ml-8 pl-3 border-l-2 border-slate-200/80 space-y-2 pt-1">
                  {cmt.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="flex gap-2.5 bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs hover:border-slate-300 transition-all"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#7BD1FA] to-sky-700 flex items-center justify-center text-[#073247] font-bold text-[11px] shrink-0 overflow-hidden aspect-square">
                        {reply.user.avatar_url ? (
                          <img
                            src={reply.user.avatar_url}
                            alt={reply.user.full_name}
                            className="w-full h-full object-cover aspect-square"
                          />
                        ) : (
                          <span>{getInitials(reply.user.full_name)}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-900">
                            {reply.user.full_name}
                          </span>
                          <span className="text-[10px] text-slate-400">Recently</span>
                        </div>
                        <p className="text-xs text-slate-800 mt-1 leading-relaxed whitespace-pre-line">
                          {reply.content}
                        </p>

                        {/* Reply Action: Like & Nested Reply */}
                        <div className="flex items-center gap-4 mt-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleLikeComment(reply.id)}
                            className={`inline-flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
                              reply.has_liked
                                ? 'text-[#0284c7] font-semibold'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title={reply.has_liked ? 'Liked' : 'Like reply'}
                          >
                            <ThumbsUp
                              className={`w-3 h-3 ${
                                reply.has_liked ? 'fill-[#7BD1FA] text-[#0284c7]' : ''
                              }`}
                            />
                            <span>
                              {reply.likes_count && reply.likes_count > 0 ? reply.likes_count : 'Like'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToCommentId(cmt.id);
                              setReplyText(`@${reply.user.full_name.split(' ')[0]} `);
                            }}
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-[#0284c7] font-medium transition-colors cursor-pointer"
                          >
                            <CornerDownRight className="w-3 h-3" />
                            <span>Reply</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && comments.length === 0 && (
        <div className="py-3 text-center text-xs text-slate-500 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
          No comments yet. Start the discussion with an architectural inquiry!
        </div>
      )}
    </div>
  );
};
