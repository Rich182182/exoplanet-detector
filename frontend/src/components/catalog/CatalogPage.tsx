import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ReactPaginate from 'react-paginate';
import './Catalog.css';
import PageContainer from './PageContainer';
import BackgroundEffects from './BackgroundEffects';
import HeroSection from './HeroSection';
import CatalogView from './CatalogView';
import FiltersPanel from './FiltersPanel';
import ResultsPanel from './ResultsPanel';
import PlanetPopup from './PlanetPopup';
import PlanetCard from './PlanetCard';
import LoadingIndicator from './LoadingIndicator'; // Import the new component

const planetImageMap: Record<string, string[]> = {
  'Terrestrial': [
    '/planets/terrestrial/1.jpg',
    '/planets/terrestrial/2.jpg',
    '/planets/terrestrial/3.jpg',
    '/planets/terrestrial/4.jpg',
    '/planets/terrestrial/5.jpg',
  ],
  'Superearth': [
    '/planets/superearth/1.png',
    '/planets/superearth/2.png',
    '/planets/superearth/3.png',
    '/planets/superearth/4.png',
    '/planets/superearth/6.png',
  ],
  'Neptune-like': [
    '/planets/neptune-like/1.jpg',
    '/planets/neptune-like/2.png',
    '/planets/neptune-like/3.png',
    '/planets/neptune-like/5.png',
  ],
  'Gas giant': [
    '/planets/gas-giant/1.jpg',
    '/planets/gas-giant/2.png',
    '/planets/gas-giant/3.png',
    '/planets/gas-giant/4.png',
    '/planets/gas-giant/5.png',
    '/planets/gas-giant/6.png',
    '/planets/gas-giant/7.png',
    '/planets/gas-giant/8.png',
  ],
  'Unknown': [
    '/planets/unknown/1.png',
  ],
};

const getRandomImage = (planetType: string, index: number) => {
  const images = planetImageMap[planetType] || planetImageMap['Unknown'];
  return images[index % images.length];
};

let planetIdCounter = 0;

interface Planet {
  id: string;
  name: string;
  imageUrl: string;
  type: string;
  source: string;
  disposition: string;
  orbitalPeriod: number;
  transitEpoch: number;
  transitDuration: number;
  transitDepth: number;
  planetaryRadius: number;
  equilibriumTemperature: number;
  insolationFlux: number;
  tcePlanetNumber: number;
  stellarEffectiveTemperature: number;
  stellarSurfaceGravity: number;
  stellarRadius: number;
  magnitude: number;
}

const ITEMS_PER_PAGE = 12;

function PlanetGrid({ currentItems, onPlanetClick }: { currentItems: Planet[], onPlanetClick: (planet: Planet) => void }) {
  return (
    <div className="results-grid">
      {currentItems.map(planet => (
        <PlanetCard key={planet.id} {...planet} onClick={() => onPlanetClick(planet)} />
      ))}
    </div>
  );
}

function CatalogPage() {
  const [allPlanets, setAllPlanets] = useState<Planet[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [planetType, setPlanetType] = useState('all');
  const [mission, setMission] = useState('all');
  const [selectedPlanet, setSelectedPlanet] = useState<any | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);

  // Data fetching
  useEffect(() => {
    const fetchAllPlanets = async () => {
      setLoading(true);
      setError(null);
      try {
        const keplerURL = "/cgi-bin/nstedAPI/nph-nstedAPI?table=cumulative&select=kepid,kepler_name,koi_disposition,koi_period,koi_time0bk,koi_duration,koi_depth,koi_prad,koi_teq,koi_insol,koi_tce_plnt_num,koi_steff,koi_slogg,koi_srad,koi_kepmag&where=koi_disposition='CONFIRMED'&format=json";
        const tessURL = "/cgi-bin/nstedAPI/nph-nstedAPI?table=toi&select=tid,tfopwg_disp,pl_orbper,pl_tranmid,pl_trandurh,pl_trandep,pl_rade,pl_eqt,pl_insol,pl_pnum,st_teff,st_logg,st_rad,st_tmag&where=tfopwg_disp='CP' or tfopwg_disp='KP'&format=JSON";

        const [keplerRes, tessRes] = await Promise.all([
          axios.get(keplerURL),
          axios.get(tessURL),
        ]);

        const kepler = keplerRes.data.map((d: any, index: number) => {
          const radius = d.koi_prad;
          let type = 'Unknown';
          if (radius > 0) {
            if (radius < 1.6) type = 'Terrestrial';
            else if (radius < 4) type = 'Superearth';
            else if (radius < 10) type = 'Neptune-like';
            else type = 'Gas giant';
          }
          return {
            id: `planet-${planetIdCounter++}`,
            name: d.kepler_name || `Kepid ${d.kepid}`,
            imageUrl: getRandomImage(type, index),
            source: "Kepler",
            type: type,
            disposition: d.koi_disposition,
            orbitalPeriod: d.koi_period,
            transitEpoch: d.koi_time0bk,
            transitDuration: d.koi_duration,
            transitDepth: d.koi_depth,
            planetaryRadius: radius,
            equilibriumTemperature: d.koi_teq,
            insolationFlux: d.koi_insol,
            tcePlanetNumber: d.koi_tce_plnt_num,
            stellarEffectiveTemperature: d.koi_steff,
            stellarSurfaceGravity: d.koi_slogg,
            stellarRadius: d.koi_srad,
            magnitude: d.koi_kepmag,
          };
        });

        const tess = tessRes.data.map((d: any, index: number) => {
          const radius = d.pl_rade;
          let type = 'Unknown';
          if (radius > 0) {
            if (radius < 1.6) type = 'Terrestrial';
            else if (radius < 4) type = 'Superearth';
            else if (radius < 10) type = 'Neptune-like';
            else type = 'Gas giant';
          }
          return {
            id: `planet-${planetIdCounter++}`,
            name: `TID ${d.tid}`,
            imageUrl: getRandomImage(type, kepler.length + index),
            source: "TESS",
            type: type,
            disposition: d.tfopwg_disp,
            orbitalPeriod: d.pl_orbper,
            transitEpoch: d.pl_tranmid,
            transitDuration: d.pl_trandurh,
            transitDepth: d.pl_trandep,
            planetaryRadius: radius,
            equilibriumTemperature: d.pl_eqt,
            insolationFlux: d.pl_insol,
            tcePlanetNumber: d.pl_pnum,
            stellarEffectiveTemperature: d.st_teff,
            stellarSurfaceGravity: d.st_logg,
            stellarRadius: d.st_rad,
            magnitude: d.st_tmag,
          };
        });

        setAllPlanets([...kepler, ...tess]);
      } catch (err) {
        setError('Failed to fetch planets. Please try again later.');
        console.error(err);
      } finally {
        setTimeout(() => {
          setLoading(false);
          setTimeout(() => setContentLoaded(true), 100); // Short delay for fade-in
        }, 1500); // Artificial delay to show the animation
      }
    };

    fetchAllPlanets();
  }, []);

  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  // Handle body scroll lock for popup and loading
  useEffect(() => {
    if (selectedPlanet || loading) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [selectedPlanet, loading]);

  const clearFilters = () => {
    setSearchTerm('');
    setPlanetType('all');
    setMission('all');
    setCurrentPage(0);
  };

  const openPlanetPopup = (planet: any) => {
    setSelectedPlanet(planet);
  };

  const closePlanetPopup = () => {
    setSelectedPlanet(null);
  };

  const filteredPlanets = useMemo(() => {
    return allPlanets.filter(planet => {
      const nameMatch = (planet.name || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const missionMatch = mission === 'all' || planet.source === mission;
      const typeMatch = planetType === 'all' || planet.type === planetType;
      return nameMatch && missionMatch && typeMatch;
    });
  }, [allPlanets, debouncedSearchTerm, planetType, mission]);

  // Reset to page 0 when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearchTerm, planetType, mission]);

  const pageCount = Math.ceil(filteredPlanets.length / ITEMS_PER_PAGE);
  const offset = currentPage * ITEMS_PER_PAGE;
  const currentItems = filteredPlanets.slice(offset, offset + ITEMS_PER_PAGE);

  const handlePageClick = (event: { selected: number }) => {
    setCurrentPage(event.selected);
  };

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <PageContainer>
      <LoadingIndicator show={loading} />
      <div className={`catalog-content ${contentLoaded ? 'loaded' : ''}`}>
        <BackgroundEffects />
        <HeroSection />
        <CatalogView>
          <FiltersPanel
            planetType={planetType}
            setPlanetType={setPlanetType}
            mission={mission}
            setMission={setMission}
            clearFilters={clearFilters}
          />
          <ResultsPanel
            totalCount={filteredPlanets.length}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            pageCount={pageCount}
            onPageChange={handlePageClick}
            currentPage={currentPage}
          >
            <PlanetGrid currentItems={currentItems} onPlanetClick={openPlanetPopup} />
            {pageCount > 1 && (
              <ReactPaginate
                breakLabel="..."
                nextLabel=">"
                onPageChange={handlePageClick}
                pageRangeDisplayed={5}
                pageCount={pageCount}
                previousLabel="<"
                renderOnZeroPageCount={null}
                containerClassName={'pagination'}
                pageClassName={'page-item'}
                pageLinkClassName={'page-link'}
                previousClassName={'page-item'}
                previousLinkClassName={'page-link'}
                nextClassName={'page-item'}
                nextLinkClassName={'page-link'}
                breakClassName={'page-item'}
                breakLinkClassName={'page-link'}
                activeClassName={'active'}
                forcePage={currentPage}
              />
            )}
          </ResultsPanel>
        </CatalogView>
        <PlanetPopup planet={selectedPlanet} onClose={closePlanetPopup} />
      </div>
    </PageContainer>
  );
}

export default CatalogPage;