import React, { useState, useEffect } from 'react';
import { Info, UserPlus, Check, Sparkles, Tag, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { Profile } from '../../lib/types';

interface TrendingSidebarProps {
  onTagClick?: (tag: string) => void;
  onSelectUser?: (username: string) => void;
}

export const TrendingSidebar: React.FC<TrendingSidebarProps> = ({ 
  onTagClick,
  onSelectUser,
}) => {
  const [recommendations, setRecommendations] = useState<Profile[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [isLoadingRecs, setIsLoadingRecs] = useState<boolean>(true);

  const trendingTopics = [
    { rank: 1, title: 'Distributed LLM Serving', stats: '24.8k professionals discussing', tag: 'DistributedSystems' },
    { rank: 2, title: 'Quantum SDKs v3.0 Release', stats: '16.2k readers • Tech Architecture', tag: 'Quantum' },
    { rank: 3, title: 'Silicon Photonics Breakthrough', stats: '11.4k engineers • Hardware', tag: 'AIHardware' },
    { rank: 4, title: 'Autonomous Agents in Fintech', stats: '9.8k readers • Financial Systems', tag: 'AgenticAI' },
    { rank: 5, title: 'Edge Inference on Wearables', stats: '7.1k discussions • Systems', tag: 'EdgeAI' },
  ];

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setIsLoadingRecs(true);
    try {
      const list = await api.getRecommendations();
      setRecommendations(list);
      // Initialize following map
      const initialMap: Record<string, boolean> = {};
      list.forEach((p) => {
        initialMap[p.id || p.username] = Boolean(p.is_following);
      });
      setFollowingMap(initialMap);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const handleFollowToggle = async (profile: Profile) => {
    const key = profile.id || profile.username;
    const isCurrentlyFollowing = Boolean(followingMap[key]);
    const nextState = !isCurrentlyFollowing;

    // Optimistic UI update
    setFollowingMap((prev) => ({ ...prev, [key]: nextState }));

    try {
      await api.followProfile(profile.id || profile.username);
    } catch (err) {
      // Revert if error
      setFollowingMap((prev) => ({ ...prev, [key]: isCurrentlyFollowing }));
    }
  };

  return (
    <div className="w-80 shrink-0 space-y-4 hidden lg:block">
      {/* 1. Trending in Tech Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
            <span className="text-indigo-600">📈</span>
            <span>Trending in Tech</span>
          </div>
          <Info className="w-4 h-4 text-slate-600 cursor-pointer hover:text-slate-600" />
        </div>

        <div className="divide-y divide-slate-50 mt-1">
          {trendingTopics.map((topic) => (
            <div
              key={topic.rank}
              onClick={() => onTagClick?.(topic.tag)}
              className="py-2.5 group cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <span className="text-xs font-bold text-slate-600 font-mono mt-0.5">
                  {topic.rank}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 group-hover:text-[#0284c7] transition-colors leading-tight">
                    {topic.title}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    {topic.stats}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => onTagClick?.('DistributedSystems')}
          className="mt-3 text-xs font-semibold text-[#0284c7] hover:text-[#0369a1] hover:underline block text-center w-full cursor-pointer"
        >
          Show more topics
        </button>
      </div>

      {/* 2. People You May Know Recommendation Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#0284c7]" />
            <span className="font-bold text-slate-900 text-sm">People You May Know</span>
          </div>
          <button 
            onClick={loadRecommendations}
            className="text-xs font-semibold text-[#0284c7] hover:underline cursor-pointer"
            title="Refresh recommendations"
          >
            Refresh
          </button>
        </div>

        <div className="space-y-3 mt-3">
          {isLoadingRecs ? (
            <div className="py-6 text-center text-xs text-slate-600">
              Analyzing shared engineering interests...
            </div>
          ) : recommendations.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-600">
              No new recommendations right now.
            </div>
          ) : (
            recommendations.map((person) => {
              const key = person.id || person.username;
              const isFollowing = Boolean(followingMap[key]);
              const initials = person.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              // Shared interest display
              const sharedInterest = person.shared_interest || 'Also in Artificial Intelligence';

              return (
                <div key={key} className="flex items-start justify-between gap-2.5 group">
                  <div 
                    onClick={() => onSelectUser?.(person.username)}
                    className="flex items-start gap-2.5 min-w-0 cursor-pointer flex-1"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#7BD1FA] to-sky-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs overflow-hidden aspect-square ring-1 ring-slate-100 mt-0.5">
                      {person.avatar_url ? (
                        <img 
                          src={person.avatar_url} 
                          alt={person.full_name} 
                          className="w-full h-full object-cover aspect-square"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>

                    {/* Name, Headline, and Shared Interest */}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#0284c7] transition-colors truncate">
                        {person.full_name}
                      </div>
                      <div className="text-[11px] text-slate-600 truncate leading-tight mt-0.5">
                        {person.headline || 'AI Systems Engineer'}
                      </div>

                      {/* Matching Shared Interest Label */}
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-[#0369a1] font-medium bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100 w-fit">
                        <Tag className="w-2.5 h-2.5 text-[#0284c7] shrink-0" />
                        <span className="truncate">{sharedInterest}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Follow Button */}
                  <button
                    onClick={() => handleFollowToggle(person)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 mt-0.5 ${
                      isFollowing
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        : 'bg-[#7BD1FA] text-[#073247] hover:bg-[#62c7f8] shadow-2xs border border-sky-300'
                    }`}
                    title={isFollowing ? 'Unfollow' : 'Follow'}
                  >
                    {isFollowing ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3 stroke-[2.5]" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Executive Digest Promo Card */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white shadow-xs border border-sky-900/50">
        <div className="flex items-center gap-2 text-[#7BD1FA] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-[#7BD1FA]" />
          <span>Nexus Architecture Digest</span>
        </div>
        <div className="font-semibold text-sm mt-1">Weekly Systems Briefing</div>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
          High-signal syntheses of distributed systems and ML accelerators, vetted by architects.
        </p>
        <button
          onClick={() => alert('Subscribed to Weekly Nexus Architecture Digest!')}
          className="mt-3 w-full py-1.5 bg-[#7BD1FA] hover:bg-[#62c7f8] text-[#073247] rounded-lg text-xs font-bold transition-colors cursor-pointer"
        >
          Subscribe Free
        </button>
      </div>

      {/* 4. Footer Meta Links */}
      <div className="px-2 text-[11px] text-slate-600 space-y-1">
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <a href="#" className="hover:text-slate-600">About</a>
          <a href="#" className="hover:text-slate-600">Accessibility</a>
          <a href="#" className="hover:text-slate-600">Privacy & Terms</a>
          <a href="#" className="hover:text-slate-600">Ad Choices</a>
          <a href="#" className="hover:text-slate-600">Architecture</a>
        </div>
        <div className="text-slate-600 pt-1">
          Nexus Network © 2026 • React + Django + Supabase
        </div>
      </div>
    </div>
  );
};
