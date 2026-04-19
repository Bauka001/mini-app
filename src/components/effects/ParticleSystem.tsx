import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface ParticleSystemProps {
  particles: Particle[];
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({ particles }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => (
          <React.Fragment key={particle.id}>
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={`${particle.id}-${i}`}
                initial={{ 
                  x: particle.x, 
                  y: particle.y, 
                  scale: Math.random() * 0.3 + 0.3,
                  opacity: 1 
                }}
                animate={{ 
                  x: particle.x + (Math.random() - 0.5) * 150, 
                  y: particle.y + (Math.random() - 0.5) * 150, 
                  opacity: 0,
                  scale: 0
                }}
                transition={{ 
                  duration: Math.random() * 0.3 + 0.3, 
                  ease: "easeOut" 
                }}
                className="absolute w-2 h-2 rounded-full"
                style={{ 
                  backgroundColor: particle.color,
                  boxShadow: `0 0 6px ${particle.color}`
                }}
              />
            ))}
          </React.Fragment>
        ))}
      </AnimatePresence>
    </div>
  );
};
