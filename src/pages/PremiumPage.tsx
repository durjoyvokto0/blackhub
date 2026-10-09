import React, { useState, useEffect } from 'react';
import { MembershipPlan } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Crown,
  Check,
  X,
  Shield,
  Zap,
  Sparkles,
  Lock,
  Bitcoin,
  Coins,
  ArrowRight
} from 'lucide-react';

interface PremiumPageProps {
  onNavigate: (page: string, params?: any) => void;
}

export const PremiumPage: React.FC<PremiumPageProps> = ({ onNavigate }) => {
  const { user, isPremium } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    apiRequest<{ plans: MembershipPlan[] }>('/api/memberships/plans')
      .then((data) => {
        if (data?.plans) setPlans(data.plans);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = (plan: MembershipPlan) => {
    if (!user) {
      onNavigate('login', { redirect: 'checkout', planId: plan.id });
    } else {
      onNavigate('checkout', { planId: plan.id });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black tracking-widest uppercase">
            <Crown className="w-3.5 h-3.5 fill-amber-400" />
            <span>BlackHub VIP Pass</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Elevate Your Streaming Experience
          </h1>

          <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
            Unlock exclusive 4K master cinematic releases, completely remove all video advertisements, and stream with unrestricted bandwidth. Powered exclusively by secure cryptocurrency payments.
          </p>

          {isPremium && (
            <div className="p-4 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold inline-block">
              You are currently an active VIP member. Subscription expires: {user?.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toLocaleDateString() : 'Active'}
            </div>
          )}
        </div>

        {/* 4 Configurable Membership Plans Grid (Section 5) */}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-white">Choose Your Plan</h2>
            <p className="text-xs text-gray-400 mt-1">
              Select your membership duration: 1 Month, 3 Months, 6 Months, or 12 Months VIP Access.
            </p>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => {
                const isBestValue = plan.duration_months === 12;
                const isPopular = plan.duration_months === 3;

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 ${
                      isBestValue
                        ? 'bg-gradient-to-b from-[#221815] to-[#12121a] border-2 border-amber-500/70 shadow-2xl shadow-amber-500/10'
                        : isPopular
                        ? 'bg-gradient-to-b from-[#1c1420] to-[#12121a] border-2 border-red-600/60 shadow-xl shadow-red-600/10'
                        : 'bg-[#12121a] border border-white/10 hover:border-white/20'
                    }`}
                  >
                    {isBestValue && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-red-600 text-[10px] font-black uppercase text-black tracking-wider shadow">
                        Best Value (33% Off)
                      </span>
                    )}

                    {isPopular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-red-600 text-[10px] font-black uppercase text-white tracking-wider shadow">
                        Most Popular
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg text-white">{plan.name}</h3>
                        <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                          {plan.duration_months} {plan.duration_months === 1 ? 'Month' : 'Months'}
                        </span>
                      </div>

                      {/* Pricing */}
                      <div className="mt-4 mb-6">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl sm:text-4xl font-black text-white">
                            ${plan.price_usd}
                          </span>
                          <span className="text-xs text-gray-400">USD</span>
                        </div>
                        <div className="text-[11px] text-amber-400 font-mono mt-0.5 flex items-center gap-1">
                          <Coins className="w-3 h-3" />
                          <span>{plan.price_crypto} {plan.crypto_symbol}</span>
                        </div>
                      </div>

                      {/* Features List */}
                      <ul className="space-y-2.5 text-xs text-gray-300">
                        {plan.features?.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10">
                      <button
                        onClick={() => handleSubscribe(plan)}
                        className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          isBestValue
                            ? 'bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-black font-black'
                            : 'bg-red-600 hover:bg-red-500 text-white'
                        }`}
                      >
                        <Crown className="w-4 h-4" />
                        <span>Subscribe with Crypto</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Free vs Premium Comparison Table */}
        <div className="bg-[#12121a] rounded-2xl border border-white/10 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white mb-6 text-center">
            Free vs Premium Membership Comparison
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="py-3 px-4 font-semibold">Features & Privileges</th>
                  <th className="py-3 px-4 font-semibold text-center">Free Membership</th>
                  <th className="py-3 px-4 font-semibold text-center text-amber-400">VIP Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-3 px-4 text-gray-300 font-medium">Standard Free Video Streaming</td>
                  <td className="py-3 px-4 text-center text-green-400"><Check className="w-4 h-4 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-green-400"><Check className="w-4 h-4 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-300 font-medium">100% Ad-Free Browsing (No Banners/Popups)</td>
                  <td className="py-3 px-4 text-center text-gray-400"><X className="w-4 h-4 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-green-400"><Check className="w-4 h-4 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-300 font-medium">Zero Video Pre-Roll / Mid-Roll Ads</td>
                  <td className="py-3 px-4 text-center text-gray-400"><X className="w-4 h-4 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-green-400"><Check className="w-4 h-4 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-300 font-medium">Exclusive 4K Ultra HD & Cinema Releases</td>
                  <td className="py-3 px-4 text-center text-gray-400"><X className="w-4 h-4 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-green-400"><Check className="w-4 h-4 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-300 font-medium">Original Raw Source File Downloads</td>
                  <td className="py-3 px-4 text-center text-gray-400"><X className="w-4 h-4 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-green-400"><Check className="w-4 h-4 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-300 font-medium">Payment Privacy (Crypto-Only, No KYC)</td>
                  <td className="py-3 px-4 text-center text-green-400"><Check className="w-4 h-4 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-green-400"><Check className="w-4 h-4 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-300 font-medium">Priority CDN Bandwidth</td>
                  <td className="py-3 px-4 text-center text-gray-400">Standard</td>
                  <td className="py-3 px-4 text-center text-amber-400 font-bold">Uncapped Ultra</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Why Cryptocurrency Only Callout (Section 14) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#12121a] p-6 rounded-2xl border border-white/10 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Bitcoin className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Zero Third-Party Processors</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              We never collect credit cards, billing addresses, or bank details. Transactions settle directly on verified blockchain networks.
            </p>
          </div>

          <div className="bg-[#12121a] p-6 rounded-2xl border border-white/10 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-red-600/15 text-red-500 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Full Financial Privacy</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Pay anonymously using USDT (TRC20/ERC20), Bitcoin, Ethereum, or Litecoin. No monthly recurring surprises—only prepaid terms.
            </p>
          </div>

          <div className="bg-[#12121a] p-6 rounded-2xl border border-white/10 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Rapid Network Activation</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Once you broadcast your transaction and provide the hash, our verification engine activates your membership in seconds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
