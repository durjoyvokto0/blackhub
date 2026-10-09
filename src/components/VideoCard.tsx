import React from 'react';
import { Video } from '../types/index.ts';
import { Crown, Play, Eye, Clock } from 'lucide-react';

interface VideoCardProps {
  video: Video;
  onSelect: (video: Video) => void;
  onCreatorSelect?: (creatorId: number, username: string) => void;
}

export function formatDuration(seconds: number): string {
  if (!seconds) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatViews(views: number): string {
  if (!views) return '0 views';
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
  return `${views} views`;
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, onSelect, onCreatorSelect }) => {
  const isPremium = video.access_level === 'premium';

  return (
    <div
      onClick={() => onSelect(video)}
      className="group flex flex-col bg-[#12121a] rounded-xl overflow-hidden border border-white/10 hover:border-white/25 hover:shadow-xl hover:shadow-black/60 transition-all duration-300 cursor-pointer"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-black/60">
        <img
          src={video.thumbnail_url}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Dark overlay on hover with play icon */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {isPremium ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gradient-to-r from-amber-500 to-red-600 text-[10px] font-black uppercase text-black tracking-wider shadow-md">
              <Crown className="w-3 h-3 fill-black" />
              PREMIUM 4K
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[10px] font-bold text-gray-300 border border-white/10">
              FREE HD
            </span>
          )}
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/85 backdrop-blur-md text-[11px] font-mono font-medium text-white shadow">
          {formatDuration(video.duration)}
        </div>
      </div>

      {/* Info Container */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="font-semibold text-sm text-gray-100 group-hover:text-red-400 line-clamp-2 transition-colors leading-snug">
            {video.title}
          </h3>

          {/* Creator info */}
          <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onCreatorSelect && video.creator_id) {
                  onCreatorSelect(video.creator_id, video.creator_username || 'Creator');
                }
              }}
              className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer truncate max-w-[70%]"
            >
              <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                {(video.creator_username || 'B')[0].toUpperCase()}
              </div>
              <span className="truncate">{video.creator_display_name || video.creator_username || 'BlackHub Creator'}</span>
            </button>

            {video.category_name && (
              <span className="text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded truncate">
                {video.category_name}
              </span>
            )}
          </div>
        </div>

        {/* Metadata stats */}
        <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3 text-gray-400" />
            {formatViews(video.views_count)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-gray-400" />
            {timeAgo(video.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
};
