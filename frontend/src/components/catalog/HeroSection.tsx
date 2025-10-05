import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

function HeroSection() {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const fadeStart = 50;
      const fadeEnd = 300;
      
      if (scrollY > fadeStart) {
        const newOpacity = Math.max(0, 1 - (scrollY - fadeStart) / (fadeEnd - fadeStart));
        setOpacity(newOpacity);
      } else {
        setOpacity(1);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="hero-section">
      <h1>WELCOME TO CATALOG</h1>
      <p>
        This catalog brings together up-to-date data on exoplanets discovered by astronomers worldwide.
        Each planet is presented with key parameters: host star type, distance, composition, and physical characteristics. 
        The main page serves as an entry point for exploring different stellar systems.
      </p>
      <Icon icon="lucide:arrow-up" className="arrow-down-icon" rotate={2} style={{ opacity: opacity, transition: 'opacity 0.3s ease', pointerEvents: 'none' }} />
    </div>
  );
}

export default HeroSection;