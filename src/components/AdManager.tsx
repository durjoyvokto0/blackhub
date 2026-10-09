import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';

const SOCIAL_BAR_SCRIPT_ID = 'blackhub-ad-social-bar';
const POPUNDER_SCRIPT_ID = 'blackhub-ad-popunder';

/**
 * AdManager Component
 * Injects social bar ads and popunder ads STRICTLY for free users.
 * Automatically purges all ad scripts if the user is a Premium subscriber.
 */
export const AdManager: React.FC = () => {
  const { isPremium } = useAuth();

  useEffect(() => {
    // If user is a verified Premium subscriber, purge all third-party ad scripts immediately
    if (isPremium) {
      const socialScript = document.getElementById(SOCIAL_BAR_SCRIPT_ID);
      if (socialScript) socialScript.remove();

      const popunderScript = document.getElementById(POPUNDER_SCRIPT_ID);
      if (popunderScript) popunderScript.remove();

      return;
    }

    // For Free users only: Inject Social Bar Ad
    // <script data-cfasync="false" src="https://biomanos.org/14/0f8f3cdeeb80412fea7eaf021b962a99"></script>
    if (!document.getElementById(SOCIAL_BAR_SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = SOCIAL_BAR_SCRIPT_ID;
      script.setAttribute('data-cfasync', 'false');
      script.src = 'https://biomanos.org/14/0f8f3cdeeb80412fea7eaf021b962a99';
      script.async = true;
      document.body.appendChild(script);
    }

    // For Free users only: Inject Popunder ("pounder") Ad
    // <script data-cfasync="false" src="https://benchform.org/1/d33bf90131152027330b971ab3ec5197"></script>
    if (!document.getElementById(POPUNDER_SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = POPUNDER_SCRIPT_ID;
      script.setAttribute('data-cfasync', 'false');
      script.src = 'https://benchform.org/1/d33bf90131152027330b971ab3ec5197';
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      // Cleanup on unmount or premium upgrade
      if (isPremium) {
        document.getElementById(SOCIAL_BAR_SCRIPT_ID)?.remove();
        document.getElementById(POPUNDER_SCRIPT_ID)?.remove();
      }
    };
  }, [isPremium]);

  return null;
};
