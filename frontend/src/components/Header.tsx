import { Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTranslation } from 'react-i18next';

export default function Header() {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'zh-TW', label: '繁' },
  ];

  return (
    <header className="backdrop-blur-xl bg-[#0A2342]/40 border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center pl-2">
            <h1 className="font-display text-2xl font-bold">
              <span className="glow-text-cyan">IVY</span>
              <span className="text-white">-Predict</span>
            </h1>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-10">
            <Link
              to="/"
              className="text-[#8A9BA8] hover:text-[#00C9A7] font-medium text-base transition-all duration-300"
            >
              {t('nav.markets')}
            </Link>
            <Link
              to="/quick"
              className="text-[#8A9BA8] hover:text-[#00C9A7] font-medium text-base transition-all duration-300 flex items-center gap-2"
            >
              <span>⚡</span> {t('nav.quick_trade')}
            </Link>
            <Link
              to="/create"
              className="text-[#8A9BA8] hover:text-[#00C9A7] font-medium text-base transition-all duration-300"
            >
              {t('nav.create')}
            </Link>
            <Link
              to="/portfolio"
              className="text-[#8A9BA8] hover:text-[#00C9A7] font-medium text-base transition-all duration-300"
            >
              {t('nav.portfolio')}
            </Link>
          </nav>

          {/* Language Switcher & Connect Wallet */}
          <div className="flex items-center space-x-5 pr-2">
            {/* Language Switcher */}
            <div className="flex items-center space-x-1 border border-white/10 rounded-lg p-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-all duration-300 ${
                    i18n.language === lang.code
                      ? 'bg-gradient-to-r from-[#005F6B] to-[#0A2342] text-white'
                      : 'text-[#8A9BA8] hover:text-[#00C9A7]'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            {/* Connect Wallet */}
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
