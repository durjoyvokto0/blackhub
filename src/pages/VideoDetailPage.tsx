import React, { useState, useEffect } from 'react';
import { Video, Comment } from '../types/index.ts';
import { CustomVideoPlayer } from '../components/CustomVideoPlayer.tsx';
import { VideoCard, formatViews, timeAgo } from '../components/VideoCard.tsx';
import { AdBanner } from '../components/AdBanner.tsx';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  ThumbsUp,
  Bookmark,
  Share2,
  Flag,
  MessageSquare,
  Send,
  Crown,
  Check,
  AlertTriangle,
  UserCheck
} from 'lucide-react';

interface VideoDetailPageProps {
  videoId: number;
  onNavigate: (page: string, params?: any) => void;
}

export const VideoDetailPage: React.FC<VideoDetailPageProps> = ({ videoId, onNavigate }) => {
  const { user } = useAuth();
  const [video, setVideo] = useState<Video | null>(null);
  const [related, setRelated] = useState<Video[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [liked, setLiked] = useState<boolean>(false);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [saved, setSaved] = useState<boolean>(false);
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<string>('copyright');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [reportSuccess, setReportSuccess] = useState<boolean>(false);

  useEffect(() => {
    async function loadVideo() {
      try {
        setLoading(true);
        const [videoRes, commentsRes] = await Promise.all([
          apiRequest<{ video: Video; related: Video[] }>(`/api/videos/${videoId}`),
          apiRequest<{ comments: Comment[] }>(`/api/videos/${videoId}/comments`)
        ]);

        if (videoRes?.video) {
          setVideo(videoRes.video);
          setLiked(Boolean(videoRes.video.isLiked));
          setLikesCount(videoRes.video.likes_count || 0);
          setSaved(Boolean(videoRes.video.isSaved));
          setRelated(videoRes.related || []);
        }

        if (commentsRes?.comments) {
          setComments(commentsRes.comments);
        }
      } catch (err) {
        console.error('[VideoDetailPage] Error loading video:', err);
      } finally {
        setLoading(false);
      }
    }

    loadVideo();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [videoId]);

  const handleLike = async () => {
    if (!user) {
      onNavigate('login');
      return;
    }
    try {
      const res = await apiRequest<{ liked: boolean }>(`/api/videos/${videoId}/like`, { method: 'POST' });
      setLiked(res.liked);
      setLikesCount((prev) => (res.liked ? prev + 1 : Math.max(0, prev - 1)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!user) {
      onNavigate('login');
      return;
    }
    try {
      const res = await apiRequest<{ saved: boolean }>(`/api/videos/${videoId}/save`, { method: 'POST' });
      setSaved(res.saved);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onNavigate('login');
      return;
    }
    if (!newComment.trim()) return;

    try {
      const res = await apiRequest<{ comment: Comment }>(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: newComment.trim() })
      });
      if (res?.comment) {
        setComments([res.comment, ...comments]);
        setNewComment('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/community/report', {
        method: 'POST',
        body: JSON.stringify({
          videoId,
          reason: reportReason,
          details: reportDetails
        })
      });
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
        setReportDetails('');
      }, 1500);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0e] flex items-center justify-center text-gray-400">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-[#0a0a0e] text-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold mb-2">Video Unavailable</h2>
        <p className="text-xs text-gray-400 mb-4">This video does not exist or is pending moderator approval.</p>
        <button
          onClick={() => onNavigate('browse')}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-500 cursor-pointer"
        >
          Return to Browse
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Video & Discussion Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Custom Video Player */}
            <CustomVideoPlayer video={video} onUpgradeClick={() => onNavigate('premium')} />

            {/* Video Header & Meta */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {video.access_level === 'premium' ? (
                  <span className="px-2.5 py-0.5 rounded bg-amber-500 text-black font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Crown className="w-3 h-3 fill-black" /> VIP 4K Ultra
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-white/10 text-gray-300 text-[10px] font-bold">
                    FREE HD
                  </span>
                )}
                {video.category_name && (
                  <span className="text-xs text-gray-400 bg-[#161622] px-2 py-0.5 rounded">
                    {video.category_name}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white leading-snug">
                {video.title}
              </h1>

              {/* View Count & Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-y border-white/10 text-xs">
                <div className="text-gray-400 font-medium">
                  <span>{formatViews(video.views_count)}</span>
                  <span className="mx-2">•</span>
                  <span>{timeAgo(video.created_at)}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Like Button */}
                  <button
                    onClick={handleLike}
                    className={`px-3.5 py-2 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      liked
                        ? 'bg-red-600/20 border-red-500 text-red-400'
                        : 'bg-[#14141e] border-white/10 text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${liked ? 'fill-red-400' : ''}`} />
                    <span>{likesCount}</span>
                  </button>

                  {/* Bookmark Button */}
                  <button
                    onClick={handleSave}
                    className={`px-3.5 py-2 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      saved
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-[#14141e] border-white/10 text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-amber-300' : ''}`} />
                    <span>{saved ? 'Saved' : 'Save'}</span>
                  </button>

                  {/* Share Button */}
                  <button
                    onClick={handleShare}
                    className="px-3.5 py-2 rounded-full bg-[#14141e] border border-white/10 text-gray-300 hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedShare ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copiedShare ? 'Copied' : 'Share'}</span>
                  </button>

                  {/* Report Button */}
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="p-2 rounded-full bg-[#14141e] border border-white/10 text-gray-400 hover:text-red-400 hover:bg-white/5 transition-all cursor-pointer"
                    title="Report Content"
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Creator Channel Box */}
            <div className="bg-[#12121a] p-4 rounded-xl border border-white/10 flex items-center justify-between gap-4">
              <div
                onClick={() => onNavigate('creator', { id: video.creator_id, username: video.creator_username })}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-zinc-800 flex items-center justify-center text-base font-bold text-white shadow">
                  {(video.creator_username || 'B')[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white group-hover:text-red-400 transition-colors">
                    {video.creator_display_name || video.creator_username || 'BlackHub Creator'}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {(video.creator_subscribers_count || 1200).toLocaleString()} Subscribers
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSubscribed(!subscribed)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  subscribed
                    ? 'bg-white/10 text-gray-300 border border-white/15'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
                }`}
              >
                {subscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            </div>

            {/* Video Description & Tags */}
            <div className="bg-[#12121a] p-5 rounded-xl border border-white/10 space-y-3">
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                {video.description || 'No detailed description provided for this video.'}
              </p>

              {video.tags && video.tags.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-1.5">
                  {video.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-gray-400"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="bg-[#12121a] p-5 rounded-xl border border-white/10 space-y-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-red-500" />
                <span>Comments ({comments.length})</span>
              </h3>

              {/* Add Comment Input */}
              <form onSubmit={handleCommentSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={user ? "Add a public comment..." : "Log in to post a comment"}
                  disabled={!user}
                  className="flex-1 bg-[#181824] border border-white/15 rounded-lg px-4 py-2.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-red-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!user || !newComment.trim()}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post</span>
                </button>
              </form>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No comments yet. Be the first to share your thoughts!</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-3 text-xs border-b border-white/5 pb-3 last:border-none">
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center font-bold text-white uppercase shrink-0 text-[10px]">
                        {c.username[0]}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-200">{c.display_name || c.username}</span>
                          <span className="text-[10px] text-gray-400">{timeAgo(c.created_at)}</span>
                        </div>
                        <p className="text-gray-300 leading-normal">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Related Videos & Sponsorship */}
          <div className="space-y-6">
            <AdBanner placement="sidebar" onUpgradeClick={() => onNavigate('premium')} />

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-gray-400">
                Up Next & Related
              </h3>

              <div className="space-y-4">
                {related.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => onNavigate('video', { id: v.id })}
                    className="flex gap-3 group cursor-pointer bg-[#12121a] p-2 rounded-xl border border-transparent hover:border-white/15 transition-all"
                  >
                    <div className="relative aspect-video w-32 rounded-lg overflow-hidden shrink-0 bg-black">
                      <img
                        src={v.thumbnail_url}
                        alt={v.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {v.access_level === 'premium' && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500 text-black font-black text-[8px]">
                          VIP
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <h4 className="text-xs font-semibold text-gray-200 group-hover:text-red-400 line-clamp-2 leading-snug">
                        {v.title}
                      </h4>
                      <div className="text-[10px] text-gray-400 space-y-0.5">
                        <p className="truncate">{v.creator_username}</p>
                        <p>{formatViews(v.views_count)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14141e] border border-white/20 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Report Content</h3>
            </div>
            <p className="text-xs text-gray-400">
              BlackHub maintains strict content policies. Please specify the nature of the issue.
            </p>

            {reportSuccess ? (
              <div className="p-4 rounded-xl bg-green-500/20 border border-green-500/40 text-green-400 text-xs text-center font-semibold">
                Report logged successfully. Our moderation department will review this content.
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Reason:</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-[#1a1a26] border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="copyright">Copyright Infringement (DMCA)</option>
                    <option value="terms_violation">Terms of Service Violation</option>
                    <option value="adult_compliance">Age & Consent Non-Compliance</option>
                    <option value="illegal_material">Prohibited / Illegal Material</option>
                    <option value="spam">Spam / Misleading Metadata</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Details (Optional):</label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide additional timestamps or copyright ownership proof..."
                    className="w-full bg-[#1a1a26] border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow cursor-pointer"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
