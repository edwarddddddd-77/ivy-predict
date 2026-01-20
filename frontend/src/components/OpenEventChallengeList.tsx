import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatUnits } from 'viem';
import { useAccount } from 'wagmi';
import {
  useOpenEventChallenges,
  useEventChallengeData,
  Position,
  CATEGORIES,
} from '../hooks/useEventPKChallenge';
import type { EventChallenge } from '../hooks/useEventPKChallenge';

// Get category emoji
function getCategoryEmoji(category: string): string {
  const cat = CATEGORIES.find(c => c.value === category);
  return cat?.emoji || '🔮';
}

// Single challenge card component
function EventChallengeCard({ challengeId }: { challengeId: bigint }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { address } = useAccount();
  const { data: challenge } = useEventChallengeData(challengeId) as { data: EventChallenge | undefined };

  if (!challenge) return null;

  // Don't show own challenges
  if (address && challenge.creator.toLowerCase() === address.toLowerCase()) {
    return null;
  }

  const isYes = challenge.creatorPosition === Position.YES;
  const opponentPosition = isYes ? 'NO' : 'YES';

  // Truncate question
  const truncatedQuestion = challenge.question.length > 60
    ? challenge.question.substring(0, 60) + '...'
    : challenge.question;

  return (
    <div
      onClick={() => navigate(`/event-pk/${challengeId.toString()}`)}
      className="glass-card rounded-xl p-4 hover:border-[#00C9A7]/50 border border-transparent transition-all duration-300 cursor-pointer group"
    >
      {/* Header: Category + Stake */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getCategoryEmoji(challenge.category)}</span>
          <span className="text-[#8A9BA8] text-sm">{challenge.category}</span>
        </div>
        <div className="text-[#00C9A7] font-medium text-sm">
          {formatUnits(challenge.creatorAmount, 18)} USDT
        </div>
      </div>

      {/* Question */}
      <p className="text-white font-medium mb-3 min-h-[48px]">
        {truncatedQuestion}
      </p>

      {/* Creator's position */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#8A9BA8] text-sm">{t('pk.challenger_bets', 'Challenger bets')}:</span>
        <span className={`px-2 py-0.5 rounded text-sm font-medium ${
          isYes ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {isYes ? 'YES' : 'NO'}
        </span>
      </div>

      {/* Opponent will bet */}
      <div className="text-center py-3 mb-3 bg-[#0A2342]/60 rounded-lg">
        <div className="text-xs text-[#8A9BA8] mb-1">{t('openChallenge.you_bet', 'You will bet')}</div>
        <div className={`text-xl font-bold ${opponentPosition === 'YES' ? 'text-green-400' : 'text-red-400'}`}>
          {opponentPosition}
        </div>
      </div>

      {/* Amount range */}
      <div className="flex justify-between text-sm mb-3">
        <span className="text-[#8A9BA8]">{t('pk.amount_range', 'Range')}</span>
        <span className="text-white">
          {formatUnits(challenge.minAmount, 18)} - {formatUnits(challenge.maxAmount, 18)} USDT
        </span>
      </div>

      {/* Accept Button */}
      <button className="w-full py-2.5 bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {t('eventPk.accept_challenge', 'Accept Challenge')} →
      </button>
    </div>
  );
}

// Main component
export default function OpenEventChallengeList() {
  const { t } = useTranslation();
  const { chain } = useAccount();
  const { data: openChallengeIds, isLoading } = useOpenEventChallenges() as { data: bigint[] | undefined; isLoading: boolean };

  if (!chain) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="text-[#8A9BA8]">{t('common.loading', 'Loading...')}</p>
      </div>
    );
  }

  if (!openChallengeIds || openChallengeIds.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">🎯</div>
        <h3 className="text-xl font-bold text-white mb-2">
          {t('openChallenge.no_event_challenges', 'No Open Event Challenges')}
        </h3>
        <p className="text-[#8A9BA8]">
          {t('openChallenge.no_event_challenges_desc', 'Be the first to create a public event challenge!')}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          🔥 {t('openChallenge.event_title', 'Open Event Challenges')}
          <span className="text-sm font-normal text-[#00C9A7] bg-[#00C9A7]/10 px-2 py-0.5 rounded-full">
            {openChallengeIds.length}
          </span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {openChallengeIds.map((id) => (
          <EventChallengeCard key={id.toString()} challengeId={id} />
        ))}
      </div>
    </div>
  );
}
