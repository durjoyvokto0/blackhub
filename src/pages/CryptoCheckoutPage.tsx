import React, { useState, useEffect } from 'react';
import { MembershipPlan, PaymentOrder } from '../types/index.ts';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Crown,
  Copy,
  Check,
  Clock,
  AlertTriangle,
  QrCode,
  Send,
  ArrowRight,
  ShieldAlert,
  Coins,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface CryptoCheckoutPageProps {
  planId?: number;
  onNavigate: (page: string, params?: any) => void;
}

export const CryptoCheckoutPage: React.FC<CryptoCheckoutPageProps> = ({ planId = 1, onNavigate }) => {
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number>(planId);
  const [selectedAsset, setSelectedAsset] = useState<string>('USDT');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('TRC20');
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [orderCreating, setOrderCreating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Tx Hash submission
  const [txHash, setTxHash] = useState<string>('');
  const [isSubmittingTx, setIsSubmittingTx] = useState<boolean>(false);
  const [txSuccessMessage, setTxSuccessMessage] = useState<string>('');
  const [txErrorMessage, setTxErrorMessage] = useState<string>('');

  useEffect(() => {
    // If not logged in, redirect to login
    if (!user) {
      onNavigate('login');
      return;
    }

    // Load plans
    apiRequest<{ plans: MembershipPlan[] }>('/api/memberships/plans')
      .then((data) => {
        if (data?.plans) {
          setPlans(data.plans);
          // If planId specified, select it
          if (planId) setSelectedPlanId(planId);
        }
      })
      .finally(() => setLoading(false));
  }, [user, planId]);

  // Generate order when plan and currency are confirmed
  const handleCreateOrder = async (targetPlanId: number, asset: string, network: string) => {
    try {
      setOrderCreating(true);
      setTxErrorMessage('');
      setTxSuccessMessage('');
      const res = await apiRequest<{ order: PaymentOrder }>('/api/memberships/orders/create', {
        method: 'POST',
        body: JSON.stringify({
          planId: targetPlanId,
          assetSymbol: asset,
          network: network
        })
      });

      if (res?.order) {
        setOrder(res.order);
      }
    } catch (err: any) {
      setTxErrorMessage(err.message || 'Failed to initialize payment order.');
    } finally {
      setOrderCreating(false);
    }
  };

  useEffect(() => {
    if (plans.length > 0 && selectedPlanId) {
      handleCreateOrder(selectedPlanId, selectedAsset, selectedNetwork);
    }
  }, [plans, selectedPlanId, selectedAsset, selectedNetwork]);

  const handleCopyAddress = () => {
    if (order?.receivingAddress) {
      navigator.clipboard.writeText(order.receivingAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmitTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !txHash.trim()) return;

    try {
      setIsSubmittingTx(true);
      setTxErrorMessage('');
      setTxSuccessMessage('');

      const res = await apiRequest<{ message: string; status: string; subscriptionActivated: boolean }>(
        `/api/memberships/orders/${order.id}/submit-tx`,
        {
          method: 'POST',
          body: JSON.stringify({
            transactionHash: txHash.trim()
          })
        }
      );

      setTxSuccessMessage(res.message);
      setOrder({ ...order, status: res.status as any, transactionHash: txHash.trim() });

      if (res.subscriptionActivated) {
        await refreshUser();
      }
    } catch (err: any) {
      setTxErrorMessage(err.message || 'Failed to verify transaction hash.');
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0e] flex items-center justify-center text-gray-400">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/20 text-red-400 text-xs font-bold uppercase tracking-wider">
            <Coins className="w-3.5 h-3.5" />
            <span>Cryptocurrency Gateway</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            VIP Membership Checkout
          </h1>
          <p className="text-xs text-gray-400 max-w-lg mx-auto">
            Decentralized, privacy-focused settlement. Send the exact cryptocurrency amount to activate instant 4K streaming.
          </p>
        </div>

        {/* Card Payments Disabled Notice (Section 14) */}
        <div className="bg-[#14141e] border border-white/10 rounded-xl p-4 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Card payments are disabled for this release. Cryptocurrency is strictly the only supported method.</span>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10">
            Crypto Only
          </span>
        </div>

        {/* Step 1: Select Plan & Cryptocurrency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan Summary Selection */}
          <div className="bg-[#12121a] p-5 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>1. Selected Plan</span>
            </h3>

            <div className="space-y-2">
              {plans.map((p) => (
                <label
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedPlanId === p.id
                      ? 'bg-red-950/30 border-red-500 text-white'
                      : 'bg-[#161622] border-white/10 text-gray-300 hover:border-white/20'
                  }`}
                >
                  <div>
                    <span className="font-bold text-sm block">{p.name}</span>
                    <span className="text-xs text-gray-400">{p.duration_months} Month Duration</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm block">${p.price_usd}</span>
                    <span className="text-[10px] text-amber-400 font-mono">{p.price_crypto} USDT</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Crypto Asset Selector */}
          <div className="bg-[#12121a] p-5 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Coins className="w-4 h-4 text-red-500" />
              <span>2. Choose Cryptocurrency</span>
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { asset: 'USDT', net: 'TRC20', name: 'USDT (TRC20)', rec: true },
                { asset: 'USDT', net: 'ERC20', name: 'USDT (ERC20)', rec: false },
                { asset: 'BTC', net: 'Bitcoin', name: 'Bitcoin (BTC)', rec: false },
                { asset: 'ETH', net: 'Ethereum', name: 'Ethereum (ETH)', rec: false },
                { asset: 'LTC', net: 'Litecoin', name: 'Litecoin (LTC)', rec: false }
              ].map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setSelectedAsset(c.asset); setSelectedNetwork(c.net); }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedAsset === c.asset && selectedNetwork === c.net
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                      : 'bg-[#161622] border-white/10 text-gray-300 hover:border-white/20'
                  }`}
                >
                  <span className="font-bold text-xs block">{c.name}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{c.net}</span>
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Always transfer using the correct blockchain network. Transactions sent on mismatched chains cannot be recovered.
              </span>
            </div>
          </div>
        </div>

        {/* Step 2: Payment Details & QR Code (Section 16 & 17) */}
        {orderCreating ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : order ? (
          <div className="bg-[#12121a] p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-white/10 gap-2">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-mono">Order Reference</span>
                <h3 className="text-xl font-mono font-black text-white">{order.orderReference}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  order.status === 'confirmed'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                    : order.status === 'under_verification'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}>
                  Status: {order.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Confirmed State Callout */}
            {order.status === 'confirmed' ? (
              <div className="p-6 rounded-2xl bg-green-950/40 border border-green-500/50 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-green-500 text-black flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white">Payment Confirmed & Membership Activated!</h4>
                <p className="text-xs text-gray-300 max-w-md mx-auto">
                  Your BlackHub VIP Pass is active. All premium 4K videos are unlocked and all advertisements have been removed from your experience.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => onNavigate('browse', { access: 'premium' })}
                    className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-green-600/30"
                  >
                    Start Watching 4K Exclusives
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* QR Code */}
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-white/20">
                  {order.qrCodeUrl ? (
                    <img src={order.qrCodeUrl} alt="Deposit QR" className="w-44 h-44 object-contain" />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-gray-600 font-mono text-xs">
                      QR Generated
                    </div>
                  )}
                  <span className="text-[10px] text-gray-800 font-mono mt-1 font-semibold">Scan with Wallet App</span>
                </div>

                {/* Transfer Info */}
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Send Exactly:</label>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black font-mono text-amber-400">
                        {order.amountCrypto} {order.assetSymbol}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">(${order.amountUsd} USD)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                      {order.assetSymbol} ({order.network}) Receiving Address:
                    </label>
                    <div className="flex items-center gap-2 bg-[#181824] border border-white/15 rounded-xl p-2.5">
                      <code className="text-xs font-mono text-gray-200 truncate flex-1 select-all">
                        {order.receivingAddress}
                      </code>
                      <button
                        onClick={handleCopyAddress}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shrink-0"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-red-500" />
                      <span>Order Expires in 2 Hours</span>
                    </span>
                    <span>•</span>
                    <span>Required Confirmations: 2</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Transaction Hash Submission (Section 18) */}
            {order.status !== 'confirmed' && (
              <div className="pt-6 border-t border-white/10 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Have you sent the transaction?</h4>
                  <p className="text-xs text-gray-400">
                    Paste your transaction hash (TxID) below to trigger verification and activate your subscription.
                  </p>
                </div>

                <form onSubmit={handleSubmitTx} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      placeholder="e.g. 0x8f2a... or blockchain transaction hash"
                      disabled={isSubmittingTx}
                      className="flex-1 bg-[#181824] border border-white/15 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-red-500 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingTx || !txHash.trim()}
                      className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      {isSubmittingTx ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Verify & Activate</span>
                        </>
                      )}
                    </button>
                  </div>

                  {txSuccessMessage && (
                    <div className="p-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300 text-xs">
                      {txSuccessMessage}
                    </div>
                  )}

                  {txErrorMessage && (
                    <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs">
                      {txErrorMessage}
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>
        ) : null}

        {/* Track Order Shortcut */}
        <div className="text-center pt-2">
          <button
            onClick={() => onNavigate('payment-status')}
            className="text-xs text-gray-400 hover:text-white transition-colors underline cursor-pointer"
          >
            Track Existing Payment Order Status
          </button>
        </div>
      </div>
    </div>
  );
};
