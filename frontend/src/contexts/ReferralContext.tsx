import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ReferralContextType {
  referrer: string | null;
  setReferrer: (address: string) => void;
  clearReferrer: () => void;
  getReferralLink: (userAddress: string) => string;
}

const ReferralContext = createContext<ReferralContextType | undefined>(undefined);

const REFERRAL_STORAGE_KEY = 'ivy_predict_referrer';

export function ReferralProvider({ children }: { children: ReactNode }) {
  const [referrer, setReferrerState] = useState<string | null>(null);

  // Load referrer from URL or localStorage on mount
  useEffect(() => {
    // Check URL params first
    const params = new URLSearchParams(window.location.search);
    const refFromUrl = params.get('ref');

    if (refFromUrl && refFromUrl.startsWith('0x')) {
      setReferrerState(refFromUrl);
      localStorage.setItem(REFERRAL_STORAGE_KEY, refFromUrl);

      // Clean URL without reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else {
      // Try localStorage
      const storedRef = localStorage.getItem(REFERRAL_STORAGE_KEY);
      if (storedRef) {
        setReferrerState(storedRef);
      }
    }
  }, []);

  const setReferrer = (address: string) => {
    if (address && address.startsWith('0x')) {
      setReferrerState(address);
      localStorage.setItem(REFERRAL_STORAGE_KEY, address);
    }
  };

  const clearReferrer = () => {
    setReferrerState(null);
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  };

  const getReferralLink = (userAddress: string) => {
    return `${window.location.origin}?ref=${userAddress}`;
  };

  return (
    <ReferralContext.Provider
      value={{
        referrer,
        setReferrer,
        clearReferrer,
        getReferralLink,
      }}
    >
      {children}
    </ReferralContext.Provider>
  );
}

export function useReferral() {
  const context = useContext(ReferralContext);
  if (!context) {
    throw new Error('useReferral must be used within a ReferralProvider');
  }
  return context;
}
