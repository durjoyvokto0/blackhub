import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { AdManager } from './components/AdManager.tsx';
import { LiveAudienceTracker } from './components/LiveAudienceTracker.tsx';

// Public and User Pages
import { HomePage } from './pages/HomePage.tsx';
import { BrowsePage } from './pages/BrowsePage.tsx';
import { VideoDetailPage } from './pages/VideoDetailPage.tsx';
import { CategoriesPage } from './pages/CategoriesPage.tsx';
import { SearchResultsPage } from './pages/SearchResultsPage.tsx';
import { CreatorProfilePage } from './pages/CreatorProfilePage.tsx';
import { PremiumPage } from './pages/PremiumPage.tsx';
import { CryptoCheckoutPage } from './pages/CryptoCheckoutPage.tsx';
import { PaymentStatusPage } from './pages/PaymentStatusPage.tsx';
import {
  LoginPage,
  RegisterPage,
  EmailVerificationPage,
  PasswordRecoveryPage
} from './pages/AuthPages.tsx';
import { UserDashboardPage } from './pages/UserDashboardPage.tsx';
import {
  WatchHistoryPage,
  SavedVideosPage,
  NotificationsPage
} from './pages/UserMediaPages.tsx';
import { AccountSettingsPage } from './pages/AccountSettingsPage.tsx';
import { UploadVideoPage } from './pages/UploadVideoPage.tsx';
import { HelpSupportPage, LegalPage } from './pages/SupportAndLegalPages.tsx';

// Administrator Pages
import { AdminLoginPage } from './pages/AdminLoginPage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';

function AppContent() {
  const { user, isAdmin } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [pageParams, setPageParams] = useState<any>({});

  // Sync with browser URL hash or popstate for bookmarkable links
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || 'home';
      const [route, queryString] = hash.split('?');
      const params: any = {};
      if (queryString) {
        new URLSearchParams(queryString).forEach((val, key) => {
          params[key] = val;
        });
      }
      setCurrentPage(route || 'home');
      setPageParams(params);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (page: string, params: any = {}) => {
    setCurrentPage(page);
    setPageParams(params);
    let hash = page;
    if (Object.keys(params).length > 0) {
      const search = new URLSearchParams(params).toString();
      hash += `?${search}`;
    }
    window.location.hash = hash;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Determine whether to show public Navbar and Footer
  const isAdminPortal = currentPage === 'admin-dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0e] text-white selection:bg-red-600 selection:text-white">
      {/* Background audience presence tracker */}
      <LiveAudienceTracker currentPage={currentPage} />

      {/* Global Ad Manager: strictly loads social bar & popunder for free users; omitted for VIP */}
      <AdManager />

      {!isAdminPortal && <Navbar onNavigate={navigate} currentPage={currentPage} />}

      <main className="flex-1">
        {/* Public Video Pages */}
        {currentPage === 'home' && <HomePage onNavigate={navigate} />}
        {currentPage === 'browse' && (
          <BrowsePage
            onNavigate={navigate}
            initialCategory={pageParams.category}
            initialAccess={pageParams.access}
          />
        )}
        {currentPage === 'video' && (
          <VideoDetailPage
            videoId={parseInt(pageParams.id || '1')}
            onNavigate={navigate}
          />
        )}
        {currentPage === 'categories' && <CategoriesPage onNavigate={navigate} />}
        {currentPage === 'search' && (
          <SearchResultsPage
            query={pageParams.query || ''}
            onNavigate={navigate}
          />
        )}
        {currentPage === 'creator' && (
          <CreatorProfilePage
            creatorId={parseInt(pageParams.id || '1')}
            creatorUsername={pageParams.username}
            onNavigate={navigate}
          />
        )}

        {/* Membership & Checkout Pages */}
        {currentPage === 'premium' && <PremiumPage onNavigate={navigate} />}
        {currentPage === 'checkout' && (
          <CryptoCheckoutPage
            planId={pageParams.planId ? parseInt(pageParams.planId) : 1}
            onNavigate={navigate}
          />
        )}
        {currentPage === 'payment-status' && <PaymentStatusPage onNavigate={navigate} />}

        {/* User Account & Auth Pages */}
        {currentPage === 'login' && (
          <LoginPage
            onNavigate={navigate}
            redirect={pageParams.redirect}
            planId={pageParams.planId ? parseInt(pageParams.planId) : undefined}
          />
        )}
        {currentPage === 'register' && <RegisterPage onNavigate={navigate} />}
        {currentPage === 'verify-email' && (
          <EmailVerificationPage
            initialCode={pageParams.initialCode}
            onNavigate={navigate}
          />
        )}
        {currentPage === 'forgot-password' && <PasswordRecoveryPage onNavigate={navigate} />}
        {currentPage === 'user-dashboard' && <UserDashboardPage onNavigate={navigate} />}
        {currentPage === 'history' && <WatchHistoryPage onNavigate={navigate} />}
        {currentPage === 'saved' && <SavedVideosPage onNavigate={navigate} />}
        {currentPage === 'settings' && <AccountSettingsPage onNavigate={navigate} />}
        {currentPage === 'notifications' && <NotificationsPage onNavigate={navigate} />}
        {currentPage === 'upload' && <UploadVideoPage onNavigate={navigate} />}

        {/* Help, Support & Legal Compliance */}
        {currentPage === 'help' && <HelpSupportPage onNavigate={navigate} />}
        {currentPage === 'crypto-guide' && <HelpSupportPage onNavigate={navigate} />}
        {currentPage === 'terms' && <LegalPage onNavigate={navigate} defaultSection="terms" />}
        {currentPage === 'privacy' && <LegalPage onNavigate={navigate} defaultSection="privacy" />}
        {currentPage === 'compliance' && <LegalPage onNavigate={navigate} defaultSection="dmca" />}
        {currentPage === 'report-content' && <LegalPage onNavigate={navigate} defaultSection="dmca" />}

        {/* Private Administrator Gateway */}
        {currentPage === 'admin-login' && <AdminLoginPage onNavigate={navigate} />}
        {currentPage === 'admin-dashboard' && <AdminDashboardPage onNavigate={navigate} />}
      </main>

      {!isAdminPortal && <Footer onNavigate={navigate} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
