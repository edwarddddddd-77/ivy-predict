import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { useTranslation } from 'react-i18next';
import { getContractAddress } from '../contracts/addresses';
import EventPKChallengeABI from '../contracts/abis/EventPKChallenge.json';
import MockUSDTABI from '../contracts/abis/MockUSDT.json';
import { useReferral } from '../contexts/ReferralContext';
import {
  useEventChallengeData,
  EventChallengeState,
  Position,
  EventResult,
  formatAddress,
  CATEGORIES,
} from '../hooks/useEventPKChallenge';
import ShareCardV2 from '../components/ShareCardV2';

export default function EventPKBattlePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address: userAddress, chain } = useAccount();
  const { referrer } = useReferral();

  const challengeId = id ? BigInt(id) : undefined;

  // Contract addresses
  const eventPKChallengeAddress = chain?.id
    ? getContractAddress(chain.id, 'EVENT_PK_CHALLENGE') as `0x${string}`
    : undefined;
  const usdtAddress = chain?.id
    ? getContractAddress(chain.id, 'MOCK_USDT') as `0x${string}`
    : undefined;

  // Read challenge data
  const { data: challenge, refetch: refetchChallenge } = useEventChallengeData(challengeId);

  // Accept amount state
  const [acceptAmount, setAcceptAmount] = useState('');
  const [step, setStep] = useState<'approve' | 'accept'>('approve');
  const [copied, setCopied] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [selectedVote, setSelectedVote] = useState<number | null>(null);

  // Read USDT allowance
  const { data: usdtAllowance, refetch: refetchAllowance } = useReadContract({
    address: usdtAddress,
    abi: MockUSDTABI.abi,
    functionName: 'allowance',
    args: userAddress && eventPKChallengeAddress ? [userAddress, eventPKChallengeAddress] : undefined,
  });

  // Contract writes
  const { data: approveHash, writeContract: writeApprove, isPending: isApprovePending } = useWriteContract();
  const { data: acceptHash, writeContract: writeAccept, isPending: isAcceptPending } = useWriteContract();
  const { data: voteHash, writeContract: writeVote, isPending: isVotePending } = useWriteContract();
  const { data: cancelHash, writeContract: writeCancel, isPending: isCancelPending } = useWriteContract();

  // Transaction receipts
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isAcceptConfirming, isSuccess: isAcceptSuccess } = useWaitForTransactionReceipt({ hash: acceptHash });
  const { isLoading: isVoteConfirming, isSuccess: isVoteSuccess } = useWaitForTransactionReceipt({ hash: voteHash });
  const { isLoading: isCancelConfirming, isSuccess: isCancelSuccess } = useWaitForTransactionReceipt({ hash: cancelHash });

  // Set default accept amount
  useEffect(() => {
    if (challenge && !acceptAmount) {
      const c = challenge as any;
      const minAmount = formatUnits(c.minAmount, 18);
      setAcceptAmount(minAmount);
    }
  }, [challenge, acceptAmount]);

  // Check approval status
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

  // Refetch on success
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
    }
    if (isAcceptSuccess || isVoteSuccess || isCancelSuccess) {
      refetchChallenge();
    }
  }, [isApproveSuccess, isAcceptSuccess, isVoteSuccess, isCancelSuccess, refetchAllowance, refetchChallenge]);

  // Handle approve
  const handleApprove = () => {
    if (!usdtAddress || !eventPKChallengeAddress) return;

    writeApprove({
      address: usdtAddress,
      abi: MockUSDTABI.abi,
      functionName: 'approve',
      args: [eventPKChallengeAddress, parseUnits('1000000', 18)],
    });
  };

  // Handle accept
  const handleAccept = () => {
    if (!eventPKChallengeAddress || challengeId === undefined) return;

    writeAccept({
      address: eventPKChallengeAddress,
      abi: EventPKChallengeABI.abi,
      functionName: 'acceptChallenge',
      args: [
        challengeId,
        parseUnits(acceptAmount, 18),
        referrer || '0x0000000000000000000000000000000000000000',
      ],
    });
  };

  // Handle vote
  const handleVote = () => {
    if (!eventPKChallengeAddress || challengeId === undefined || selectedVote === null) return;

    writeVote({
      address: eventPKChallengeAddress,
      abi: EventPKChallengeABI.abi,
      functionName: 'submitVote',
      args: [challengeId, selectedVote],
    });
  };

  // Handle cancel
  const handleCancel = () => {
    if (!eventPKChallengeAddress || challengeId === undefined) return;

    writeCancel({
      address: eventPKChallengeAddress,
      abi: EventPKChallengeABI.abi,
      functionName: 'cancelChallenge',
      args: [challengeId],
    });
  };

  // Copy invite link
  const handleCopyLink = () => {
    const link = `${window.location.origin}/event-pk/${id}${referrer ? `?ref=${referrer}` : ''}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading state
  if (!challenge) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="animate-spin text-6xl mb-4">⏳</div>
        <p className="text-[#8A9BA8]">{t('eventPk.loading', 'Loading challenge...')}</p>
      </div>
    );
  }

  const c = challenge as any;
  const isCreator = userAddress?.toLowerCase() === c.creator.toLowerCase();
  const isOpponent = userAddress?.toLowerCase() === c.opponent?.toLowerCase();
  const canVote = (isCreator && !c.creatorVoted) || (isOpponent && !c.opponentVoted);
  const resolveTimeReached = Date.now() / 1000 >= Number(c.resolveTime);

  // Get category emoji
  const categoryEmoji = CATEGORIES.find(cat => cat.value === c.category)?.emoji || '🔮';

  // Render waiting state (Created)
  const renderWaitingState = () => (
    <div className="space-y-6">
      {/* Share section for creator */}
      {isCreator && (
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="text-2xl mb-2">📤</div>
          <h3 className="text-xl font-bold text-white mb-2">
            {t('eventPk.share_challenge', 'Share Your Challenge')}
          </h3>
          <p className="text-[#8A9BA8] mb-4">
            {t('eventPk.share_desc', 'Send the link to someone who disagrees with you!')}
          </p>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/event-pk/${id}`}
              className="flex-1 px-4 py-3 bg-[#0A2342]/50 border border-white/10 rounded-lg text-white text-sm"
            />
            <button
              onClick={handleCopyLink}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-[#00C9A7] text-white hover:opacity-90'
              }`}
            >
              {copied ? '✓' : t('eventPk.copy', 'Copy')}
            </button>
          </div>

          <button
            onClick={handleCancel}
            disabled={isCancelPending || isCancelConfirming}
            className="text-red-400 hover:text-red-300 transition-all"
          >
            {isCancelPending || isCancelConfirming
              ? t('eventPk.cancelling', 'Cancelling...')
              : t('eventPk.cancel_challenge', 'Cancel Challenge')}
          </button>
        </div>
      )}

      {/* Accept section for opponent */}
      {!isCreator && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 text-center">
            {t('eventPk.accept_challenge', 'Accept This Challenge')}
          </h3>

          <div className="text-center mb-6">
            <div className="text-sm text-[#8A9BA8] mb-1">
              {t('eventPk.opponent_bets', 'You will bet')}
            </div>
            <div className={`text-3xl font-bold ${c.creatorPosition === Position.YES ? 'text-red-400' : 'text-green-400'}`}>
              {c.creatorPosition === Position.YES ? 'NO' : 'YES'}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm text-[#8A9BA8] mb-2 block">
              {t('eventPk.your_stake', 'Your Stake')} ({formatUnits(c.minAmount, 18)} - {formatUnits(c.maxAmount, 18)} USDT)
            </label>
            <input
              type="number"
              value={acceptAmount}
              onChange={(e) => setAcceptAmount(e.target.value)}
              min={formatUnits(c.minAmount, 18)}
              max={formatUnits(c.maxAmount, 18)}
              className="w-full px-4 py-3 bg-[#0A2342]/30 border border-white/10 rounded-lg text-white text-center text-xl focus:outline-none focus:border-[#00C9A7]"
            />
          </div>

          {step === 'approve' ? (
            <button
              onClick={handleApprove}
              disabled={isApprovePending || isApproveConfirming}
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xl font-bold rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              {isApprovePending || isApproveConfirming
                ? t('eventPk.approving', 'Approving...')
                : t('eventPk.approve_usdt', 'Approve USDT')}
            </button>
          ) : (
            <button
              onClick={handleAccept}
              disabled={isAcceptPending || isAcceptConfirming}
              className="w-full py-4 bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white text-xl font-bold rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              {isAcceptPending || isAcceptConfirming
                ? t('eventPk.accepting', 'Accepting...')
                : t('eventPk.accept_bet', 'Accept Bet')}
            </button>
          )}
        </div>
      )}
    </div>
  );

  // Render active state (waiting for resolution)
  const renderActiveState = () => (
    <div className="space-y-6">
      {/* Status */}
      <div className="glass-card rounded-2xl p-6 text-center">
        {!resolveTimeReached ? (
          <>
            <div className="text-4xl mb-2">⏳</div>
            <h3 className="text-xl font-bold text-white mb-2">
              {t('eventPk.waiting_resolve', 'Waiting for Resolution Time')}
            </h3>
            <p className="text-[#8A9BA8]">
              {t('eventPk.resolve_at', 'Can be resolved after')}: {' '}
              <span className="text-white">
                {new Date(Number(c.resolveTime) * 1000).toLocaleDateString()}
              </span>
            </p>
          </>
        ) : canVote ? (
          <>
            <div className="text-4xl mb-2">🗳️</div>
            <h3 className="text-xl font-bold text-white mb-4">
              {t('eventPk.submit_vote', 'Submit Your Vote')}
            </h3>
            <p className="text-[#8A9BA8] mb-6">
              {t('eventPk.vote_desc', 'What was the actual outcome?')}
            </p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <button
                onClick={() => setSelectedVote(EventResult.YES_Wins)}
                className={`p-4 rounded-xl transition-all ${
                  selectedVote === EventResult.YES_Wins
                    ? 'bg-green-600 border-2 border-green-400'
                    : 'bg-[#0A2342]/30 border border-white/10 hover:border-green-500/50'
                }`}
              >
                <div className="text-2xl mb-1">👍</div>
                <div className="text-white font-bold">YES</div>
              </button>
              <button
                onClick={() => setSelectedVote(EventResult.NO_Wins)}
                className={`p-4 rounded-xl transition-all ${
                  selectedVote === EventResult.NO_Wins
                    ? 'bg-red-600 border-2 border-red-400'
                    : 'bg-[#0A2342]/30 border border-white/10 hover:border-red-500/50'
                }`}
              >
                <div className="text-2xl mb-1">👎</div>
                <div className="text-white font-bold">NO</div>
              </button>
              <button
                onClick={() => setSelectedVote(EventResult.Draw)}
                className={`p-4 rounded-xl transition-all ${
                  selectedVote === EventResult.Draw
                    ? 'bg-yellow-600 border-2 border-yellow-400'
                    : 'bg-[#0A2342]/30 border border-white/10 hover:border-yellow-500/50'
                }`}
              >
                <div className="text-2xl mb-1">🤝</div>
                <div className="text-white font-bold">Draw</div>
              </button>
            </div>

            <button
              onClick={handleVote}
              disabled={isVotePending || isVoteConfirming || selectedVote === null}
              className="w-full py-4 bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white text-xl font-bold rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              {isVotePending || isVoteConfirming
                ? t('eventPk.submitting', 'Submitting...')
                : t('eventPk.submit', 'Submit Vote')}
            </button>
          </>
        ) : (
          <>
            <div className="text-4xl mb-2">✅</div>
            <h3 className="text-xl font-bold text-white mb-2">
              {t('eventPk.voted', 'You have voted')}
            </h3>
            <p className="text-[#8A9BA8]">
              {t('eventPk.waiting_other', 'Waiting for the other party to vote...')}
            </p>
          </>
        )}
      </div>

      {/* Vote status */}
      <div className="glass-card rounded-2xl p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-sm text-[#8A9BA8] mb-1">{t('eventPk.creator_vote', 'Creator Vote')}</div>
            <div className={`text-lg font-bold ${c.creatorVoted ? 'text-green-400' : 'text-[#8A9BA8]'}`}>
              {c.creatorVoted ? '✓ Voted' : '⏳ Pending'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-[#8A9BA8] mb-1">{t('eventPk.opponent_vote', 'Opponent Vote')}</div>
            <div className={`text-lg font-bold ${c.opponentVoted ? 'text-green-400' : 'text-[#8A9BA8]'}`}>
              {c.opponentVoted ? '✓ Voted' : '⏳ Pending'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render resolved state
  const renderResolvedState = () => {
    const isWinner = userAddress?.toLowerCase() === c.winner?.toLowerCase();
    const isDraw = c.result === EventResult.Draw;
    const totalPool = Number(formatUnits(c.creatorAmount, 18)) + Number(formatUnits(c.opponentAmount, 18));

    return (
      <div className="space-y-6">
        <div className="glass-card rounded-2xl p-8 text-center">
          {isDraw ? (
            <>
              <div className="text-6xl mb-4">🤝</div>
              <h2 className="text-3xl font-bold text-yellow-400 mb-2">
                {t('eventPk.draw', 'Draw!')}
              </h2>
              <p className="text-[#8A9BA8]">
                {t('eventPk.draw_desc', 'Stakes have been returned to both parties.')}
              </p>
            </>
          ) : isWinner ? (
            <>
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-3xl font-bold text-green-400 mb-2">
                {t('eventPk.you_won', 'You Won!')}
              </h2>
              <p className="text-[#8A9BA8] mb-4">
                {t('eventPk.won_amount', 'You won approximately')}
              </p>
              <div className="text-4xl font-bold text-[#00C9A7]">
                ~{(totalPool * 0.98).toFixed(2)} USDT
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">😢</div>
              <h2 className="text-3xl font-bold text-red-400 mb-2">
                {t('eventPk.you_lost', 'You Lost')}
              </h2>
              <p className="text-[#8A9BA8]">
                {t('eventPk.lost_desc', 'Better luck next time!')}
              </p>
            </>
          )}

          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="text-sm text-[#8A9BA8] mb-2">{t('eventPk.result', 'Result')}</div>
            <div className={`text-xl font-bold ${c.result === EventResult.YES_Wins ? 'text-green-400' : 'text-red-400'}`}>
              {c.result === EventResult.YES_Wins ? 'YES' : 'NO'}
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowShareCard(true)}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xl font-bold rounded-xl hover:opacity-90"
        >
          📤 {t('eventPk.share_result', 'Share Result')}
        </button>

        <button
          onClick={() => navigate('/event-pk')}
          className="w-full py-4 border border-[#00C9A7] text-[#00C9A7] text-xl font-bold rounded-xl hover:bg-[#00C9A7]/10"
        >
          {t('eventPk.create_new', 'Create New Challenge')}
        </button>
      </div>
    );
  };

  // Render cancelled/expired state
  const renderCancelledState = () => (
    <div className="glass-card rounded-2xl p-8 text-center">
      <div className="text-6xl mb-4">{c.state === EventChallengeState.Cancelled ? '❌' : '⏰'}</div>
      <h2 className="text-2xl font-bold text-[#8A9BA8] mb-2">
        {c.state === EventChallengeState.Cancelled
          ? t('eventPk.cancelled', 'Challenge Cancelled')
          : t('eventPk.expired', 'Challenge Expired')}
      </h2>
      <p className="text-[#8A9BA8] mb-6">
        {c.state === EventChallengeState.Cancelled
          ? t('eventPk.cancelled_desc', 'This challenge was cancelled by the creator.')
          : t('eventPk.expired_desc', 'This challenge expired without being accepted.')}
      </p>
      <button
        onClick={() => navigate('/event-pk')}
        className="px-8 py-3 bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white font-bold rounded-xl"
      >
        {t('eventPk.create_new', 'Create New Challenge')}
      </button>
    </div>
  );

  // Render disputed state
  const renderDisputedState = () => (
    <div className="glass-card rounded-2xl p-8 text-center">
      <div className="text-6xl mb-4">⚖️</div>
      <h2 className="text-2xl font-bold text-yellow-400 mb-2">
        {t('eventPk.disputed', 'Challenge Disputed')}
      </h2>
      <p className="text-[#8A9BA8]">
        {t('eventPk.disputed_desc', 'Both parties voted differently. Waiting for oracle resolution...')}
      </p>
    </div>
  );

  // Render based on state
  const renderContent = () => {
    switch (c.state) {
      case EventChallengeState.Created:
        return renderWaitingState();
      case EventChallengeState.Active:
        return renderActiveState();
      case EventChallengeState.Resolved:
        return renderResolvedState();
      case EventChallengeState.Cancelled:
      case EventChallengeState.Expired:
        return renderCancelledState();
      case EventChallengeState.Disputed:
        return renderDisputedState();
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Challenge Header */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-3xl">{categoryEmoji}</span>
          <span className="text-sm text-[#8A9BA8] px-3 py-1 bg-[#0A2342]/50 rounded-full">
            {c.category}
          </span>
          <span className="text-sm text-[#8A9BA8]">#{id}</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-6">"{c.question}"</h1>

        {/* Positions */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl ${c.creatorPosition === Position.YES ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
            <div className="text-sm text-[#8A9BA8] mb-1">{t('eventPk.creator', 'Creator')}</div>
            <div className="text-white font-mono text-sm mb-2">{formatAddress(c.creator)}</div>
            <div className={`text-xl font-bold ${c.creatorPosition === Position.YES ? 'text-green-400' : 'text-red-400'}`}>
              {c.creatorPosition === Position.YES ? 'YES' : 'NO'}
            </div>
            <div className="text-[#00C9A7] font-mono">{formatUnits(c.creatorAmount, 18)} USDT</div>
          </div>

          <div className={`p-4 rounded-xl ${c.opponent ? (c.creatorPosition === Position.YES ? 'bg-red-500/20 border border-red-500/50' : 'bg-green-500/20 border border-green-500/50') : 'bg-[#0A2342]/30 border border-white/10'}`}>
            <div className="text-sm text-[#8A9BA8] mb-1">{t('eventPk.opponent', 'Opponent')}</div>
            {c.opponent && c.opponent !== '0x0000000000000000000000000000000000000000' ? (
              <>
                <div className="text-white font-mono text-sm mb-2">{formatAddress(c.opponent)}</div>
                <div className={`text-xl font-bold ${c.creatorPosition === Position.YES ? 'text-red-400' : 'text-green-400'}`}>
                  {c.creatorPosition === Position.YES ? 'NO' : 'YES'}
                </div>
                <div className="text-[#00C9A7] font-mono">{formatUnits(c.opponentAmount, 18)} USDT</div>
              </>
            ) : (
              <div className="text-[#8A9BA8]">{t('eventPk.waiting', 'Waiting...')}</div>
            )}
          </div>
        </div>

        {/* Total Pool */}
        {c.opponent && c.opponent !== '0x0000000000000000000000000000000000000000' && (
          <div className="mt-4 pt-4 border-t border-white/10 text-center">
            <div className="text-sm text-[#8A9BA8]">{t('eventPk.total_pool', 'Total Pool')}</div>
            <div className="text-2xl font-bold text-[#00C9A7]">
              {(Number(formatUnits(c.creatorAmount, 18)) + Number(formatUnits(c.opponentAmount, 18))).toFixed(2)} USDT
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Content */}
      {renderContent()}

      {/* Share Card Modal */}
      {showShareCard && (
        <ShareCardV2
          type="pk_result"
          data={{
            challengeId: id || '',
            assetSymbol: c.category,
            isWinner: userAddress?.toLowerCase() === c.winner?.toLowerCase(),
            isDraw: c.result === EventResult.Draw,
          }}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </div>
  );
}
