import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Search, Clock, CheckCircle2, XCircle, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';

interface PaymentStatusPageProps {
  onNavigate: (page: string, params?: any) => void;
}

export const PaymentStatusPage: React.FC<PaymentStatusPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [searchRef, setSearchRef] = useState<string>('');
  const [searchedOrder, setSearchedOrder] = useState<any | null>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (user) {
      apiRequest<{ orders: any[] }>('/api/memberships/my-subscription')
        .then((data) => {
          if (data?.orders) setUserOrders(data.orders);
        })
        .catch((e) => console.error(e));
    }
  }, [user]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchRef.trim()) return;

    try {
      setLoading(true);
      setError('');
      const data = await apiRequest<{ order: any }>(`/api/memberships/orders/${encodeURIComponent(searchRef.trim())}`);
      if (data?.order) {
        setSearchedOrder(data.order);
      } else {
        setError('No order found with reference ' + searchRef);
      }
    } catch (err: any) {
      setError(err.message || 'Order lookup failed.');
      setSearchedOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-bold uppercase">
            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed & Active
          </span>
        );
      case 'under_verification':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold uppercase">
            <Clock className="w-3.5 h-3.5" /> Under Verification
          </span>
        );
      case 'expired':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30 text-xs font-bold uppercase">
            <XCircle className="w-3.5 h-3.5" /> Expired
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold uppercase">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase">
            <AlertCircle className="w-3.5 h-3.5" /> Pending Payment
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Cryptocurrency Payment Verification</h1>
          <p className="text-xs text-gray-400 mt-1">
            Track blockchain order confirmation, review transaction hashes, and inspect membership activation dates.
          </p>
        </div>

        {/* Lookup Bar */}
        <div className="bg-[#12121a] p-6 rounded-2xl border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white">Order Lookup</h3>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              placeholder="Enter Order Reference (e.g. BH-2026-00051)"
              className="flex-1 bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              disabled={loading || !searchRef.trim()}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Lookup</span>
            </button>
          </form>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Searched Order Result Card */}
          {searchedOrder && (
            <div className="mt-4 p-5 rounded-xl bg-[#161622] border border-white/15 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <span className="text-[10px] text-gray-400 font-mono">Order ID</span>
                  <h4 className="font-mono font-bold text-base text-white">{searchedOrder.orderReference}</h4>
                </div>
                {getStatusBadge(searchedOrder.status)}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px]">Plan</span>
                  <span className="font-bold text-white">{searchedOrder.planName || 'VIP Membership'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Amount</span>
                  <span className="font-mono text-amber-400 font-bold">{searchedOrder.amountCrypto} {searchedOrder.assetSymbol}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Network</span>
                  <span className="font-mono text-gray-300">{searchedOrder.network}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Confirmations</span>
                  <span className="font-mono text-gray-300">{searchedOrder.confirmations || 0} / 2</span>
                </div>
              </div>

              {searchedOrder.transactionHash && (
                <div className="pt-2 text-xs">
                  <span className="text-gray-400 block text-[10px]">Submitted Tx Hash:</span>
                  <code className="text-[11px] font-mono text-gray-300 break-all select-all">
                    {searchedOrder.transactionHash}
                  </code>
                </div>
              )}

              {searchedOrder.subExpiresAt && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 text-xs">
                  Active Subscription Expiration: {new Date(searchedOrder.subExpiresAt).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User's Order History */}
        {user && userOrders.length > 0 && (
          <div className="bg-[#12121a] p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white">Your Payment Orders</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400">
                    <th className="py-2.5 px-3">Order Ref</th>
                    <th className="py-2.5 px-3">Plan</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Network</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {userOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-white/5">
                      <td className="py-2.5 px-3 font-mono font-medium text-white">{o.order_reference}</td>
                      <td className="py-2.5 px-3 text-gray-300">{o.plan_name}</td>
                      <td className="py-2.5 px-3 font-mono text-amber-400">{o.amount_crypto} {o.asset_symbol}</td>
                      <td className="py-2.5 px-3 text-gray-400 font-mono">{o.network}</td>
                      <td className="py-2.5 px-3 text-gray-400">{new Date(o.created_at).toLocaleDateString()}</td>
                      <td className="py-2.5 px-3 text-right">{getStatusBadge(o.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
