import React, { useState } from 'react';
import { 
  CheckCheck, 
  Settings, 
  Eye, 
  AtSign, 
  Award, 
  Briefcase, 
  Repeat2, 
  UserCheck, 
  TrendingUp, 
  CornerDownLeft, 
  ThumbsUp, 
  Send, 
  Bookmark, 
  ExternalLink,
  Check,
  ArrowRight,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { NotificationItem } from '../../lib/types';
import { api } from '../../lib/api';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  onNotificationsChange: (items: NotificationItem[]) => void;
  onNavigateToItem?: (destination: {
    tab: 'home' | 'messaging' | 'profile' | 'explore' | 'notifications';
    username?: string;
    postId?: string;
    jobData?: any;
  }) => void;
  onOpenRoleModal?: (jobData?: any) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  onNotificationsChange,
  onNavigateToItem,
  onOpenRoleModal,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'network' | 'mentions' | 'jobs'>('all');
  const [thanked, setThanked] = useState<Record<string, boolean>>({});
  const [acceptedInvites, setAcceptedInvites] = useState<Record<string, boolean>>({});
  const [savedJobs, setSavedJobs] = useState<Record<string, boolean>>({});

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    onNotificationsChange(notifications.map(n => ({ ...n, is_read: true })));
  };

  const handleItemClick = async (item: NotificationItem) => {
    // 1. Mark as read on backend and in state
    if (!item.is_read) {
      try {
        await api.markNotificationRead(item.id);
      } catch (err) {
        console.error('Failed to mark notification read on backend:', err);
      }
      onNotificationsChange(
        notifications.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
    }

    // 2. When clicking 'like' or 'comment', route directly to specific post view
    if (item.type === 'like' || item.type === 'comment') {
      onNavigateToItem?.({
        tab: 'home',
        postId: item.post_id || item.target_id || 'post-001',
      });
      return;
    }

    if (item.type === 'follow' || item.type === 'connect_invite') {
      onNavigateToItem?.({
        tab: 'profile',
        username: item.actor?.username || 'marcus_vance',
      });
      return;
    }

    // Determine destination for other notification types
    if (item.type === 'mention' || item.cta_type === 'reply') {
      onNavigateToItem?.({
        tab: 'messaging',
        username: item.actor?.username || 'marcus_vance',
        postId: item.post_id,
      });
    } else if (item.type === 'endorsement' || item.cta_type === 'thanks') {
      onNavigateToItem?.({
        tab: 'messaging',
        username: item.actor?.username || 'sarah_chen',
      });
    } else if (item.type === 'profile_view') {
      onNavigateToItem?.({
        tab: 'profile',
        username: item.actor?.username || 'elena_rostova',
      });
    } else if (item.type === 'opportunity' || item.cta_type === 'job') {
      if (onOpenRoleModal && item.job_data) {
        onOpenRoleModal(item.job_data);
      } else {
        onNavigateToItem?.({
          tab: 'explore',
          jobData: item.job_data,
        });
      }
    } else if (item.type === 'repost' || item.post_id) {
      onNavigateToItem?.({
        tab: 'home',
        postId: item.post_id || 'post-001',
      });
    } else {
      onNavigateToItem?.({
        tab: item.target_tab || 'home',
        username: item.actor?.username,
        postId: item.post_id,
      });
    }
  };

  const filteredNotifs = notifications.filter((item) => {
    if (activeTab === 'mentions') return item.type === 'mention';
    if (activeTab === 'network') return item.type === 'connect_invite' || item.type === 'profile_view';
    if (activeTab === 'jobs') return item.type === 'opportunity';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Title & Controls */}
      <div className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <span className="bg-[#7BD1FA] text-[#073247] text-xs font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
              {unreadCount} New
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 hover:text-sky-700 transition-colors cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-slate-600" />
            <span>Mark all read</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab('network')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'network'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          My Network
        </button>
        <button
          onClick={() => setActiveTab('mentions')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'mentions'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Mentions & Messages
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'jobs'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Job Alerts
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifs.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
            No notifications in this category.
          </div>
        ) : (
          filteredNotifs.map((item) => {
            const destinationLabel = 
              item.type === 'mention' || item.cta_type === 'reply' ? 'Open in Messages' :
              item.type === 'opportunity' ? 'View Role Specs' :
              item.type === 'profile_view' || item.type === 'connect_invite' ? 'View Member Profile' :
              item.type === 'endorsement' ? 'Reply with Thanks' :
              'View in Feed';

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-4 sm:p-5 rounded-xl border transition-all cursor-pointer group hover:shadow-xs ${
                  !item.is_read
                    ? 'bg-indigo-50/70 border-indigo-200 shadow-2xs ring-1 ring-indigo-100'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Left Badge / Avatar Icon */}
                  <div className="relative shrink-0">
                    {item.type === 'opportunity' ? (
                      <div className="w-11 h-11 rounded-xl bg-sky-100 border border-sky-200 text-[#0284c7] flex items-center justify-center font-bold">
                        <Briefcase className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-slate-700 to-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs overflow-hidden">
                        {item.actor?.avatar_url ? (
                          <img src={item.actor.avatar_url} alt="Actor" className="w-full h-full object-cover" />
                        ) : (
                          <span>
                            {item.actor
                              ? item.actor.full_name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)
                              : 'MIO'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Type overlay mini badge */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#7BD1FA] text-[#073247] flex items-center justify-center ring-2 ring-white text-[10px] font-bold">
                      {item.type === 'profile_view' && <Eye className="w-3 h-3" />}
                      {item.type === 'mention' && <AtSign className="w-3 h-3" />}
                      {item.type === 'endorsement' && <Award className="w-3 h-3" />}
                      {item.type === 'opportunity' && <Briefcase className="w-3 h-3" />}
                      {item.type === 'repost' && <Repeat2 className="w-3 h-3" />}
                      {item.type === 'connect_invite' && <UserCheck className="w-3 h-3" />}
                    </div>
                  </div>

                  {/* Content body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {item.type === 'opportunity' && (
                          <div className="text-[11px] font-bold text-[#0284c7] tracking-wider">
                            OPPORTUNITY MATCH
                          </div>
                        )}
                        <div className="text-sm font-semibold text-slate-900 leading-snug group-hover:text-[#0284c7] transition-colors">
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div className="text-xs text-slate-600 mt-0.5">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-1">
                        <span className="text-[11px] text-slate-500 font-medium">
                          {item.time_ago}
                        </span>
                        <span className="text-[10px] font-bold text-[#0284c7] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          <span>{destinationLabel}</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>

                    {/* Mention Quote */}
                    {item.quote && (
                      <div className="mt-2.5 p-3 rounded-lg bg-white/90 border border-slate-200 text-xs text-slate-700 italic leading-relaxed">
                        {item.quote}
                      </div>
                    )}

                    {/* Endorsement Tags */}
                    {item.tags && (
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-1 rounded-md bg-sky-50 border border-sky-200 text-xs font-semibold text-sky-800 flex items-center gap-1.5"
                          >
                            <Check className="w-3 h-3 text-[#0284c7] stroke-[2.5]" />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Opportunity Details Box */}
                    {item.job_data && (
                      <div className="mt-2 text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                        <span>🏢 <strong>{item.job_data.company}</strong></span>
                        <span>📍 {item.job_data.location}</span>
                        <span className="font-semibold text-emerald-600">{item.job_data.compensation}</span>
                      </div>
                    )}

                    {/* Contextual Action CTAs */}
                    <div className="mt-3 flex items-center gap-2 pt-1">
                      {/* View Analytics */}
                      {item.cta_type === 'analytics' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemClick(item);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7BD1FA] hover:bg-[#62c7f8] text-[#073247] rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>View Profile & Analytics</span>
                          </button>
                          <span className="text-xs text-emerald-600 font-medium">
                            +38% views vs last week
                          </span>
                        </div>
                      )}

                      {/* Mention Reply & Like */}
                      {item.cta_type === 'reply' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemClick(item);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7BD1FA] hover:bg-[#62c7f8] text-[#073247] rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <CornerDownLeft className="w-3.5 h-3.5" />
                            <span>Reply in Messages</span>
                          </button>
                          {item.post_id && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToItem?.({ tab: 'home', postId: item.post_id });
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
                            >
                              <span>View Post</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Endorsement Say Thanks */}
                      {item.cta_type === 'thanks' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemClick(item);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              thanked[item.id]
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-[#7BD1FA] hover:bg-[#62c7f8] text-[#073247]'
                            }`}
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{thanked[item.id] ? 'Thanked in Chat' : 'Send Thanks via Message'}</span>
                          </button>
                        </div>
                      )}

                      {/* Opportunity Match Actions */}
                      {item.cta_type === 'job' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemClick(item);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7BD1FA] hover:bg-[#62c7f8] text-[#073247] rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>View Role Specs</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSavedJobs(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${savedJobs[item.id] ? 'fill-sky-600 text-sky-600' : ''}`} />
                            <span>{savedJobs[item.id] ? 'Saved' : 'Save Job'}</span>
                          </button>
                        </div>
                      )}

                      {/* Connection Invitation */}
                      {item.cta_type === 'connect' && (
                        <div className="flex items-center gap-2">
                          {acceptedInvites[item.id] ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                                <Check className="w-4 h-4 text-emerald-600" />
                                <span>Connected</span>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigateToItem?.({ tab: 'messaging', username: item.actor?.username });
                                }}
                                className="px-2.5 py-1 text-xs bg-sky-50 text-[#0369a1] font-bold rounded hover:bg-sky-100 transition-colors flex items-center gap-1"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>Message</span>
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAcceptedInvites(prev => ({ ...prev, [item.id]: true }));
                                }}
                                className="px-3.5 py-1.5 bg-[#7BD1FA] hover:bg-[#62c7f8] text-[#073247] rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleItemClick(item);
                                }}
                                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
                              >
                                View Profile
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
