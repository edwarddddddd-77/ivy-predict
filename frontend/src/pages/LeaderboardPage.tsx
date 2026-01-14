import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccount } from 'wagmi';

// Mock leaderboard data - will be replaced with real data from contract/API
const MOCK_LEADERBOARD = [
  { rank: 1, address: '0x1234...5678', predictions: 156, winRate: 72.4, profit: 12.5 },
  { rank: 2, address: '0x2345...6789', predictions: 203, winRate: 68.2, profit: 9.8 },
  { rank: 3, address: '0x3456...7890', predictions: 89, winRate: 71.1, profit: 7.2 },
  { rank: 4, address: '0x4567...8901', predictions: 134, winRate: 65.7, profit: 5.4 },
  { rank: 5, address: '0x5678...9012', predictions: 178, winRate: 62.3, profit: 4.1 },
  { rank: 6, address: '0x6789...0123', predictions: 67, winRate: 67.2, profit: 3.8 },
  { rank: 7, address: '0x7890...1234', predictions: 245, winRate: 58.4, profit: 2.9 },
  { rank: 8, address: '0x8901...2345', predictions: 112, winRate: 61.6, profit: 2.3 },
  { rank: 9, address: '0x9012...3456', predictions: 98, winRate: 59.2, profit: 1.7 },
  { rank: 10, address: '0x0123...4567', predictions: 156, winRate: 55.8, profit: 1.2 },
];

type TimeFilter = '24h' | '7d' | '30d' | 'all';

function getRankBadge(rank: number) {
  if (rank === 1) return { emoji: '🥇', color: 'from-yellow-400 to-yellow-600' };
  if (rank === 2) return { emoji: '🥈', color: 'from-gray-300 to-gray-500' };
  if (rank === 3) return { emoji: '🥉', color: 'from-orange-400 to-orange-600' };
  return { emoji: `#${rank}`, color: 'from-[#0A2342] to-[#0A2342]' };
}

function formatAddress(address: string) {
  if (address.length <= 13) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function LeaderboardPage() {
  const { t } = useTranslation();
  const { address: userAddress } = useAccount();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7d');

  const timeFilters: { key: TimeFilter; label: string }[] = [
    { key: '24h', label: '24H' },
    { key: '7d', label: '7D' },
    { key: '30d', label: '30D' },
    { key: 'all', label: 'All Time' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl font-bold text-white mb-4">
          🏆 {t('leaderboard.title', 'Leaderboard')}
        </h1>
        <p className="text-[#8A9BA8] text-lg">
          {t('leaderboard.subtitle', 'Top predictors ranked by performance')}
        </p>
      </div>

      {/* Time Filter */}
      <div className="flex justify-center gap-2 mb-8">
        {timeFilters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setTimeFilter(filter.key)}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              timeFilter === filter.key
                ? 'bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white'
                : 'bg-[#0A2342]/60 text-[#8A9BA8] hover:bg-[#0A2342] hover:text-white border border-white/10'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card rounded-xl p-5 text-center">
          <div className="text-3xl mb-2">👥</div>
          <div className="text-sm text-[#8A9BA8] mb-1">{t('leaderboard.total_traders', 'Total Traders')}</div>
          <div className="font-mono text-2xl font-bold text-white">1,234</div>
        </div>
        <div className="glass-card rounded-xl p-5 text-center">
          <div className="text-3xl mb-2">📊</div>
          <div className="text-sm text-[#8A9BA8] mb-1">{t('leaderboard.total_predictions', 'Total Predictions')}</div>
          <div className="font-mono text-2xl font-bold text-white">45,678</div>
        </div>
        <div className="glass-card rounded-xl p-5 text-center">
          <div className="text-3xl mb-2">💰</div>
          <div className="text-sm text-[#8A9BA8] mb-1">{t('leaderboard.total_volume', 'Total Volume')}</div>
          <div className="font-mono text-2xl font-bold text-white">12,345 USDT</div>
        </div>
        <div className="glass-card rounded-xl p-5 text-center">
          <div className="text-3xl mb-2">🎯</div>
          <div className="text-sm text-[#8A9BA8] mb-1">{t('leaderboard.avg_win_rate', 'Avg Win Rate')}</div>
          <div className="font-mono text-2xl font-bold text-[#00C9A7]">58.3%</div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="font-display text-2xl font-bold text-white">
            🔥 {t('leaderboard.top_predictors', 'Top Predictors')}
          </h2>
        </div>

        {/* Table Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-[#0A2342]/40 text-sm text-[#8A9BA8] font-medium">
          <div className="col-span-1">{t('leaderboard.rank', 'Rank')}</div>
          <div className="col-span-4">{t('leaderboard.trader', 'Trader')}</div>
          <div className="col-span-2 text-center">{t('leaderboard.predictions', 'Predictions')}</div>
          <div className="col-span-2 text-center">{t('leaderboard.win_rate', 'Win Rate')}</div>
          <div className="col-span-3 text-right">{t('leaderboard.profit', 'Profit (USDT)')}</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-white/5">
          {MOCK_LEADERBOARD.map((trader) => {
            const badge = getRankBadge(trader.rank);
            const isCurrentUser = userAddress && trader.address.includes(userAddress.slice(2, 6));

            return (
              <div
                key={trader.rank}
                className={`grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-white/5 transition-colors ${
                  isCurrentUser ? 'bg-[#00C9A7]/10 border-l-4 border-[#00C9A7]' : ''
                }`}
              >
                {/* Rank */}
                <div className="col-span-12 md:col-span-1">
                  <span
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${badge.color} text-white font-bold text-sm`}
                  >
                    {trader.rank <= 3 ? badge.emoji : trader.rank}
                  </span>
                </div>

                {/* Trader Address */}
                <div className="col-span-12 md:col-span-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00C9A7] to-[#005F6B] flex items-center justify-center text-lg">
                      {trader.rank <= 3 ? badge.emoji : '👤'}
                    </div>
                    <div>
                      <div className="font-mono text-white font-medium">
                        {formatAddress(trader.address)}
                      </div>
                      {isCurrentUser && (
                        <span className="text-xs text-[#00C9A7] font-medium">
                          {t('leaderboard.you', 'You')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Predictions */}
                <div className="col-span-4 md:col-span-2 text-center">
                  <span className="md:hidden text-xs text-[#8A9BA8] mr-2">Predictions:</span>
                  <span className="font-mono text-white">{trader.predictions}</span>
                </div>

                {/* Win Rate */}
                <div className="col-span-4 md:col-span-2 text-center">
                  <span className="md:hidden text-xs text-[#8A9BA8] mr-2">Win Rate:</span>
                  <span
                    className={`font-mono font-medium ${
                      trader.winRate >= 60 ? 'text-[#00C9A7]' : trader.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}
                  >
                    {trader.winRate}%
                  </span>
                </div>

                {/* Profit */}
                <div className="col-span-4 md:col-span-3 text-right">
                  <span className="md:hidden text-xs text-[#8A9BA8] mr-2">Profit:</span>
                  <span className="font-mono text-[#00C9A7] font-bold">
                    +{trader.profit} USDT
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More */}
        <div className="p-6 text-center border-t border-white/10">
          <button className="px-8 py-3 bg-[#0A2342]/60 text-[#8A9BA8] font-medium rounded-lg hover:bg-[#0A2342] hover:text-white transition-all border border-white/10">
            {t('leaderboard.load_more', 'Load More')}
          </button>
        </div>
      </div>

      {/* Your Rank Card (if connected) */}
      {userAddress && (
        <div className="mt-8 glass-card rounded-2xl p-6">
          <h3 className="font-display text-xl font-bold text-white mb-4">
            📍 {t('leaderboard.your_ranking', 'Your Ranking')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm text-[#8A9BA8] mb-1">{t('leaderboard.your_rank', 'Rank')}</div>
              <div className="font-mono text-2xl font-bold text-white">#--</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-[#8A9BA8] mb-1">{t('leaderboard.your_predictions', 'Predictions')}</div>
              <div className="font-mono text-2xl font-bold text-white">--</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-[#8A9BA8] mb-1">{t('leaderboard.your_win_rate', 'Win Rate')}</div>
              <div className="font-mono text-2xl font-bold text-[#00C9A7]">--%</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-[#8A9BA8] mb-1">{t('leaderboard.your_profit', 'Profit')}</div>
              <div className="font-mono text-2xl font-bold text-[#00C9A7]">-- USDT</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
