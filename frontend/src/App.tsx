import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import MarketDetailPage from './pages/MarketDetailPage';
import CreateMarketPage from './pages/CreateMarketPage';
import PortfolioPage from './pages/PortfolioPage';

function App() {
  return (
    <div className="min-h-screen bg-[#051525] text-white">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/market/:address" element={<MarketDetailPage />} />
          <Route path="/create" element={<CreateMarketPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
