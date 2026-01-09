import { useAccount } from 'wagmi';
import { useTranslation } from 'react-i18next';

export default function PortfolioPage() {
  const { t } = useTranslation();
  const { address: userAddress } = useAccount();

  if (!userAddress) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 bg-prism-deep/30 border border-energy-cyan/20 rounded-2xl">
        <div className="text-7xl mb-6">💼</div>
        <h2 className="font-display text-2xl font-bold text-white mb-4">{t('portfolio.connect_title')}</h2>
        <p className="text-data-grey-light text-lg">{t('portfolio.connect_message')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="font-display text-4xl font-bold text-white mb-8">{t('portfolio.title')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-prism-deep/50 backdrop-blur-sm border border-energy-cyan/30 rounded-xl p-6 hover:border-energy-bright/50 transition-all duration-300">
          <div className="text-sm text-data-grey mb-2">{t('portfolio.total_value')}</div>
          <div className="font-mono text-3xl font-bold text-white">0 BNB</div>
          <div className="text-sm text-energy-cyan mt-1">+0%</div>
        </div>
        <div className="bg-prism-deep/50 backdrop-blur-sm border border-energy-cyan/30 rounded-xl p-6 hover:border-energy-bright/50 transition-all duration-300">
          <div className="text-sm text-data-grey mb-2">{t('portfolio.active_positions')}</div>
          <div className="font-mono text-3xl font-bold text-white">0</div>
        </div>
        <div className="bg-prism-deep/50 backdrop-blur-sm border border-energy-cyan/30 rounded-xl p-6 hover:border-energy-bright/50 transition-all duration-300">
          <div className="text-sm text-data-grey mb-2">{t('portfolio.total_pnl')}</div>
          <div className="font-mono text-3xl font-bold text-white">0 BNB</div>
        </div>
      </div>

      <div className="bg-prism-deep/50 backdrop-blur-sm border border-energy-cyan/30 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-energy-cyan/30">
          <h2 className="font-display text-2xl font-bold text-white">{t('portfolio.positions_title')}</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-20">
            <div className="text-7xl mb-6">📊</div>
            <h3 className="font-display text-2xl font-bold text-white mb-3">{t('portfolio.no_positions')}</h3>
            <p className="text-data-grey-light text-lg mb-8">{t('portfolio.no_positions_message')}</p>
            <a
              href="/"
              className="inline-block px-8 py-4 bg-brand-gradient text-white font-semibold rounded-lg shadow-glow-cyan hover:shadow-glow-cyan-lg transition-all duration-300 transform hover:scale-105"
            >
              {t('portfolio.browse_markets')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
