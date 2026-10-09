import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Video } from '../types/index.ts';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Crown,
  Lock,
  RotateCcw,
  SkipForward,
  Sparkles
} from 'lucide-react';
import { formatDuration } from './VideoCard.tsx';

interface CustomVideoPlayerProps {
  video: Video;
  onUpgradeClick: () => void;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ video, onUpgradeClick }) => {
  const { isPremium, user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(video.duration || 0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);

  // Pre-roll ad state for FREE users watching free videos
  const [isAdPlaying, setIsAdPlaying] = useState<boolean>(!isPremium && video.access_level === 'free');
  const [adCountdown, setAdCountdown] = useState<number>(5);

  const isLocked = video.access_level === 'premium' && !isPremium;

  // Handle ad countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAdPlaying && !isPremium) {
      timer = setInterval(() => {
        setAdCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isAdPlaying, isPremium]);

  const handleSkipAd = () => {
    setIsAdPlaying(false);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      videoRef.current.volume = volume || 0.5;
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSettingsMenu(false);
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(isPlaying ? false : true)}
      className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 group select-none"
    >
      {/* Locked Screen for Non-Premium User on Premium Video */}
      {isLocked ? (
        <div className="absolute inset-0 z-30 bg-[#0e0e14]/95 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center text-white mb-4 shadow-xl shadow-red-600/30">
            <Lock className="w-8 h-8" />
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-black tracking-widest uppercase mb-2 border border-amber-500/30 flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 fill-amber-400" />
            Exclusive Premium 4K
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white max-w-lg mb-2">
            This video is restricted to BlackHub VIP subscribers
          </h2>
          <p className="text-sm text-gray-400 max-w-md mb-6 leading-relaxed">
            Upgrade your membership using cryptocurrency to unlock unrestricted access to this film, full 4K 60FPS bitrates, and a 100% ad-free experience.
          </p>
          <button
            onClick={onUpgradeClick}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-sm shadow-xl shadow-red-600/40 transition-all cursor-pointer flex items-center gap-2"
          >
            <Crown className="w-4 h-4 fill-white" />
            <span>Unlock Instant Access with Crypto</span>
          </button>
        </div>
      ) : null}

      {/* Simulated Pre-Roll Ad for FREE Users (Section 5 & 21) */}
      {!isPremium && isAdPlaying && !isLocked ? (
        <div className="absolute inset-0 z-20 bg-black flex flex-col items-center justify-center p-6 text-white">
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs text-gray-300 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Sponsored Ad • {adCountdown > 0 ? `Video starts in ${adCountdown}s` : 'You can skip now'}</span>
          </div>

          <div className="text-center max-w-md p-6 bg-[#161622] rounded-2xl border border-white/15 shadow-2xl">
            <span className="text-xs uppercase tracking-widest text-red-400 font-bold">BlackHub VIP Pass</span>
            <h3 className="text-xl font-bold mt-1 text-white">Stream 100% Ad-Free in 4K Ultra HD</h3>
            <p className="text-xs text-gray-400 mt-2">
              Tired of video pre-rolls? Upgrade to our Monthly or Annual plan using Bitcoin, USDT, or Ethereum.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={onUpgradeClick}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-all cursor-pointer"
              >
                Get Ad-Free Pass
              </button>
            </div>
          </div>

          {/* Skip Ad Button */}
          <div className="absolute bottom-6 right-6">
            <button
              onClick={handleSkipAd}
              disabled={adCountdown > 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs shadow-lg transition-all ${
                adCountdown > 0
                  ? 'bg-black/60 text-gray-400 border border-white/10 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-red-600/40'
              }`}
            >
              <span>{adCountdown > 0 ? `Skip Ad in ${adCountdown}s` : 'Skip Ad'}</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Actual HTML5 Video Element */}
      <video
        ref={videoRef}
        src={video.video_url}
        poster={video.thumbnail_url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
      />

      {/* Floating Center Play Icon when paused and not locked */}
      {!isPlaying && !isLocked && !isAdPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl shadow-red-600/50 transform group-hover:scale-110 transition-transform">
            <Play className="w-7 h-7 fill-white ml-1" />
          </div>
        </div>
      )}

      {/* Custom Control Bar Overlay */}
      {!isLocked && !isAdPlaying && (
        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Progress Timeline Scrubber */}
          <div className="mb-3">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-red-600 hover:h-2 transition-all"
            />
          </div>

          <div className="flex items-center justify-between text-white text-xs">
            {/* Left Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-1.5 hover:text-red-500 transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1.5 group/vol">
                <button onClick={toggleMute} className="p-1 hover:text-red-500 transition-colors cursor-pointer">
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>

              {/* Time Display */}
              <span className="font-mono text-[11px] text-gray-300">
                {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3 relative">
              {/* Quality Badge */}
              <span className="px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-black">
                {video.access_level === 'premium' ? '4K UHD' : '1080p HD'}
              </span>

              {/* Speed Settings Button */}
              <div className="relative">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="p-1.5 hover:text-red-500 transition-colors cursor-pointer text-xs font-mono"
                  title="Playback Speed"
                >
                  {playbackSpeed}x
                </button>

                {showSettingsMenu && (
                  <div className="absolute right-0 bottom-8 bg-[#181822] border border-white/20 rounded-lg p-1.5 shadow-xl w-24 text-xs z-50">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => changeSpeed(spd)}
                        className={`w-full text-left px-2 py-1 rounded hover:bg-white/10 ${
                          playbackSpeed === spd ? 'text-red-400 font-bold' : 'text-gray-300'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 hover:text-red-500 transition-colors cursor-pointer"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
