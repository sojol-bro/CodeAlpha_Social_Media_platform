import React, { useState, useEffect } from 'react';
import { Bell, Plus, Database } from 'lucide-react';
import { getSupabaseConfig, getCurrentUserAvatar } from '../lib/supabase';
import { SearchBar } from './search/SearchBar';
import { NotificationDropdown } from './notifications/NotificationDropdown';
import { NotificationItem } from '../lib/types';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenCreate: () => void;
  onOpenArchitecture: () => void;
  onOpenConfig: () => void;
  onSelectProfile: (username?: string) => void;
  onNavigateToPost?: (postId: string) => void;
  onViewAllNotifications?: () => void;
  notifications?: NotificationItem[];
  onNotificationsChange?: (notifs: NotificationItem[]) => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  onOpenCreate,
  onOpenArchitecture,
  onOpenConfig,
  onSelectProfile,
  onNavigateToPost,
  onViewAllNotifications,
  notifications = [],
  onNotificationsChange,
  unreadCount = 0,
}) => {
  const config = getSupabaseConfig();
  const [avatar, setAvatar] = useState<string>(getCurrentUserAvatar());
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);

  useEffect(() => {
    const handleAvatarUpdate = (e: any) => {
      if (e.detail?.avatar_url !== undefined) {
        setAvatar(e.detail.avatar_url);
      }
    };
    window.addEventListener('mio:avatar-updated', handleAvatarUpdate);
    return () => window.removeEventListener('mio:avatar-updated', handleAvatarUpdate);
  }, []);

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between gap-4">
      {/* Search Bar Zone with 300ms Debounce and Live Floating Results */}
      <div className="flex-1 max-w-xl">
        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectUser={(username) => {
            onSelectProfile(username);
          }}
          onSearchSubmit={(q) => {
            setSearchQuery(q);
          }}
        />
      </div>

      {/* Right Control Zone */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Status Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Online</span>
        </div>

        {/* Database & Stack Connection State Indicator */}
        <button
          onClick={onOpenConfig}
          title="Supabase & Django Connection Status"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-sky-700 hover:bg-sky-50/70 border border-slate-200 transition-colors cursor-pointer"
        >
          <Database className="w-3.5 h-3.5 text-[#0284c7]" />
          <span>{config.isConfigured ? 'Supabase Connected' : 'Supabase (Dev)'}</span>
        </button>

        {/* Real-time Notification Bell with Red Badge Counter & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNotifDropdownOpen((prev) => !prev)}
            className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
              isNotifDropdownOpen
                ? 'bg-sky-50 text-[#0284c7]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Notification Center"
          >
            <Bell className="w-5 h-5 stroke-[1.8]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-rose-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white shadow-xs animate-in zoom-in-50">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Floating Dropdown */}
          <NotificationDropdown
            isOpen={isNotifDropdownOpen}
            onClose={() => setIsNotifDropdownOpen(false)}
            notifications={notifications}
            onNotificationsChange={(updated) => onNotificationsChange?.(updated)}
            onNavigateToPost={(postId) => onNavigateToPost?.(postId)}
            onNavigateToProfile={(username) => onSelectProfile(username)}
            onViewAllNotifications={() => onViewAllNotifications?.()}
          />
        </div>

        {/* Primary Action Button with #7BD1FA */}
        <button
          onClick={onOpenCreate}
          className="flex items-center gap-1.5 bg-[#7BD1FA] hover:bg-[#62c7f8] active:scale-[0.99] text-[#073247] px-3.5 py-2 rounded-lg text-sm font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[2.8]" />
          <span>Create Post</span>
        </button>

        {/* User Avatar */}
        <button
          onClick={() => onSelectProfile()}
          className="relative group p-0.5 rounded-full ring-2 ring-transparent hover:ring-[#7BD1FA] transition-all cursor-pointer"
          title="View Elena Rostova Profile"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#7BD1FA] to-sky-700 flex items-center justify-center text-[#073247] font-bold text-xs shadow-xs overflow-hidden aspect-square">
            {avatar ? (
              <img src={avatar} alt="Profile" className="w-full h-full object-cover aspect-square" />
            ) : (
              <span>ER</span>
            )}
          </div>
        </button>
      </div>
    </header>
  );
};
