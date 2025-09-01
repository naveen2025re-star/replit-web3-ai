import React, { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';

interface Coin {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  delay: number;
}

interface CoinDropAnimationProps {
  trigger: boolean;
  creditsAdded: number;
  onComplete?: () => void;
}

export function CoinDropAnimation({ trigger, creditsAdded, onComplete }: CoinDropAnimationProps) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger && !isActive) {
      setIsActive(true);
      
      // Create coins based on credits added (max 20 coins for performance)
      const coinCount = Math.min(Math.floor(creditsAdded / 100) + 5, 20);
      const newCoins: Coin[] = Array.from({ length: coinCount }, (_, i) => ({
        id: i,
        x: Math.random() * 300 - 150, // Spread around center
        y: -50,
        rotation: Math.random() * 360,
        scale: Math.random() * 0.4 + 0.8,
        delay: Math.random() * 500
      }));

      setCoins(newCoins);

      // Animation cleanup
      setTimeout(() => {
        setCoins([]);
        setIsActive(false);
        onComplete?.();
      }, 2000);
    }
  }, [trigger, creditsAdded, isActive, onComplete]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9998] flex items-center justify-center">
      {coins.map(coin => (
        <div
          key={coin.id}
          className="absolute animate-bounce"
          style={{
            left: `calc(50% + ${coin.x}px)`,
            animationDelay: `${coin.delay}ms`,
            animationDuration: '1.5s',
            animationFillMode: 'forwards'
          }}
        >
          <div
            className="text-yellow-400 drop-shadow-lg animate-spin"
            style={{
              transform: `scale(${coin.scale})`,
              animationDuration: '2s'
            }}
          >
            <Coins size={32} className="filter drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
          </div>
        </div>
      ))}
      
      {/* Credit amount display */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-20">
        <div className="animate-pulse text-2xl font-bold text-yellow-400 text-center drop-shadow-lg">
          +{creditsAdded.toLocaleString()} Credits!
        </div>
      </div>
    </div>
  );
}