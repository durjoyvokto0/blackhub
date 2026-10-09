import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiRequest } from '../lib/api.ts';
import { User, Lock, Trash2, CheckCircle2, ShieldAlert } from 'lucide-react';

interface AccountSettingsPageProps {
  onNavigate: (page: string, params?: any) => void;
}

export const AccountSettingsPage: React.FC<AccountSettingsPageProps> = ({ onNavigate }) => {
  const { user, updateUser, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profileMsg, setProfileMsg] = useState('');

  // Change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Deletion
  const [confirmDeletePassword, setConfirmDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProfileMsg('');
      await apiRequest('/api/auth/settings', {
        method: 'PUT',
        body: JSON.stringify({ displayName, bio })
      });
      updateUser({ displayName, bio });
      setProfileMsg('Profile updated successfully.');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (e: any) {
      setProfileMsg(e.message || 'Update failed.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setChangingPassword(true);
      setPasswordMsg('');
      setPasswordError('');
      await apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setPasswordMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Password update failed.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setDeleteError('');
      await apiRequest('/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ confirmPassword: confirmDeletePassword })
      });
      await logout();
      onNavigate('home');
    } catch (err: any) {
      setDeleteError(err.message || 'Account deletion failed.');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0e] flex items-center justify-center p-6 text-white text-center">
        <div>
          <h2 className="text-xl font-bold mb-2">Please Sign In</h2>
          <button onClick={() => onNavigate('login')} className="px-6 py-2.5 bg-red-600 rounded-xl text-xs font-bold hover:bg-red-500 cursor-pointer">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Account Settings</h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage your personal profile, credentials, and account preferences.
          </p>
        </div>

        {/* 1. Profile Information */}
        <div className="bg-[#12121a] p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/10 pb-4">
            <User className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold text-white">Profile Information</h2>
          </div>

          {profileMsg && (
            <div className="p-3 bg-green-500/20 border border-green-500/30 text-green-300 rounded-xl text-xs">
              {profileMsg}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Username (Immutable)</label>
                <input
                  type="text"
                  disabled
                  value={user.username}
                  className="w-full bg-[#161622] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Public Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Channel Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell viewers about your interests..."
                className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Save Profile
            </button>
          </form>
        </div>

        {/* 2. Change Password */}
        <div className="bg-[#12121a] p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/10 pb-4">
            <Lock className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-white">Security & Password</h2>
          </div>

          {passwordMsg && <p className="text-xs text-green-400">{passwordMsg}</p>}
          {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">New Password (min 8 chars)</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold border border-white/15 transition-all cursor-pointer"
            >
              {changingPassword ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* 3. Account Deletion Request (Section 3) */}
        {user.role !== 'Administrator' && (
          <div className="bg-red-950/20 border border-red-900/30 p-6 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-red-500">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Delete Account</h3>
            </div>
            <p className="text-xs text-gray-400">
              Permanently delete your profile, watch history, and account data in compliance with privacy retention laws.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Request Account Deletion
            </button>
          </div>
        )}
      </div>

      {/* Account Deletion Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14141e] border border-white/20 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white text-red-400">Confirm Account Deletion</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              This action is permanent and irreversible. Please enter your account password to confirm deletion.
            </p>

            {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <input
                type="password"
                required
                value={confirmDeletePassword}
                onChange={(e) => setConfirmDeletePassword(e.target.value)}
                placeholder="Enter your account password"
                className="w-full bg-[#1a1a26] border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white cursor-pointer"
                >
                  Confirm & Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
