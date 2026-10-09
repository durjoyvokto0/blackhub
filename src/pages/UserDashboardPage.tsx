import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiRequest } from '../lib/api.ts';
import { Video } from '../types/index.ts';
import { VideoCard } from '../components/VideoCard.tsx';
import {
  Crown,
  Clock,
  Bookmark,
  Upload,
  Settings,
  Eye,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldCheck
} from 'lucide-react';

interface UserDashboardPageProps {
  onNavigate: (page: string, params?: any) => void;
}

export const UserDashboardPage: React.FC<UserDashboardPageProps> = ({ onNavigate }) => {
  const { user, isPremium } = useAuth();
  const [recentHistory, setRecentHistory] = useState<Video[]>([]);
  const [savedVideos, setSavedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUserData() {
      try {
        setLoading(true);
        // Load some sample videos for user history & saved
        const data = await apiRequest<{ videos: Video[] }>('/api/videos?limit=8');
        if (data?.videos) {
          setRecentHistory(data.videos.slice(0, 4));
          setSavedVideos(data.videos.slice(2, 6));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0e] flex items-center justify-center p-6 text-white text-center">
        <div>
          <h2 className="text-xl font-bold mb-2">Please Sign In</h2>
          <p className="text-xs text-gray-400 mb-4">You need an authenticated account to access the user dashboard.</p>
          <button
            onClick={() => onNavigate('login')}
            className="px-6 py-2.5 bg-red-600 rounded-xl text-xs font-bold hover:bg-red-500 cursor-pointer"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Profile Header */}
        <div className="bg-[#12121a] p-6 sm:p-8 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-red-600 to-zinc-800 flex items-center justify-center text-2xl font-black text-white uppercase shadow-xl">
              {user.username.substring(0, 2)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">{user.displayName || user.username}</h1>
                {isPremium && (
                  <span className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-500 to-red-600 text-black font-black text-[10px] uppercase">
                    VIP PRO
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">{user.email}</p>
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300">
                  Role: {user.role}
                </span>
                {user.isEmailVerified ? (
                  <span className="flex items-center gap-1 text-green-400 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5" /> Email Verified
                  </span>
                ) : (
                  <button
                    onClick={() => onNavigate('verify-email')}
                    className="text-amber-400 underline hover:text-amber-300 text-[11px] cursor-pointer"
                  >
                    Verify Email
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('upload')}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Video</span>
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Membership Status Card (Section 5 & 19) */}
        <div className="bg-gradient-to-r from-[#17141f] via-[#12121a] to-[#1a1215] p-6 sm:p-8 rounded-2xl border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />
              <h2 className="text-lg font-bold text-white">Membership Entitlement</h2>
            </div>
            {isPremium ? (
              <p className="text-xs text-gray-300">
                You have active VIP status with 100% ad-free viewing, 4K video playback, and raw downloads.
                {user.subscriptionExpiresAt && (
                  <span className="block text-amber-300 font-semibold mt-1">
                    Valid until: {new Date(user.subscriptionExpiresAt).toLocaleDateString()}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                You are currently on the Free plan. Upgrade with cryptocurrency to remove all ads and unlock 4K Ultra streaming.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isPremium ? (
              <button
                onClick={() => onNavigate('premium')}
                className="px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer"
              >
                Extend VIP Pass
              </button>
            ) : (
              <button
                onClick={() => onNavigate('premium')}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs shadow-xl shadow-red-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Crown className="w-4 h-4" />
                <span>Upgrade to VIP (from $14.99)</span>
              </button>
            )}
          </div>
        </div>

        {/* Watch History Shortcut */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-red-500" />
              <span>Recently Watched</span>
            </h2>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              View Full History
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recentHistory.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onSelect={(v) => onNavigate('video', { id: v.id })}
              />
            ))}
          </div>
        </div>

        {/* Saved Videos Shortcut */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-amber-400" />
              <span>Saved Videos</span>
            </h2>
            <button
              onClick={() => onNavigate('saved')}
              className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              View All Saved
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {savedVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onSelect={(v) => onNavigate('video', { id: v.id })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
