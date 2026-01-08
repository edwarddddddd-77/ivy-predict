import { useAccount } from 'wagmi';

export default function PortfolioPage() {
  const { address: userAddress } = useAccount();

  if (!userAddress) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="text-6xl mb-4">💼</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Portfolio</h2>
        <p className="text-gray-600 mb-6">Connect your wallet to view your positions</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Portfolio</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Total Value</div>
          <div className="text-3xl font-bold text-gray-900">0 BNB</div>
          <div className="text-sm text-green-600 mt-1">+0%</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Active Positions</div>
          <div className="text-3xl font-bold text-gray-900">0</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Total P&L</div>
          <div className="text-3xl font-bold text-gray-900">0 BNB</div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Your Positions</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Positions Yet</h3>
            <p className="text-gray-600 mb-4">
              Start trading on prediction markets to build your portfolio
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Browse Markets
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
