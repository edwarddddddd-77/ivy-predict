import { useAccount } from 'wagmi';
import { useTranslation } from 'react-i18next';

export default function PortfolioPage() {
  const { t } = useTranslation();
  const { address: userAddress } = useAccount();

  if (!userAddress) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 glass-card rounded-2xl">
        <div className="text-7xl mb-6">💼</div>
        <h2 className="font-display text-2xl font-bold text-white mb-4">{t('portfolio.connect_title')}</h2>
        <p className="text-[#8A9BA8] text-lg">{t('portfolio.connect_message')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6">
      <h1 className="font-display text-4xl font-bold text-white mb-8">{t('portfolio.title')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card rounded-xl p-6">
          <div className="text-sm text-[#8A9BA8] mb-2">{t('portfolio.total_value')}</div>
          <div className="font-mono text-3xl font-bold text-white">0 BNB</div>
          <div className="text-sm text-[#00C9A7] mt-1">+0%</div>
        </div>
        <div className="glass-card rounded-xl p-6">
          <div className="text-sm text-[#8A9BA8] mb-2">{t('portfolio.active_positions')}</div>
          <div className="font-mono text-3xl font-bold text-white">0</div>
        </div>
        <div className="glass-card rounded-xl p-6">
          <div className="text-sm text-[#8A9BA8] mb-2">{t('portfolio.total_pnl')}</div>
          <div className="font-mono text-3xl font-bold text-white">0 BNB</div>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="font-display text-2xl font-bold text-white">{t('portfolio.positions_title')}</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-20">
            <div className="text-7xl mb-6">📊</div>
            <h3 className="font-display text-2xl font-bold text-white mb-3">{t('portfolio.no_positions')}</h3>
            <p className="text-[#8A9BA8] text-lg mb-8">{t('portfolio.no_positions_message')}</p>
            <a
              href="/"
              className="inline-block px-8 py-4 bg-gradient-to-r from-[#005F6B] to-[#0A2342] text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              {t('portfolio.browse_markets')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
