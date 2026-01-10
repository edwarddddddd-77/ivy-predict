import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { getContractAddress } from '../contracts/addresses';
import USDTFaucetABI from '../contracts/abis/USDTFaucet.json';

export default function FaucetBanner() {
  const { t } = useTranslation();
  const { address: userAddress, chain } = useAccount();
  const [claiming, setClaiming] = useState(false);

  // Check if user has already claimed
  const { data: hasClaimed, refetch: refetchClaimed } = useReadContract({
    address: chain?.id === 97 ? getContractAddress(97, 'USDT_FAUCET') as `0x${string}` : undefined,
    abi: USDTFaucetABI.abi,
    functionName: 'hasClaimedTokens',
    args: userAddress ? [userAddress] : undefined,
  });

  // Get faucet balance
  const { data: faucetBalance } = useReadContract({
    address: chain?.id === 97 ? getContractAddress(97, 'USDT_FAUCET') as `0x${string}` : undefined,
    abi: USDTFaucetABI.abi,
    functionName: 'getBalance',
  });

  const { writeContract, data: hash, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleClaim = async () => {
    if (!chain || chain.id !== 97) {
      alert(t('faucet.alert_testnet') || 'Please switch to BSC Testnet');
      return;
    }

    setClaiming(true);
    try {
      writeContract({
        address: getContractAddress(97, 'USDT_FAUCET') as `0x${string}`,
        abi: USDTFaucetABI.abi,
        functionName: 'claim',
      });
    } catch (err) {
      console.error('Claim error:', err);
      setClaiming(false);
    }
  };

  // Refetch claim status after successful transaction
  if (isSuccess && claiming) {
    setClaiming(false);
    refetchClaimed();
  }

  // Hide banner on mainnet or if no chain connected
  if (!chain || chain.id !== 97) {
    return null;
  }

  const availableClaims = faucetBalance ? Math.floor(Number(faucetBalance) / (30000 * 1e18)) : 0;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#00C9A7] to-[#005F6B] rounded-2xl p-6 mb-8">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-white rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10 flex items-center justify-between">
        {/* Left: Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🚰</span>
            <h2 className="font-display text-2xl font-bold text-white">{t('faucet.title')}</h2>
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold text-white">
              {t('faucet.testnet_only')}
            </span>
          </div>
          <p className="text-white/90 text-lg mb-1">
            {t('faucet.description')}
          </p>
          <p className="text-white/70 text-sm">
            {t('faucet.available')}: {availableClaims.toLocaleString()} {t('faucet.claims_remaining')}
          </p>
        </div>

        {/* Right: Action Button */}
        <div className="flex-shrink-0">
          {!userAddress ? (
            <div className="px-8 py-4 bg-white/20 text-white/60 rounded-lg font-semibold cursor-not-allowed">
              {t('faucet.connect_first')}
            </div>
          ) : hasClaimed ? (
            <div className="text-center">
              <div className="px-8 py-4 bg-white/20 text-white rounded-lg font-semibold flex items-center gap-2">
                <span>✅</span>
                <span>{t('faucet.already_claimed')}</span>
              </div>
              <p className="text-white/70 text-xs mt-2">{t('faucet.received')}</p>
            </div>
          ) : (
            <button
              onClick={handleClaim}
              disabled={isConfirming || claiming}
              className="px-8 py-4 bg-white text-[#00C9A7] font-bold rounded-lg hover:bg-white/90 transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isConfirming ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('faucet.claiming')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>💰</span>
                  <span>{t('faucet.claim_button')}</span>
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="relative z-10 mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-white text-sm">
            ❌ {t('common.error')}: {error.message.includes('AlreadyClaimed') ? t('faucet.error_claimed') : t('faucet.error_failed')}
          </p>
        </div>
      )}

      {/* Success message */}
      {isSuccess && (
        <div className="relative z-10 mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
          <p className="text-white text-sm">
            ✅ {t('faucet.success')}
          </p>
        </div>
      )}
    </div>
  );
}
