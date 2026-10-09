import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Crown } from 'lucide-react';

interface AdBannerProps {
  placement?: 'sidebar' | 'leaderboard' | 'in-feed';
  onUpgradeClick?: () => void;
}

const BANNER_IFRAME_DOC = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: transparent;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <script type="text/javascript">
    atOptions = {
      'key' : '9ef5447ad5fa172346f576c06036b4b2',
      'format' : 'iframe',
      'height' : 90,
      'width' : 728,
      'params' : {}
    };
  </script>
  <script type="text/javascript" src="https://biomanos.org/22/9ef5447ad5fa172346f576c06036b4b2"></script>
</body>
</html>`;

export const AdBanner: React.FC<AdBannerProps> = ({ placement = 'leaderboard', onUpgradeClick }) => {
  const { isPremium } = useAuth();

  // STRICT REQUIREMENT: Don't show any ads to premium members
  if (isPremium) {
    return null;
  }

  if (placement === 'sidebar') {
    return (
      <div className="w-full bg-[#12121a] border border-white/10 rounded-xl p-3 my-4 flex flex-col items-center overflow-hidden">
        <div className="w-full flex items-center justify-between text-[10px] text-gray-400 font-mono mb-2 px-1">
          <span>SPONSORED ADVERTISEMENT</span>
          <button
            onClick={onUpgradeClick}
            className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-sans"
          >
            <Crown className="w-2.5 h-2.5" /> Remove Ads
          </button>
        </div>

        {/* Scaled/Responsive container for sidebar */}
        <div className="w-full overflow-x-auto scrollbar-none flex justify-center py-1">
          <div className="min-w-[728px] flex justify-center">
            <iframe
              srcDoc={BANNER_IFRAME_DOC}
              width="728"
              height="90"
              style={{ border: 'none', overflow: 'hidden' }}
              title="BlackHub Sidebar Banner Ad"
              scrolling="no"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full my-6 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-[#12121a] border border-white/10 rounded-2xl p-3.5 flex flex-col items-center shadow-lg overflow-hidden">
        <div className="w-full flex items-center justify-between text-[10px] text-gray-400 font-mono mb-2 px-1">
          <span>ADVERTISEMENT • FREE VIEWER MODE</span>
          <button
            onClick={onUpgradeClick}
            className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-sans"
          >
            <Crown className="w-3 h-3" /> Remove all ads with BlackHub VIP
          </button>
        </div>

        {/* 728x90 Leaderboard Banner with exact requested atOptions script */}
        <div className="w-full overflow-x-auto scrollbar-none flex justify-center py-1">
          <div className="min-w-[728px] flex justify-center">
            <iframe
              srcDoc={BANNER_IFRAME_DOC}
              width="728"
              height="90"
              style={{ border: 'none', overflow: 'hidden' }}
              title="BlackHub Leaderboard Banner Ad"
              scrolling="no"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
