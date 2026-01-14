import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTranslation } from 'react-i18next';

export default function Header() {
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'zh-TW', label: '繁' },
  ];

  const navLinks = [
    { to: '/', label: t('nav.markets'), icon: null },
    { to: '/quick', label: t('nav.quick_trade'), icon: '⚡' },
    { to: '/pk', label: t('nav.price_pk', 'Price PK'), icon: '📈' },
    { to: '/event-pk', label: t('nav.event_pk', 'Event PK'), icon: '🎯' },
    { to: '/create', label: t('nav.create'), icon: null },
    { to: '/portfolio', label: t('nav.portfolio'), icon: null },
  ];

  return (
    <header className="backdrop-blur-xl bg-[#0A2342]/40 border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-8 py-4 md:py-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <h1 className="font-display text-xl md:text-2xl font-bold">
              <span className="glow-text-cyan">IVY</span>
              <span className="text-white">-Predict</span>
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-[#8A9BA8] hover:text-[#00C9A7] font-medium text-sm transition-all duration-300 flex items-center gap-1.5"
              >
                {link.icon && <span>{link.icon}</span>}
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Side: Language + Wallet + Mobile Menu */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Language Switcher */}
            <div className="hidden sm:flex items-center border border-white/10 rounded-lg p-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm font-medium transition-all duration-300 ${
                    i18n.language === lang.code
                      ? 'bg-gradient-to-r from-[#005F6B] to-[#0A2342] text-white'
                      : 'text-[#8A9BA8] hover:text-[#00C9A7]'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            {/* Connect Wallet - Hide label on small screens */}
            <div className="[&>div>button]:!px-2 [&>div>button]:md:!px-4 [&>div>button]:!text-xs [&>div>button]:md:!text-sm">
              <ConnectButton />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#8A9BA8] hover:text-[#00C9A7] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <nav className="lg:hidden mt-4 pb-4 border-t border-white/10 pt-4">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[#8A9BA8] hover:text-[#00C9A7] font-medium text-base transition-all duration-300 flex items-center gap-2 py-2"
                >
                  {link.icon && <span>{link.icon}</span>}
                  {link.label}
                </Link>
              ))}

              {/* Mobile Language Switcher */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/10 mt-2">
                <span className="text-[#8A9BA8] text-sm">Language:</span>
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
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
