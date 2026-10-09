import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiRequest } from '../lib/api.ts';
import { VideoCategory } from '../types/index.ts';
import { Upload, Film, Image, CheckCircle2, ShieldAlert, AlertTriangle, ArrowRight } from 'lucide-react';

interface UploadVideoPageProps {
  onNavigate: (page: string, params?: any) => void;
}

export const UploadVideoPage: React.FC<UploadVideoPageProps> = ({ onNavigate }) => {
  const { user, isAdmin } = useAuth();
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [tags, setTags] = useState('');
  const [accessLevel, setAccessLevel] = useState<'free' | 'premium'>('free');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    apiRequest<{ categories: VideoCategory[] }>('/api/videos/categories')
      .then((data) => {
        if (data?.categories) {
          setCategories(data.categories);
          if (data.categories[0]) setCategoryId(data.categories[0].id);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Video title is required.');
      return;
    }

    try {
      setUploading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('categoryId', String(categoryId));
      formData.append('tags', tags);
      formData.append('accessLevel', accessLevel);

      if (videoFile) formData.append('video', videoFile);
      if (thumbnailFile) formData.append('thumbnail', thumbnailFile);

      const res = await apiRequest<{ message: string; video: any }>('/api/videos/upload', {
        method: 'POST',
        body: formData
      });

      setSuccessMsg(res.message);
      setTitle('');
      setDescription('');
      setTags('');
      setVideoFile(null);
      setThumbnailFile(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Video upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0e] flex items-center justify-center p-6 text-white text-center">
        <div>
          <h2 className="text-xl font-bold mb-2">Please Sign In to Upload</h2>
          <p className="text-xs text-gray-400 mb-4">You must be logged in to submit videos for community review.</p>
          <button onClick={() => onNavigate('login')} className="px-6 py-2.5 bg-red-600 rounded-xl text-xs font-bold hover:bg-red-500 cursor-pointer">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Upload Video</h1>
          <p className="text-xs text-gray-400 mt-1">
            Publish your video creations to the BlackHub platform.
          </p>
        </div>

        {/* Section 7 Moderation Note */}
        {!isAdmin && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-300 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className="font-bold">Content Moderation Notice</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
                User-uploaded content remains unpublished under review until verified by a platform administrator.
                Ensure all materials comply with platform age, consent, and copyright guidelines.
              </p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="bg-green-500/20 border border-green-500/40 rounded-2xl p-4 text-xs text-green-300 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-2xl p-4 text-xs text-red-300 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-[#12121a] p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6">
          {/* File Picker Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Video File */}
            <div className="border-2 border-dashed border-white/15 hover:border-red-500/50 rounded-2xl p-6 text-center space-y-2 bg-[#161622] transition-colors relative">
              <Film className="w-8 h-8 text-red-500 mx-auto" />
              <div className="text-xs font-bold text-white">Select Video File</div>
              <p className="text-[10px] text-gray-400">MP4, WebM, MOV (Max 500MB)</p>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {videoFile && (
                <div className="text-[11px] text-green-400 font-mono truncate pt-1">
                  Selected: {videoFile.name}
                </div>
              )}
            </div>

            {/* Thumbnail File */}
            <div className="border-2 border-dashed border-white/15 hover:border-amber-500/50 rounded-2xl p-6 text-center space-y-2 bg-[#161622] transition-colors relative">
              <Image className="w-8 h-8 text-amber-500 mx-auto" />
              <div className="text-xs font-bold text-white">Upload Thumbnail</div>
              <p className="text-[10px] text-gray-400">JPG, PNG, WebP (16:9 ratio)</p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {thumbnailFile && (
                <div className="text-[11px] text-green-400 font-mono truncate pt-1">
                  Selected: {thumbnailFile.name}
                </div>
              )}
            </div>
          </div>

          {/* Video Metadata */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Video Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your video a compelling title"
                className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Description</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a comprehensive summary, credits, and synopsis..."
                className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(parseInt(e.target.value))}
                  className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Cinema, 4K, Cyberpunk, Drone"
                  className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Admin Access Level Toggle */}
            {isAdmin && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-white">Administrator Access Tier</label>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="accessTier"
                      checked={accessLevel === 'free'}
                      onChange={() => setAccessLevel('free')}
                      className="text-red-600 focus:ring-0"
                    />
                    <span className="text-gray-300">Free HD</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="accessTier"
                      checked={accessLevel === 'premium'}
                      onChange={() => setAccessLevel('premium')}
                      className="text-amber-500 focus:ring-0"
                    />
                    <span className="text-amber-400 font-bold">Premium VIP 4K</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>{isAdmin ? 'Publish Video Immediately' : 'Submit Video for Review'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
