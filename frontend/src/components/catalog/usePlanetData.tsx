import { useState, useEffect } from 'react';
import axios from 'axios';

const placeholderImages = [
  '/b62eabe5863821a86b684aaabf7b687f0c54e25f.jpg',
  '/50ec4e79b8bb9771d127f621fb27d1245099c441.jpg',
  '/b8f226896d1a04d4f487ecc66579e97bc32e54ae.jpg',
];

export const usePlanetData = () => {
  const [allPlanets, setAllPlanets] = useState<any[]>([]);
  const [filteredPlanets, setFilteredPlanets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [planetType, setPlanetType] = useState('all');
  const [mission, setMission] = useState('all');

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

        const kepler = keplerRes.data.map((d: any, index: number) => ({
          id: `kepler-${d.kepid}`,
          name: d.kepler_name || `Kepid ${d.kepid}`,
          imageUrl: placeholderImages[index % placeholderImages.length],
          source: "Kepler",
          disposition: d.koi_disposition,
          orbitalPeriod: d.koi_period,
          transitEpoch: d.koi_time0bk,
          transitDuration: d.koi_duration,
          transitDepth: d.koi_depth,
          planetaryRadius: d.koi_prad,
          equilibriumTemperature: d.koi_teq,
          insolationFlux: d.koi_insol,
          tcePlanetNumber: d.koi_tce_plnt_num,
          stellarEffectiveTemperature: d.koi_steff,
          stellarSurfaceGravity: d.koi_slogg,
          stellarRadius: d.koi_srad,
          magnitude: d.koi_kepmag,
        }));

        const tess = tessRes.data.map((d: any, index: number) => ({
          id: `tess-${d.tid}`,
          name: `TID ${d.tid}`,
          imageUrl: placeholderImages[(kepler.length + index) % placeholderImages.length],
          source: "TESS",
          disposition: d.tfopwg_disp,
          orbitalPeriod: d.pl_orbper,
          transitEpoch: d.pl_tranmid,
          transitDuration: d.pl_trandurh,
          transitDepth: d.pl_trandep,
          planetaryRadius: d.pl_rade,
          equilibriumTemperature: d.pl_eqt,
          insolationFlux: d.pl_insol,
          tcePlanetNumber: d.pl_pnum,
          stellarEffectiveTemperature: d.st_teff,
          stellarSurfaceGravity: d.st_logg,
          stellarRadius: d.st_rad,
          magnitude: d.st_tmag,
        }));

        setAllPlanets([...kepler, ...tess]);
      } catch (err) {
        setError('Failed to fetch planets. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllPlanets();
  }, []);

  // Filtering logic
  useEffect(() => {
    const filtered = allPlanets.filter(planet => {
      const nameMatch = (planet.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const missionMatch = mission === 'all' || planet.source === mission;
      const radius = planet.planetaryRadius;
      let type = 'Unknown';
      if (radius > 0) {
        if (radius < 1.6) type = 'Terrestrial';
        else if (radius < 4) type = 'Superearth';
        else if (radius < 10) type = 'Neptune-like';
        else type = 'Gas giant';
      }
      const typeMatch = planetType === 'all' || type === planetType;
      return nameMatch && missionMatch && typeMatch;
    });
    setFilteredPlanets(filtered);
  }, [allPlanets, searchTerm, planetType, mission]);

  const clearFilters = () => {
    setSearchTerm('');
    setPlanetType('all');
    setMission('all');
  };

  return {
    loading,
    error,
    filteredPlanets,
    searchTerm,
    setSearchTerm,
    planetType,
    setPlanetType,
    mission,
    setMission,
    clearFilters,
  };
};