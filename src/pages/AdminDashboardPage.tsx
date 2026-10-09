import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiRequest, getStoredToken } from '../lib/api.ts';
import { AdminStats, AuditLog, SourceFile } from '../types/index.ts';
import {
  LayoutDashboard,
  Users,
  Film,
  Upload,
  Download,
  CreditCard,
  Settings,
  Shield,
  Coins,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Trash2,
  Search,
  RefreshCw,
  LogOut,
  Sliders,
  Terminal,
  FileCheck2,
  Clock,
  Eye,
  Lock,
  Globe,
  FileCode,
  Activity,
  Crown,
  Radio,
  UserCheck,
  Sparkles
} from 'lucide-react';

interface AdminDashboardPageProps {
  onNavigate: (page: string, params?: any) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate }) => {
  const { user, isAdmin, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'audience' | 'users' | 'videos' | 'upload' | 'source-files' | 'plans' | 'crypto' | 'payments' | 'security' | 'tests'
  >('overview');

  // Stats
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  // Audience & Live Presence state
  const [audienceData, setAudienceData] = useState<any | null>(null);
  const [loadingAudience, setLoadingAudience] = useState<boolean>(false);
  const [autoRefreshAudience, setAutoRefreshAudience] = useState<boolean>(true);
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'premium' | 'free' | 'guest'>('all');

  // Users tab state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState<string>('');
  const [grantModalUser, setGrantModalUser] = useState<any | null>(null);
  const [grantMonths, setGrantMonths] = useState<number>(1);
  const [grantReason, setGrantReason] = useState<string>('Complimentary customer service grant');

  // Videos tab state
  const [videosList, setVideosList] = useState<any[]>([]);
  const [videoFilter, setVideoFilter] = useState<string>('all');
  const [rejectModalVideo, setRejectModalVideo] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Violation of community standards');

  // Source files tab state
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
  const [downloadMsg, setDownloadMsg] = useState<string>('');

  // Plans tab state
  const [plans, setPlans] = useState<any[]>([]);

  // Crypto settings tab state
  const [cryptoSettings, setCryptoSettings] = useState<any>({
    isEnabled: true,
    assetSymbol: 'USDT',
    network: 'TRC20',
    receivingAddress: '',
    verificationMode: 'auto',
    requiredConfirmations: 2,
    paymentInstructions: ''
  });
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState<string>('');
  const [cryptoSaveMsg, setCryptoSaveMsg] = useState<string>('');
  const [cryptoSaveError, setCryptoSaveError] = useState<string>('');

  // Payments verification queue tab state
  const [paymentOrders, setPaymentOrders] = useState<any[]>([]);

  // Security tab state
  const [recoveryEmail, setRecoveryEmail] = useState<string>('');
  const [recoveryCode, setRecoveryCode] = useState<string>('');
  const [recoveryMsg, setRecoveryMsg] = useState<string>('');
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);

  // Automated acceptance test suite state (Section 26)
  const [testResults, setTestResults] = useState<any[]>([]);
  const [testsRunning, setTestsRunning] = useState<boolean>(false);
  const [testsStatus, setTestsStatus] = useState<string>('');

  // Fetch Dashboard Overview Stats
  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const data = await apiRequest<{ metrics: AdminStats; recentLogs: AuditLog[] }>('/api/admin/stats');
      if (data) {
        setStats(data.metrics);
        setRecentLogs(data.recentLogs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch Real-time Audience & Membership Analytics
  const loadAudienceData = async () => {
    try {
      setLoadingAudience(true);
      const data = await apiRequest<any>('/api/admin/audience-analytics');
      if (data) {
        setAudienceData(data);
      }
    } catch (e) {
      console.error('[Audience fetch error]:', e);
    } finally {
      setLoadingAudience(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadStats();
  }, [isAdmin]);

  // Periodic Auto-Refresh for Live Audience tab
  useEffect(() => {
    if (!isAdmin || activeTab !== 'audience' || !autoRefreshAudience) return;
    const interval = setInterval(() => {
      apiRequest<any>('/api/admin/audience-analytics')
        .then((data) => {
          if (data) setAudienceData(data);
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [isAdmin, activeTab, autoRefreshAudience]);

  // Load Tab Specific Data
  useEffect(() => {
    if (!isAdmin) return;

    if (activeTab === 'audience') {
      loadAudienceData();
    } else if (activeTab === 'users') {
      apiRequest<{ users: any[] }>(`/api/admin/users?search=${encodeURIComponent(userSearch)}`)
        .then((data) => setUsersList(data.users || []))
        .catch((e) => console.error(e));
    } else if (activeTab === 'videos') {
      apiRequest<{ videos: any[] }>(`/api/admin/videos?status=${videoFilter}`)
        .then((data) => setVideosList(data.videos || []))
        .catch((e) => console.error(e));
    } else if (activeTab === 'source-files') {
      apiRequest<{ sourceFiles: SourceFile[] }>('/api/admin/source-files')
        .then((data) => setSourceFiles(data.sourceFiles || []))
        .catch((e) => console.error(e));
    } else if (activeTab === 'plans') {
      apiRequest<{ plans: any[] }>('/api/memberships/plans')
        .then((data) => setPlans(data.plans || []))
        .catch((e) => console.error(e));
    } else if (activeTab === 'crypto') {
      apiRequest<any>('/api/memberships/crypto-settings')
        .then((data) => {
          if (data) {
            setCryptoSettings({
              isEnabled: data.isEnabled,
              assetSymbol: data.assetSymbol,
              network: data.network,
              receivingAddress: data.receivingAddress,
              verificationMode: data.verificationMode || 'auto',
              requiredConfirmations: data.requiredConfirmations || 2,
              paymentInstructions: data.paymentInstructions || ''
            });
          }
        })
        .catch((e) => console.error(e));
    } else if (activeTab === 'payments') {
      apiRequest<{ orders: any[] }>('/api/admin/payments')
        .then((data) => setPaymentOrders(data.orders || []))
        .catch((e) => console.error(e));
    } else if (activeTab === 'security') {
      apiRequest<any>('/api/admin/security')
        .then((data) => {
          if (data) {
            setRecoveryEmail(data.recoveryEmail || '');
          }
        })
        .catch((e) => console.error(e));
      apiRequest<{ logs: any[] }>('/api/admin/audit-logs')
        .then((data) => setSecurityLogs(data.logs || []))
        .catch((e) => console.error(e));
    }
  }, [activeTab, isAdmin, userSearch, videoFilter]);

  // Handle User Moderation Action
  const handleUserAction = async (userId: number, action: string, reason = '') => {
    try {
      await apiRequest(`/api/admin/users/${userId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action, reason })
      });
      // Refresh list
      const res = await apiRequest<{ users: any[] }>(`/api/admin/users?search=${encodeURIComponent(userSearch)}`);
      setUsersList(res.users || []);
    } catch (e: any) {
      alert(e.message || 'Action failed');
    }
  };

  // Grant Complimentary Membership
  const handleGrantMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantModalUser) return;
    try {
      await apiRequest(`/api/admin/users/${grantModalUser.id}/grant-membership`, {
        method: 'POST',
        body: JSON.stringify({ months: grantMonths, reason: grantReason })
      });
      setGrantModalUser(null);
      const res = await apiRequest<{ users: any[] }>(`/api/admin/users?search=${encodeURIComponent(userSearch)}`);
      setUsersList(res.users || []);
      loadStats();
    } catch (e: any) {
      alert(e.message || 'Failed to grant membership');
    }
  };

  // Moderate Video Action
  const handleVideoAction = async (videoId: number, action: string, reason = '', accessLevel?: string) => {
    try {
      await apiRequest(`/api/admin/videos/${videoId}/moderate`, {
        method: 'POST',
        body: JSON.stringify({ action, reason, accessLevel })
      });
      const res = await apiRequest<{ videos: any[] }>(`/api/admin/videos?status=${videoFilter}`);
      setVideosList(res.videos || []);
      setRejectModalVideo(null);
      loadStats();
    } catch (e: any) {
      alert(e.message || 'Video moderation action failed');
    }
  };

  // Section 13 Source File Authorized Download
  const handleDownloadSourceFile = async (fileId: number, filename: string) => {
    try {
      setDownloadMsg(`Requesting authorized download token for "${filename}"...`);
      const res = await apiRequest<{ downloadUrl: string }>(`/api/admin/source-files/${fileId}/download-token`);
      if (res?.downloadUrl) {
        setDownloadMsg(`Authorized! Downloading: ${filename}`);
        // Trigger browser download
        const a = document.createElement('a');
        a.href = res.downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => setDownloadMsg(''), 4000);
      }
    } catch (e: any) {
      setDownloadMsg(`Download failed: ${e.message}`);
    }
  };

  // Save Crypto Settings (Requires Admin Password - Section 15)
  const handleSaveCryptoSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCryptoSaveMsg('');
      setCryptoSaveError('');
      await apiRequest('/api/admin/crypto-settings', {
        method: 'PUT',
        body: JSON.stringify({
          adminPassword: adminPasswordConfirm,
          ...cryptoSettings
        })
      });
      setCryptoSaveMsg('Cryptocurrency receiving settings updated securely.');
      setAdminPasswordConfirm('');
    } catch (err: any) {
      setCryptoSaveError(err.message || 'Failed to save crypto settings.');
    }
  };

  // Manual Payment Verification Action (Section 18)
  const handleVerifyPayment = async (orderId: number, action: 'approve' | 'reject', reason = '') => {
    try {
      await apiRequest(`/api/admin/payments/${orderId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ action, reason })
      });
      const res = await apiRequest<{ orders: any[] }>('/api/admin/payments');
      setPaymentOrders(res.orders || []);
      loadStats();
    } catch (e: any) {
      alert(e.message || 'Payment verification failed');
    }
  };

  // Run Automated Acceptance Tests (Section 26)
  const handleRunAcceptanceTests = async () => {
    try {
      setTestsRunning(true);
      setTestsStatus('Executing test runner across 16 acceptance criteria...');
      const data = await apiRequest<any>('/api/test-suite/run');
      setTestResults(data.results || []);
      setTestsStatus(data.status);
    } catch (err: any) {
      setTestsStatus(`Tests execution error: ${err.message}`);
    } finally {
      setTestsRunning(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#07070a] flex items-center justify-center p-6 text-white text-center">
        <div className="bg-[#12121a] p-8 rounded-2xl border border-red-500/30 max-w-md space-y-4 shadow-2xl">
          <Shield className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-xs text-gray-400">
            This administration gateway is strictly restricted to authorized system operators.
          </p>
          <button
            onClick={() => onNavigate('admin-login')}
            className="px-6 py-2.5 bg-red-600 rounded-xl text-xs font-bold hover:bg-red-500 cursor-pointer"
          >
            Authenticate via Admin Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080c] text-white flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#0d0d14] border-r border-white/10 p-4 space-y-6 shrink-0">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black shadow-lg shadow-red-600/30 text-white text-sm">
              BH
            </div>
            <div>
              <span className="font-black text-sm block">ADMIN CONSOLE</span>
              <span className="text-[10px] text-gray-400 font-mono">v1.0 • black999</span>
            </div>
          </div>
        </div>

        <nav className="space-y-1 text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
              activeTab === 'overview' ? 'bg-red-600 text-white font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview & Metrics</span>
          </button>

          <button
            onClick={() => setActiveTab('audience')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
              activeTab === 'audience' ? 'bg-red-600 text-white font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Live Audience & Members</span>
            </div>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {stats?.onlineNow !== undefined ? `${stats.onlineNow} Online` : 'Live'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
              activeTab === 'users' ? 'bg-red-600 text-white font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Management</span>
          </button>

          <button
            onClick={() => setActiveTab('videos')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
              activeTab === 'videos' ? 'bg-red-600 text-white font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Video Moderation</span>
          </button>

          <button
            onClick={() => onNavigate('upload')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-gray-400 hover:text-white hover:bg-white/5"
          >
            <Upload className="w-4 h-4" />
            <span>Admin Upload Video</span>
          </button>

          <button
            onClick={() => setActiveTab('source-files')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
              activeTab === 'source-files' ? 'bg-red-600 text-white font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Source Files & Raw</span>
          </button>

          <button
            onClick={() => setActiveTab('plans')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
              activeTab === 'plans' ? 'bg-red-600 text-white font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Membership Plans</span>
          </button>

          <button
            onClick={() => setActiveTab('crypto')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
              activeTab === 'crypto' ? 'bg-red-600 text-white font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Crypto Payments Config</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
              activeTab === 'payments' ? 'bg-red-600 text-white font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Payment Verification</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
              activeTab === 'security' ? 'bg-red-600 text-white font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Admin Security & Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
              activeTab === 'tests' ? 'bg-red-600 text-white font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>System Acceptance Tests</span>
          </button>
        </nav>

        <div className="pt-6 border-t border-white/10 space-y-2">
          <button
            onClick={() => onNavigate('home')}
            className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-white cursor-pointer"
          >
            ← View Public Site
          </button>
          <button
            onClick={() => logout().then(() => onNavigate('home'))}
            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:text-red-300 flex items-center gap-2 cursor-pointer font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
        {/* TAB 1: OVERVIEW & STATS */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-white">System Overview</h1>
                <p className="text-xs text-gray-400 mt-0.5">Real-time statistics across users, video library, and crypto payments.</p>
              </div>
              <button
                onClick={loadStats}
                className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {loadingStats ? (
              <div className="py-20 flex justify-center">
                <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : stats ? (
              <>
                {/* Metric Cards Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Total Registered Accounts */}
                  <div className="bg-[#12121a] p-5 rounded-2xl border border-white/10 relative overflow-hidden">
                    <span className="text-xs text-gray-400">Total Users</span>
                    <h3 className="text-2xl font-black text-white mt-1">{stats.totalUsers}</h3>
                    <span className="text-[10px] text-gray-400">Registered platform accounts</span>
                  </div>

                  {/* Card 2: Premium Membership Users */}
                  <div className="bg-[#12121a] p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-amber-300 font-semibold flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5 text-amber-400" /> Premium VIP Users
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                        {stats.totalUsers > 0 ? (((stats.premiumUsers ?? stats.activePremiumSubscribers) / stats.totalUsers) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-amber-400 mt-1">{stats.premiumUsers ?? stats.activePremiumSubscribers}</h3>
                    <span className="text-[10px] text-amber-400/80">Active VIP memberships</span>
                  </div>

                  {/* Card 3: Free Users */}
                  <div className="bg-[#12121a] p-5 rounded-2xl border border-white/10 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-400" /> Free Tier Users
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-mono">
                        {stats.totalUsers > 0 ? (((stats.freeUsers ?? Math.max(0, stats.totalUsers - stats.activePremiumSubscribers)) / stats.totalUsers) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-white mt-1">
                      {stats.freeUsers ?? Math.max(0, stats.totalUsers - stats.activePremiumSubscribers)}
                    </h3>
                    <span className="text-[10px] text-gray-400">Free registered accounts</span>
                  </div>

                  {/* Card 4: Online Now in Website */}
                  <div className="bg-[#12121a] p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                        Online Now on Website
                      </span>
                      <button
                        onClick={() => setActiveTab('audience')}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
                      >
                        Live →
                      </button>
                    </div>
                    <h3 className="text-2xl font-black text-emerald-400 mt-1">
                      {stats.onlineNow ?? 1}
                    </h3>
                    <span className="text-[10px] text-emerald-300/80 font-mono">
                      {stats.onlinePremium ?? 0} VIP • {stats.onlineFree ?? 0} Free • {stats.onlineGuests ?? 1} Guests
                    </span>
                  </div>

                  <div className="bg-[#12121a] p-5 rounded-2xl border border-white/10">
                    <span className="text-xs text-gray-400">Published Videos</span>
                    <h3 className="text-2xl font-black text-white mt-1">{stats.publishedVideos}</h3>
                    <span className="text-[10px] text-gray-400">{stats.totalVideos} total videos</span>
                  </div>

                  <div className="bg-[#12121a] p-5 rounded-2xl border border-white/10">
                    <span className="text-xs text-gray-400">Storage Used</span>
                    <h3 className="text-2xl font-black text-white mt-1">{stats.storageConsumption}</h3>
                    <span className="text-[10px] text-gray-400">Private object storage</span>
                  </div>

                  <div className="bg-[#12121a] p-5 rounded-2xl border border-white/10">
                    <span className="text-xs text-gray-400">Pending Video Approvals</span>
                    <h3 className="text-2xl font-black text-amber-400 mt-1">{stats.pendingVideoApprovals}</h3>
                    <span className="text-[10px] text-gray-400">Awaiting moderation</span>
                  </div>

                  <div className="bg-[#12121a] p-5 rounded-2xl border border-white/10">
                    <span className="text-xs text-gray-400">Content Reports</span>
                    <h3 className="text-2xl font-black text-red-400 mt-1">{stats.pendingContentReports}</h3>
                    <span className="text-[10px] text-gray-400">DMCA / policy notices</span>
                  </div>

                  <div className="bg-[#12121a] p-5 rounded-2xl border border-white/10">
                    <span className="text-xs text-gray-400">Confirmed Crypto Orders</span>
                    <h3 className="text-2xl font-black text-green-400 mt-1">{stats.confirmedPayments}</h3>
                    <span className="text-[10px] text-gray-400">Blockchain verified</span>
                  </div>

                  <div className="bg-[#12121a] p-5 rounded-2xl border border-white/10">
                    <span className="text-xs text-gray-400">Pending Orders</span>
                    <h3 className="text-2xl font-black text-amber-400 mt-1">{stats.pendingPayments}</h3>
                    <span className="text-[10px] text-gray-400">In verification queue</span>
                  </div>
                </div>

                {/* Recent Admin Audit Activity */}
                <div className="bg-[#12121a] p-6 rounded-2xl border border-white/10 space-y-4">
                  <h3 className="text-sm font-bold text-white">Recent Operator Audit Trail</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400">
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3">Operator</th>
                          <th className="py-2.5 px-3">Action</th>
                          <th className="py-2.5 px-3">Target</th>
                          <th className="py-2.5 px-3">Details</th>
                          <th className="py-2.5 px-3">IP Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                        {recentLogs.map((l) => (
                          <tr key={l.id} className="hover:bg-white/5">
                            <td className="py-2 px-3 text-gray-400">{new Date(l.created_at).toLocaleTimeString()}</td>
                            <td className="py-2 px-3 text-white font-bold">{l.admin_username}</td>
                            <td className="py-2 px-3 text-red-400 font-bold">{l.action}</td>
                            <td className="py-2 px-3 text-gray-300">{l.target_type}:{l.target_id}</td>
                            <td className="py-2 px-3 text-gray-300 font-sans truncate max-w-xs">{l.details}</td>
                            <td className="py-2 px-3 text-gray-400">{l.ip_address}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* TAB: LIVE AUDIENCE & MEMBERSHIP STATS */}
        {activeTab === 'audience' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-black text-white">Live Audience & Membership Stats</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Live Presence
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Real-time monitor of active visitors, Premium VIP subscribers, Free accounts, and active website sessions.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAutoRefreshAudience(!autoRefreshAudience)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    autoRefreshAudience
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${autoRefreshAudience ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`}></span>
                  <span>{autoRefreshAudience ? 'Auto-Refresh (4s)' : 'Auto-Refresh Off'}</span>
                </button>

                <button
                  onClick={loadAudienceData}
                  disabled={loadingAudience}
                  className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAudience ? 'animate-spin' : ''}`} />
                  <span>Refresh Now</span>
                </button>
              </div>
            </div>

            {/* Audience KPI Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Online Right Now */}
              <div className="bg-[#12121a] p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[#12121a] to-transparent">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Online Right Now
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                </div>
                <h3 className="text-3xl font-black text-emerald-400 mt-2">
                  {audienceData?.onlinePresence?.totalOnline ?? (stats?.onlineNow ?? 1)}
                </h3>
                <span className="text-[10px] text-emerald-300/80">Active website viewers right now</span>
              </div>

              {/* VIP Members Online */}
              <div className="bg-[#12121a] p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-[#12121a] to-transparent">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-300 font-semibold flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-400" />
                    VIP Members Online
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                    Ad-Free Tier
                  </span>
                </div>
                <h3 className="text-3xl font-black text-amber-400 mt-2">
                  {audienceData?.onlinePresence?.onlinePremium ?? (stats?.onlinePremium ?? 0)}
                </h3>
                <span className="text-[10px] text-amber-300/70">Verified VIP accounts browsing</span>
              </div>

              {/* Free Users Online */}
              <div className="bg-[#12121a] p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300 font-semibold flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-gray-400" />
                    Free Members Online
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-mono">
                    Free Tier
                  </span>
                </div>
                <h3 className="text-3xl font-black text-white mt-2">
                  {audienceData?.onlinePresence?.onlineFree ?? (stats?.onlineFree ?? 0)}
                </h3>
                <span className="text-[10px] text-gray-400">Registered free accounts browsing</span>
              </div>

              {/* Guest / Anonymous Online */}
              <div className="bg-[#12121a] p-5 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-300 font-semibold flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-blue-400" />
                    Guest Viewers Online
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                    Ad-Supported
                  </span>
                </div>
                <h3 className="text-3xl font-black text-blue-400 mt-2">
                  {audienceData?.onlinePresence?.onlineGuests ?? (stats?.onlineGuests ?? 1)}
                </h3>
                <span className="text-[10px] text-blue-300/70">Unregistered visitors viewing site</span>
              </div>
            </div>

            {/* Membership Ratio & Distribution Card */}
            <div className="bg-[#12121a] p-6 rounded-2xl border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Platform Membership Distribution</span>
                    <span className="text-xs font-normal text-gray-400">
                      (Total {audienceData?.membership?.totalUsers ?? stats?.totalUsers ?? 0} registered users)
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Live breakdown of paying VIP subscribers vs free tier accounts across the entire platform.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-amber-500"></span>
                    <span className="text-amber-400 font-bold">
                      {audienceData?.membership?.premiumUsers ?? stats?.activePremiumSubscribers ?? 0} VIP ({audienceData?.membership?.premiumPercentage ?? '0'}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-gray-600"></span>
                    <span className="text-gray-300 font-bold">
                      {audienceData?.membership?.freeUsers ?? stats?.freeUsers ?? 0} Free ({audienceData?.membership?.freePercentage ?? '0'}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual Split Bar */}
              <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${Math.max(2, parseFloat(audienceData?.membership?.premiumPercentage || '0'))}%` }}
                  className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-500"
                  title="VIP Subscribers"
                ></div>
                <div
                  style={{ width: `${Math.max(2, parseFloat(audienceData?.membership?.freePercentage || '100'))}%` }}
                  className="bg-gradient-to-r from-gray-600 to-gray-700 h-full transition-all duration-500"
                  title="Free Users"
                ></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-gray-400 text-[11px] block">Total Registered Users</span>
                  <span className="text-lg font-black text-white">{audienceData?.membership?.totalUsers ?? stats?.totalUsers ?? 0}</span>
                </div>
                <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                  <span className="text-amber-300/80 text-[11px] block">Active VIP Subscribers</span>
                  <span className="text-lg font-black text-amber-400">
                    {audienceData?.membership?.premiumUsers ?? stats?.activePremiumSubscribers ?? 0}
                  </span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-gray-400 text-[11px] block">Free Accounts (Ad-Supported)</span>
                  <span className="text-lg font-black text-gray-200">
                    {audienceData?.membership?.freeUsers ?? stats?.freeUsers ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Real-Time Online Visitors Table */}
            <div className="bg-[#12121a] rounded-2xl border border-white/10 overflow-hidden space-y-4 p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Currently Active Visitors</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Live stream of users and visitors currently browsing pages on BlackHub.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
                  <button
                    onClick={() => setAudienceFilter('all')}
                    className={`px-3 py-1 rounded-lg cursor-pointer transition-colors ${
                      audienceFilter === 'all' ? 'bg-red-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    All ({audienceData?.onlinePresence?.totalOnline ?? 0})
                  </button>
                  <button
                    onClick={() => setAudienceFilter('premium')}
                    className={`px-3 py-1 rounded-lg cursor-pointer transition-colors ${
                      audienceFilter === 'premium' ? 'bg-amber-500 text-black font-bold' : 'text-amber-400 hover:text-amber-300'
                    }`}
                  >
                    VIP ({audienceData?.onlinePresence?.onlinePremium ?? 0})
                  </button>
                  <button
                    onClick={() => setAudienceFilter('free')}
                    className={`px-3 py-1 rounded-lg cursor-pointer transition-colors ${
                      audienceFilter === 'free' ? 'bg-white/20 text-white font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Free ({audienceData?.onlinePresence?.onlineFree ?? 0})
                  </button>
                  <button
                    onClick={() => setAudienceFilter('guest')}
                    className={`px-3 py-1 rounded-lg cursor-pointer transition-colors ${
                      audienceFilter === 'guest' ? 'bg-blue-600 text-white font-bold' : 'text-blue-400 hover:text-blue-300'
                    }`}
                  >
                    Guests ({audienceData?.onlinePresence?.onlineGuests ?? 0})
                  </button>
                </div>
              </div>

              {/* Visitors Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 bg-white/5">
                      <th className="py-3 px-4">Visitor Identity</th>
                      <th className="py-3 px-4">Membership Tier</th>
                      <th className="py-3 px-4">Active Page</th>
                      <th className="py-3 px-4">Last Ping</th>
                      <th className="py-3 px-4">Session Duration</th>
                      <th className="py-3 px-4">Device & IP</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {audienceData?.onlinePresence?.visitors
                      ?.filter((v: any) => {
                        if (audienceFilter === 'premium') return v.isPremium;
                        if (audienceFilter === 'free') return !v.isPremium && v.userId;
                        if (audienceFilter === 'guest') return !v.userId;
                        return true;
                      })
                      .map((v: any) => (
                        <tr key={v.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                              <div>
                                <span className="font-bold text-white block">{v.username}</span>
                                <span className="text-[10px] text-gray-500 font-mono">
                                  {v.userId ? `User ID #${v.userId}` : `Session: ${v.id.substring(0, 14)}...`}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {v.isPremium ? (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px] flex items-center gap-1 w-fit">
                                <Crown className="w-3 h-3 text-amber-400" /> VIP MEMBER
                              </span>
                            ) : v.userId ? (
                              <span className="px-2.5 py-1 rounded-lg bg-white/10 text-gray-300 border border-white/10 font-bold text-[10px] flex items-center gap-1 w-fit">
                                <Users className="w-3 h-3 text-gray-400" /> FREE MEMBER
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold text-[10px] flex items-center gap-1 w-fit">
                                <Globe className="w-3 h-3 text-blue-400" /> GUEST VIEWER
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-gray-300">
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-gray-300">
                              {v.currentPath || '/home'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-emerald-400 font-semibold text-[11px]">
                            {v.lastSeenSecondsAgo < 5 ? 'Just now' : `${v.lastSeenSecondsAgo}s ago`}
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-[11px]">
                            {v.sessionMinutes}m online
                          </td>
                          <td className="py-3 px-4 text-gray-400 font-mono text-[10px]">
                            <div>{v.ip || '127.0.0.1'}</div>
                            <div className="truncate max-w-[150px] text-gray-500">{v.userAgent || 'Desktop'}</div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {v.userId ? (
                              <button
                                onClick={() => {
                                  setUserSearch(v.username);
                                  setActiveTab('users');
                                }}
                                className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] cursor-pointer"
                              >
                                Manage User
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-500 italic">Anonymous</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    {(!audienceData?.onlinePresence?.visitors || audienceData.onlinePresence.visitors.length === 0) && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500 text-xs">
                          No active visitors recorded yet. Browsing activity will appear in real time.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USER MANAGEMENT (Section 11) */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-white">User Management</h1>
                <p className="text-xs text-gray-400">Manage user roles, ban/suspend accounts, grant VIP passes, revoke sessions.</p>
              </div>

              <div className="w-full sm:w-72">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user or email..."
                  className="w-full bg-[#14141e] border border-white/15 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="bg-[#12121a] rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 bg-white/5">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">VIP Expiration</th>
                      <th className="py-3 px-4">Joined</th>
                      <th className="py-3 px-4 text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5">
                        <td className="py-3 px-4">
                          <span className="font-bold text-white block">{u.username}</span>
                          <span className="text-[10px] text-gray-400">{u.email}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-[10px]">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                            u.status === 'banned'
                              ? 'bg-red-500/20 text-red-400'
                              : u.status === 'suspended'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-amber-300">
                          {u.sub_expires_at ? new Date(u.sub_expires_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-gray-400">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => setGrantModalUser(u)}
                            className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 font-semibold text-[11px] cursor-pointer"
                          >
                            Grant VIP
                          </button>

                          {u.status === 'active' ? (
                            <button
                              onClick={() => handleUserAction(u.id, 'suspend')}
                              className="px-2.5 py-1 rounded bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 text-[11px] cursor-pointer"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUserAction(u.id, 'restore')}
                              className="px-2.5 py-1 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30 text-[11px] cursor-pointer"
                            >
                              Restore
                            </button>
                          )}

                          <button
                            onClick={() => handleUserAction(u.id, 'ban')}
                            className="px-2.5 py-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 text-[11px] cursor-pointer"
                          >
                            Ban
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Complimentary Grant Modal */}
            {grantModalUser && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#14141e] border border-white/20 rounded-2xl max-w-md w-full p-6 space-y-4">
                  <h3 className="text-base font-bold text-white">Grant Complimentary VIP Membership</h3>
                  <p className="text-xs text-gray-400">
                    Granting access for <span className="text-white font-bold">{grantModalUser.username}</span>.
                  </p>

                  <form onSubmit={handleGrantMembership} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Duration</label>
                      <select
                        value={grantMonths}
                        onChange={(e) => setGrantMonths(parseInt(e.target.value))}
                        className="w-full bg-[#181824] border border-white/15 rounded-lg px-3 py-2 text-xs text-white"
                      >
                        <option value={1}>1 Month VIP</option>
                        <option value={3}>3 Months VIP</option>
                        <option value={6}>6 Months VIP</option>
                        <option value={12}>12 Months VIP</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Reason for Audit Log</label>
                      <input
                        type="text"
                        required
                        value={grantReason}
                        onChange={(e) => setGrantReason(e.target.value)}
                        placeholder="e.g. Promotional partnership, bug bounty"
                        className="w-full bg-[#181824] border border-white/15 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setGrantModalUser(null)}
                        className="px-4 py-2 bg-white/5 rounded-lg text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-amber-500 text-black font-bold rounded-lg text-xs cursor-pointer"
                      >
                        Activate Membership
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VIDEO MODERATION (Section 12) */}
        {activeTab === 'videos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-white">Video Moderation</h1>
                <p className="text-xs text-gray-400">Approve user submissions, set free/premium tier, edit or unpublish content.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Filter:</span>
                <select
                  value={videoFilter}
                  onChange={(e) => setVideoFilter(e.target.value)}
                  className="bg-[#14141e] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="all">All Videos</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="published">Published</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="bg-[#12121a] rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 bg-white/5">
                      <th className="py-3 px-4">Video Title</th>
                      <th className="py-3 px-4">Creator</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Tier</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4 text-right">Moderator Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {videosList.map((v) => (
                      <tr key={v.id} className="hover:bg-white/5">
                        <td className="py-3 px-4 max-w-xs">
                          <span className="font-bold text-white block truncate">{v.title}</span>
                          <span className="text-[10px] text-gray-400 font-mono">ID: {v.id} • {v.category_name}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-300 font-medium">{v.creator_username || 'Admin'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            v.status === 'published'
                              ? 'bg-green-500/20 text-green-400'
                              : v.status === 'pending_review'
                              ? 'bg-amber-500/20 text-amber-400 animate-pulse'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {v.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleVideoAction(v.id, 'set_access', '', v.access_level === 'free' ? 'premium' : 'free')}
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase cursor-pointer ${
                              v.access_level === 'premium'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : 'bg-white/10 text-gray-300'
                            }`}
                          >
                            {v.access_level}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-gray-400 font-mono">{Math.floor(v.duration / 60)}m {v.duration % 60}s</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {v.status !== 'published' && (
                            <button
                              onClick={() => handleVideoAction(v.id, 'approve')}
                              className="px-2.5 py-1 rounded bg-green-600 hover:bg-green-500 text-white font-bold text-[11px] cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => setRejectModalVideo(v)}
                            className="px-2.5 py-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 text-[11px] cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleVideoAction(v.id, 'delete')}
                            className="px-2 py-1 rounded bg-white/5 hover:bg-red-950/40 text-gray-400 hover:text-red-400 text-[11px] cursor-pointer"
                            title="Delete permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reject Reason Modal */}
            {rejectModalVideo && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#14141e] border border-white/20 rounded-2xl max-w-md w-full p-6 space-y-4">
                  <h3 className="text-base font-bold text-white text-red-400">Reject Video Submission</h3>
                  <p className="text-xs text-gray-400">
                    Specify the justification for rejecting "{rejectModalVideo.title}".
                  </p>
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full bg-[#181824] border border-white/15 rounded-lg p-3 text-xs text-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setRejectModalVideo(null)}
                      className="px-4 py-2 bg-white/5 rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleVideoAction(rejectModalVideo.id, 'reject', rejectReason)}
                      className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg text-xs"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ORIGINAL SOURCE FILES & RAW DOWNLOADS (Section 13) */}
        {activeTab === 'source-files' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-black text-white">Source Files & Website Export</h1>
              <p className="text-xs text-gray-400 mt-1">
                Download the complete website source code to self-host and publish anywhere (cPanel, VPS, Docker, Vercel, Netlify), or download original raw video files.
              </p>
            </div>

            {downloadMsg && (
              <div className="p-3 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl text-xs flex items-center gap-2">
                <Download className="w-4 h-4" />
                <span>{downloadMsg}</span>
              </div>
            )}

            {/* Top Cards: Website Publishing Packages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Full-Stack Source Code Package */}
              <div className="bg-[#12121a] p-6 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4 hover:border-red-500/40 transition-colors">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">Complete Website Source Code (.zip)</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Full production-ready codebase including React components, Express API backend, TypeScript definitions, database schemas, Dockerfile, docker-compose.yml, and deployment guide.
                  </p>
                  <div className="text-[11px] text-gray-500 font-mono space-y-0.5 pt-1">
                    <p>• Ready for: Ubuntu/Debian VPS, Docker, DigitalOcean, AWS, Linode</p>
                    <p>• One-command launch: <code className="text-gray-300 font-bold">npm install && npm start</code></p>
                  </div>
                </div>

                <a
                  href={`/api/admin/website-package/download?type=full_source&token=${getStoredToken()}`}
                  download="blackhub-website-complete-source.zip"
                  onClick={() => setDownloadMsg('Packaging complete website source code into ZIP...')}
                  className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer text-center"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Complete Website Source (.zip)</span>
                </a>
              </div>

              {/* Card 2: Static Production Dist Package */}
              <div className="bg-[#12121a] p-6 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-colors">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">Production Frontend Build (.zip)</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Pre-compiled, minified static HTML, CSS, and JS bundle from <code className="text-white font-mono">dist/</code>. Perfect for drop-in publishing to any static web hosting or CDN.
                  </p>
                  <div className="text-[11px] text-gray-500 font-mono space-y-0.5 pt-1">
                    <p>• Ready for: cPanel public_html, Vercel, Netlify, Cloudflare Pages, Apache, Nginx</p>
                    <p>• Instant deployment without requiring Node.js build step</p>
                  </div>
                </div>

                <a
                  href={`/api/admin/website-package/download?type=static_dist&token=${getStoredToken()}`}
                  download="blackhub-frontend-dist.zip"
                  onClick={() => setDownloadMsg('Packaging production dist build into ZIP...')}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer text-center"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Production Build (.zip)</span>
                </a>
              </div>
            </div>

            {/* Deployment Quick Guide Banner */}
            <div className="bg-[#101018] border border-white/10 rounded-2xl p-5 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">Publishing Quick Guide</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                To host on any Linux server: unzip the downloaded package, run <code className="text-amber-400 font-mono">npm install</code>, then <code className="text-amber-400 font-mono">npm start</code>. To run with Docker, execute <code className="text-amber-400 font-mono">docker-compose up -d</code>. Review <code className="text-white font-mono font-semibold">DEPLOYMENT_GUIDE.md</code> included inside the package for full instructions.
              </p>
            </div>

            {/* Video Raw Source Files Table */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-gray-400">
                Uploaded Video Master Files
              </h3>

              <div className="bg-[#12121a] rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 bg-white/5 font-sans">
                        <th className="py-3 px-4">Original Filename</th>
                        <th className="py-3 px-4">Associated Video</th>
                        <th className="py-3 px-4">Format</th>
                        <th className="py-3 px-4">File Size</th>
                        <th className="py-3 px-4">SHA-256 Checksum</th>
                        <th className="py-3 px-4 text-right">Download</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[11px]">
                      {sourceFiles.map((sf) => (
                        <tr key={sf.id} className="hover:bg-white/5">
                          <td className="py-3 px-4 text-white font-bold">{sf.original_filename}</td>
                          <td className="py-3 px-4 font-sans text-gray-300 truncate max-w-xs">{sf.video_title}</td>
                          <td className="py-3 px-4 uppercase text-gray-400">{sf.file_format}</td>
                          <td className="py-3 px-4 text-gray-300">{(sf.file_size / (1024 * 1024)).toFixed(1)} MB</td>
                          <td className="py-3 px-4 text-gray-400 truncate max-w-[140px]" title={sf.checksum_sha256}>
                            {sf.checksum_sha256.substring(0, 16)}...
                          </td>
                          <td className="py-3 px-4 text-right font-sans">
                            <button
                              onClick={() => handleDownloadSourceFile(sf.id, sf.original_filename)}
                              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 ml-auto cursor-pointer shadow-md"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download Raw</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MEMBERSHIP PLANS CONFIGURATION (Section 5 & 20) */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-white">Membership Plans Pricing</h1>
              <p className="text-xs text-gray-400 mt-1">
                Configure prices and durations for the four platform subscription tiers. Not hardcoded in frontend.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((p) => (
                <div key={p.id} className="bg-[#12121a] p-6 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-white">{p.name}</h3>
                    <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                      {p.duration_months} mo
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-gray-400 mb-1">Price (USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={p.price_usd}
                        onBlur={async (e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            await apiRequest(`/api/admin/plans/${p.id}`, {
                              method: 'PUT',
                              body: JSON.stringify({ priceUsd: val, priceCrypto: val })
                            });
                          }
                        }}
                        className="w-full bg-[#181824] border border-white/15 rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1">Price (USDT Crypto)</label>
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={p.price_crypto}
                        onBlur={async (e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            await apiRequest(`/api/admin/plans/${p.id}`, {
                              method: 'PUT',
                              body: JSON.stringify({ priceCrypto: val })
                            });
                          }
                        }}
                        className="w-full bg-[#181824] border border-white/15 rounded-lg px-3 py-2 text-amber-400 font-mono"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400">Edits are saved directly to the database.</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: CRYPTO PAYMENT SETTINGS (Section 15) */}
        {activeTab === 'crypto' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h1 className="text-2xl font-black text-white">Cryptocurrency Gateway Settings</h1>
              <p className="text-xs text-gray-400 mt-1">
                Configure wallet addresses, blockchain networks, and verification parameters. Re-authentication password strictly required before updating.
              </p>
            </div>

            {cryptoSaveMsg && (
              <div className="p-3 bg-green-500/20 border border-green-500/30 text-green-300 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{cryptoSaveMsg}</span>
              </div>
            )}

            {cryptoSaveError && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{cryptoSaveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCryptoSettings} className="bg-[#12121a] p-6 sm:p-8 rounded-2xl border border-white/10 space-y-5 text-xs">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">Receiving Wallet Address *</label>
                <input
                  type="text"
                  required
                  value={cryptoSettings.receivingAddress}
                  onChange={(e) => setCryptoSettings({ ...cryptoSettings, receivingAddress: e.target.value })}
                  placeholder="e.g. TYDzpSLJgQW72m2a4x1G8bN5qVzXw9K3Rp"
                  className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Primary Asset</label>
                  <input
                    type="text"
                    value={cryptoSettings.assetSymbol}
                    onChange={(e) => setCryptoSettings({ ...cryptoSettings, assetSymbol: e.target.value })}
                    className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Network</label>
                  <input
                    type="text"
                    value={cryptoSettings.network}
                    onChange={(e) => setCryptoSettings({ ...cryptoSettings, network: e.target.value })}
                    className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Verification Mode</label>
                  <select
                    value={cryptoSettings.verificationMode}
                    onChange={(e) => setCryptoSettings({ ...cryptoSettings, verificationMode: e.target.value })}
                    className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white"
                  >
                    <option value="auto">Automatic (Blockchain API)</option>
                    <option value="manual">Manual Operations Review</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Required Confirmations</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={cryptoSettings.requiredConfirmations}
                    onChange={(e) => setCryptoSettings({ ...cryptoSettings, requiredConfirmations: parseInt(e.target.value) })}
                    className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Password Gate (Section 15) */}
              <div className="pt-4 border-t border-white/10 space-y-2">
                <label className="block font-bold text-amber-400">
                  Confirm Administrator Password (Required to Modify Receiving Address) *
                </label>
                <input
                  type="password"
                  required
                  value={adminPasswordConfirm}
                  onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                  placeholder="Enter current master admin password"
                  className="w-full bg-[#181824] border border-amber-500/30 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
              >
                Save Crypto Settings
              </button>
            </form>
          </div>
        )}

        {/* TAB 7: PAYMENT VERIFICATION QUEUE (Section 18 & 20) */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-white">Payment Orders & Verification</h1>
              <p className="text-xs text-gray-400 mt-1">
                Review submitted blockchain transaction hashes, verify amounts, and approve or reject subscriptions.
              </p>
            </div>

            <div className="bg-[#12121a] rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 bg-white/5 font-sans">
                      <th className="py-3 px-4">Order Ref</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Network</th>
                      <th className="py-3 px-4">Transaction Hash</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right font-sans">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-[11px]">
                    {paymentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-white/5">
                        <td className="py-3 px-4 text-white font-bold">{o.order_reference}</td>
                        <td className="py-3 px-4 font-sans text-gray-300">
                          {o.username} <span className="text-[10px] text-gray-400">({o.email})</span>
                        </td>
                        <td className="py-3 px-4 text-amber-400 font-bold">{o.amount_crypto} {o.asset_symbol}</td>
                        <td className="py-3 px-4 text-gray-300">{o.network}</td>
                        <td className="py-3 px-4 text-gray-400 truncate max-w-xs" title={o.transaction_hash}>
                          {o.transaction_hash || 'No hash submitted'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            o.status === 'confirmed'
                              ? 'bg-green-500/20 text-green-400'
                              : o.status === 'under_verification'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-sans space-x-1.5">
                          {o.status !== 'confirmed' && (
                            <button
                              onClick={() => handleVerifyPayment(o.id, 'approve')}
                              className="px-2.5 py-1 rounded bg-green-600 hover:bg-green-500 text-white font-bold text-[10px] cursor-pointer"
                            >
                              Approve & Activate
                            </button>
                          )}
                          {o.status !== 'rejected' && o.status !== 'confirmed' && (
                            <button
                              onClick={() => handleVerifyPayment(o.id, 'reject', 'Transaction not found on chain')}
                              className="px-2.5 py-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 text-[10px] cursor-pointer"
                            >
                              Reject
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: ADMIN SECURITY & RECOVERY (Section 9) */}
        {activeTab === 'security' && (
          <div className="space-y-8 max-w-3xl">
            <div>
              <h1 className="text-2xl font-black text-white">Administrator Security & Recovery</h1>
              <p className="text-xs text-gray-400 mt-1">
                Section 9: Manage recovery email address, verify tokens, review audit logs, and revoke all active operator sessions.
              </p>
            </div>

            {recoveryMsg && (
              <div className="p-3 bg-green-500/20 border border-green-500/30 text-green-300 rounded-xl text-xs">
                {recoveryMsg}
              </div>
            )}

            {/* Recovery Email Setup */}
            <div className="bg-[#12121a] p-6 rounded-2xl border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white">Verified Recovery Email Address</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                A verified recovery email allows secure emergency password restoration via short-lived single-use tokens.
              </p>
              <div className="flex gap-2 text-xs">
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="security@blackhub.internal"
                  className="flex-1 bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-white"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const pw = prompt('Confirm administrator password:');
                    if (pw) {
                      const res = await apiRequest('/api/admin/security/recovery-email', {
                        method: 'POST',
                        body: JSON.stringify({ recoveryEmail, adminPassword: pw })
                      });
                      setRecoveryMsg(res.message);
                    }
                  }}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save & Send Token
                </button>
              </div>

              <div className="flex gap-2 text-xs pt-2">
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  placeholder="Enter 6-digit verification code"
                  className="w-60 bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-white font-mono uppercase"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await apiRequest('/api/admin/security/verify-recovery-email', {
                      method: 'POST',
                      body: JSON.stringify({ code: recoveryCode })
                    });
                    setRecoveryMsg('Recovery email verified successfully!');
                  }}
                  className="px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Verify Code
                </button>
              </div>
            </div>

            {/* Revoke Sessions */}
            <div className="bg-[#12121a] p-6 rounded-2xl border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-white">Revoke Administrator Sessions</h3>
              <p className="text-xs text-gray-400">
                Immediately sign out all other devices and browser sessions logged into this administrator account.
              </p>
              <button
                onClick={async () => {
                  await apiRequest('/api/admin/security/revoke-other-sessions', { method: 'POST' });
                  alert('All other administrator sessions have been revoked.');
                }}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl text-xs font-bold text-white cursor-pointer"
              >
                Sign Out Other Devices
              </button>
            </div>
          </div>
        )}

        {/* TAB 9: AUTOMATED ACCEPTANCE TESTS (Section 26) */}
        {activeTab === 'tests' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-white">System Acceptance Verification</h1>
                <p className="text-xs text-gray-400 mt-1">
                  Section 26: Live automated test runner verifying all 16 specification criteria against the backend engine.
                </p>
              </div>

              <button
                onClick={handleRunAcceptanceTests}
                disabled={testsRunning}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {testsRunning ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <FileCheck2 className="w-4 h-4" />
                )}
                <span>Run 16 Acceptance Tests</span>
              </button>
            </div>

            {testsStatus && (
              <div className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between ${
                testsStatus === 'ALL_TESTS_PASSED'
                  ? 'bg-green-500/20 border-green-500/40 text-green-300'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              }`}>
                <span>Status: {testsStatus}</span>
                {testResults.length > 0 && (
                  <span>
                    Passed: {testResults.filter(r => r.passed).length} / {testResults.length}
                  </span>
                )}
              </div>
            )}

            <div className="space-y-3">
              {testResults.map((t) => (
                <div
                  key={t.testNumber}
                  className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-all ${
                    t.passed
                      ? 'bg-[#121614] border-green-500/30 text-gray-200'
                      : 'bg-[#1a1214] border-red-500/40 text-gray-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-400">#{t.testNumber}</span>
                      <h4 className="text-xs font-bold text-white">{t.name}</h4>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono leading-relaxed">{t.message}</p>
                  </div>

                  <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider shrink-0 ${
                    t.passed ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {t.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
