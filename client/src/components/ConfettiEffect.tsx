import React, { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  emoji: string;
  scale: number;
  opacity: number;
  life: number;
}

interface ConfettiEffectProps {
  trigger: boolean;
  onComplete?: () => void;
  intensity?: 'low' | 'medium' | 'high';
  type?: 'payment' | 'credit' | 'achievement';
}

export function ConfettiEffect({ 
  trigger, 
  onComplete, 
  intensity = 'medium',
  type = 'payment' 
}: ConfettiEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isActive, setIsActive] = useState(false);

  const getEmojis = () => {
    switch (type) {
      case 'payment':
        return ['🎉', '✨', '💰', '🌟', '🎊', '💎', '⚡', '🔥'];
      case 'credit':
        return ['🪙', '💰', '✨', '⭐', '🔥', '💎', '🌟', '⚡'];
      case 'achievement':
        return ['🏆', '🥇', '🎯', '⭐', '🌟', '✨', '🎉', '🔥'];
      default:
        return ['🎉', '✨', '💰', '🌟'];
    }
  };

  const getParticleCount = () => {
    switch (intensity) {
      case 'low': return 20;
      case 'medium': return 40;
      case 'high': return 60;
      default: return 40;
    }
  };

  const createParticle = (id: number): Particle => {
    const emojis = getEmojis();
    return {
      id,
      x: Math.random() * window.innerWidth,
      y: -20,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 3 + 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      scale: Math.random() * 0.5 + 0.5,
      opacity: 1,
      life: 1
    };
  };

  useEffect(() => {
    if (trigger && !isActive) {
      setIsActive(true);
      const particleCount = getParticleCount();
      const newParticles = Array.from({ length: particleCount }, (_, i) => createParticle(i));
      setParticles(newParticles);

      const animationDuration = 3000;
      const startTime = Date.now();

      const animate = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = elapsed / animationDuration;

        if (progress >= 1) {
          setParticles([]);
          setIsActive(false);
          onComplete?.();
          return;
        }

        setParticles(currentParticles => 
          currentParticles.map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            rotation: particle.rotation + particle.rotationSpeed,
            vy: particle.vy + 0.1, // gravity
            opacity: Math.max(0, 1 - progress),
            life: 1 - progress,
            scale: particle.scale * (1 - progress * 0.3)
          })).filter(particle => particle.y < window.innerHeight + 50)
        );

        requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    }
  }, [trigger, isActive, intensity, type, onComplete]);

  if (!isActive || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]" style={{ overflow: 'hidden' }}>
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute transition-none"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            transform: `rotate(${particle.rotation}deg) scale(${particle.scale})`,
            opacity: particle.opacity,
            fontSize: '1.5rem',
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        >
          {particle.emoji}
        </div>
      ))}
    </div>
  );
}