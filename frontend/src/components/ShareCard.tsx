import { useState } from 'react';
import { useAccount } from 'wagmi';

interface ShareCardProps {
  assetSymbol: string;
  direction: 'UP' | 'DOWN';
  startPrice: string;
  endPrice?: string;
  duration: string;
  payout?: string;
  isWin?: boolean;
  marketAddress: string;
}

export default function ShareCard({
  assetSymbol,
  direction,
  startPrice,
  endPrice,
  duration,
  payout,
  isWin,
  marketAddress,
}: ShareCardProps) {
  const { address } = useAccount();
  const [copied, setCopied] = useState(false);
  const [showCard, setShowCard] = useState(false);

  // Generate referral link
  const referralLink = `${window.location.origin}?ref=${address || ''}`;
  const marketLink = `${window.location.origin}/price-market/${marketAddress}?ref=${address || ''}`;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleTwitterShare = () => {
    const text = isWin
      ? `🎯 I just predicted ${assetSymbol} would go ${direction} and WON ${payout}! 💰\n\nStart: $${startPrice}\nEnd: $${endPrice}\n\nTry your prediction skills on @IvyPredict ⚡`
      : `🎯 I'm predicting ${assetSymbol} will go ${direction} in ${duration}!\n\nCurrent price: $${startPrice}\n\nJoin me on @IvyPredict ⚡`;

    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(marketLink)}`;
    window.open(url, '_blank');
  };

  const handleTelegramShare = () => {
    const text = isWin
      ? `🎯 I just predicted ${assetSymbol} would go ${direction} and WON ${payout}! Try your prediction skills!`
      : `🎯 I'm predicting ${assetSymbol} will go ${direction} in ${duration}! Join me!`;

    const url = `https://t.me/share/url?url=${encodeURIComponent(marketLink)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <>
      {/* Share Button */}
      <button
        onClick={() => setShowCard(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#00C9A7]/20 to-[#005F6B]/20 border border-[#00C9A7]/50 text-[#00C9A7] rounded-lg hover:bg-[#00C9A7]/30 transition-all"
      >
        <span>📤</span>
        <span>Share</span>
      </button>

      {/* Share Modal */}
      {showCard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full">
            {/* Preview Card */}
            <div className="bg-gradient-to-br from-[#0A2342] to-[#0D3158] rounded-2xl p-6 mb-4 border border-[#00C9A7]/30 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <span className="font-bold text-white text-lg">IVY Predict</span>
                </div>
                {isWin && (
                  <div className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-bold rounded-full">
                    WINNER 🏆
                  </div>
                )}
              </div>

              {/* Prediction Info */}
              <div className="text-center mb-6">
                <div className="text-[#8A9BA8] text-sm mb-2">I predicted</div>
                <div className="flex items-center justify-center gap-3 mb-3">
                  <span className="text-3xl font-bold text-white">{assetSymbol}</span>
                  <span className={`text-4xl ${direction === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                    {direction === 'UP' ? '📈' : '📉'}
                  </span>
                </div>
                <div className="text-xl font-medium text-[#00C9A7]">
                  {duration}
                </div>
              </div>

              {/* Price Info */}
              <div className="bg-[#0A2342]/60 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-[#8A9BA8]">Start Price</div>
                    <div className="text-lg font-bold text-white">${startPrice}</div>
                  </div>
                  <div className="text-2xl text-[#8A9BA8]">→</div>
                  <div className="text-right">
                    <div className="text-xs text-[#8A9BA8]">{endPrice ? 'End Price' : 'Pending...'}</div>
                    <div className={`text-lg font-bold ${endPrice ? (isWin ? 'text-green-400' : 'text-red-400') : 'text-[#8A9BA8]'}`}>
                      {endPrice ? `$${endPrice}` : '???'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payout (if win) */}
              {isWin && payout && (
                <div className="text-center mb-6 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/30">
                  <div className="text-sm text-green-400 mb-1">Won</div>
                  <div className="text-3xl font-bold text-green-400">{payout}</div>
                </div>
              )}

              {/* CTA */}
              <div className="text-center">
                <div className="text-sm text-[#8A9BA8] mb-2">Try your prediction skills</div>
                <div className="text-[#00C9A7] font-medium">ivy-predict.io</div>
              </div>
            </div>

            {/* Share Actions */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="text-white font-medium mb-3">Share to:</div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleTwitterShare}
                  className="flex items-center justify-center gap-2 py-3 bg-[#1DA1F2] text-white font-medium rounded-lg hover:opacity-90 transition-all"
                >
                  <span>𝕏</span>
                  <span>Twitter</span>
                </button>
                <button
                  onClick={handleTelegramShare}
                  className="flex items-center justify-center gap-2 py-3 bg-[#0088cc] text-white font-medium rounded-lg hover:opacity-90 transition-all"
                >
                  <span>✈️</span>
                  <span>Telegram</span>
                </button>
              </div>

              {/* Copy Link */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={marketLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-[#0A2342]/60 border border-white/10 rounded-lg text-white text-sm"
                />
                <button
                  onClick={() => handleCopy(marketLink)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-[#00C9A7] text-white hover:opacity-90'
                  }`}
                >
                  {copied ? '✓' : '📋'}
                </button>
              </div>

              {/* Referral Info */}
              <div className="mt-4 p-3 bg-[#00C9A7]/10 rounded-lg border border-[#00C9A7]/30">
                <div className="text-sm text-[#00C9A7] font-medium mb-1">🎁 Your Referral Link</div>
                <div className="text-xs text-[#8A9BA8]">
                  Earn rewards when friends join through your link!
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowCard(false)}
                className="w-full py-3 border border-white/20 text-[#8A9BA8] rounded-lg hover:bg-white/5 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
