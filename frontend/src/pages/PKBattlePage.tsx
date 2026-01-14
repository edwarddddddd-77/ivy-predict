import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { useTranslation } from 'react-i18next';
import { getContractAddress } from '../contracts/addresses';
import PKChallengeABI from '../contracts/abis/PKChallenge.json';
import MockUSDTABI from '../contracts/abis/MockUSDT.json';
import { useReferral } from '../contexts/ReferralContext';
import {
  useChallengeData,
  useTimeRemaining,
  useCanResolve,
  ChallengeState,
  DURATION_LABELS,
  formatAddress,
  getStateLabel,
} from '../hooks/usePKChallenge';

// Countdown timer component
function CountdownTimer({ seconds }: { seconds: number }) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const isUrgent = seconds < 300; // Less than 5 minutes

  return (
    <div className={`font-mono text-4xl font-bold ${isUrgent ? 'text-red-400 animate-pulse' : 'text-white'}`}>
      {hours > 0 && <span>{String(hours).padStart(2, '0')}:</span>}
      <span>{String(minutes).padStart(2, '0')}</span>
      <span>:</span>
      <span>{String(secs).padStart(2, '0')}</span>
    </div>
  );
}

export default function PKBattlePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address: userAddress, chain } = useAccount();
  const { referrer } = useReferral();

  const challengeId = id ? BigInt(id) : undefined;

  // Contract addresses
  const pkChallengeAddress = chain?.id
    ? getContractAddress(chain.id, 'PK_CHALLENGE') as `0x${string}`
    : undefined;
  const usdtAddress = chain?.id
    ? getContractAddress(chain.id, 'MOCK_USDT') as `0x${string}`
    : undefined;

  // Read challenge data
  const { data: challenge, refetch: refetchChallenge } = useChallengeData(challengeId);
  const { data: timeRemaining } = useTimeRemaining(challengeId) as { data: bigint | undefined };
  const { data: canResolve } = useCanResolve(challengeId) as { data: boolean | undefined };

  // Accept amount state
  const [acceptAmount, setAcceptAmount] = useState('');
  const [step, setStep] = useState<'approve' | 'accept'>('approve');
  const [copied, setCopied] = useState(false);

  // Read USDT allowance
  const { data: usdtAllowance, refetch: refetchAllowance } = useReadContract({
    address: usdtAddress,
    abi: MockUSDTABI.abi,
    functionName: 'allowance',
    args: userAddress && pkChallengeAddress ? [userAddress, pkChallengeAddress] : undefined,
  });

  // Contract writes
  const { data: approveHash, writeContract: writeApprove, isPending: isApprovePending } = useWriteContract();
  const { data: acceptHash, writeContract: writeAccept, isPending: isAcceptPending } = useWriteContract();
  const { data: resolveHash, writeContract: writeResolve, isPending: isResolvePending } = useWriteContract();
  const { data: cancelHash, writeContract: writeCancel, isPending: isCancelPending } = useWriteContract();

  // Transaction receipts
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isAcceptConfirming, isSuccess: isAcceptSuccess } = useWaitForTransactionReceipt({ hash: acceptHash });
  const { isLoading: isResolveConfirming, isSuccess: isResolveSuccess } = useWaitForTransactionReceipt({ hash: resolveHash });
  const { isLoading: isCancelConfirming, isSuccess: isCancelSuccess } = useWaitForTransactionReceipt({ hash: cancelHash });

  // Set default accept amount
  useEffect(() => {
    if (challenge && !acceptAmount) {
      const c = challenge as any;
      setAcceptAmount(formatUnits(c.minAmount, 18));
    }
  }, [challenge, acceptAmount]);

  // Check allowance
  useEffect(() => {
    if (usdtAllowance !== undefined && acceptAmount) {
      const requiredAmount = parseUnits(acceptAmount || '0', 18);
      if ((usdtAllowance as bigint) >= requiredAmount) {
        setStep('accept');
      } else {
        setStep('approve');
      }
    }
  }, [usdtAllowance, acceptAmount]);

  // After approve success
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      setStep('accept');
    }
  }, [isApproveSuccess, refetchAllowance]);

  // After accept/resolve/cancel success
  useEffect(() => {
    if (isAcceptSuccess || isResolveSuccess || isCancelSuccess) {
      refetchChallenge();
    }
  }, [isAcceptSuccess, isResolveSuccess, isCancelSuccess, refetchChallenge]);

  // Handlers
  const handleApprove = () => {
    if (!usdtAddress || !pkChallengeAddress) return;
    writeApprove({
      address: usdtAddress,
      abi: MockUSDTABI.abi,
      functionName: 'approve',
      args: [pkChallengeAddress, parseUnits('1000000', 18)],
    });
  };

  const handleAccept = () => {
    if (!pkChallengeAddress || !challengeId) return;
    writeAccept({
      address: pkChallengeAddress,
      abi: PKChallengeABI.abi,
      functionName: 'acceptChallenge',
      args: [
        challengeId,
        parseUnits(acceptAmount, 18),
        referrer || '0x0000000000000000000000000000000000000000',
      ],
    });
  };

  const handleResolve = () => {
    if (!pkChallengeAddress || !challengeId) return;
    writeResolve({
      address: pkChallengeAddress,
      abi: PKChallengeABI.abi,
      functionName: 'resolveChallenge',
      args: [challengeId],
    });
  };

  const handleCancel = () => {
    if (!pkChallengeAddress || !challengeId) return;
    writeCancel({
      address: pkChallengeAddress,
      abi: PKChallengeABI.abi,
      functionName: 'cancelChallenge',
      args: [challengeId],
    });
  };

  // Copy invite link
  const copyInviteLink = () => {
    const link = `${window.location.origin}/pk/${id}?ref=${userAddress || ''}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Share to Twitter
  const shareToTwitter = () => {
    if (!challenge) return;
    const c = challenge as any;
    const text = `I'm challenging you to a ${c.assetSymbol} price prediction battle on @IvyPredict! I bet it goes ${c.creatorDirection === 0 ? 'UP 📈' : 'DOWN 📉'}. ${formatUnits(c.creatorAmount, 18)} USDT on the line! Can you beat me?`;
    const url = `${window.location.origin}/pk/${id}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  // Loading state
  if (!challenge) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="animate-spin text-6xl mb-4">⏳</div>
        <p className="text-[#8A9BA8]">{t('pk.loading', 'Loading challenge...')}</p>
      </div>
    );
  }

  const c = challenge as any;
  const isCreator = userAddress?.toLowerCase() === c.creator.toLowerCase();
  const isOpponent = userAddress?.toLowerCase() === c.opponent?.toLowerCase();

  // Render based on state
  const renderContent = () => {
    switch (c.state) {
      case ChallengeState.Created:
        return renderWaitingState();
      case ChallengeState.Active:
        return renderActiveState();
      case ChallengeState.Resolved:
        return renderResolvedState();
      case ChallengeState.Cancelled:
      case ChallengeState.Expired:
        return renderCancelledState();
      default:
        return null;
    }
  };

  // Waiting for opponent
  const renderWaitingState = () => (
    <div className="space-y-6">
      {isCreator ? (
        // Creator view - share link
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-white mb-4">
            {t('pk.waiting_opponent', 'Waiting for Opponent')}
          </h2>
          <p className="text-[#8A9BA8] mb-6">
            {t('pk.share_invite', 'Share the invite link with your friend to start the battle!')}
          </p>

          {/* Invite link */}
          <div className="bg-[#0A2342]/60 rounded-xl p-4 mb-6">
            <div className="text-sm text-[#8A9BA8] mb-2">{t('pk.invite_link', 'Invite Link')}</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={`${window.location.origin}/pk/${id}`}
                readOnly
                className="flex-1 px-4 py-3 bg-[#051525] border border-white/10 rounded-lg text-white text-sm font-mono"
              />
              <button
                onClick={copyInviteLink}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  copied ? 'bg-green-500 text-white' : 'bg-[#00C9A7] text-white hover:opacity-90'
                }`}
              >
                {copied ? '✓' : t('pk.copy', 'Copy')}
              </button>
            </div>
          </div>

          {/* Share buttons */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={shareToTwitter}
              className="px-6 py-3 bg-[#1DA1F2] text-white rounded-lg font-medium hover:opacity-90 flex items-center gap-2"
            >
              𝕏 Twitter
            </button>
            <button
              onClick={() => {
                const text = `Join my PK battle on IVY Predict!`;
                const url = `${window.location.origin}/pk/${id}`;
                window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
              }}
              className="px-6 py-3 bg-[#0088cc] text-white rounded-lg font-medium hover:opacity-90 flex items-center gap-2"
            >
              ✈️ Telegram
            </button>
          </div>

          {/* Cancel button */}
          <button
            onClick={handleCancel}
            disabled={isCancelPending || isCancelConfirming}
            className="px-6 py-3 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
          >
            {isCancelPending || isCancelConfirming ? t('pk.cancelling', 'Cancelling...') : t('pk.cancel_challenge', 'Cancel Challenge')}
          </button>
        </div>
      ) : (
        // Opponent view - accept challenge
        <div className="glass-card rounded-2xl p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">⚔️</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t('pk.accept_challenge', 'Accept Challenge')}
            </h2>
            <p className="text-[#8A9BA8]">
              {t('pk.challenger_bets', 'Challenger bets')} <span className={c.creatorDirection === 0 ? 'text-green-400' : 'text-red-400'}>
                {c.creatorDirection === 0 ? 'UP 📈' : 'DOWN 📉'}
              </span>
            </p>
          </div>

          {/* Amount input */}
          <div className="mb-6">
            <label className="text-sm text-[#8A9BA8] mb-2 block">{t('pk.your_stake', 'Your Stake')}</label>
            <div className="relative">
              <input
                type="number"
                value={acceptAmount}
                onChange={e => setAcceptAmount(e.target.value)}
                min={formatUnits(c.minAmount, 18)}
                max={formatUnits(c.maxAmount, 18)}
                className="w-full px-4 py-3 bg-[#0A2342]/60 border border-white/10 rounded-lg text-white focus:border-[#00C9A7] focus:outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A9BA8]">USDT</span>
            </div>
            <p className="text-sm text-[#8A9BA8] mt-2">
              {t('pk.amount_range', 'Range')}: {formatUnits(c.minAmount, 18)} - {formatUnits(c.maxAmount, 18)} USDT
            </p>
          </div>

          {/* Your prediction */}
          <div className="p-4 bg-[#0A2342]/60 rounded-xl mb-6">
            <div className="text-sm text-[#8A9BA8] mb-2">{t('pk.your_prediction', 'Your Prediction')}</div>
            <div className={`text-2xl font-bold ${c.creatorDirection === 0 ? 'text-red-400' : 'text-green-400'}`}>
              {c.creatorDirection === 0 ? '📉 DOWN (Price will fall)' : '📈 UP (Price will rise)'}
            </div>
          </div>

          {/* Action button */}
          {step === 'approve' ? (
            <button
              onClick={handleApprove}
              disabled={isApprovePending || isApproveConfirming}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xl font-bold rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              {isApprovePending || isApproveConfirming ? '⏳ Approving...' : '🔓 Approve USDT'}
            </button>
          ) : (
            <button
              onClick={handleAccept}
              disabled={isAcceptPending || isAcceptConfirming}
              className="w-full py-4 bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white text-xl font-bold rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              {isAcceptPending || isAcceptConfirming ? '⏳ Accepting...' : '⚔️ Accept Challenge'}
            </button>
          )}
        </div>
      )}
    </div>
  );

  // Battle in progress
  const renderActiveState = () => (
    <div className="space-y-6">
      {/* Countdown */}
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="text-sm text-[#8A9BA8] mb-2">{t('pk.time_remaining', 'Time Remaining')}</div>
        <CountdownTimer seconds={Number(timeRemaining || 0)} />
        <p className="text-[#8A9BA8] mt-4">
          {t('pk.battle_active', 'Battle is in progress. Result will be determined when time runs out.')}
        </p>
      </div>

      {/* Price info */}
      <div className="glass-card rounded-2xl p-6">
        <div className="text-center">
          <div className="text-sm text-[#8A9BA8] mb-2">{t('pk.start_price', 'Start Price')}</div>
          <div className="text-3xl font-bold text-white font-mono">
            ${(Number(c.startPrice) / 1e8).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Resolve button (when time is up) */}
      {canResolve && (
        <button
          onClick={handleResolve}
          disabled={isResolvePending || isResolveConfirming}
          className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xl font-bold rounded-xl hover:opacity-90 disabled:opacity-50"
        >
          {isResolvePending || isResolveConfirming ? '⏳ Resolving...' : '🏆 Resolve & Claim'}
        </button>
      )}
    </div>
  );

  // Battle resolved
  const renderResolvedState = () => {
    const isWinner = c.winner.toLowerCase() === userAddress?.toLowerCase();
    const isDraw = c.winner === '0x0000000000000000000000000000000000000000';
    const priceChange = Number(c.endPrice) - Number(c.startPrice);
    const priceChangePercent = ((priceChange / Number(c.startPrice)) * 100).toFixed(2);

    return (
      <div className="space-y-6">
        {/* Result banner */}
        <div className={`glass-card rounded-2xl p-8 text-center ${
          isDraw ? 'border-2 border-yellow-500/50' : isWinner ? 'border-2 border-green-500/50' : 'border-2 border-red-500/50'
        }`}>
          <div className="text-6xl mb-4">
            {isDraw ? '🤝' : isWinner ? '🏆' : '😢'}
          </div>
          <h2 className={`text-3xl font-bold mb-2 ${
            isDraw ? 'text-yellow-400' : isWinner ? 'text-green-400' : 'text-red-400'
          }`}>
            {isDraw ? t('pk.draw', 'Draw!') : isWinner ? t('pk.you_won', 'You Won!') : t('pk.you_lost', 'You Lost')}
          </h2>
          {!isDraw && (
            <p className="text-[#8A9BA8]">
              {t('pk.winner', 'Winner')}: {formatAddress(c.winner)}
            </p>
          )}
        </div>

        {/* Price change */}
        <div className="glass-card rounded-2xl p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-[#8A9BA8]">{t('pk.start_price', 'Start')}</div>
              <div className="text-xl font-bold text-white font-mono">
                ${(Number(c.startPrice) / 1e8).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-[#8A9BA8]">{t('pk.change', 'Change')}</div>
              <div className={`text-xl font-bold font-mono ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChangePercent}%
              </div>
            </div>
            <div>
              <div className="text-sm text-[#8A9BA8]">{t('pk.end_price', 'End')}</div>
              <div className="text-xl font-bold text-white font-mono">
                ${(Number(c.endPrice) / 1e8).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Share button */}
        <button
          onClick={shareToTwitter}
          className="w-full py-4 bg-[#1DA1F2] text-white text-xl font-bold rounded-xl hover:opacity-90"
        >
          📤 {t('pk.share_result', 'Share Result')}
        </button>
      </div>
    );
  };

  // Cancelled/Expired
  const renderCancelledState = () => (
    <div className="glass-card rounded-2xl p-8 text-center">
      <div className="text-6xl mb-4">{c.state === ChallengeState.Cancelled ? '❌' : '⏰'}</div>
      <h2 className="text-2xl font-bold text-white mb-4">
        {c.state === ChallengeState.Cancelled ? t('pk.cancelled', 'Challenge Cancelled') : t('pk.expired', 'Challenge Expired')}
      </h2>
      <p className="text-[#8A9BA8]">
        {c.state === ChallengeState.Cancelled
          ? t('pk.cancelled_desc', 'This challenge was cancelled by the creator.')
          : t('pk.expired_desc', 'This challenge expired without being accepted.')}
      </p>
      <button
        onClick={() => navigate('/pk')}
        className="mt-6 px-8 py-3 bg-[#00C9A7] text-white font-bold rounded-xl hover:opacity-90"
      >
        {t('pk.create_new', 'Create New Challenge')}
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">⚔️</div>
        <h1 className="font-display text-3xl font-bold text-white">
          PK #{id}
        </h1>
        <div className={`inline-block mt-2 px-4 py-1 rounded-full text-sm font-medium ${
          c.state === ChallengeState.Created ? 'bg-yellow-500/20 text-yellow-400' :
          c.state === ChallengeState.Active ? 'bg-blue-500/20 text-blue-400' :
          c.state === ChallengeState.Resolved ? 'bg-green-500/20 text-green-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {getStateLabel(c.state)}
        </div>
      </div>

      {/* Battle info */}
      <div className="glass-card rounded-2xl p-8 mb-8">
        <div className="flex items-center justify-between">
          {/* Creator */}
          <div className="text-center flex-1">
            <div className={`w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br ${
              c.creatorDirection === 0 ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600'
            } flex items-center justify-center text-3xl`}>
              {c.creatorDirection === 0 ? '📈' : '📉'}
            </div>
            <div className="text-white font-bold">
              {formatAddress(c.creator)}
              {isCreator && <span className="text-[#00C9A7] ml-1">(You)</span>}
            </div>
            <div className="text-2xl font-bold text-[#00C9A7] mt-2">
              {formatUnits(c.creatorAmount, 18)} USDT
            </div>
            <div className={`text-sm ${c.creatorDirection === 0 ? 'text-green-400' : 'text-red-400'}`}>
              {c.creatorDirection === 0 ? '📈 UP' : '📉 DOWN'}
            </div>
          </div>

          {/* VS */}
          <div className="px-8">
            <div className="text-4xl font-bold text-white/30">VS</div>
          </div>

          {/* Opponent */}
          <div className="text-center flex-1">
            <div className={`w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br ${
              c.opponent !== '0x0000000000000000000000000000000000000000'
                ? (c.creatorDirection === 0 ? 'from-red-500 to-rose-600' : 'from-green-500 to-emerald-600')
                : 'from-gray-500 to-gray-600'
            } flex items-center justify-center text-3xl`}>
              {c.opponent !== '0x0000000000000000000000000000000000000000'
                ? (c.creatorDirection === 0 ? '📉' : '📈')
                : '❓'}
            </div>
            <div className="text-white font-bold">
              {c.opponent !== '0x0000000000000000000000000000000000000000'
                ? formatAddress(c.opponent)
                : t('pk.waiting', 'Waiting...')}
              {isOpponent && <span className="text-[#00C9A7] ml-1">(You)</span>}
            </div>
            <div className="text-2xl font-bold text-[#00C9A7] mt-2">
              {c.opponentAmount > 0 ? formatUnits(c.opponentAmount, 18) : '?'} USDT
            </div>
            <div className={`text-sm ${c.creatorDirection === 0 ? 'text-red-400' : 'text-green-400'}`}>
              {c.creatorDirection === 0 ? '📉 DOWN' : '📈 UP'}
            </div>
          </div>
        </div>

        {/* Battle info */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-[#8A9BA8]">{t('pk.asset', 'Asset')}</div>
            <div className="text-lg font-bold text-white">{c.assetSymbol}</div>
          </div>
          <div>
            <div className="text-sm text-[#8A9BA8]">{t('pk.duration', 'Duration')}</div>
            <div className="text-lg font-bold text-white">{DURATION_LABELS[c.duration]}</div>
          </div>
          <div>
            <div className="text-sm text-[#8A9BA8]">{t('pk.total_pool', 'Total Pool')}</div>
            <div className="text-lg font-bold text-[#00C9A7]">
              {formatUnits(c.creatorAmount + c.opponentAmount, 18)} USDT
            </div>
          </div>
        </div>
      </div>

      {/* State-specific content */}
      {renderContent()}
    </div>
  );
}
