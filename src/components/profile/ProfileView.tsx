import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FileText, 
  Users, 
  Share2, 
  MessageSquare, 
  MoreHorizontal, 
  CheckCircle, 
  Briefcase, 
  GraduationCap, 
  Languages, 
  ExternalLink,
  Edit2,
  Copy,
  Check,
  Building2,
  ThumbsUp,
  Repeat2,
  Send,
  Camera,
  Loader2,
  Image as ImageIcon,
  Trash2,
  Globe,
  AlertCircle
} from 'lucide-react';
import { DEFAULT_CURRENT_USER, uploadProfilePicture, getCurrentUserAvatar, setCurrentUserAvatar, getCurrentUserProfile, SUPABASE_BUCKET_DP } from '../../lib/supabase';
import { Profile } from '../../lib/types';
import { INITIAL_POSTS, PROFILES } from '../../lib/mockData';
import { api, getLocalPosts } from '../../lib/api';
import { PostCard } from '../feed/PostCard';
import { ProfileEditModal } from './ProfileEditModal';

interface ProfileViewProps {
  onOpenMessageWithUser?: (username: string) => void;
  targetUsername?: string;
  onBack?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ 
  onOpenMessageWithUser, 
  targetUsername,
  onBack 
}) => {
  const params = useParams<{ username?: string }>();
  const effectiveUsername = params.username || targetUsername;

  // Use the live session to accurately determine which user is "me"
  const { user: sessionUser } = useAuth();
  const sessionUserId = sessionUser?.id || '';
  const sessionUsername = sessionUser?.user_metadata?.username || 
                          sessionUser?.user_metadata?.preferred_username || '';

  const [activeTab, setActiveTab] = useState<'posts' | 'articles' | 'about' | 'experience'>('posts');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const currentUser = getCurrentUserProfile();

  // A profile belongs to the current viewer when the URL username matches their
  // session username, session UUID, or stored profile username/id.
  const isOtherUser = Boolean(
    effectiveUsername && 
    effectiveUsername !== sessionUserId &&
    effectiveUsername !== sessionUsername &&
    effectiveUsername !== currentUser.username && 
    effectiveUsername !== currentUser.id
  );

  const [profile, setProfile] = useState<Profile>(() => {
    if (isOtherUser && effectiveUsername) {
      const found = Object.values(PROFILES).find(p => p.username === effectiveUsername || p.id === effectiveUsername) || PROFILES[effectiveUsername];
      if (found) return found;
      // Return a temporary skeleton — will be replaced by API call or notFound
      return {
        id: `user-${effectiveUsername}`,
        username: effectiveUsername,
        full_name: '',
        headline: '',
        bio: '',
        location: '',
        industry: '',
        avatar_url: '',
        followers_count: 0,
        following_count: 0,
        created_at: new Date().toISOString(),
      };
    }
    return currentUser;
  });

  const [avatarUrl, setAvatarUrl] = useState<string>(profile.avatar_url || (isOtherUser ? '' : getCurrentUserAvatar()));
  const [isUploadingDp, setIsUploadingDp] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [dpStatus, setDpStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNotFound(false);
    setIsLoadingProfile(true);

    const isOther = Boolean(
      effectiveUsername && 
      effectiveUsername !== sessionUserId &&
      effectiveUsername !== sessionUsername &&
      effectiveUsername !== currentUser.username && 
      effectiveUsername !== currentUser.id
    );

    if (isOther && effectiveUsername) {
      api.getProfile(effectiveUsername)
        .then((p) => {
          // If we got a synthetic fallback (id starts with 'user-') and no DB data,
          // check if this is a genuinely unknown user.
          if (p.id === `user-${effectiveUsername}` && !p.full_name) {
            setNotFound(true);
          } else {
            setProfile(p);
            setAvatarUrl(p.avatar_url || '');
          }
        })
        .catch(() => {
          setNotFound(true);
        })
        .finally(() => setIsLoadingProfile(false));
    } else {
      // Viewing own profile
      api.getCurrentProfile()
        .then((data) => {
          setProfile(data);
          if (data.avatar_url) setAvatarUrl(data.avatar_url);
        })
        .catch(() => {})
        .finally(() => setIsLoadingProfile(false));
    }

    const handleAvatarUpdate = (e: any) => {
      if (e.detail?.avatar_url !== undefined && !isOtherUser) {
        setAvatarUrl(e.detail.avatar_url);
        setProfile((prev) => ({ ...prev, avatar_url: e.detail.avatar_url }));
      }
    };

    const handleProfileUpdate = (e: any) => {
      if (e.detail?.profile && !isOtherUser) {
        setProfile(e.detail.profile);
        if (e.detail.profile.avatar_url !== undefined) {
          setAvatarUrl(e.detail.profile.avatar_url);
        }
      }
    };

    window.addEventListener('mio:avatar-updated', handleAvatarUpdate);
    window.addEventListener('mio:profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('mio:avatar-updated', handleAvatarUpdate);
      window.removeEventListener('mio:profile-updated', handleProfileUpdate);
    };
  }, [effectiveUsername, sessionUserId, sessionUsername]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDp(true);
    setDpStatus("Uploading photo to Supabase Storage ('DP' bucket)...");

    try {
      const res = await uploadProfilePicture(file);
      setAvatarUrl(res.url);
      setProfile((prev) => ({ ...prev, avatar_url: res.url }));
      setDpStatus("Profile picture updated in 'DP' bucket!");
      setTimeout(() => setDpStatus(null), 3500);
    } catch (err: any) {
      setDpStatus('Failed to upload picture. Saved locally.');
      setTimeout(() => setDpStatus(null), 3500);
    } finally {
      setIsUploadingDp(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = () => {
    setCurrentUserAvatar('');
    setAvatarUrl('');
    setProfile((prev) => ({ ...prev, avatar_url: '' }));
    setDpStatus('Profile picture removed.');
    setTimeout(() => setDpStatus(null), 2500);
  };

  const allPosts = getLocalPosts();
  const userPosts = allPosts
    .filter(
      (p) => 
        p.user?.username === profile.username || 
        p.user?.id === profile.id ||
        (profile.username === currentUser.username && (p.user?.username === 'elena_rostova' || p.user?.id === currentUser.id))
    )
    .map((p) => ({
      ...p,
      user: {
        ...p.user,
        ...profile,
        avatar_url: profile.avatar_url || p.user?.avatar_url || '',
      },
    }));

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText?.(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const initials = profile.full_name
    ?.split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';

  // === Profile Not Found (404) State ===
  if (notFound) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-4 sm:px-6 flex flex-col items-center gap-6 text-center">
        {onBack && (
          <button
            onClick={onBack}
            className="self-start inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <span>← Back</span>
          </button>
        )}
        <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-slate-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Profile Not Found</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-sm">
            The profile <span className="font-mono font-semibold">@{effectiveUsername}</span> does not exist or has been removed.
          </p>
        </div>
      </div>
    );
 }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Optional Back Navigation */}
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
        >
          <span>← Back to Notifications</span>
        </button>
      )}

      {/* Profile Card Header */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {/* Cover backdrop - Skyblue gradient */}
        <div className="h-36 bg-gradient-to-r from-sky-400 via-[#38bdf8] to-[#7BD1FA] relative">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-14 mb-4 gap-4">
            <div className="flex items-end gap-4">
              <div className="relative group">
                {!isOtherUser && (
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                )}

                <div 
                  onClick={() => !isOtherUser && fileInputRef.current?.click()}
                  className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-[#0284c7] via-[#38bdf8] to-[#7BD1FA] text-[#073247] flex items-center justify-center font-bold text-3xl ring-4 ring-white shadow-md overflow-hidden relative ${!isOtherUser ? 'cursor-pointer group-hover:ring-sky-200 transition-all' : ''}`}
                  title={isOtherUser ? profile.full_name : "Upload profile picture to Supabase 'DP' bucket"}
                >
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={profile.full_name} 
                      className="w-full h-full object-cover aspect-square"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}

                  {/* Hover upload overlay only for own profile */}
                  {!isOtherUser && (
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-1 text-center">
                      {isUploadingDp ? (
                        <Loader2 className="w-6 h-6 animate-spin text-[#7BD1FA]" />
                      ) : (
                        <>
                          <Camera className="w-5 h-5 text-[#7BD1FA] mb-1" />
                          <span className="text-[10px] font-bold leading-tight">Change DP</span>
                          <span className="text-[9px] text-sky-200 opacity-90">(DP bucket)</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Camera quick-action badge button only for own profile */}
                {!isOtherUser && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingDp}
                    className="absolute bottom-0 right-0 p-1.5 bg-[#7BD1FA] hover:bg-[#62c7f8] text-[#073247] rounded-full ring-2 ring-white shadow-sm transition-transform active:scale-95 cursor-pointer"
                    title="Upload avatar to DP bucket"
                  >
                    {isUploadingDp ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>

              <div className="mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {profile.full_name}
                  </h1>
                  <span className="text-xs text-slate-500 font-mono">
                    @{profile.username}
                  </span>
                  <CheckCircle className="w-4 h-4 text-[#0284c7] fill-sky-100" />
                  <span className="text-[11px] font-bold text-[#073247] bg-[#7BD1FA]/20 border border-[#7BD1FA]/50 px-2 py-0.5 rounded-full">
                    Verified
                  </span>
                  {!isOtherUser && (
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                      DP: <code>{SUPABASE_BUCKET_DP}</code> bucket
                    </span>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-slate-700 font-medium mt-0.5 max-w-xl leading-relaxed">
                  {profile.headline}
                </div>
                <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                  {profile.location && <span>{profile.location}</span>}
                  {profile.location && <span>•</span>}
                  <span className="text-[#0284c7] font-semibold cursor-pointer hover:underline">
                    {profile.followers_count?.toLocaleString() || '14,820'} connections
                  </span>
                  {profile.website && (
                    <>
                      <span>•</span>
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-600 hover:text-[#0284c7] hover:underline flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span>Website</span>
                      </a>
                    </>
                  )}
                  {avatarUrl && !isOtherUser && (
                    <>
                      <span>•</span>
                      <button
                        onClick={handleRemoveAvatar}
                        className="text-xs text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove DP</span>
                      </button>
                    </>
                  )}
                </div>

                {dpStatus && !isOtherUser && (
                  <div className="mt-1.5 text-xs font-semibold text-[#0284c7] bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>{dpStatus}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-end">
              {isOtherUser ? (
                <>
                  <button
                    onClick={() => onOpenMessageWithUser?.(profile.username)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#7BD1FA] hover:bg-[#62c7f8] text-[#073247] rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Send Message</span>
                  </button>
                  <button
                    onClick={() => setIsFollowing(!isFollowing)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      isFollowing
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{isFollowing ? 'Following' : 'Connect'}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#7BD1FA] hover:bg-[#62c7f8] text-[#073247] rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    title="Edit profile details, headline, and bio"
                  >
                    <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Edit Profile</span>
                  </button>
                  <button
                    onClick={() => onOpenMessageWithUser?.(profile.username)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </button>
                </>
              )}
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                title="Profile Settings"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 3 Metric Cards (Screenshot 6) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-100 text-[#0284c7] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 tabular-nums">128</div>
                <div className="text-[11px] text-slate-600 font-medium">Published Research Articles</div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-100 text-[#0284c7] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 tabular-nums">
                  {profile.followers_count ? (profile.followers_count / 1000).toFixed(1) + 'k' : '14.8k'}
                </div>
                <div className="text-[11px] text-slate-600 font-medium">Professional Followers</div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-100 text-[#0284c7] flex items-center justify-center shrink-0">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 tabular-nums">
                  {profile.following_count || '492'}
                </div>
                <div className="text-[11px] text-slate-600 font-medium">Active Collaborators</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 text-xs font-semibold text-slate-600 gap-6 mt-6 pt-2">
            <button
              onClick={() => setActiveTab('posts')}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'posts'
                  ? 'border-[#7BD1FA] text-[#0369a1] font-bold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab('articles')}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'articles'
                  ? 'border-[#7BD1FA] text-[#0369a1] font-bold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Articles & Research
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'about'
                  ? 'border-[#7BD1FA] text-[#0369a1] font-bold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              About
            </button>
            <button
              onClick={() => setActiveTab('experience')}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'experience'
                  ? 'border-[#7BD1FA] text-[#0369a1] font-bold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Experience & Credentials
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Stream + Right Profile Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Recent Activity Posts */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">Recent Activity</span>
              <span className="text-xs text-[#0284c7] font-medium">All updates</span>
            </div>
            <select className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none">
              <option>Most relevant ▾</option>
              <option>Latest updates ▾</option>
            </select>
          </div>

          {/* Posts */}
          {userPosts.length > 0 ? (
            userPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))
          ) : (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-sm font-bold text-slate-800">No updates yet</h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                {profile.full_name} has not published any public research updates or articles yet.
              </p>
              <button
                onClick={() => onOpenMessageWithUser?.(profile.username)}
                className="px-4 py-2 bg-[#7BD1FA] hover:bg-[#62c7f8] text-[#073247] rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Send Message to {profile.full_name.split(' ')[0]}
              </button>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): About, Experience, Education, Languages */}
        <div className="lg:col-span-4 space-y-4">
          {/* About Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                About {profile.full_name.split(' ')[0]}
              </h3>
              {!isOtherUser && (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  title="Edit About & Bio"
                  className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {profile.bio || 'No executive summary provided yet. Click "Edit Profile" to add your bio.'}
            </p>

            {/* Skill tags */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              {['Distributed Systems', 'Tensor Compilers', 'AI Accelerators', 'LLM Inference'].map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 rounded-md bg-sky-50 border border-sky-100 text-xs font-semibold text-[#0369a1]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Experience Highlight */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Experience Highlight</h3>
              <button 
                onClick={() => setActiveTab('experience')}
                className="text-xs font-semibold text-[#0284c7] hover:underline cursor-pointer"
              >
                View all (6)
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#0284c7] flex items-center justify-center shrink-0 mt-0.5">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 leading-snug">
                    {profile.headline.split('|')[0] || 'VP of AI Systems & Architecture'}
                  </div>
                  <div className="text-[11px] text-slate-600">MIO Labs</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">
                    2022 — Present • 2 yrs 8 mos
                  </div>
                  <div className="text-[10px] text-slate-600">
                    {profile.location || 'San Francisco Bay Area'} • Hybrid
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 leading-snug">
                    Staff Research Scientist
                  </div>
                  <div className="text-[11px] text-slate-600">Google Brain</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">
                    2018 — 2022 • 4 yrs
                  </div>
                  <div className="text-[10px] text-slate-600">Mountain View, CA</div>
                </div>
              </div>
            </div>
          </div>

          {/* Education */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Education</h3>
              <span className="text-xs text-[#0284c7] font-bold cursor-pointer">+</span>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#0284c7] flex items-center justify-center shrink-0 mt-0.5">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 leading-snug">
                  Stanford University
                </div>
                <div className="text-[11px] text-slate-600">
                  Ph.D. in Computer Science
                </div>
                <div className="text-[10px] text-slate-600 mt-0.5">
                  Specialization: Scalable Parallel Systems & Compilers
                </div>
              </div>
            </div>
          </div>

          {/* Languages */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
              <Languages className="w-4 h-4 text-[#0284c7]" />
              <span>Languages</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              English (Native), Russian (Bilingual), German (Professional working)
            </p>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
        onProfileUpdated={(updated) => {
          setProfile(updated);
          if (updated.avatar_url !== undefined) {
            setAvatarUrl(updated.avatar_url);
          }
        }}
      />
    </div>
  );
};
