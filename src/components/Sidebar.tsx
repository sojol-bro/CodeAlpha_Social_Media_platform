import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Compass, Bookmark, Edit3, Bell, MessageSquare, User, LogOut } from 'lucide-react';
import { DEFAULT_CURRENT_USER, getCurrentUserAvatar, getCurrentUserProfile } from '../lib/supabase';
import { Profile } from '../lib/types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadCount?: number;
  unreadMessagesCount?: number;
  savedCount?: number;
  onOpenArchitecture?: () => void;
  onOpenCreateModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  unreadCount = 4,
  unreadMessagesCount = 2,
  savedCount,
  onOpenCreateModal,
}) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState<string>(getCurrentUserAvatar());
  const [userProfile, setUserProfile] = useState<Profile>(getCurrentUserProfile());

  useEffect(() => {
    const handleAvatarUpdate = (e: any) => {
      if (e.detail?.avatar_url !== undefined) {
        setAvatar(e.detail.avatar_url);
      }
    };
    const handleProfileUpdate = (e: any) => {
      if (e.detail?.profile) {
        setUserProfile(e.detail.profile);
        if (e.detail.profile.avatar_url !== undefined) {
          setAvatar(e.detail.profile.avatar_url);
        }
      }
    };
    window.addEventListener('mio:avatar-updated', handleAvatarUpdate);
    window.addEventListener('mio:profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('mio:avatar-updated', handleAvatarUpdate);
      window.removeEventListener('mio:profile-updated', handleProfileUpdate);
    };
  }, []);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'explore', label: 'Explore', icon: Compass, path: '/explore' },
    { id: 'saved', label: 'Saved', icon: Bookmark, badge: savedCount, path: '/saved' },
    { id: 'studio', label: 'Post', icon: Edit3, action: () => { setActiveTab('studio'); navigate('/studio'); } },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount, path: '/notifications' },
    { id: 'messaging', label: 'Messaging', icon: MessageSquare, badge: unreadMessagesCount, path: '/messaging' },
    { id: 'profile', label: 'Profile', icon: User, path: `/profile/${userProfile.username}` },
  ];

  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between h-screen sticky top-0 z-30 select-none">
      <div>
        {/* Brand header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#7BD1FA] flex items-center justify-center text-[#073247] shadow-sm font-black text-base">
              M
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 tracking-tight leading-none">
                MIO<span className="text-[#7BD1FA]">.</span>
              </div>
              <div className="text-[11px] font-medium text-slate-600 tracking-tight mt-0.5">
                Executive Tech Network
              </div>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <Link
                key={item.id}
                to={item.path || '#'}
                onClick={(e) => {
                  if (item.action) {
                    e.preventDefault();
                    item.action();
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-sky-50 text-sky-950 font-semibold border-l-4 border-[#7BD1FA] rounded-l-none'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-[18px] h-[18px] transition-colors ${
                      isActive ? 'text-[#0284c7] stroke-[2.2]' : 'text-slate-500 group-hover:text-slate-800 stroke-[1.6]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-[#7BD1FA] text-[#073247]'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile card at bottom */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div 
          onClick={() => setActiveTab('profile')} 
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-slate-200"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7BD1FA] to-sky-700 flex items-center justify-center text-slate-950 font-bold text-sm shadow-sm ring-2 ring-white overflow-hidden aspect-square">
              {avatar ? (
                <img src={avatar} alt="Profile" className="w-full h-full object-cover aspect-square" />
              ) : (
                <span>ER</span>
              )}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900 truncate">
              {userProfile.full_name}
            </div>
            <div className="text-[11px] text-slate-600 truncate">
              {userProfile.headline.split('|')[0]}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          <button
            onClick={() => {
              setActiveTab('profile');
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-colors cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>
          <button
            onClick={() => signOut()}
            title="Sign Out of Supabase Session"
            className="flex items-center justify-center gap-1 py-1.5 px-2.5 text-xs text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
