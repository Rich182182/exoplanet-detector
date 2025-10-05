import React from 'react';

interface PlanetCardProps {
  name: string;
  imageUrl: string;
  id: string | number;
  disposition: string;
  orbitalPeriod: number | string;
  onClick: () => void;
}

function PlanetCard({ name, imageUrl, id, disposition, orbitalPeriod, onClick }: PlanetCardProps) {
  return (
    <div className="planet-card" onClick={onClick}>
      <div className="planet-card-image" style={{ backgroundImage: `url(${imageUrl})` }}></div>
      <div className="planet-card-info">
        <h4>{name}</h4>
        <div className="planet-card-stats">
            <p>ID: {id}</p>
            <p>Disposition: {disposition}</p>
            <p>Orbital period: {orbitalPeriod}</p>
        </div>
      </div>
    </div>
  );
}

export default PlanetCard;
