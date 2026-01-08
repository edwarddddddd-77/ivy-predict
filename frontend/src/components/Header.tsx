import { Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';

export default function Header() {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'zh-CN', label: '简' },
    { code: 'zh-TW', label: '繁' },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <Logo className="h-10" />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              {t('nav.markets')}
            </Link>
            <Link
              to="/create"
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              {t('nav.create')}
            </Link>
            <Link
              to="/portfolio"
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              {t('nav.portfolio')}
            </Link>
          </nav>

          {/* Language Switcher & Connect Wallet */}
          <div className="flex items-center space-x-4">
            {/* Language Switcher */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    i18n.language === lang.code
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
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
