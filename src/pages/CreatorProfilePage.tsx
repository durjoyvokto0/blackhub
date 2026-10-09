import React, { useState, useEffect } from 'react';
import { Video } from '../types/index.ts';
import { VideoCard } from '../components/VideoCard.tsx';
import { apiRequest } from '../lib/api.ts';
import { UserCheck, Film, Info, Calendar } from 'lucide-react';

interface CreatorProfilePageProps {
  creatorId: number;
  creatorUsername?: string;
  onNavigate: (page: string, params?: any) => void;
}

export const CreatorProfilePage: React.FC<CreatorProfilePageProps> = ({ creatorId, creatorUsername, onNavigate }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeTab, setActiveTab] = useState<'videos' | 'about'>('videos');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadCreatorVideos() {
      try {
        setLoading(true);
        const data = await apiRequest<{ videos: Video[] }>(`/api/videos?limit=50`);
        if (data?.videos) {
          // Filter creator videos
          const cv = data.videos.filter((v) => v.creator_id === creatorId || v.creator_username === creatorUsername);
          setVideos(cv.length > 0 ? cv : data.videos.slice(0, 4));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadCreatorVideos();
  }, [creatorId, creatorUsername]);

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white pb-12">
      {/* Creator Banner */}
      <div className="h-48 sm:h-64 w-full bg-gradient-to-r from-red-950 via-[#181824] to-black relative">
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Creator Info Header */}
        <div className="relative -mt-16 sm:-mt-20 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-end gap-4">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-zinc-800 border-4 border-[#0a0a0e] flex items-center justify-center text-3xl font-black text-white uppercase shadow-2xl">
              {(creatorUsername || 'C')[0]}
            </div>
            <div className="space-y-1 mb-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {creatorUsername || 'BlackHub Creator'}
              </h1>
              <p className="text-xs text-gray-400">
                Verified Creator • 142,000 Subscribers • {videos.length} Uploaded Works
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => setIsSubscribed(!isSubscribed)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isSubscribed
                  ? 'bg-white/10 text-gray-200 border border-white/15'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
              }`}
            >
              {isSubscribed ? 'Subscribed' : 'Subscribe to Channel'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-white/10 my-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('videos')}
            className={`pb-3 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'videos' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Videos ({videos.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`pb-3 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'about' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>About</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'videos' ? (
          loading ? (
            <div className="py-20 flex justify-center text-gray-400">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {videos.map((v) => (
                <VideoCard
                  key={v.id}
                  video={v}
                  onSelect={(vid) => onNavigate('video', { id: vid.id })}
                />
              ))}
            </div>
          )
        ) : (
          <div className="max-w-2xl bg-[#12121a] p-6 rounded-2xl border border-white/10 space-y-4 text-sm text-gray-300">
            <h3 className="font-bold text-white text-base">Channel Bio & Details</h3>
            <p className="leading-relaxed">
              Official channel producing premier 4K cinematic original releases on BlackHub. Specializing in high-production sci-fi epics, dark ambient compositions, and cutting-edge visual design.
            </p>
            <div className="pt-4 border-t border-white/5 space-y-2 text-xs text-gray-400">
              <p>Joined: October 2024</p>
              <p>Total Views: 4,890,200</p>
              <p>Location: International / Decentralized</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
