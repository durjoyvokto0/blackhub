import React, { useState } from 'react';
import { apiRequest } from '../lib/api.ts';
import { HelpCircle, Shield, FileText, ChevronDown, Send, CheckCircle2, Bitcoin, Coins } from 'lucide-react';

interface LegalSupportProps {
  onNavigate: (page: string, params?: any) => void;
  defaultSection?: 'terms' | 'privacy' | 'dmca' | 'faq' | 'crypto';
}

export const HelpSupportPage: React.FC<LegalSupportProps> = ({ onNavigate }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [ticketSent, setTicketSent] = useState(false);

  const faqs = [
    {
      q: 'How do cryptocurrency memberships work on BlackHub?',
      a: 'We support four prepaid membership durations: 1 Month, 3 Months, 6 Months, and 12 Months. When you select a plan, the system generates a unique order and wallet address. Send the exact amount in USDT, Bitcoin, Ethereum, or Litecoin, submit your transaction hash, and your VIP pass activates automatically.'
    },
    {
      q: 'Why are credit/debit card payments disabled?',
      a: 'To maximize user privacy, eliminate recurring charge disputes, and protect against centralized banking surveillance, BlackHub is crypto-only for this release. We do not store or process payment card data.'
    },
    {
      q: 'What benefits do VIP subscribers receive?',
      a: 'VIP subscribers receive an entirely ad-free experience (no video pre-rolls, no banners, no popups), access to our high-bitrate 4K Ultra master releases, unrestricted download speeds, and priority customer support.'
    },
    {
      q: 'How long does payment verification take?',
      a: 'Automatic verification usually completes within 1 to 5 minutes after your transaction receives 2 network confirmations on the blockchain. If manual review is required, an administrator verifies submissions in our operations queue.'
    },
    {
      q: 'Can creators upload videos?',
      a: 'Yes. All registered creators can upload eligible videos. Submitted videos are reviewed by our moderation staff to ensure compliance with our content and copyright guidelines before becoming public.'
    }
  ];

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/community/support', {
        method: 'POST',
        body: JSON.stringify({ name, email, subject, message })
      });
      setTicketSent(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/20 text-red-400 text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Customer Assistance</span>
          </div>
          <h1 className="text-3xl font-black text-white">Help & Support Center</h1>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Find answers to frequently asked questions about video streaming, cryptocurrency payments, and platform policies.
          </p>
        </div>

        {/* Crypto Quick Guide */}
        <div className="bg-[#12121a] p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Cryptocurrency Payment Guide</h2>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            1. Select your desired membership duration (1, 3, 6, or 12 Months).<br />
            2. Choose your preferred asset (USDT TRC20, USDT ERC20, BTC, ETH, LTC).<br />
            3. Copy the exact deposit address or scan the QR code with your private crypto wallet.<br />
            4. Broadcast the payment on the appropriate network.<br />
            5. Copy the transaction hash (TxID) from your wallet and paste it on the checkout page to trigger instant verification.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white mb-2">Frequently Asked Questions</h2>
          {faqs.map((f, i) => (
            <div key={i} className="bg-[#12121a] rounded-xl border border-white/10 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-4 text-left font-semibold text-sm text-gray-200 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
              >
                <span>{f.q}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openFaq === i ? 'rotate-180 text-red-500' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 pt-1 text-xs text-gray-400 leading-relaxed border-t border-white/5">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Support Form */}
        <div className="bg-[#12121a] p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6">
          <h2 className="text-lg font-bold text-white">Contact Platform Support</h2>
          <p className="text-xs text-gray-400">Need direct assistance with an order or technical issue? Submit an inquiry.</p>

          {ticketSent && (
            <div className="p-4 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Inquiry dispatched successfully! Our support desk will reply via email.</span>
            </div>
          )}

          <form onSubmit={handleTicketSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@domain.com"
                  className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Question regarding crypto transaction..."
                className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Message</label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Provide detailed description of your request..."
                className="w-full bg-[#181824] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Submit Ticket</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Legal & DMCA Page (Section 25)
export const LegalPage: React.FC<LegalSupportProps> = ({ defaultSection = 'terms' }) => {
  const [activeSection, setActiveSection] = useState<'terms' | 'privacy' | 'dmca'>(defaultSection as any);

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Legal & Compliance Documentation</h1>
            <p className="text-xs text-gray-400">Terms of Service, Privacy Disclosures, and DMCA Copyright Reporting.</p>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-xs font-semibold">
          <button
            onClick={() => setActiveSection('terms')}
            className={`px-4 py-2 rounded-lg cursor-pointer ${
              activeSection === 'terms' ? 'bg-red-600 text-white font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => setActiveSection('privacy')}
            className={`px-4 py-2 rounded-lg cursor-pointer ${
              activeSection === 'privacy' ? 'bg-red-600 text-white font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveSection('dmca')}
            className={`px-4 py-2 rounded-lg cursor-pointer ${
              activeSection === 'dmca' ? 'bg-red-600 text-white font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Copyright & DMCA Notice
          </button>
        </div>

        {/* Section Content */}
        <div className="bg-[#12121a] p-6 sm:p-8 rounded-2xl border border-white/10 text-xs sm:text-sm text-gray-300 leading-relaxed space-y-4">
          {activeSection === 'terms' && (
            <>
              <h2 className="text-lg font-bold text-white">1. Platform Eligibility and Age Verification</h2>
              <p>
                By accessing BlackHub, you affirm and warrant that you are at least 18 years of age (or the legal age of majority in your jurisdiction). Users under the age of 18 are strictly prohibited from viewing content or creating accounts.
              </p>
              <h2 className="text-lg font-bold text-white pt-2">2. Cryptocurrency Subscriptions and Refund Policy</h2>
              <p>
                All VIP memberships are purchased using decentralized cryptocurrencies. Blockchain transactions are immutable and non-refundable once confirmed on the respective distributed ledger network. Each subscription provides access for the selected calendar duration (1, 3, 6, or 12 months) and does not automatically bill your wallet.
              </p>
              <h2 className="text-lg font-bold text-white pt-2">3. Prohibited Content and Conduct</h2>
              <p>
                Users are strictly prohibited from uploading content involving minors, non-consensual recordings, hate speech, copyrighted works without written authorization, or unlawful material. All user uploads undergo administrative moderation.
              </p>
            </>
          )}

          {activeSection === 'privacy' && (
            <>
              <h2 className="text-lg font-bold text-white">1. Data Minimization Principles</h2>
              <p>
                BlackHub operates under strict privacy-preserving principles. We do not store financial account numbers, credit card tokens, or banking identity documents. We process only account email addresses, usernames, and hashed passwords.
              </p>
              <h2 className="text-lg font-bold text-white pt-2">2. Cryptographic Security & Session Storage</h2>
              <p>
                All passwords are encrypted with bcrypt cryptographic salting. Sessions are maintained via secure server-side tokens and HTTP security headers.
              </p>
              <h2 className="text-lg font-bold text-white pt-2">3. Data Retention and Erasure Requests</h2>
              <p>
                In compliance with international data privacy frameworks (including GDPR and CCPA), users have the right to request permanent account deletion via Account Settings at any time.
              </p>
            </>
          )}

          {activeSection === 'dmca' && (
            <>
              <h2 className="text-lg font-bold text-white">Digital Millennium Copyright Act (DMCA) Policy</h2>
              <p>
                BlackHub respects the intellectual property rights of creators and content owners. In accordance with Title 17, United States Code, Section 512(c)(3), our designated copyright agent processes all formal notices of claimed infringement expeditiously.
              </p>
              <div className="bg-[#181824] p-4 rounded-xl border border-white/10 my-4 space-y-2">
                <p className="font-bold text-white">Filing a DMCA Notice:</p>
                <p>1. Physical or electronic signature of the copyright owner.</p>
                <p>2. Identification of the copyrighted work claimed to have been infringed.</p>
                <p>3. Identification of the material that is to be removed, including the direct BlackHub URL or Video ID.</p>
                <p>4. Submitter contact details (name, address, email, telephone number).</p>
                <p>5. A statement made under penalty of perjury that the information is accurate.</p>
              </div>
              <p className="text-gray-400">
                Direct DMCA submissions can be submitted via the "Report Video" button on any video page or transmitted to <span className="text-red-400 font-mono">dmca@blackhub.internal</span>.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
