import React from 'react';
import { Icon } from '@iconify/react';
import './PlanetPopup.css';

interface PlanetPopupProps {
  planet: any; // Replace 'any' with a more specific type if available
  onClose: () => void;
}

const PlanetPopup: React.FC<PlanetPopupProps> = ({ planet, onClose }) => {
  if (!planet) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const displayValue = (value: any, unit = '') => {
    const isInvalid = value === null || value === undefined || value === '' || (typeof value === 'number' && !isFinite(value));
    if (isInvalid) {
      return 'unknown';
    }
    return `${value}${unit ? ` ${unit}` : ''}`;
  };

  return (
    <div className="planet-popup-overlay" onClick={handleOverlayClick}>
      <div className="planet-popup-content">
        <button className="planet-popup-close" onClick={onClose}>
          <Icon icon="mdi:close" />
        </button>
        <div className="planet-popup-main">
          <div className="planet-popup-image" style={{ backgroundImage: `url(${planet.imageUrl})` }}></div>
          <div className="planet-popup-details">
            <h2 className="planet-popup-name">{displayValue(planet.name)}</h2>
            <div className="planet-popup-stats-grid">
              <div className="stat-item">
                <h4 className="stat-label">ID:</h4>
                <p className="stat-value">{displayValue(planet.id)}</p>
              </div>
              <div className="stat-item">
                <h4 className="stat-label">Disposition:</h4>
                <p className="stat-value">{displayValue(planet.disposition)}</p>
              </div>
              <div className="stat-item">
                <h4 className="stat-label">Orbital period:</h4>
                <p className="stat-value">{displayValue(planet.orbitalPeriod, 'days')}</p>
              </div>
              <div className="stat-item">
                <h4 className="stat-label">Transit epoch:</h4>
                <p className="stat-value">{displayValue(planet.transitEpoch, 'val.')}</p>
              </div>
              <div className="stat-item">
                <h4 className="stat-label">Transit duration:</h4>
                <p className="stat-value">{displayValue(planet.transitDuration, 'hours')}</p>
              </div>
              <div className="stat-item">
                <h4 className="stat-label">Transit depth:</h4>
                <p className="stat-value">{displayValue(planet.transitDepth, 'val.')}</p>
              </div>
              <div className="stat-item">
                <h4 className="stat-label">Planetary radius:</h4>
                <p className="stat-value">{displayValue(planet.planetaryRadius, 'val.')}</p>
              </div>
              <div className="stat-item">
                <h4 className="stat-label">Equilibrium temperature:</h4>
                <p className="stat-value">{displayValue(planet.equilibriumTemperature, 'val.')}</p>
              </div>
              <div className="stat-item">
                <h4 className="stat-label">Insolation flux:</h4>
                <p className="stat-value">{displayValue(planet.insolationFlux, 'val.')}</p>
              </div>
              <div className="stat-item">
                <h4 className="stat-label">TCE planet number:</h4>
                <p className="stat-value">{displayValue(planet.tcePlanetNumber, 'val.')}</p>
              </div>
              <div className="stat-item">
                <h4 className="stat-label">Stellar effective temperature:</h4>
                <p className="stat-value">{displayValue(planet.stellarEffectiveTemperature, 'val.')}</p>
              </div>
              <div className="stat-item">
                <h4 className="stat-label">Stellar surface gravity:</h4>
                <p className="stat-value">{displayValue(planet.stellarSurfaceGravity, 'val.')}</p>
              </div>
              <div className="stat-item">
                <h4 className="stat-label">Stellar radius:</h4>
                <p className="stat-value">{displayValue(planet.stellarRadius, 'val.')}</p>
              </div>
              <div className="stat-item">
                <h4 className="stat-label">Magnitude:</h4>
                <p className="stat-value">{displayValue(planet.magnitude, 'val.')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanetPopup;
