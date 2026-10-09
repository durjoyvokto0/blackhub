import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';

function getOrCreateVisitorId(): string {
  try {
    let vid = sessionStorage.getItem('bh_visitor_id');
    if (!vid) {
      vid = localStorage.getItem('bh_visitor_id');
    }
    if (!vid) {
      vid = 'bh_v_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('bh_visitor_id', vid);
      localStorage.setItem('bh_visitor_id', vid);
    }
    return vid;
  } catch {
    return 'bh_anon_' + Date.now().toString(36);
  }
}

export const LiveAudienceTracker: React.FC<{ currentPage?: string }> = ({ currentPage = 'home' }) => {
  const { user } = useAuth();

  useEffect(() => {
    const visitorId = getOrCreateVisitorId();
    const token = localStorage.getItem('blackhub_token');

    const sendHeartbeat = () => {
      const currentPath = window.location.hash || `/${currentPage}`;
      fetch('/api/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Visitor-Id': visitorId,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          visitorId,
          path: currentPath
        })
      }).catch(() => {
        // Silent fail for network glitches
      });
    };

    // Immediate initial heartbeat
    sendHeartbeat();

    // Heartbeat every 25 seconds
    const interval = setInterval(sendHeartbeat, 25000);

    // Visibility change handler
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, currentPage]);

  return null;
};
