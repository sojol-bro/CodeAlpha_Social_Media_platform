import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { QuickComposer } from './components/feed/QuickComposer';
import { PostCard } from './components/feed/PostCard';
import { TrendingSidebar } from './components/feed/TrendingSidebar';
import { ExploreView } from './components/explore/ExploreView';
import { PostCreationStudio } from './components/studio/PostCreationStudio';
import { NotificationsView } from './components/notifications/NotificationsView';
import { MessagingView } from './components/messaging/MessagingView';
import { ProfileView } from './components/profile/ProfileView';
import { SavedView } from './components/saved/SavedView';
import { ArchitectureModal } from './components/ArchitectureModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { JobRoleModal } from './components/notifications/JobRoleModal';
import { useAuth } from './context/AuthContext';
import { api } from './lib/api';
import { supabase, getCurrentUserProfile } from './lib/supabase';
import { Post, NotificationItem } from './lib/types';
import { Sparkles, X, Filter } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [isLoadingFeed, setIsLoadingFeed] = useState<boolean>(true);
  const [activeMessageRecipient, setActiveMessageRecipient] = useState<string | undefined>();
  const [activeProfileUsername, setActiveProfileUsername] = useState<string | undefined>();

  // Modal states
  const [isArchitectureOpen, setIsArchitectureOpen] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [studioInitialText, setStudioInitialText] = useState<string>('');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [selectedJobData, setSelectedJobData] = useState<any>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Derive the current user's own username from the live session (not from localStorage hardcoded default)
  const { user: sessionUser } = useAuth();
  const getMyUsername = () => {
    if (sessionUser) {
      return sessionUser.user_metadata?.username ||
             sessionUser.user_metadata?.preferred_username ||
             getCurrentUserProfile().username;
    }
    return getCurrentUserProfile().username;
  };

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/profile/')) {
      const uname = path.replace('/profile/', '');
      if (uname) {
        setActiveProfileUsername(uname);
        setActiveTab('profile');
      }
    } else if (path === '/profile') {
      const myUsername = getMyUsername();
      setActiveProfileUsername(myUsername);
      setActiveTab('profile');
    } else if (path === '/explore') {
      setActiveTab('explore');
    } else if (path === '/saved') {
      setActiveTab('saved');
    } else if (path === '/notifications') {
      setActiveTab('notifications');
    } else if (path === '/messaging') {
      setActiveTab('messaging');
    } else if (path === '/studio') {
      setActiveTab('studio');
    } else if (path === '/' || path === '/home') {
      setActiveTab('home');
    }
  }, [location.pathname]);

  const handleSelectProfile = (username?: string) => {
    const myUsername = getMyUsername();
    const uname = username || myUsername;
    setActiveProfileUsername(uname);
    setActiveTab('profile');
    navigate(`/profile/${uname}`);
  };

  useEffect(() => {
    loadFeed();
    loadNotifications();
    loadSavedCount();
  }, [selectedTag, searchQuery]);

  // Real-time Notifications: Supabase Realtime Channel
  useEffect(() => {
    const currentProfile = getCurrentUserProfile();

    // 1. Subscribe to Supabase Realtime postgres_changes on notifications table
    let channel: any = null;
    try {
      channel = supabase
        .channel('public:notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
          },
          (payload: any) => {
            const row = payload.new;
            if (!row) return;

            // Only notify if notification is for current user (or recipient)
            if (row.user_id && row.user_id !== currentProfile.id) {
              return;
            }

            const formattedNotif: NotificationItem = {
              id: row.id || `notif-rt-${Date.now()}`,
              type: row.type || 'like',
              user_id: row.user_id || currentProfile.id,
              title: row.content || 'New update in your network',
              subtitle: row.type ? `${row.type.toUpperCase()} alert` : undefined,
              content: row.content,
              time_ago: 'Just now',
              is_read: false,
              post_id: row.post_id,
              comment_id: row.comment_id,
              actor: row.metadata?.actor || undefined,
            };

            setNotifications((prev) => [formattedNotif, ...prev]);
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime channel error:', err);
    }

    // 2. Local in-app notification event listener for instant zero-latency updates
    const handleLocalNotif = (e: any) => {
      if (e.detail?.notification) {
        setNotifications((prev) => [e.detail.notification, ...prev]);
      }
    };
    window.addEventListener('mio:notification-received', handleLocalNotif);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('mio:notification-received', handleLocalNotif);
    };
  }, []);

  const handleNavigateToPost = (postId: string) => {
    setActiveTab('home');
    setTimeout(() => {
      const el = document.getElementById(`post-${postId}`) || document.getElementById(postId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-[#7BD1FA]', 'bg-sky-50/40');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-[#7BD1FA]', 'bg-sky-50/40');
        }, 2500);
      }
    }, 120);
  };

  const loadSavedCount = async () => {
    try {
      const data = await api.getSavedPosts();
      setSavedCount(data.count ?? data.results.length);
    } catch (err) {
      console.error('Error loading saved count:', err);
    }
  };

  const loadFeed = async () => {
    setIsLoadingFeed(true);
    try {
      const data = await api.getFeed(1, selectedTag || undefined, searchQuery || undefined);
      setPosts(data.results);
    } catch (err) {
      console.error('Error loading feed:', err);
    } finally {
      setIsLoadingFeed(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
    setActiveTab('home');
    setSelectedTag(null);
  };

  const handleQuickPost = async (text: string) => {
    try {
      const created = await api.createPost({
        caption: text,
        tags: ['EngineeringLeadership', 'TechUpdate'],
        post_type: 'standard',
      });
      setPosts((prev) => [created, ...prev]);
    } catch (err) {
      alert('Failed to publish post');
    }
  };

  const handleOpenStudio = (initialText?: string) => {
    setStudioInitialText(initialText || '');
    setActiveTab('studio');
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-slate-900 flex font-sans antialiased">
      {/* 1. Left Fixed Navigation Rail */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'profile') {
            setActiveProfileUsername(undefined);
          }
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        unreadCount={unreadCount}
        unreadMessagesCount={2}
        savedCount={savedCount}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onOpenCreateModal={() => handleOpenStudio()}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Top Header */}
        <Header
          searchQuery={searchQuery}
          setSearchQuery={(q) => {
            setSearchQuery(q);
            if (activeTab !== 'home') setActiveTab('home');
          }}
          onOpenCreate={() => handleOpenStudio()}
          onOpenArchitecture={() => setIsArchitectureOpen(true)}
          onOpenConfig={() => setIsConfigOpen(true)}
          onSelectProfile={handleSelectProfile}
          onNavigateToPost={handleNavigateToPost}
          onViewAllNotifications={() => setActiveTab('notifications')}
          notifications={notifications}
          onNotificationsChange={setNotifications}
          unreadCount={unreadCount}
        />

        {/* Viewport Content Container */}
        <main className="flex-1 pb-16">
          {/* HOME FEED VIEW */}
          {activeTab === 'home' && (
            <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Center Feed Column (8 cols on large screens) */}
                <div className="lg:col-span-8 space-y-4">
                  {/* Quick Thought Composer */}
                  <QuickComposer
                    onOpenFullStudio={handleOpenStudio}
                    onSubmitQuickPost={handleQuickPost}
                  />

                  {/* Active Filter Pill Bar */}
                  {(selectedTag || searchQuery) && (
                    <div className="flex items-center justify-between p-3 bg-sky-50/80 border border-sky-100 rounded-xl text-xs">
                      <div className="flex items-center gap-2 text-sky-950">
                        <Filter className="w-3.5 h-3.5 text-[#0284c7]" />
                        <span>
                          Filtering by:{' '}
                          <strong className="text-[#0369a1]">
                            {selectedTag ? `#${selectedTag}` : `"${searchQuery}"`}
                          </strong>
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTag(null);
                          setSearchQuery('');
                        }}
                        className="flex items-center gap-1 font-semibold text-[#0284c7] hover:text-[#0369a1] cursor-pointer"
                      >
                        <span>Clear Filter</span>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Feed Stream Header */}
                  <div className="flex items-center justify-between px-1 text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                      <span>Feed Stream</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7BD1FA]" />
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span>Sort by:</span>
                      <select className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer">
                        <option>Top Quality ▾</option>
                        <option>Most Recent ▾</option>
                        <option>Research Papers ▾</option>
                      </select>
                    </div>
                  </div>

                  {/* Posts List */}
                  {isLoadingFeed ? (
                    <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-600">
                      Loading feed updates from database...
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
                      <h4 className="text-sm font-bold text-slate-800">No matching updates found</h4>
                      <p className="text-xs text-slate-600 mt-1">
                        Try modifying your search or tag filter.
                      </p>
                    </div>
                  ) : (
                    posts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onSelectUser={handleSelectProfile}
                        onTagClick={(tag) => setSelectedTag(tag)}
                        onSaveChange={(postId, isSaved) => {
                          setSavedCount((prev) => (isSaved ? prev + 1 : Math.max(0, prev - 1)));
                          setPosts((prev) =>
                            prev.map((p) => (p.id === postId ? { ...p, has_saved: isSaved } : p))
                          );
                        }}
                      />
                    ))
                  )}
                </div>

                {/* Right Trending & Network Column (4 cols) */}
                <TrendingSidebar
                  onTagClick={(tag) => setSelectedTag(tag)}
                  onSelectUser={handleSelectProfile}
                />
              </div>
            </div>
          )}

          {/* EXPLORE & INSIGHTS VIEW (Screenshot 5) */}
          {activeTab === 'explore' && <ExploreView />}

          {/* SAVED SECTION VIEW (Bookmarks & Papers Archive) */}
          {activeTab === 'saved' && (
            <SavedView
              onNavigateToFeed={() => setActiveTab('home')}
              onSelectUser={handleSelectProfile}
              onTagClick={(tag) => {
                setSelectedTag(tag);
                setActiveTab('home');
              }}
              onSavedCountChange={(cnt) => setSavedCount(cnt)}
            />
          )}

          {/* POST CREATION STUDIO (Screenshot 3) */}
          {activeTab === 'studio' && (
            <PostCreationStudio
              initialText={studioInitialText}
              onBackToFeed={() => setActiveTab('home')}
              onPostCreated={handlePostCreated}
            />
          )}

          {/* NOTIFICATIONS VIEW (Screenshot 1) */}
          {activeTab === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onNotificationsChange={setNotifications}
              onNavigateToItem={(destination) => {
                if (destination.tab === 'messaging') {
                  if (destination.username) {
                    setActiveMessageRecipient(destination.username);
                  }
                  setActiveTab('messaging');
                } else if (destination.tab === 'profile') {
                  if (destination.username) {
                    handleSelectProfile(destination.username);
                  } else {
                    handleSelectProfile();
                  }
                } else if (destination.tab === 'home') {
                  setActiveTab('home');
                  if (destination.postId) {
                    const pid = destination.postId;
                    setTimeout(() => {
                      const el = document.getElementById(`post-${pid}`) || document.getElementById(pid);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('ring-2', 'ring-[#7BD1FA]', 'bg-sky-50/30');
                        setTimeout(() => {
                          el.classList.remove('ring-2', 'ring-[#7BD1FA]', 'bg-sky-50/30');
                        }, 2500);
                      }
                    }, 120);
                  }
                } else if (destination.tab === 'explore') {
                  setActiveTab('explore');
                  if (destination.jobData) {
                    setSelectedJobData(destination.jobData);
                    setIsRoleModalOpen(true);
                  }
                } else {
                  setActiveTab(destination.tab as any);
                }
              }}
              onOpenRoleModal={(jobData) => {
                setSelectedJobData(jobData);
                setIsRoleModalOpen(true);
              }}
            />
          )}

          {/* MESSAGING VIEW (Screenshot 2) */}
          {activeTab === 'messaging' && (
            <MessagingView
              initialRecipientUsername={activeMessageRecipient}
              onSelectUser={handleSelectProfile}
            />
          )}

          {/* PROFILE VIEW (Dynamic Routing /profile/:username) */}
          {activeTab === 'profile' && (
            <Routes>
              <Route
                path="/profile/:username"
                element={
                  <ProfileView
                    onBack={() => {
                      setActiveProfileUsername(undefined);
                      setActiveTab('notifications');
                      navigate('/notifications');
                    }}
                    onOpenMessageWithUser={(username) => {
                      setActiveMessageRecipient(username);
                      setActiveTab('messaging');
                      navigate('/messaging');
                    }}
                  />
                }
              />
              <Route
                path="*"
                element={
                  <ProfileView
                    key={activeProfileUsername || 'current-user-profile'}
                    targetUsername={activeProfileUsername}
                    onBack={() => {
                      setActiveProfileUsername(undefined);
                      setActiveTab('notifications');
                      navigate('/notifications');
                    }}
                    onOpenMessageWithUser={(username) => {
                      setActiveMessageRecipient(username);
                      setActiveTab('messaging');
                      navigate('/messaging');
                    }}
                  />
                }
              />
            </Routes>
          )}
        </main>
      </div>

      {/* 3. Full-Stack Architecture & Code Inspector Modal */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      {/* 4. Supabase & Backend Credentials Modal */}
      <SupabaseConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />

      {/* 5. Opportunity / Job Role Modal */}
      <JobRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        jobData={selectedJobData}
        onMessageHiringLead={(leadUsername) => {
          setIsRoleModalOpen(false);
          setActiveMessageRecipient(leadUsername);
          setActiveTab('messaging');
        }}
      />
    </div>
  );
}
