import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatUnits } from 'viem';
import { useAccount } from 'wagmi';
import {
  useOpenChallenges,
  useChallengeData,
  PriceDirection,
  DURATION_LABELS,
} from '../hooks/usePKChallenge';
import type { Challenge } from '../hooks/usePKChallenge';

// Asset icons
const ASSET_ICONS: Record<string, string> = {
  'BTC/USD': '₿',
  'ETH/USD': 'Ξ',
  'BNB/USD': '◆',
};

// Single challenge card component
function ChallengeCard({ challengeId }: { challengeId: bigint }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { address } = useAccount();
  const { data: challenge } = useChallengeData(challengeId) as { data: Challenge | undefined };

  if (!challenge) return null;

  // Don't show own challenges
  if (address && challenge.creator.toLowerCase() === address.toLowerCase()) {
    return null;
  }

  const isUp = challenge.creatorDirection === PriceDirection.UP;
  const opponentDirection = isUp ? 'DOWN' : 'UP';

  return (
    <div
      onClick={() => navigate(`/pk/${challengeId.toString()}`)}
      className="glass-card rounded-xl p-4 hover:border-[#00C9A7]/50 border border-transparent transition-all duration-300 cursor-pointer group"
    >
      {/* Header: Asset + Direction */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{ASSET_ICONS[challenge.assetSymbol] || '📈'}</span>
          <span className="text-white font-bold">{challenge.assetSymbol.replace('/USD', '')}</span>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          isUp ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
        }`}>
          {t('pk.challenger_bets', 'Challenger bets')} {isUp ? 'UP' : 'DOWN'}
        </div>
      </div>

      {/* Opponent will bet */}
      <div className="text-center py-3 mb-3 bg-[#0A2342]/60 rounded-lg">
        <div className="text-xs text-[#8A9BA8] mb-1">{t('openChallenge.you_bet', 'You will bet')}</div>
        <div className={`text-xl font-bold ${!isUp ? 'text-red-400' : 'text-green-400'}`}>
          {opponentDirection}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[#8A9BA8]">{t('pk.duration', 'Duration')}</span>
          <span className="text-white">{DURATION_LABELS[challenge.duration]}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#8A9BA8]">{t('pk.amount_range', 'Range')}</span>
          <span className="text-white">
            {formatUnits(challenge.minAmount, 18)} - {formatUnits(challenge.maxAmount, 18)} USDT
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#8A9BA8]">{t('pk.stake', 'Stake')}</span>
          <span className="text-[#00C9A7] font-medium">
            {formatUnits(challenge.creatorAmount, 18)} USDT
          </span>
        </div>
      </div>

      {/* Accept Button */}
      <button className="w-full mt-4 py-2.5 bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {t('pk.accept_challenge', 'Accept Challenge')} →
      </button>
    </div>
  );
}

// Main component
export default function OpenPKChallengeList() {
  const { t } = useTranslation();
  const { chain } = useAccount();
  const { data: openChallengeIds, isLoading } = useOpenChallenges() as { data: bigint[] | undefined; isLoading: boolean };

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
          {t('openChallenge.no_challenges', 'No Open Challenges')}
        </h3>
        <p className="text-[#8A9BA8]">
          {t('openChallenge.no_challenges_desc', 'Be the first to create a public challenge!')}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          🔥 {t('openChallenge.title', 'Open Challenges')}
          <span className="text-sm font-normal text-[#00C9A7] bg-[#00C9A7]/10 px-2 py-0.5 rounded-full">
            {openChallengeIds.length}
          </span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {openChallengeIds.map((id) => (
          <ChallengeCard key={id.toString()} challengeId={id} />
        ))}
      </div>
    </div>
  );
}
