import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatUnits, parseUnits } from 'viem';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import {
  useOpenChallenges,
  useChallengeData,
  PriceDirection,
  DURATION_LABELS,
} from '../hooks/usePKChallenge';
import type { Challenge } from '../hooks/usePKChallenge';
import { getContractAddress } from '../contracts/addresses';
import PKChallengeABI from '../contracts/abis/PKChallenge.json';
import MockUSDTABI from '../contracts/abis/MockUSDT.json';
import { useReferral } from '../contexts/ReferralContext';

interface SmartMatchCardProps {
  selectedAsset: string;
  selectedDirection: 0 | 1;
  amount: string;
  onMatchAccepted?: () => void;
}

// Asset icons
const ASSET_ICONS: Record<string, string> = {
  'BTC/USD': '₿',
  'ETH/USD': 'Ξ',
  'BNB/USD': '◆',
};

// Single match card
function MatchCard({
  challengeId,
  userAmount,
  onAccept,
}: {
  challengeId: bigint;
  userAmount: string;
  onAccept: (id: bigint) => void;
}) {
  const { t } = useTranslation();
  const { data: challenge } = useChallengeData(challengeId) as { data: Challenge | undefined };

  if (!challenge) return null;

  const isCreatorUp = challenge.creatorDirection === PriceDirection.UP;

  return (
    <div className="bg-gradient-to-r from-[#00C9A7]/10 to-[#005F6B]/10 rounded-xl p-4 border border-[#00C9A7]/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{ASSET_ICONS[challenge.assetSymbol] || '📈'}</span>
          <span className="text-white font-bold">{challenge.assetSymbol.replace('/USD', '')}</span>
        </div>
        <span className="text-xs text-[#8A9BA8]">
          {DURATION_LABELS[challenge.duration]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-[#0A2342]/60 rounded-lg">
          <div className="text-xs text-[#8A9BA8] mb-1">{t('smartMatch.opponent_bets', 'Opponent bets')}</div>
          <div className={`text-lg font-bold ${isCreatorUp ? 'text-green-400' : 'text-red-400'}`}>
            {isCreatorUp ? '📈 UP' : '📉 DOWN'}
          </div>
        </div>
        <div className="text-center p-3 bg-[#0A2342]/60 rounded-lg">
          <div className="text-xs text-[#8A9BA8] mb-1">{t('smartMatch.you_bet', 'You bet')}</div>
          <div className={`text-lg font-bold ${!isCreatorUp ? 'text-green-400' : 'text-red-400'}`}>
            {!isCreatorUp ? '📈 UP' : '📉 DOWN'}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm mb-4">
        <div>
          <span className="text-[#8A9BA8]">{t('smartMatch.their_stake', 'Their stake')}: </span>
          <span className="text-white font-medium">{formatUnits(challenge.creatorAmount, 18)} USDT</span>
        </div>
        <div>
          <span className="text-[#8A9BA8]">{t('smartMatch.your_stake', 'Your stake')}: </span>
          <span className="text-[#00C9A7] font-medium">{userAmount} USDT</span>
        </div>
      </div>

      <button
        onClick={() => onAccept(challengeId)}
        className="w-full py-3 bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white font-bold rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
      >
        ⚡ {t('smartMatch.instant_battle', 'Instant Battle')}
      </button>
    </div>
  );
}

// Main SmartMatchCard component
export default function SmartMatchCard({
  selectedAsset,
  selectedDirection,
  amount,
  onMatchAccepted,
}: SmartMatchCardProps) {
  const navigate = useNavigate();
  const { address, chain } = useAccount();
  const { referrer } = useReferral();
  const [matchingChallenges, setMatchingChallenges] = useState<bigint[]>([]);
  const [step, setStep] = useState<'approve' | 'accept'>('approve');
  const [selectedMatch, setSelectedMatch] = useState<bigint | null>(null);

  // Contract addresses
  const pkChallengeAddress = chain?.id
    ? getContractAddress(chain.id, 'PK_CHALLENGE') as `0x${string}`
    : undefined;
  const usdtAddress = chain?.id
    ? getContractAddress(chain.id, 'MOCK_USDT') as `0x${string}`
    : undefined;

  // Get all open challenges
  const { data: openChallengeIds } = useOpenChallenges() as { data: bigint[] | undefined };

  // Get challenge data for filtering
  const [challengeDataMap, setChallengeDataMap] = useState<Map<string, Challenge>>(new Map());

  // Read USDT allowance
  const { data: usdtAllowance, refetch: refetchAllowance } = useReadContract({
    address: usdtAddress,
    abi: MockUSDTABI.abi,
    functionName: 'allowance',
    args: address && pkChallengeAddress ? [address, pkChallengeAddress] : undefined,
    query: { enabled: !!address && !!pkChallengeAddress && !!usdtAddress },
  });

  // Contract writes
  const { data: approveHash, writeContract: writeApprove, isPending: isApprovePending, reset: resetApprove } = useWriteContract();
  const { data: acceptHash, writeContract: writeAccept, isPending: isAcceptPending } = useWriteContract();

  // Transaction receipts
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isAcceptConfirming, isSuccess: isAcceptSuccess } = useWaitForTransactionReceipt({ hash: acceptHash });

  // Check allowance
  useEffect(() => {
    if (usdtAllowance !== undefined && amount) {
      const requiredAmount = parseUnits(amount || '0', 18);
      if ((usdtAllowance as bigint) >= requiredAmount) {
        setStep('accept');
      } else {
        setStep('approve');
      }
    }
  }, [usdtAllowance, amount]);

  // After approve success
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      setStep('accept');
      resetApprove();
    }
  }, [isApproveSuccess, refetchAllowance, resetApprove]);

  // After accept success
  useEffect(() => {
    if (isAcceptSuccess && selectedMatch) {
      onMatchAccepted?.();
      navigate(`/pk/${selectedMatch.toString()}`);
    }
  }, [isAcceptSuccess, selectedMatch, navigate, onMatchAccepted]);

  // Filter matching challenges
  useEffect(() => {
    if (!openChallengeIds || !address || !amount || parseFloat(amount) <= 0) {
      setMatchingChallenges([]);
      return;
    }

    const oppositeDirection = selectedDirection === 0 ? 1 : 0;
    const userAmount = parseUnits(amount, 18);

    const matches = openChallengeIds.filter(id => {
      const challenge = challengeDataMap.get(id.toString());
      if (!challenge) return false;

      // Skip own challenges
      if (challenge.creator.toLowerCase() === address.toLowerCase()) return false;

      // Must be same asset
      if (challenge.assetSymbol !== selectedAsset) return false;

      // Must be opposite direction
      if (challenge.creatorDirection !== oppositeDirection) return false;

      // User amount must be within range
      if (userAmount < challenge.minAmount || userAmount > challenge.maxAmount) return false;

      return true;
    });

    setMatchingChallenges(matches);
  }, [openChallengeIds, selectedAsset, selectedDirection, amount, address, challengeDataMap]);

  // Handle approve
  const handleApprove = () => {
    if (!usdtAddress || !pkChallengeAddress) return;
    writeApprove({
      address: usdtAddress,
      abi: MockUSDTABI.abi,
      functionName: 'approve',
      args: [pkChallengeAddress, parseUnits('1000000', 18)],
    });
  };

  // Handle accept challenge
  const handleAccept = (challengeId: bigint) => {
    if (!pkChallengeAddress || !amount) return;
    setSelectedMatch(challengeId);

    if (step === 'approve') {
      handleApprove();
      return;
    }

    writeAccept({
      address: pkChallengeAddress,
      abi: PKChallengeABI.abi,
      functionName: 'acceptChallenge',
      args: [
        challengeId,
        parseUnits(amount, 18),
        referrer || '0x0000000000000000000000000000000000000000',
      ],
    });
  };

  // Don't render if no amount
  if (!amount || parseFloat(amount) <= 0) {
    return null;
  }

  // Loading state - fetch challenge data
  if (openChallengeIds && openChallengeIds.length > 0) {
    // This is a simplified approach - in production you'd want to batch these reads
    return (
      <SmartMatchCardInner
        openChallengeIds={openChallengeIds}
        selectedAsset={selectedAsset}
        selectedDirection={selectedDirection}
        amount={amount}
        address={address}
        matchingChallenges={matchingChallenges}
        setMatchingChallenges={setMatchingChallenges}
        challengeDataMap={challengeDataMap}
        setChallengeDataMap={setChallengeDataMap}
        step={step}
        handleAccept={handleAccept}
        isApprovePending={isApprovePending}
        isApproveConfirming={isApproveConfirming}
        isAcceptPending={isAcceptPending}
        isAcceptConfirming={isAcceptConfirming}
      />
    );
  }

  return null;
}

// Inner component to handle data fetching
function SmartMatchCardInner({
  openChallengeIds,
  selectedAsset,
  selectedDirection,
  amount,
  address,
  matchingChallenges,
  setMatchingChallenges,
  challengeDataMap,
  setChallengeDataMap,
  step,
  handleAccept,
  isApprovePending,
  isApproveConfirming,
  isAcceptPending,
  isAcceptConfirming,
}: {
  openChallengeIds: bigint[];
  selectedAsset: string;
  selectedDirection: 0 | 1;
  amount: string;
  address: `0x${string}` | undefined;
  matchingChallenges: bigint[];
  setMatchingChallenges: (ids: bigint[]) => void;
  challengeDataMap: Map<string, Challenge>;
  setChallengeDataMap: (map: Map<string, Challenge>) => void;
  step: 'approve' | 'accept';
  handleAccept: (id: bigint) => void;
  isApprovePending: boolean;
  isApproveConfirming: boolean;
  isAcceptPending: boolean;
  isAcceptConfirming: boolean;
}) {
  const { t } = useTranslation();

  // Filter matching challenges when data is available
  useEffect(() => {
    if (!address || !amount || parseFloat(amount) <= 0) {
      setMatchingChallenges([]);
      return;
    }

    const oppositeDirection = selectedDirection === 0 ? 1 : 0;
    const userAmount = parseUnits(amount, 18);

    const matches = openChallengeIds.filter(id => {
      const challenge = challengeDataMap.get(id.toString());
      if (!challenge) return false;

      if (challenge.creator.toLowerCase() === address.toLowerCase()) return false;
      if (challenge.assetSymbol !== selectedAsset) return false;
      if (challenge.creatorDirection !== oppositeDirection) return false;
      if (userAmount < challenge.minAmount || userAmount > challenge.maxAmount) return false;

      return true;
    });

    setMatchingChallenges(matches);
  }, [openChallengeIds, selectedAsset, selectedDirection, amount, address, challengeDataMap]);

  // Individual challenge loader
  const ChallengeLoader = ({ id }: { id: bigint }) => {
    const { data } = useChallengeData(id) as { data: Challenge | undefined };

    useEffect(() => {
      if (data && !challengeDataMap.has(id.toString())) {
        const newMap = new Map(challengeDataMap);
        newMap.set(id.toString(), data);
        setChallengeDataMap(newMap);
      }
    }, [data, id]);

    return null;
  };

  const isLoading = isApprovePending || isApproveConfirming || isAcceptPending || isAcceptConfirming;

  // Render loaders for all challenges (hidden)
  const loaders = openChallengeIds.map(id => (
    <ChallengeLoader key={id.toString()} id={id} />
  ));

  if (matchingChallenges.length === 0) {
    return <>{loaders}</>;
  }

  return (
    <>
      {loaders}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">⚡</span>
          <h3 className="text-xl font-bold text-white">
            {t('smartMatch.title', 'Smart Match Found!')}
          </h3>
          <span className="text-sm text-[#00C9A7] bg-[#00C9A7]/10 px-2 py-0.5 rounded-full">
            {matchingChallenges.length} {t('smartMatch.available', 'available')}
          </span>
        </div>
        <p className="text-[#8A9BA8] text-sm mb-4">
          {t('smartMatch.description', 'We found opponents ready to battle. Accept for instant action!')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matchingChallenges.slice(0, 4).map(id => (
            <div key={id.toString()} className="relative">
              <MatchCard
                challengeId={id}
                userAmount={amount}
                onAccept={handleAccept}
              />
              {isLoading && (
                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                  <span className="animate-spin text-2xl">⏳</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {step === 'approve' && (
          <p className="text-center text-[#8A9BA8] text-sm mt-4">
            {t('smartMatch.approve_first', 'USDT approval required before accepting')}
          </p>
        )}
      </div>
    </>
  );
}
