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

function FiltersPanel({
    planetType, setPlanetType,
    mission, setMission,
    clearFilters
}: FiltersPanelProps) {
  const planetTypeOptions = [
    { value: 'all', label: 'All Types', icon: () => <Icon icon="mdi:earth" /> },
    { value: 'Terrestrial', label: 'Terrestrial', icon: () => <Icon icon="majesticons:planet-line" /> },
    { value: 'Superearth', label: 'Superearth', icon: Earth },
    { value: 'Neptune-like', label: 'Neptune-like', icon: Planet24Regular },
    { value: 'Gas giant', label: 'Gas giant', icon: Planet3 },
    { value: 'Unknown', label: 'Unknown', icon: () => <Icon icon="mdi:help-circle-outline" /> },
  ];

  const missionOptions = [
    { value: 'all', label: 'All Missions', icon: () => <Icon icon="mdi:web" /> },
    { value: 'Kepler', label: 'Kepler', icon: () => <Icon icon="mdi:telescope" /> },
    { value: 'TESS', label: 'TESS', icon: () => <Icon icon="mdi:satellite-variant" /> },
  ];

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
