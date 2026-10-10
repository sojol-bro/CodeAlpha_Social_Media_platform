import React, { useRef, useEffect } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Heart, 
  MessageSquare, 
  UserPlus, 
  ExternalLink, 
  Sparkles,
  ArrowRight,
  Eye,
  Briefcase
} from 'lucide-react';
import { NotificationItem } from '../../lib/types';
import { api } from '../../lib/api';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onNotificationsChange: (updated: NotificationItem[]) => void;
  onNavigateToPost: (postId: string) => void;
  onNavigateToProfile: (username: string) => void;
  onViewAllNotifications: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  notifications,
  onNotificationsChange,
  onNavigateToPost,
  onNavigateToProfile,
  onViewAllNotifications,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      const updated = notifications.map((n) => ({ ...n, is_read: true }));
      onNotificationsChange(updated);
    } catch (e) {
      console.error('Failed to mark all as read:', e);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    // 1. Mark as read on backend & locally
    if (!notif.is_read) {
      try {
        await api.markNotificationRead(notif.id);
        const updated = notifications.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n));
        onNotificationsChange(updated);
      } catch (err) {
        console.error('Failed to mark notification read:', err);
      }
    }

    onClose();

    // 2. Route directly based on notification type
    if (notif.type === 'like' || notif.type === 'comment') {
      const targetPostId = notif.post_id || notif.target_id;
      if (targetPostId) {
        onNavigateToPost(targetPostId);
      } else {
        onNavigateToPost('post-001');
      }
    } else if (notif.type === 'follow' || notif.type === 'connect_invite') {
      const username = notif.actor?.username || notif.target_id || 'marcus_vance';
      onNavigateToProfile(username);
    } else if (notif.target_tab === 'profile') {
      const username = notif.actor?.username || notif.target_id || 'elena_rostova';
      onNavigateToProfile(username);
    } else {
      onViewAllNotifications();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />;
      case 'comment':
        return <MessageSquare className="w-3.5 h-3.5 text-[#0284c7] fill-sky-100" />;
      case 'follow':
      case 'connect_invite':
        return <UserPlus className="w-3.5 h-3.5 text-indigo-600" />;
      case 'profile_view':
        return <Eye className="w-3.5 h-3.5 text-amber-600" />;
      case 'opportunity':
        return <Briefcase className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-[#0284c7]" />;
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Header */}
      <div className="p-3.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#7BD1FA] text-[#073247] flex items-center justify-center font-bold text-xs">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">Notifications</h3>
            <span className="text-[11px] text-slate-600 font-medium">
              {unreadCount > 0 ? `${unreadCount} unread updates` : 'All caught up'}
            </span>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-[11px] font-bold text-[#0284c7] hover:text-[#0369a1] hover:underline cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-600">
            No notifications yet. Activity on your posts and profile will show up here.
          </div>
        ) : (
          notifications.slice(0, 8).map((notif) => {
            const isUnread = !notif.is_read;
            const actorName = notif.actor?.full_name || 'A network member';
            const actorInitials = actorName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 transition-colors cursor-pointer flex gap-3 items-start ${
                  isUnread
                    ? 'bg-indigo-50/70 border-l-3 border-indigo-600 hover:bg-indigo-50'
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                {/* Actor Avatar with Action Badge */}
                <div className="relative shrink-0 mt-0.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#7BD1FA] to-sky-700 flex items-center justify-center text-white font-bold text-xs shadow-2xs overflow-hidden aspect-square">
                    {notif.actor?.avatar_url ? (
                      <img
                        src={notif.actor.avatar_url}
                        alt={actorName}
                        className="w-full h-full object-cover aspect-square"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span>{actorInitials}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white shadow-2xs border border-slate-100 flex items-center justify-center">
                    {getNotificationIcon(notif.type)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-900 leading-snug">
                    <span className="font-bold">{actorName} </span>
                    <span className="text-slate-700">
                      {notif.type === 'like' && 'liked your technical post.'}
                      {notif.type === 'comment' && 'commented on your post.'}
                      {notif.type === 'follow' && 'started following your research updates.'}
                      {notif.type === 'connect_invite' && 'invited you to connect.'}
                      {notif.type === 'profile_view' && 'viewed your systems architecture profile.'}
                      {notif.type === 'endorsement' && 'endorsed your distributed ML skills.'}
                      {notif.type === 'opportunity' && notif.title}
                    </span>
                  </div>

                  {notif.content && notif.type === 'comment' && (
                    <p className="text-[11px] text-slate-600 line-clamp-1 italic mt-0.5 bg-white/70 p-1 rounded border border-slate-200">
                      "{notif.content}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-600">
                    <span>{notif.time_ago}</span>
                    {isUnread && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    )}
                    {(notif.type === 'like' || notif.type === 'comment') && (
                      <span className="text-[#0284c7] font-semibold hover:underline">
                        View post →
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Link */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
        <button
          onClick={() => {
            onClose();
            onViewAllNotifications();
          }}
          className="w-full py-1 text-center font-bold text-[#0284c7] hover:text-[#0369a1] hover:underline cursor-pointer flex items-center justify-center gap-1"
        >
          <span>View all in Notification Center</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
