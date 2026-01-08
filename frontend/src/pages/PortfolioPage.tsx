import { useAccount } from 'wagmi';
import { useTranslation } from 'react-i18next';

export default function PortfolioPage() {
  const { t } = useTranslation();
  const { address: userAddress } = useAccount();

  if (!userAddress) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="text-6xl mb-4">💼</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('portfolio.title')}</h2>
        <p className="text-gray-600 mb-6">{t('portfolio.connect_message')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('portfolio.title')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">{t('portfolio.total_value')}</div>
          <div className="text-3xl font-bold text-gray-900">0 BNB</div>
          <div className="text-sm text-green-600 mt-1">+0%</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">{t('portfolio.active_positions')}</div>
          <div className="text-3xl font-bold text-gray-900">0</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">{t('portfolio.total_pnl')}</div>
          <div className="text-3xl font-bold text-gray-900">0 BNB</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{t('portfolio.positions_title')}</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('portfolio.no_positions')}</h3>
            <p className="text-gray-600 mb-4">{t('portfolio.no_positions_message')}</p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              {t('portfolio.browse_markets')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
