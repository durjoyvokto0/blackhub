import React, { useState, useEffect } from 'react';
import { Video } from '../types/index.ts';
import { VideoCard } from '../components/VideoCard.tsx';
import { apiRequest } from '../lib/api.ts';
import { History, Bookmark, Trash2, Bell, Check, Info } from 'lucide-react';

interface MediaPageProps {
  onNavigate: (page: string, params?: any) => void;
}

// 1. Watch History Page
export const WatchHistoryPage: React.FC<MediaPageProps> = ({ onNavigate }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    apiRequest<{ videos: Video[] }>('/api/videos?limit=12')
      .then((data) => {
        if (data?.videos) setVideos(data.videos);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleClearHistory = () => {
    setVideos([]);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Watch History</h1>
              <p className="text-xs text-gray-400">Pick up where you left off across all devices.</p>
            </div>
          </div>

          {videos.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-white/10 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : videos.length === 0 ? (
          <div className="p-12 text-center text-gray-400 bg-[#12121a] rounded-2xl border border-white/10 space-y-3">
            <p className="text-sm font-semibold text-white">No watch history recorded yet.</p>
            <p className="text-xs">Browse videos and start watching to build your playback list.</p>
            <button
              onClick={() => onNavigate('browse')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-500 cursor-pointer"
            >
              Explore Videos
            </button>
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
        )}
      </div>
    </div>
  );
};

// 2. Saved Videos Page
export const SavedVideosPage: React.FC<MediaPageProps> = ({ onNavigate }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    apiRequest<{ videos: Video[] }>('/api/videos?access=premium&limit=8')
      .then((data) => {
        if (data?.videos) setVideos(data.videos);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Bookmark className="w-5 h-5 fill-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Saved Videos</h1>
            <p className="text-xs text-gray-400">Your personal library of bookmarked releases.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : videos.length === 0 ? (
          <div className="p-12 text-center text-gray-400 bg-[#12121a] rounded-2xl border border-white/10 space-y-3">
            <p className="text-sm font-semibold text-white">No saved videos.</p>
            <p className="text-xs">Click the bookmark icon on any video page to save it for later.</p>
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
        )}
      </div>
    </div>
  );
};

// 3. Notifications Page
export const NotificationsPage: React.FC<MediaPageProps> = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState<any[]>([
    {
      id: 1,
      title: 'Welcome to BlackHub Streaming',
      message: 'Thank you for joining our privacy-focused 4K platform. Explore featured releases today.',
      created_at: new Date().toISOString(),
      type: 'info'
    },
    {
      id: 2,
      title: 'VIP Pass Activated Notice',
      message: 'Upgrade to remove all ads and enable high-speed raw file downloads with cryptocurrency.',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      type: 'billing'
    }
  ]);

  const handleMarkAllRead = () => {
    // Simulated mark all read
  };

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Notifications</h1>
              <p className="text-xs text-gray-400">Account, billing, and community announcements.</p>
            </div>
          </div>

          <button
            onClick={handleMarkAllRead}
            className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            Mark all as read
          </button>
        </div>

        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="bg-[#12121a] p-4 rounded-xl border border-white/10 flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-red-500 shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">{n.title}</h4>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
