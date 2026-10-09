import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiRequest } from '../lib/api.ts';
import { Film, Lock, Mail, User, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

interface AuthPageProps {
  onNavigate: (page: string, params?: any) => void;
  redirect?: string;
  planId?: number;
}

// 1. Login Page
export const LoginPage: React.FC<AuthPageProps> = ({ onNavigate, redirect, planId }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;

    try {
      setLoading(true);
      setError('');
      const data = await apiRequest<{ sessionToken: string; user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          login: identifier.trim(),
          password
        })
      });

      login(data.sessionToken, data.user);

      if (data.user.forcePasswordChange) {
        onNavigate('change-password-forced');
      } else if (redirect === 'checkout' && planId) {
        onNavigate('checkout', { planId });
      } else {
        onNavigate('home');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-[#12121a] border border-white/10 rounded-2xl p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center mx-auto shadow-lg shadow-red-600/30">
            <Film className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Sign In to BlackHub</h1>
          <p className="text-xs text-gray-400">Access your personalized feed, watch history, and VIP streams.</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Username or Email</label>
            <div className="relative">
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="your_username or email"
                className="w-full bg-[#181824] border border-white/15 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-300">Password</label>
              <button
                type="button"
                onClick={() => onNavigate('forgot-password')}
                className="text-[11px] text-gray-400 hover:text-white transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#181824] border border-white/15 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-white/10 text-xs text-gray-400">
          Don't have an account?{' '}
          <button
            onClick={() => onNavigate('register')}
            className="text-red-400 hover:text-red-300 font-bold ml-1 cursor-pointer"
          >
            Create free account
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. Registration Page
export const RegisterPage: React.FC<AuthPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ageConfirmed) {
      setError('You must confirm that you are at least 18 years of age.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await apiRequest<{ sessionToken: string; user: any; verificationCode: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password
        })
      });

      login(data.sessionToken, data.user);
      onNavigate('verify-email', { initialCode: data.verificationCode });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-[#12121a] border border-white/10 rounded-2xl p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center mx-auto shadow-lg shadow-red-600/30">
            <Film className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Join BlackHub</h1>
          <p className="text-xs text-gray-400">Free registration. Upgrade to Premium anytime with cryptocurrency.</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Unique Username</label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. shadow_rider"
                className="w-full bg-[#181824] border border-white/15 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-[#181824] border border-white/15 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Password (min. 8 characters)</label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#181824] border border-white/15 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* 18+ and Terms confirmation */}
          <div className="space-y-2 pt-1 text-xs text-gray-400">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-white/20 text-red-600 focus:ring-0"
              />
              <span>
                I confirm that I am at least 18 years old and agree to the{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('terms')}
                  className="text-red-400 underline hover:text-white"
                >
                  Terms of Service
                </button>{' '}
                and Privacy Policy.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-white/10 text-xs text-gray-400">
          Already registered?{' '}
          <button
            onClick={() => onNavigate('login')}
            className="text-red-400 hover:text-red-300 font-bold ml-1 cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

// 3. Email Verification Page
export const EmailVerificationPage: React.FC<{ initialCode?: string; onNavigate: (page: string) => void }> = ({
  initialCode,
  onNavigate
}) => {
  const { user, refreshUser } = useAuth();
  const [code, setCode] = useState(initialCode || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    try {
      setLoading(true);
      setError('');
      await apiRequest('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() })
      });
      setSuccess(true);
      await refreshUser();
      setTimeout(() => onNavigate('home'), 1500);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Invalid code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-[#12121a] border border-white/10 rounded-2xl p-8 space-y-6 text-center shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto">
          <Mail className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Verify Your Email</h1>
          <p className="text-xs text-gray-400 mt-1">
            Enter the 6-character verification code associated with your account.
          </p>
        </div>

        {initialCode && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
            Simulation Code: <span className="font-mono font-bold">{initialCode}</span>
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}
        {success && (
          <div className="p-3 bg-green-500/20 border border-green-500/40 text-green-300 rounded-xl text-xs flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Email verified successfully! Redirecting...</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="text"
            required
            maxLength={10}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="6-DIGIT CODE"
            className="w-full text-center tracking-widest font-mono text-base bg-[#181824] border border-white/15 rounded-xl py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 uppercase"
          />

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Verifying...' : 'Confirm Verification'}
          </button>
        </form>

        <button
          onClick={() => onNavigate('home')}
          className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

// 4. Password Recovery Page
export const PasswordRecoveryPage: React.FC<AuthPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const data = await apiRequest<{ message: string; resetToken?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() })
      });
      setMessage(data.message);
      if (data.resetToken) {
        setToken(data.resetToken);
        setStep('reset');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const data = await apiRequest<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword })
      });
      setMessage(data.message);
      setTimeout(() => onNavigate('login'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-[#12121a] border border-white/10 rounded-2xl p-8 space-y-6 text-center shadow-2xl">
        <h1 className="text-2xl font-black text-white">Password Recovery</h1>
        <p className="text-xs text-gray-400">
          Reset your credentials securely via email verification token.
        </p>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {message && <p className="text-xs text-green-400">{message}</p>}

        {step === 'request' ? (
          <form onSubmit={handleRequestToken} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your account email"
              className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            >
              Generate Reset Token
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Reset Token"
              className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-red-500"
            />
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Password (min 8 chars)"
              className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            >
              Update Password
            </button>
          </form>
        )}

        <button
          onClick={() => onNavigate('login')}
          className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};
