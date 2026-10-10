import React, { useState } from 'react';
import { 
  Sparkles, 
  Flame, 
  Bookmark, 
  Share2, 
  Rss, 
  TrendingUp, 
  Layers, 
  Cpu, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import { INITIAL_EXPLORE_ARTICLES } from '../../lib/mockData';
import { ExploreArticle } from '../../lib/types';

export const ExploreView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('Trending');
  const [articles, setArticles] = useState<ExploreArticle[]>(INITIAL_EXPLORE_ARTICLES);
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    { id: 'Trending', label: 'Trending', icon: Flame },
    { id: 'Technology', label: 'Technology' },
    { id: 'Leadership', label: 'Leadership' },
    { id: 'AI & Data Science', label: 'AI & Data Science' },
    { id: 'Design Systems', label: 'Design Systems' },
    { id: 'Cloud Infrastructure', label: 'Cloud Infrastructure' },
  ];

  const handleBookmark = (id: string) => {
    setBookmarked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleShare = (id: string) => {
    setCopiedId(id);
    navigator.clipboard?.writeText?.(window.location.origin + `#article-${id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header Banner */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-[#0284c7] tracking-wider uppercase mb-1">
          <span className="w-2 h-2 rounded-full bg-[#7BD1FA]" />
          <span>Executive Knowledge Network</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Explore & Industry Insights
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Curated perspectives, technical deep dives, and emerging enterprise trends vetted by industry practitioners.
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-100 text-xs font-semibold text-[#0369a1] shrink-0 self-start sm:self-auto shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#0284c7]" />
            <span>42 New Insights added this cycle</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#7BD1FA] text-[#073247] font-bold shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 shrink-0">
          <span>Sort by:</span>
          <select className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer">
            <option>Editor's Picks ▾</option>
            <option>Most Read ▾</option>
            <option>Highest Engagement ▾</option>
            <option>Latest Published ▾</option>
          </select>
        </div>
      </div>

      {/* 3-Column Bento / Cards Grid (Screenshot 5) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((art) => {
          const isBookmarked = bookmarked[art.id];
          const isCopied = copiedId === art.id;

          return (
            <div
              key={art.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Visual Top Bar / Image Preview */}
                {art.id === 'art-001' && (
                  <div className="h-44 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 relative p-4 flex flex-col justify-between overflow-hidden">
                    <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#7BD1FA_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-200 bg-slate-950/80 px-2 py-0.5 rounded border border-sky-800">
                        Enterprise AI
                      </span>
                      <span className="text-[10px] font-bold text-[#073247] bg-[#7BD1FA] px-2 py-0.5 rounded">
                        Featured
                      </span>
                    </div>
                    <div className="relative z-10 text-[11px] text-slate-300 font-mono flex items-center justify-between">
                      <span>eBPF Runtime Mesh</span>
                      <span className="text-emerald-400">● Nominal</span>
                    </div>
                  </div>
                )}

                {art.id === 'art-005' && (
                  <div className="h-36 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 relative p-4 flex flex-col justify-between border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-sky-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        Cloud Infrastructure
                      </span>
                      <span className="text-[10px] font-bold text-slate-300 font-mono">
                        eBPF Native
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-sky-300">
                      <ShieldMeshIcon />
                      <span>Zero-Trust Mesh Protocol</span>
                    </div>
                  </div>
                )}

                <div className="p-5 space-y-3">
                  {/* Category Pill for non-banner cards */}
                  {!['art-001', 'art-005'].includes(art.id) && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#0369a1] bg-sky-50 border border-sky-100 px-2.5 py-0.5 rounded">
                        {art.category}
                      </span>
                      {art.badge && (
                        <span className="text-[10px] font-medium text-slate-600 font-mono">
                          {art.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Read count / subtitle */}
                  {art.read_count && (
                    <div className="text-[11px] text-slate-600 font-medium">
                      Deep Dive Architecture • {art.read_count}
                    </div>
                  )}

                  {/* Article Title */}
                  <h3 className="text-base font-bold text-slate-900 leading-snug hover:text-[#0284c7] cursor-pointer transition-colors">
                    {art.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {art.excerpt}
                  </p>

                  {/* Embedded Visuals */}
                  {/* Retention Chart (Screenshot 5) */}
                  {art.has_chart === 'retention' && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-600 font-semibold uppercase">Retention Lift</div>
                        <div className="text-lg font-bold text-[#0284c7] tabular-nums">+34.8%</div>
                      </div>
                      <div className="w-28 h-8">
                        <svg className="w-full h-full" viewBox="0 0 100 30">
                          <path
                            d="M 5 25 Q 40 22 70 12 T 95 5"
                            fill="none"
                            stroke="#0284c7"
                            strokeWidth="2.5"
                          />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Tokens Visual Preview (Screenshot 5) */}
                  {art.has_chart === 'tokens' && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[10px] space-y-1.5">
                      <div className="text-slate-600 font-semibold">TOKENS.CONFIG.JSON</div>
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="p-1.5 bg-white rounded border border-slate-200 text-center">
                          <div className="w-4 h-4 bg-[#7BD1FA] rounded mx-auto mb-1" />
                          <span className="text-[9px] text-slate-600">sys.pri</span>
                        </div>
                        <div className="p-1.5 bg-white rounded border border-slate-200 text-center">
                          <div className="w-4 h-4 bg-sky-200 rounded mx-auto mb-1" />
                          <span className="text-[9px] text-slate-600">sys.sec</span>
                        </div>
                        <div className="p-1.5 bg-white rounded border border-slate-200 text-center">
                          <div className="w-4 h-4 bg-slate-200 rounded mx-auto mb-1" />
                          <span className="text-[9px] text-slate-600">sys.elev</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Venture Seed Velocity (Screenshot 5) */}
                  {art.has_chart === 'funding' && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-600 font-semibold uppercase">Q3 Seed Velocity</div>
                        <div className="text-base font-bold text-slate-900 tabular-nums">$1.42B Series A</div>
                      </div>
                      <div className="flex items-end gap-1 h-8">
                        <div className="w-2 h-3 bg-sky-200 rounded-xs" />
                        <div className="w-2 h-4 bg-sky-300 rounded-xs" />
                        <div className="w-2 h-6 bg-sky-400 rounded-xs" />
                        <div className="w-2 h-8 bg-[#7BD1FA] rounded-xs" />
                      </div>
                    </div>
                  )}

                  {/* Focus Time Index (Screenshot 5) */}
                  {art.has_chart === 'focus' && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-600 font-semibold uppercase">Focus Time Index</div>
                        <div className="text-base font-bold text-slate-900 tabular-nums">28.4 hrs/wk</div>
                      </div>
                      <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        +12.4% avg
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Author & Actions Footer */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-700 to-sky-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                    {art.author.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {art.author.full_name}
                    </div>
                    <div className="text-[10px] text-slate-600 truncate">
                      {art.read_time}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-slate-600">
                  <button
                    onClick={() => handleBookmark(art.id)}
                    className="p-1.5 hover:text-[#0284c7] rounded hover:bg-slate-100 transition-colors"
                    title="Bookmark"
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-[#0284c7] text-[#0284c7]' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleShare(art.id)}
                    className="p-1.5 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                    title="Share"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Curate Weekly Digest Banner (Screenshot 5) */}
      <div className="p-6 rounded-2xl bg-sky-50/70 border border-sky-100 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#7BD1FA] text-[#073247] flex items-center justify-center shrink-0 shadow-xs font-bold">
            <Rss className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900">
              Curate Your Weekly Intelligence Digest
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Get synthetic briefings of top enterprise architecture papers delivered each Monday morning.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => alert('Configure Topics preferences modal opened.')}
            className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Configure Topics
          </button>
          <button
            onClick={() => alert('Subscribed to Weekly Intelligence Digest!')}
            className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold text-[#073247] bg-[#7BD1FA] hover:bg-[#62c7f8] rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Subscribe Free
          </button>
        </div>
      </div>
    </div>
  );
};

const ShieldMeshIcon = () => (
  <svg className="w-4 h-4 text-[#7BD1FA]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
