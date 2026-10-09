import React, { useState, useEffect } from 'react';
import { VideoCategory } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';
import { Film, Zap, Cpu, Globe, Eye, Sparkles, Gamepad2, Music, ChevronRight } from 'lucide-react';

interface CategoriesPageProps {
  onNavigate: (page: string, params?: any) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  Film: <Film className="w-6 h-6 text-red-500" />,
  Zap: <Zap className="w-6 h-6 text-amber-500" />,
  Cpu: <Cpu className="w-6 h-6 text-cyan-500" />,
  Globe: <Globe className="w-6 h-6 text-emerald-500" />,
  Eye: <Eye className="w-6 h-6 text-purple-500" />,
  Sparkles: <Sparkles className="w-6 h-6 text-pink-500" />,
  Gamepad2: <Gamepad2 className="w-6 h-6 text-blue-500" />,
  Music: <Music className="w-6 h-6 text-yellow-500" />
};

export const CategoriesPage: React.FC<CategoriesPageProps> = ({ onNavigate }) => {
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    apiRequest<{ categories: VideoCategory[] }>('/api/videos/categories')
      .then((data) => {
        if (data?.categories) setCategories(data.categories);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <h1 className="text-3xl font-black text-white">Video Categories</h1>
          <p className="text-xs text-gray-400 mt-1">
            Explore curated high-bitrate collections categorized by genre, cinematography style, and format.
          </p>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center text-gray-400">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => onNavigate('browse', { category: cat.slug })}
                className="bg-[#12121a] hover:bg-[#181824] border border-white/10 hover:border-red-500/40 p-6 rounded-2xl transition-all duration-300 group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    {iconMap[cat.icon || 'Film'] || <Film className="w-6 h-6 text-red-500" />}
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed line-clamp-2">
                    {cat.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
                  <span className="font-mono">{cat.video_count || 0} Videos</span>
                  <span className="text-red-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Browse <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
