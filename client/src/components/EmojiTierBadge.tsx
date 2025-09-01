import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EmojiTierBadgeProps {
  tier: 'Free' | 'Pro' | 'Pro+' | 'Enterprise' | string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  showEmoji?: boolean;
  className?: string;
}

export function EmojiTierBadge({ 
  tier, 
  size = 'md', 
  animated = true, 
  showEmoji = true,
  className 
}: EmojiTierBadgeProps) {
  const getTierConfig = (tierName: string) => {
    const configs = {
      'Free': {
        emoji: '🆓',
        gradient: 'from-gray-500 to-gray-600',
        borderColor: 'border-gray-400',
        textColor: 'text-white',
        bgGlow: 'shadow-gray-500/20'
      },
      'Pro': {
        emoji: '⭐',
        gradient: 'from-blue-500 to-blue-600',
        borderColor: 'border-blue-400',
        textColor: 'text-white',
        bgGlow: 'shadow-blue-500/30'
      },
      'Pro+': {
        emoji: '🚀',
        gradient: 'from-purple-500 to-purple-600',
        borderColor: 'border-purple-400',
        textColor: 'text-white',
        bgGlow: 'shadow-purple-500/30'
      },
      'Enterprise': {
        emoji: '👑',
        gradient: 'from-yellow-500 to-yellow-600',
        borderColor: 'border-yellow-400',
        textColor: 'text-black',
        bgGlow: 'shadow-yellow-500/40'
      }
    };

    return configs[tierName as keyof typeof configs] || configs['Free'];
  };

  const config = getTierConfig(tier);
  
  const sizeClasses = {
    sm: 'text-xs h-5 px-2',
    md: 'text-sm h-6 px-3',
    lg: 'text-base h-8 px-4'
  };

  const emojiSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <Badge
      className={cn(
        'font-semibold transition-all duration-300 border',
        `bg-gradient-to-r ${config.gradient}`,
        config.borderColor,
        config.textColor,
        sizeClasses[size],
        animated && 'hover:scale-105 hover:shadow-lg',
        config.bgGlow,
        className
      )}
      data-testid={`badge-tier-${tier.toLowerCase()}`}
    >
      {showEmoji && (
        <span className={cn('mr-1', emojiSizes[size], animated && 'animate-pulse')}>
          {config.emoji}
        </span>
      )}
      {tier}
      {animated && tier === 'Pro+' && (
        <span className="ml-1 animate-bounce text-yellow-300">✨</span>
      )}
      {animated && tier === 'Enterprise' && (
        <span className="ml-1 animate-pulse text-yellow-300">💎</span>
      )}
    </Badge>
  );
}