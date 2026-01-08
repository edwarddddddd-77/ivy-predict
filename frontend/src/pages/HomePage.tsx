import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { getContractAddress } from '../contracts/addresses';
import FactoryABI from '../contracts/abis/PredictionMarketFactory.json';
import MarketCard from '../components/MarketCard';

export default function HomePage() {
  const { t } = useTranslation();
  const { chain } = useAccount();
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

  // Read total market count
  const { data: marketCount } = useReadContract({
    address: chain?.id ? getContractAddress(chain.id, 'FACTORY') as `0x${string}` : undefined,
    abi: FactoryABI.abi,
    functionName: 'getMarketCount',
  });

  // Read markets
  const { data: markets } = useReadContract({
    address: chain?.id ? getContractAddress(chain.id, 'FACTORY') as `0x${string}` : undefined,
    abi: FactoryABI.abi,
    functionName: 'getMarkets',
    args: [0n, marketCount || 10n],
  }) as { data: string[] | undefined };

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
        <h2 className="text-4xl font-bold mb-4">
          {t('home.hero_title')}
        </h2>
        <p className="text-xl mb-6 opacity-90">
          {t('home.hero_subtitle')}
        </p>
        <div className="grid grid-cols-3 gap-4 max-w-2xl">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold">{marketCount?.toString() || '0'}</div>
            <div className="text-sm opacity-80">{t('home.stats_markets')}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold">$0</div>
            <div className="text-sm opacity-80">{t('home.stats_volume')}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold">0</div>
            <div className="text-sm opacity-80">{t('home.stats_traders')}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900">{t('home.title')}</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('home.filter_all')}
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('home.filter_active')}
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'resolved'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('home.filter_resolved')}
          </button>
        </div>
      </div>

      {/* Markets Grid */}
      {!chain ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔗</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t('home.connect_wallet')}
          </h3>
          <p className="text-gray-600">
            {t('home.connect_message')}
          </p>
        </div>
      ) : markets && markets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {markets.map((marketAddress) => (
            <MarketCard key={marketAddress} address={marketAddress} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t('home.no_markets')}
          </h3>
          <p className="text-gray-600 mb-4">
            {t('home.no_markets_message')}
          </p>
          <a
            href="/create"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {t('home.create_market')}
          </a>
        </div>
      )}
    </div>
  );
}
