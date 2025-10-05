import React from 'react';
import FilterGroup from './FilterGroup';
import SelectMenu from './SelectMenu';
import DropdownMenu from './DropdownMenu';
import { Earth } from '@mynaui/icons-react';
import { Planet3 } from '@solar-icons/react';
import { Icon } from '@iconify/react';
import { Planet24Regular } from '@fluentui/react-icons';

interface FiltersPanelProps {
  planetType: string;
  setPlanetType: (value: string) => void;
  mission: string;
  setMission: (value: string) => void;
  clearFilters: () => void;
}

const MdiEarth = () => <Icon icon="mdi:earth" />;
const MajesticonsPlanetLine = () => <Icon icon="majesticons:planet-line" />;
const MdiHelpCircleOutline = () => <Icon icon="mdi:help-circle-outline" />;
const MdiWeb = () => <Icon icon="mdi:web" />;
const MdiOrbit = () => <Icon icon="mdi:orbit" />;
const MdiSatelliteVariant = () => <Icon icon="mdi:satellite-variant" />;

const planetTypeOptions = [
  { value: 'all', label: 'All Types', icon: MdiEarth },
  { value: 'Terrestrial', label: 'Terrestrial', icon: MajesticonsPlanetLine },
  { value: 'Superearth', label: 'Superearth', icon: Earth },
  { value: 'Neptune-like', label: 'Neptune-like', icon: Planet24Regular },
  { value: 'Gas giant', label: 'Gas giant', icon: Planet3 },
  { value: 'Unknown', label: 'Unknown', icon: MdiHelpCircleOutline },
];

const missionOptions = [
  { value: 'all', label: 'All Missions', icon: MdiWeb },
  { value: 'Kepler', label: 'Kepler', icon: MdiOrbit },
  { value: 'TESS', label: 'TESS', icon: MdiSatelliteVariant },
];

function FiltersPanel({
    planetType, setPlanetType,
    mission, setMission,
    clearFilters
}: FiltersPanelProps) {
  return (
    <aside className="filters-panel">
      <div className="filters-panel-header">
        <h4>FILTERS</h4>
        <Icon icon="mingcute:filter-line" className="filter-icon" />
      </div>
      <FilterGroup title="Planet type">
        <SelectMenu options={planetTypeOptions} value={planetType} onChange={setPlanetType} />
      </FilterGroup>
      <FilterGroup title="Mission">
        <DropdownMenu options={missionOptions} value={mission} onChange={setMission} placeholder="Select mission" />
      </FilterGroup>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="clear-filters-btn" onClick={clearFilters}>Clear filters</button>
      </div>
    </aside>
  );
}

export default FiltersPanel;