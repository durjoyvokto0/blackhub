import React, { useState, useEffect } from 'react';
import { Video, VideoCategory } from '../types/index.ts';
import { VideoCard } from '../components/VideoCard.tsx';
import { AdBanner } from '../components/AdBanner.tsx';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Play,
  Crown,
  Flame,
  Sparkles,
  TrendingUp,
  Clock,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: string, params?: any) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { isPremium } = useAuth();
  const [featuredVideo, setFeaturedVideo] = useState<Video | null>(null);
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [premiumVideos, setPremiumVideos] = useState<Video[]>([]);
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [videosRes, catsRes] = await Promise.all([
          apiRequest<{ videos: Video[] }>('/api/videos?limit=20'),
          apiRequest<{ categories: VideoCategory[] }>('/api/videos/categories')
        ]);

        if (videosRes?.videos?.length) {
          const vids = videosRes.videos;
          // Featured: First video or top viewed
          setFeaturedVideo(vids[0]);
          setTrendingVideos(vids.slice(0, 4));
          setPremiumVideos(vids.filter((v) => v.access_level === 'premium').slice(0, 4));
          setRecentVideos(vids.slice(4, 12));
        }

        if (catsRes?.categories) {
          setCategories(catsRes.categories);
        }
      } catch (err) {
        console.error('[HomePage] Failed to fetch homepage data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0e] flex items-center justify-center text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Loading BlackHub Originals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white pb-16">
      {/* Cinematic Hero Feature Banner */}
      {featuredVideo && (
        <section className="relative w-full h-[65vh] min-h-[460px] max-h-[680px] overflow-hidden">
          {/* Background image with layered gradients */}
          <img
            src={featuredVideo.thumbnail_url}
            alt={featuredVideo.title}
            className="w-full h-full object-cover object-center filter brightness-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0e] via-[#0a0a0e]/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0e] via-[#0a0a0e]/60 to-transparent"></div>

          {/* Hero Content Overlay */}
          <div className="absolute inset-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12">
            <div className="max-w-2xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-red-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-red-600/40">
                  <Flame className="w-3.5 h-3.5 fill-white" /> Featured Premiere
                </span>
                {featuredVideo.access_level === 'premium' && (
                  <span className="px-2.5 py-1 rounded bg-amber-500 text-black font-black text-xs uppercase tracking-widest flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 fill-black" /> VIP 4K
                  </span>
                )}
                <span className="text-xs text-gray-300 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                  {featuredVideo.category_name || 'Cinematic'}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                {featuredVideo.title}
              </h1>

              <p className="text-sm sm:text-base text-gray-300 line-clamp-3 leading-relaxed drop-shadow">
                {featuredVideo.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => onNavigate('video', { id: featuredVideo.id })}
                  className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-xl shadow-red-600/40 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Watch Now</span>
                </button>

                {!isPremium && (
                  <button
                    onClick={() => onNavigate('premium')}
                    className="px-5 py-3 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Crown className="w-4 h-4" />
                    <span>Get 4K VIP Pass</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">
        {/* Categories Bar */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-500" />
              <span>Browse Categories</span>
            </h2>
            <button
              onClick={() => onNavigate('categories')}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onNavigate('browse', { category: cat.slug })}
                className="px-4 py-2 rounded-full bg-[#161620] hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white whitespace-nowrap transition-colors cursor-pointer"
              >
                {cat.name}
              </button>
            ))}
          </div>
        </section>

        {/* Trending Videos */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-500" />
              <span>Trending on BlackHub</span>
            </h2>
            <button
              onClick={() => onNavigate('browse', { sort: 'views' })}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>Explore More</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {trendingVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onSelect={(v) => onNavigate('video', { id: v.id })}
                onCreatorSelect={(cId, cName) => onNavigate('creator', { id: cId, username: cName })}
              />
            ))}
          </div>
        </section>

        {/* Ad Banner strictly for Free users */}
        <AdBanner onUpgradeClick={() => onNavigate('premium')} />

        {/* VIP Premium Exclusives Row */}
        <section className="bg-gradient-to-r from-red-950/30 via-[#151520] to-black p-6 rounded-2xl border border-red-900/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />
                <h2 className="text-xl font-black text-white">BlackHub VIP 4K Exclusives</h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Highest-bitrate cinema releases and master raw footage reserved for Premium subscribers.
              </p>
            </div>
            {!isPremium && (
              <button
                onClick={() => onNavigate('premium')}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs tracking-wide shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Crown className="w-3.5 h-3.5 fill-black" />
                <span>Unlock VIP with Crypto</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {premiumVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onSelect={(v) => onNavigate('video', { id: v.id })}
                onCreatorSelect={(cId, cName) => onNavigate('creator', { id: cId, username: cName })}
              />
            ))}
          </div>
        </section>

        {/* Recent Uploads Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-500" />
              <span>Recent Uploads</span>
            </h2>
            <button
              onClick={() => onNavigate('browse', { sort: 'newest' })}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recentVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onSelect={(v) => onNavigate('video', { id: v.id })}
                onCreatorSelect={(cId, cName) => onNavigate('creator', { id: cId, username: cName })}
              />
            ))}
          </div>
        </section>

        {/* Promotional Callout */}
        {!isPremium && (
          <section className="bg-gradient-to-r from-[#12121c] to-[#1e131d] border border-white/10 rounded-2xl p-8 sm:p-10 text-center relative overflow-hidden">
            <div className="max-w-xl mx-auto space-y-4">
              <span className="px-3 py-1 rounded-full bg-red-600/20 text-red-400 text-xs font-bold uppercase tracking-wider border border-red-600/30">
                100% Cryptocurrency Supported
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Experience BlackHub Without Compromise
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                Enjoy complete anonymity with blockchain payments. Zero credit cards required. Instant activation with USDT, Bitcoin, Ethereum, and Litecoin.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => onNavigate('premium')}
                  className="px-8 py-3.5 rounded-full bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-sm shadow-xl shadow-red-600/40 transition-all cursor-pointer"
                >
                  View Membership Plans (from $14.99/mo)
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
