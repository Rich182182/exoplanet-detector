import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import LightCurveChart from './components/LightCurveChart';
import styles from './AnalysisPage.module.css';

type Feature = { name: string; value: number; importance: number };
type TransitCandidate = { center_time: number; start_time: number; end_time: number; depth: number; score?: number };
type Segment = { index: number; start: number; end: number; center: number };

interface AnalysisData {
  exoplanet: boolean;
  probability: number;
  features: Feature[];
  raw_curve: { time: number[]; flux: number[] };
  processed_curve: { time: number[]; flux: number[] };
  transit_candidates?: TransitCandidate[];
  candidates_all?: TransitCandidate[];
  segments?: Segment[];
}

const SIDEBAR_WIDTH = 360;
const SIDEBAR_HEIGHT = 560;
const VISIBLE_TARGETS = -1;

const AnalysisPage: React.FC = () => {
  // ---------- hooks (всегда в начале) ----------
  const navigate = useNavigate();
  const [data, setData] = useState<AnalysisData | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState<number | null>(null);
  const [presetZoom, setPresetZoom] = useState<'overview' | 'candidates' | 'segment'>('overview');

  // layers
  const [showRaw, setShowRaw] = useState<boolean>(false);
  const [showProcessed, setShowProcessed] = useState<boolean>(true);
  const [showBinned, setShowBinned] = useState<boolean>(false);

  // local candidates found with frontend detector (callback)
  const [localCandidates, setLocalCandidates] = useState<TransitCandidate[]>([]);

  // ---------- load stored data ----------
  useEffect(() => {
    const raw = localStorage.getItem('analysisData');
    if (!raw) { navigate('/'); return; }
    try {
      setData(JSON.parse(raw));
    } catch {
      navigate('/');
    }
  }, [navigate]);

  // ---------- derived values via useMemo (без хуков внутри условностей) ----------
  // segments (use backend if present, else uniform)
  const segments: Segment[] = useMemo(() => {
    if (!data) return [];
    if (data.segments && data.segments.length) return data.segments;
    const times = data.processed_curve.time;
    const n = Math.max(2, Math.min(8, Math.floor(times.length / 50) || 4));
    const tmin = Math.min(...times), tmax = Math.max(...times);
    const segs: Segment[] = [];
    for (let i = 0; i < n; i++) {
      const s = tmin + ((tmax - tmin) * i) / n;
      const e = tmin + ((tmax - tmin) * (i + 1)) / n;
      segs.push({ index: i, start: s, end: e, center: (s + e) / 2 });
    }
    return segs;
  }, [data]);

  // backend candidates (use candidates_all if available, else transit_candidates)
  const backendCandidates = useMemo<TransitCandidate[]>(() => {
    if (!data) return [];
    if (data.candidates_all && data.candidates_all.length) return data.candidates_all;
    return data.transit_candidates ?? [];
  }, [data]);

  // combined + dedup (stable order)
  const uniqueCandidates = useMemo<TransitCandidate[]>(() => {
    const combined = [...backendCandidates, ...localCandidates];
    // dedup by proximity, keeping highest score/depth
    const used = new Array(combined.length).fill(false);
    const out: TransitCandidate[] = [];
    for (let i = 0; i < combined.length; i++) {
      if (used[i]) continue;
      let base = combined[i];
      const baseDur = Math.abs((base.end_time ?? base.center_time) - (base.start_time ?? base.center_time)) || 1e-6;
      for (let j = i + 1; j < combined.length; j++) {
        if (used[j]) continue;
        const other = combined[j];
        const otherDur = Math.abs((other.end_time ?? other.center_time) - (other.start_time ?? other.center_time)) || 1e-6;
        const timeSpan = Math.max(baseDur, otherDur, 1e-6);
        if (Math.abs(base.center_time - other.center_time) < 0.01 * timeSpan) {
          const baseScore = base.score ?? base.depth ?? 0;
          const otherScore = other.score ?? other.depth ?? 0;
          if (otherScore > baseScore) base = other;
          used[j] = true;
        }
      }
      out.push(base);
    }
    // sort by score/depth desc
    out.sort((a, b) => ((b.score ?? b.depth ?? 0) - (a.score ?? a.depth ?? 0)));
    return out;
  }, [backendCandidates, localCandidates]);

  // sidebar (top N)
  const sidebarCandidates = useMemo(() => uniqueCandidates.slice(0, VISIBLE_TARGETS), [uniqueCandidates]);

  const probabilityPercent = useMemo(() => {
    if (!data) return 0;
    return Math.max(0, Math.min(100, Number((data.probability * 100).toFixed(1))));
  }, [data]);

  // ---------- handlers ----------
  const handleLocalDetect = (found: TransitCandidate[]) => setLocalCandidates(found);
  const handleClickProcessedBtn = () => { setShowProcessed(true); setShowRaw(false); };
  const handleClickRawBtn = () => { setShowRaw(true); setShowProcessed(false); };

  // ---------- rendering ----------
  // Loading / redirect already handled in useEffect, but keep guard
  if (!data) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <div className={styles.loadingText}>Loading analysis…</div>
      </div>
    );
  }

  return (
    <div className={styles.page} style={{ ['--sidebar-width' as any]: `${SIDEBAR_WIDTH}px`, ['--sidebar-height' as any]: `${SIDEBAR_HEIGHT}px` }}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/')}>← Upload</button>
        <h1 className={styles.title}>Exoplanet Analysis</h1>
      </header>

      <div className={styles.content}>
        <main className={styles.left}>
          <div className={styles.chartWrap}>
            <div className={styles.presets}>
              <div className={styles.presetBtns}>
                <button className={`${styles.presetBtn} ${presetZoom === 'overview' ? styles.active : ''}`} onClick={() => { setPresetZoom('overview'); setSelectedCandidate(null); setSelectedSegmentIdx(null); }}>Full overview</button>
                <button className={`${styles.presetBtn} ${presetZoom === 'candidates' ? styles.active : ''}`} onClick={() => { setPresetZoom('candidates'); setSelectedSegmentIdx(null); setSelectedCandidate(0); }}>Auto-zoom candidates</button>
                <button className={`${styles.presetBtn} ${presetZoom === 'segment' ? styles.active : ''}`} onClick={() => { if (segments.length) { setPresetZoom('segment'); setSelectedSegmentIdx(0); } }}>First segment</button>
              </div>

              <div className={styles.viewTogglesWrapper}>
                <div className={styles.layersLabel}>Layers</div>
                <div className={styles.viewToggles}>
                  <label className={styles.toggle}>
                    <input type="checkbox" checked={showRaw} onChange={(e) => setShowRaw(e.target.checked)} />
                    <span>raw</span>
                  </label>
                  <label className={styles.toggle}>
                    <input type="checkbox" checked={showProcessed} onChange={(e) => setShowProcessed(e.target.checked)} />
                    <span>processed</span>
                  </label>
                  <label className={styles.toggle}>
                    <input type="checkbox" checked={showBinned} onChange={(e) => setShowBinned(e.target.checked)} />
                    <span>binned</span>
                  </label>
                  
                </div>
              </div>
              
            </div>
            
            <LightCurveChart
              rawCurve={data.raw_curve}
              processedCurve={data.processed_curve}
              transitCandidates={uniqueCandidates}
              selectedCandidate={selectedCandidate}
              forcedViewRange={selectedSegmentIdx != null ? [segments[selectedSegmentIdx].start, segments[selectedSegmentIdx].end] : null}
              showRaw={showRaw}
              showProcessed={showProcessed}
              showBinned={showBinned}
              segments={segments}
              onLocalDetect={handleLocalDetect}
              onClickProcessedBtn={handleClickProcessedBtn}
              onClickRawBtn={handleClickRawBtn}
            />
            <div className={styles.segmentRow}>
              <div className={styles.segmentLabel}>Segment:</div>

              <input
                type="range"
                min={0}
                max={Math.max(0, segments.length - 1)}
                value={selectedSegmentIdx ?? 0}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSelectedSegmentIdx(v);
                  setPresetZoom('segment');
                  setSelectedCandidate(null);
                }}
                className={styles.segmentSlider}
              />

              <div className={styles.segmentInfo}>
                {selectedSegmentIdx == null
                  ? <span className={styles.smallMuted}>{segments.length} segments — showing all</span>
                  : <span>#{selectedSegmentIdx + 1} • {segments[selectedSegmentIdx].start.toFixed(2)}–{segments[selectedSegmentIdx].end.toFixed(2)}</span>
                }
              </div>
            </div>
            

            <div className={styles.segmentChips}>
              {segments.map(s => (
                <button key={s.index} className={`${styles.chip} ${selectedSegmentIdx === s.index ? styles.chipActive : ''}`} onClick={() => { setSelectedSegmentIdx(s.index); setPresetZoom('segment'); setSelectedCandidate(null); }}>{s.index + 1}</button>
              ))}
            </div>
          </div>
        </main>

        <aside className={styles.right} style={{ width: SIDEBAR_WIDTH, height: SIDEBAR_HEIGHT }}>
          <div className={styles.card}>
            <div className={styles.predRow}>
              <div>
                <div className={styles.predLabel}>Model</div>
                <div className={styles.predTitle}>{data.exoplanet ? 'Exoplanet' : 'No Exoplanet'}</div>
              </div>
              <div className={styles.probWrap}>
                <div className={styles.probValue}>{probabilityPercent}%</div>
                <div className={styles.progBar}><div className={styles.progFill} style={{ width: `${probabilityPercent}%` }} /></div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Top features</div>
            <ul className={styles.features}>
              {data.features.slice(0, 8).map((f, i) => (
                <li key={i} className={styles.feature}>
                  <div className={styles.featureLeft}>
                    <span className={styles.rank}>{i + 1}</span>
                    <span className={styles.fname}>{f.name.replace(/_/g, ' ').slice(0, 28)}</span>
                  </div>
                  <div className={styles.fval}>{Number.isFinite(f.value) ? f.value.toExponential(2) : String(f.value)}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Transit candidates</div>

            <div className={styles.candidatesList}>
              {sidebarCandidates.map((c, idx) => (
                <button key={idx} type="button" className={`${styles.candidateBtn} ${selectedCandidate === idx ? styles.selected : ''}`} onClick={() => { setSelectedCandidate(selectedCandidate === idx ? null : idx); setPresetZoom('candidates'); }}>
                  <div className={styles.candLeft}><div className={styles.candIdx}>#{idx + 1}</div><div className={styles.candTime}>t={c.center_time.toFixed(3)}</div></div>
                  <div className={styles.candRight}><div className={styles.candScore}>{(c.score ?? 0).toFixed(1)}σ</div><div className={styles.candDepth}>{c.depth.toFixed(4)}</div></div>
                </button>
              ))}
              {sidebarCandidates.length === 0 && <div className={styles.empty}>No candidates</div>}
            </div>

            <div className={styles.candidatesFooter}>
              <button className={styles.smallBtn} onClick={() => window.dispatchEvent(new CustomEvent('request-local-detect'))}>Find more candidates</button>
              <span className={styles.smallMuted}> {sidebarCandidates.length}</span>
            </div>
          </div>

          
        </aside>
      </div>
    </div>
  );
};

export default AnalysisPage;
