import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import MarketDetailPage from './pages/MarketDetailPage';
import PriceMarketDetailPage from './pages/PriceMarketDetailPage';
import CreateMarketPage from './pages/CreateMarketPage';
import QuickMarketPage from './pages/QuickMarketPage';
import PortfolioPage from './pages/PortfolioPage';
import LeaderboardPage from './pages/LeaderboardPage';
import PKChallengePage from './pages/PKChallengePage';
import PKBattlePage from './pages/PKBattlePage';
import EventPKChallengePage from './pages/EventPKChallengePage';
import EventPKBattlePage from './pages/EventPKBattlePage';
import { ReferralProvider } from './contexts/ReferralContext';

function App() {
  return (
    <ReferralProvider>
      <div className="min-h-screen bg-[#051525] text-white">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/market/:address" element={<MarketDetailPage />} />
            <Route path="/price-market/:address" element={<PriceMarketDetailPage />} />
            <Route path="/create" element={<CreateMarketPage />} />
            <Route path="/quick" element={<QuickMarketPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            {/* Price PK Challenge Routes */}
            <Route path="/pk" element={<PKChallengePage />} />
            <Route path="/pk/:id" element={<PKBattlePage />} />
            {/* Event PK Challenge Routes */}
            <Route path="/event-pk" element={<EventPKChallengePage />} />
            <Route path="/event-pk/:id" element={<EventPKBattlePage />} />
          </Routes>
        </main>
      </div>
    </ReferralProvider>
  );
}

export default App;
