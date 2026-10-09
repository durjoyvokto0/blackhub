import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Film,
  Search,
  Upload,
  Crown,
  User,
  Settings,
  History,
  Bookmark,
  LogOut,
  ShieldAlert,
  Menu,
  X,
  Bell,
  HelpCircle,
  FolderOpen
} from 'lucide-react';

interface NavbarProps {
  onNavigate: (page: string, params?: any) => void;
  currentPage: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
  const { user, isPremium, isAdmin, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('search', { query: searchQuery.trim() });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0c0c10]/95 backdrop-blur-md border-b border-white/10 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 font-black text-2xl tracking-tighter text-white group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/30 group-hover:bg-red-500 transition-colors">
              <Film className="w-5 h-5 text-white" />
            </div>
            <span>
              BLACK<span className="text-red-500">HUB</span>
            </span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <button
              onClick={() => onNavigate('home')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                currentPage === 'home' ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => onNavigate('browse')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                currentPage === 'browse' ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Browse
            </button>
            <button
              onClick={() => onNavigate('categories')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                currentPage === 'categories' ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Categories
            </button>
            <button
              onClick={() => onNavigate('premium')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                currentPage === 'premium'
                  ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
                  : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <Crown className="w-3.5 h-3.5 fill-amber-400" />
              <span>Premium</span>
            </button>
          </nav>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 4K videos, creators, cinema..."
              className="w-full bg-[#16161e] border border-white/15 focus:border-red-500 rounded-full py-1.5 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Upload Button */}
          <button
            onClick={() => onNavigate('upload')}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-gray-200 hover:text-white transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-red-400" />
            <span>Upload</span>
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 p-1 pl-2 rounded-full bg-[#16161e] border border-white/15 hover:border-white/30 transition-colors cursor-pointer"
              >
                <div className="text-left hidden md:block">
                  <div className="text-xs font-semibold leading-tight text-white flex items-center gap-1">
                    {user.displayName || user.username}
                    {isPremium && (
                      <span className="bg-gradient-to-r from-amber-500 to-red-500 text-[9px] text-black font-black px-1.5 py-0.5 rounded uppercase">
                        PRO
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-zinc-800 flex items-center justify-center text-xs font-bold text-white uppercase shadow">
                  {user.username.substring(0, 2)}
                </div>
              </button>

              {/* User Dropdown Menu */}
              {isDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-[#14141c] border border-white/15 rounded-xl shadow-2xl py-2 z-50 text-sm animate-in fade-in slide-in-from-top-2"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <div className="px-4 py-2.5 border-b border-white/10">
                    <p className="font-semibold text-white">{user.displayName || user.username}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isAdmin
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : isPremium
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-white/10 text-gray-300'
                      }`}>
                        {user.role}
                      </span>
                      {isPremium && user.subscriptionExpiresAt && (
                        <span className="text-[10px] text-gray-400">
                          Expires: {new Date(user.subscriptionExpiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => onNavigate('admin-dashboard')}
                      className="w-full text-left px-4 py-2 hover:bg-red-950/40 text-red-400 flex items-center gap-2.5 font-medium cursor-pointer"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>Admin Management Dashboard</span>
                    </button>
                  )}

                  <button
                    onClick={() => onNavigate('user-dashboard')}
                    className="w-full text-left px-4 py-2 hover:bg-white/5 text-gray-200 flex items-center gap-2.5 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    <span>User Dashboard</span>
                  </button>

                  <button
                    onClick={() => onNavigate('history')}
                    className="w-full text-left px-4 py-2 hover:bg-white/5 text-gray-200 flex items-center gap-2.5 cursor-pointer"
                  >
                    <History className="w-4 h-4 text-gray-400" />
                    <span>Watch History</span>
                  </button>

                  <button
                    onClick={() => onNavigate('saved')}
                    className="w-full text-left px-4 py-2 hover:bg-white/5 text-gray-200 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Bookmark className="w-4 h-4 text-gray-400" />
                    <span>Saved Videos</span>
                  </button>

                  <button
                    onClick={() => onNavigate('notifications')}
                    className="w-full text-left px-4 py-2 hover:bg-white/5 text-gray-200 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Bell className="w-4 h-4 text-gray-400" />
                    <span>Notifications</span>
                  </button>

                  <button
                    onClick={() => onNavigate('settings')}
                    className="w-full text-left px-4 py-2 hover:bg-white/5 text-gray-200 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span>Account Settings</span>
                  </button>

                  <div className="border-t border-white/10 my-1"></div>

                  <button
                    onClick={() => logout()}
                    className="w-full text-left px-4 py-2 hover:bg-red-500/10 text-red-400 flex items-center gap-2.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('login')}
                className="px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="px-3.5 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                Register
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#101017] border-b border-white/10 px-4 py-4 space-y-3">
          <form onSubmit={handleSearch} className="mb-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search videos..."
                className="w-full bg-[#181822] border border-white/15 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </form>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <button
              onClick={() => { onNavigate('home'); setIsMobileMenuOpen(false); }}
              className="p-2 rounded bg-white/5 text-left text-gray-200"
            >
              Home
            </button>
            <button
              onClick={() => { onNavigate('browse'); setIsMobileMenuOpen(false); }}
              className="p-2 rounded bg-white/5 text-left text-gray-200"
            >
              Browse
            </button>
            <button
              onClick={() => { onNavigate('categories'); setIsMobileMenuOpen(false); }}
              className="p-2 rounded bg-white/5 text-left text-gray-200"
            >
              Categories
            </button>
            <button
              onClick={() => { onNavigate('premium'); setIsMobileMenuOpen(false); }}
              className="p-2 rounded bg-amber-500/20 text-left text-amber-300 font-semibold flex items-center gap-1"
            >
              <Crown className="w-3.5 h-3.5" /> Premium
            </button>
            <button
              onClick={() => { onNavigate('upload'); setIsMobileMenuOpen(false); }}
              className="p-2 rounded bg-white/5 text-left text-gray-200 flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" /> Upload Video
            </button>
            <button
              onClick={() => { onNavigate('help'); setIsMobileMenuOpen(false); }}
              className="p-2 rounded bg-white/5 text-left text-gray-200 flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Help & Support
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
