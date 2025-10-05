import React from 'react';
import PlanetCard from './PlanetCard';
import ResultsGrid from './ResultsGrid';

interface PlanetListProps {
  planets: any[];
  onPlanetClick: (planet: any) => void;
}

const PlanetList: React.FC<PlanetListProps> = ({ planets, onPlanetClick }) => {
  if (planets.length === 0) {
    return <div style={{ color: 'white', textAlign: 'center', padding: '20px' }}>No planets match the current filters.</div>;
  }

  return (
    <ResultsGrid>
      {planets.map(planet => (
        <PlanetCard key={planet.id} {...planet} onClick={() => onPlanetClick(planet)} />
      ))}
    </ResultsGrid>
  );
};

export default PlanetList;