import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiRequest } from '../lib/api.ts';
import { ShieldAlert, Lock, User, CheckCircle2, ArrowRight } from 'lucide-react';

interface AdminLoginPageProps {
  onNavigate: (page: string, params?: any) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('black999'); // Requested default initial admin username
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forced password change modal state
  const [showForceChangeModal, setShowForceChangeModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState(false);
  const [changing, setChanging] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const data = await apiRequest<{ sessionToken: string; user: any }>('/api/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password })
      });

      login(data.sessionToken, data.user);

      // Section 8: Force password change on first login
      if (data.user.forcePasswordChange) {
        setShowForceChangeModal(true);
      } else {
        onNavigate('admin-dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Administrator authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForcePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setChangeError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setChangeError('Password confirmation does not match.');
      return;
    }

    try {
      setChanging(true);
      setChangeError('');
      await apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          newPassword
        })
      });
      setChangeSuccess(true);
      setTimeout(() => {
        setShowForceChangeModal(false);
        onNavigate('admin-dashboard');
      }, 1500);
    } catch (err: any) {
      setChangeError(err.message || 'Password update failed.');
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-[#101018] border border-red-900/40 rounded-2xl p-8 space-y-6 shadow-2xl shadow-red-950/20">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-black border border-red-500/40 flex items-center justify-center mx-auto shadow-xl shadow-red-600/30">
            <ShieldAlert className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Administrator Gateway
          </h1>
          <p className="text-xs text-gray-400">
            Authorized operations only. IP address and access credentials are authenticated and logged.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Admin Username</label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="black999"
                className="w-full bg-[#161622] border border-white/15 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Master Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Vokda@@99"
                className="w-full bg-[#161622] border border-white/15 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500 font-mono"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <p className="text-[11px] text-gray-400 mt-1 font-mono">
              Default password: <span className="text-red-400 font-bold">Vokda@@99</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/40 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>Authenticate to Dashboard</span>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-white/5">
          <button
            onClick={() => onNavigate('home')}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
          >
            ← Return to Public Website
          </button>
        </div>
      </div>

      {/* Forced Password Change Modal on First Login (Section 8) */}
      {showForceChangeModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#14141e] border-2 border-red-500/50 rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="text-center space-y-1">
              <span className="px-2.5 py-0.5 rounded bg-red-600/20 text-red-400 font-bold text-[10px] uppercase tracking-wider border border-red-600/30">
                Security Requirement
              </span>
              <h2 className="text-xl font-bold text-white pt-1">First-Time Password Change Required</h2>
              <p className="text-xs text-gray-400">
                In compliance with Section 8 security specifications, the provisioned initial administrator password must be updated immediately upon first login.
              </p>
            </div>

            {changeSuccess ? (
              <div className="p-4 rounded-xl bg-green-500/20 border border-green-500/40 text-green-300 text-xs text-center font-semibold">
                New password set successfully! Transitioning to dashboard...
              </div>
            ) : (
              <form onSubmit={handleForcePasswordChange} className="space-y-4">
                {changeError && <p className="text-xs text-red-400">{changeError}</p>}

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">New Secure Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={changing}
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                >
                  {changing ? 'Securing Account...' : 'Set New Master Password & Proceed'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
