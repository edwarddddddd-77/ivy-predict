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
    <header className="bg-prism-deep/90 backdrop-blur-md border-b border-energy-cyan/20 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src="/logo.png"
              alt="IVY Predict"
              className="h-12 w-auto object-contain"
            />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className="text-data-grey-light hover:text-energy-bright font-medium transition-all duration-300 hover:glow-text"
            >
              {t('nav.markets')}
            </Link>
            <Link
              to="/create"
              className="text-data-grey-light hover:text-energy-bright font-medium transition-all duration-300 hover:glow-text"
            >
              {t('nav.create')}
            </Link>
            <Link
              to="/portfolio"
              className="text-data-grey-light hover:text-energy-bright font-medium transition-all duration-300 hover:glow-text"
            >
              {t('nav.portfolio')}
            </Link>
          </nav>

          {/* Language Switcher & Connect Wallet */}
          <div className="flex items-center space-x-4">
            {/* Language Switcher */}
            <div className="flex items-center space-x-1 bg-prism-deep/50 border border-energy-cyan/30 rounded-lg p-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-all duration-300 ${
                    i18n.language === lang.code
                      ? 'bg-brand-gradient text-white shadow-glow-cyan'
                      : 'text-data-grey hover:text-energy-cyan'
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
