import { Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">🔮</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">IVY Predict</h1>
              <p className="text-xs text-gray-500">Decentralized Prediction Markets</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              Markets
            </Link>
            <Link
              to="/create"
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              Create Market
            </Link>
            <Link
              to="/portfolio"
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              Portfolio
            </Link>
          </nav>

          {/* Connect Wallet */}
          <div>
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
