import React from 'react';
import { Film, Shield, Lock, Bitcoin, Coins } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string, params?: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#08080c] text-gray-400 border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2.5 font-black text-2xl tracking-tighter text-white group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/30">
                <Film className="w-4 h-4 text-white" />
              </div>
              <span>
                BLACK<span className="text-red-500">HUB</span>
              </span>
            </button>
            <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
              The premier next-generation video sharing and high-bitrate 4K streaming network.
              Powered exclusively by decentralized cryptocurrency subscriptions and robust creator moderation.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Accepted Crypto:</span>
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">USDT</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">BTC</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">ETH</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">LTC</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-white transition-colors cursor-pointer">
                  Featured Home
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('browse')} className="hover:text-white transition-colors cursor-pointer">
                  Browse Videos
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('categories')} className="hover:text-white transition-colors cursor-pointer">
                  Categories
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('premium')} className="hover:text-amber-400 transition-colors text-amber-400/90 cursor-pointer">
                  Premium Membership
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('upload')} className="hover:text-white transition-colors cursor-pointer">
                  Creator Uploads
                </button>
              </li>
            </ul>
          </div>

          {/* Support & Community */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => onNavigate('help')} className="hover:text-white transition-colors cursor-pointer">
                  Help Center & FAQ
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('crypto-guide')} className="hover:text-white transition-colors cursor-pointer">
                  Crypto Payment Guide
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('payment-status')} className="hover:text-white transition-colors cursor-pointer">
                  Check Payment Order
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('report-content')} className="hover:text-red-400 transition-colors text-red-400/90 cursor-pointer">
                  DMCA & Content Report
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => onNavigate('terms')} className="hover:text-white transition-colors cursor-pointer">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('privacy')} className="hover:text-white transition-colors cursor-pointer">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('compliance')} className="hover:text-white transition-colors cursor-pointer">
                  Age & Legal Notice
                </button>
              </li>
              {/* Discreet Admin Portal Link */}
              <li className="pt-2 border-t border-white/5">
                <button
                  onClick={() => onNavigate('admin-login')}
                  className="text-xs text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Administrator Portal"
                >
                  <Lock className="w-3 h-3" />
                  <span>Admin Login</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-4">
          <p>© 2026 BlackHub Streaming Network. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-green-500" />
              <span>TLS 256-Bit Encrypted</span>
            </span>
            <span>•</span>
            <span>Strictly 18+ Content Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
