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
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={`${particle.id}-${i}`}
                initial={{ 
                  x: particle.x, 
                  y: particle.y, 
                  scale: Math.random() * 0.5 + 0.5,
                  opacity: 1 
                }}
                animate={{ 
                  x: particle.x + (Math.random() - 0.5) * 200, 
                  y: particle.y + (Math.random() - 0.5) * 200, 
                  opacity: 0,
                  scale: 0
                }}
                transition={{ 
                  duration: Math.random() * 0.5 + 0.5, 
                  ease: "easeOut" 
                }}
                className="absolute w-3 h-3 rounded-full"
                style={{ 
                  backgroundColor: particle.color,
                  boxShadow: `0 0 10px ${particle.color}`
                }}
              />
            ))}
          </React.Fragment>
        ))}
      </AnimatePresence>
    </div>
  );
};
