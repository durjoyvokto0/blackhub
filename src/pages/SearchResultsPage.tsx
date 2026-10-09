import React, { useState, useEffect } from 'react';
import { Video } from '../types/index.ts';
import { VideoCard } from '../components/VideoCard.tsx';
import { apiRequest } from '../lib/api.ts';
import { Search } from 'lucide-react';

interface SearchResultsPageProps {
  query: string;
  onNavigate: (page: string, params?: any) => void;
}

export const SearchResultsPage: React.FC<SearchResultsPageProps> = ({ query, onNavigate }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>(query);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchResults = async (term: string) => {
    try {
      setLoading(true);
      const data = await apiRequest<{ videos: Video[] }>(`/api/videos?search=${encodeURIComponent(term)}&limit=30`);
      if (data?.videos) setVideos(data.videos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearchTerm(query);
    fetchResults(query);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      fetchResults(searchTerm.trim());
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl font-black text-white">Search Results</h1>
            <p className="text-xs text-gray-400 mt-1">
              Found {videos.length} results for "<span className="text-white font-medium">{searchTerm}</span>"
            </p>
          </div>

          <form onSubmit={handleSearch} className="w-full sm:w-80">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search BlackHub..."
                className="w-full bg-[#161622] border border-white/15 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-red-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </form>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center text-gray-400">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : videos.length === 0 ? (
          <div className="bg-[#12121a] border border-white/10 rounded-2xl p-12 text-center text-gray-400 space-y-3">
            <p className="text-base font-semibold text-white">No results found for "{searchTerm}"</p>
            <p className="text-xs">Try different keywords or browse our categories.</p>
            <button
              onClick={() => onNavigate('browse')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-500 cursor-pointer mt-2"
            >
              Browse All Videos
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
      </div>
    </div>
  );
};
