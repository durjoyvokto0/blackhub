import React, { useState, useEffect } from 'react';
import { Video, VideoCategory } from '../types/index.ts';
import { VideoCard } from '../components/VideoCard.tsx';
import { AdBanner } from '../components/AdBanner.tsx';
import { apiRequest } from '../lib/api.ts';
import { Search, Filter, SlidersHorizontal, ChevronLeft, ChevronRight, Crown } from 'lucide-react';

interface BrowsePageProps {
  onNavigate: (page: string, params?: any) => void;
  initialCategory?: string;
  initialAccess?: string;
}

export const BrowsePage: React.FC<BrowsePageProps> = ({ onNavigate, initialCategory, initialAccess }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  const [selectedAccess, setSelectedAccess] = useState<string>(initialAccess || 'all');
  const [selectedSort, setSelectedSort] = useState<string>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Load categories
  useEffect(() => {
    apiRequest<{ categories: VideoCategory[] }>('/api/videos/categories')
      .then((data) => {
        if (data?.categories) setCategories(data.categories);
      })
      .catch((e) => console.error(e));
  }, []);

  // Load videos based on filter state
  useEffect(() => {
    async function fetchVideos() {
      try {
        setLoading(true);
        let url = `/api/videos?page=${currentPage}&limit=16&sort=${selectedSort}`;
        if (selectedCategory !== 'all') url += `&category=${selectedCategory}`;
        if (selectedAccess !== 'all') url += `&access=${selectedAccess}`;
        if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

        const data = await apiRequest<{ videos: Video[]; pagination: { total: number; pages: number } }>(url);
        if (data) {
          setVideos(data.videos || []);
          setTotalCount(data.pagination?.total || 0);
          setTotalPages(data.pagination?.pages || 1);
        }
      } catch (err) {
        console.error('[BrowsePage] Error fetching videos:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchVideos();
  }, [selectedCategory, selectedAccess, selectedSort, searchQuery, currentPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Title and stats */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Browse Video Library</h1>
            <p className="text-xs text-gray-400 mt-1">
              Showing {totalCount} videos across high-definition and 4K Ultra categories.
            </p>
          </div>

          {/* Quick Search */}
          <form onSubmit={handleSearchSubmit} className="w-full sm:w-72">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by title..."
                className="w-full bg-[#161622] border border-white/15 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-red-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </form>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-[#12121a] p-4 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                className="bg-[#1a1a26] border border-white/15 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Access Level Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Access:</span>
              <select
                value={selectedAccess}
                onChange={(e) => { setSelectedAccess(e.target.value); setCurrentPage(1); }}
                className="bg-[#1a1a26] border border-white/15 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="all">All Content</option>
                <option value="free">Free HD Only</option>
                <option value="premium">Premium 4K VIP</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Sort By:</span>
              <select
                value={selectedSort}
                onChange={(e) => { setSelectedSort(e.target.value); setCurrentPage(1); }}
                className="bg-[#1a1a26] border border-white/15 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="newest">Most Recent</option>
                <option value="views">Most Viewed</option>
                <option value="likes">Highest Rated</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Reset Filters */}
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedAccess('all');
              setSelectedSort('newest');
              setSearchQuery('');
              setCurrentPage(1);
            }}
            className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>

        {/* Ad Banner */}
        <AdBanner onUpgradeClick={() => onNavigate('premium')} />

        {/* Videos Grid */}
        {loading ? (
          <div className="py-20 flex justify-center text-gray-400">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : videos.length === 0 ? (
          <div className="bg-[#12121a] border border-white/10 rounded-2xl p-12 text-center text-gray-400 space-y-3">
            <p className="text-base font-semibold text-white">No videos matched your criteria.</p>
            <p className="text-xs">Try selecting a different category or clearing search terms.</p>
            <button
              onClick={() => { setSelectedCategory('all'); setSelectedAccess('all'); setSearchQuery(''); }}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-500 cursor-pointer mt-2"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onSelect={(v) => onNavigate('video', { id: v.id })}
                onCreatorSelect={(cId, cName) => onNavigate('creator', { id: cId, username: cName })}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-[#161622] border border-white/10 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 font-mono px-3">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-[#161622] border border-white/10 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
