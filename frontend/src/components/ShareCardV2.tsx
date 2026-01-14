import { useState, useRef } from 'react';
import { useAccount } from 'wagmi';

interface ShareCardV2Props {
  type: 'prediction' | 'pk_result' | 'pk_invite';
  data: {
    // Common fields
    assetSymbol: string;
    direction?: 'UP' | 'DOWN';
    startPrice?: string;
    endPrice?: string;
    duration?: string;

    // PK specific fields
    challengeId?: string;
    opponentAddress?: string;
    myAmount?: string;
    opponentAmount?: string;
    isWinner?: boolean;
    winAmount?: string;
    isDraw?: boolean;

    // Stats fields
    winRate?: number;
    totalPKs?: number;
    totalProfit?: string;
  };
  onClose?: () => void;
}

export default function ShareCardV2({ type, data, onClose }: ShareCardV2Props) {
  const { address } = useAccount();
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Generate referral link
  const referralLink = `${window.location.origin}${
    type === 'pk_invite' || type === 'pk_result'
      ? `/pk/${data.challengeId}`
      : ''
  }?ref=${address || ''}`;

  // Generate Twitter share text
  const getTwitterText = () => {
    if (type === 'pk_result') {
      if (data.isDraw) {
        return `Just finished a ${data.assetSymbol} prediction battle on @IvyPredict - it was a DRAW! Both players got their stakes back. The crypto market is unpredictable! Try your luck:`;
      }
      return data.isWinner
        ? `I just WON a ${data.assetSymbol} price prediction battle on @IvyPredict! Earned ${data.winAmount} USDT. The price moved ${data.direction === 'UP' ? 'UP 📈' : 'DOWN 📉'} from $${data.startPrice} to $${data.endPrice}. Think you can beat me?`
        : `Just finished a ${data.assetSymbol} prediction battle on @IvyPredict. Tough loss, but I'll be back! The market went ${data.direction === 'UP' ? 'DOWN 📉' : 'UP 📈'}. Challenge me to a rematch:`;
    }
    if (type === 'pk_invite') {
      return `I'm challenging you to a ${data.assetSymbol} price prediction duel on @IvyPredict! I bet it goes ${data.direction}. ${data.myAmount} USDT on the line. Think you can beat me?`;
    }
    return `I predicted ${data.assetSymbol} would go ${data.direction} on @IvyPredict and ${data.isWinner ? 'WON' : 'the market had other plans'}! Join the prediction game:`;
  };

  // Copy link handler
  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Share handlers
  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(getTwitterText())}&url=${encodeURIComponent(referralLink)}`;
    window.open(url, '_blank');
  };

  const shareToTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(getTwitterText())}`;
    window.open(url, '_blank');
  };

  // Calculate price change
  const priceChange = data.startPrice && data.endPrice
    ? ((parseFloat(data.endPrice) - parseFloat(data.startPrice)) / parseFloat(data.startPrice) * 100).toFixed(2)
    : null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="max-w-md w-full animate-in fade-in zoom-in duration-300">
        {/* Shareable Card */}
        <div
          ref={cardRef}
          className="bg-gradient-to-br from-[#0A2342] via-[#0D3158] to-[#0A2342] rounded-2xl p-6 border border-[#00C9A7]/30 shadow-2xl shadow-[#00C9A7]/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚔️</span>
              <span className="font-bold text-white text-lg">IVY Predict</span>
            </div>
            {type === 'pk_result' && !data.isDraw && (
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                data.isWinner
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                  : 'bg-gray-500/50 text-gray-300'
              }`}>
                {data.isWinner ? 'WINNER' : 'DEFEATED'}
              </div>
            )}
            {type === 'pk_result' && data.isDraw && (
              <div className="px-3 py-1 bg-yellow-500/30 text-yellow-400 rounded-full text-sm font-bold">
                DRAW
              </div>
            )}
          </div>

          {/* PK Result Card */}
          {type === 'pk_result' && (
            <>
              {/* Battle Info */}
              <div className="text-center mb-6">
                <div className="text-sm text-[#8A9BA8] mb-2">PK Battle #{data.challengeId}</div>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="text-3xl font-bold text-white">{data.assetSymbol}</span>
                  <span className={`text-4xl ${
                    priceChange && parseFloat(priceChange) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {priceChange && parseFloat(priceChange) >= 0 ? '📈' : '📉'}
                  </span>
                </div>
                <div className="text-lg text-[#8A9BA8]">{data.duration}</div>
              </div>

              {/* Price Change */}
              <div className="bg-[#051525]/60 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-[#8A9BA8]">Start Price</div>
                    <div className="text-lg font-bold text-white font-mono">${data.startPrice}</div>
                  </div>
                  <div className="text-center px-4">
                    <div className={`text-2xl font-bold ${
                      priceChange && parseFloat(priceChange) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {priceChange && parseFloat(priceChange) >= 0 ? '+' : ''}{priceChange}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#8A9BA8]">End Price</div>
                    <div className="text-lg font-bold text-white font-mono">${data.endPrice}</div>
                  </div>
                </div>
              </div>

              {/* Win Amount */}
              {data.isWinner && data.winAmount && !data.isDraw && (
                <div className="text-center p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/30 mb-4">
                  <div className="text-sm text-green-400 mb-1">Prize Won</div>
                  <div className="text-3xl font-bold text-green-400">{data.winAmount} USDT</div>
                </div>
              )}

              {/* Stats */}
              {(data.winRate !== undefined || data.totalPKs !== undefined) && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {data.winRate !== undefined && (
                    <div className="text-center p-3 bg-[#051525]/40 rounded-lg">
                      <div className="text-xs text-[#8A9BA8]">Win Rate</div>
                      <div className="text-lg font-bold text-[#00C9A7]">{data.winRate}%</div>
                    </div>
                  )}
                  {data.totalPKs !== undefined && (
                    <div className="text-center p-3 bg-[#051525]/40 rounded-lg">
                      <div className="text-xs text-[#8A9BA8]">Total PKs</div>
                      <div className="text-lg font-bold text-white">{data.totalPKs}</div>
                    </div>
                  )}
                  {data.totalProfit && (
                    <div className="text-center p-3 bg-[#051525]/40 rounded-lg">
                      <div className="text-xs text-[#8A9BA8]">Total Profit</div>
                      <div className="text-lg font-bold text-green-400">+{data.totalProfit}</div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* PK Invite Card */}
          {type === 'pk_invite' && (
            <div className="text-center">
              <div className="text-lg text-[#8A9BA8] mb-4">Challenge You To Battle!</div>
              <div className="text-4xl font-bold text-white mb-3">{data.assetSymbol}</div>
              <div className={`text-2xl font-bold ${
                data.direction === 'UP' ? 'text-green-400' : 'text-red-400'
              }`}>
                I predict {data.direction === 'UP' ? 'UP 📈' : 'DOWN 📉'}
              </div>
              <div className="mt-4 p-4 bg-[#051525]/60 rounded-xl">
                <div className="text-sm text-[#8A9BA8]">Stake Amount</div>
                <div className="text-2xl font-bold text-[#00C9A7]">{data.myAmount} USDT</div>
              </div>
              <div className="mt-4 text-[#8A9BA8]">{data.duration}</div>
            </div>
          )}

          {/* Prediction Card */}
          {type === 'prediction' && (
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-3">{data.assetSymbol}</div>
              <div className={`text-2xl font-bold ${
                data.direction === 'UP' ? 'text-green-400' : 'text-red-400'
              }`}>
                {data.direction === 'UP' ? '📈 UP' : '📉 DOWN'}
              </div>
              {data.startPrice && (
                <div className="mt-4 text-[#8A9BA8]">
                  Entry: ${data.startPrice}
                </div>
              )}
              {data.duration && (
                <div className="text-[#8A9BA8]">{data.duration}</div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-4 mt-4 border-t border-white/10">
            <div className="text-xs text-[#8A9BA8]">Join the battle at</div>
            <div className="text-[#00C9A7] font-medium">ivy-predict.vercel.app</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 space-y-3">
          {/* Social Share */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={shareToTwitter}
              className="py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-900 transition-all flex items-center justify-center gap-2"
            >
              <span className="text-lg">𝕏</span> Twitter
            </button>
            <button
              onClick={shareToTelegram}
              className="py-3 bg-[#0088cc] text-white font-medium rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <span>✈️</span> Telegram
            </button>
          </div>

          {/* Copy Link */}
          <button
            onClick={handleCopy}
            className={`w-full py-3 font-medium rounded-xl transition-all flex items-center justify-center gap-2 ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-[#00C9A7] text-white hover:opacity-90'
            }`}
          >
            {copied ? (
              <>
                <span>✓</span> Link Copied!
              </>
            ) : (
              <>
                <span>🔗</span> Copy Link
              </>
            )}
          </button>

          {/* Close */}
          {onClose && (
            <button
              onClick={onClose}
              className="w-full py-3 border border-white/20 text-[#8A9BA8] rounded-xl hover:bg-white/5 transition-all"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Export a button component that opens the share card
export function ShareButton({
  type,
  data,
  className = '',
}: Omit<ShareCardV2Props, 'onClose'> & { className?: string }) {
  const [showCard, setShowCard] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowCard(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#00C9A7]/20 to-[#005F6B]/20 border border-[#00C9A7]/50 text-[#00C9A7] rounded-lg hover:bg-[#00C9A7]/30 transition-all ${className}`}
      >
        <span>📤</span>
        <span>Share</span>
      </button>

      {showCard && (
        <ShareCardV2 type={type} data={data} onClose={() => setShowCard(false)} />
      )}
    </>
  );
}
