// LightCurveChart.tsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import styles from './LightCurveChart.module.css';

interface TransitCandidate {
  center_time: number;
  start_time: number;
  end_time: number;
  depth: number;
  score?: number;
}
interface Segment { index: number; start: number; end: number; center: number; }

interface Props {
  rawCurve: { time: number[]; flux: number[] };
  processedCurve: { time: number[]; flux: number[] };
  transitCandidates?: TransitCandidate[];
  selectedCandidate?: number | null;
  forcedViewRange?: [number, number] | null;
  showRaw?: boolean;
  showProcessed?: boolean;
  showBinned?: boolean;
  segments?: Segment[];
  onLocalDetect?: (found: TransitCandidate[]) => void;
  onClickProcessedBtn?: () => void;
  onClickRawBtn?: () => void;
}

const LightCurveChart: React.FC<Props> = ({
  rawCurve, processedCurve, transitCandidates = [], selectedCandidate = null,
  forcedViewRange = null, showRaw = false, showProcessed = true, showBinned = false,
  segments = [], onLocalDetect, onClickProcessedBtn, onClickRawBtn
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const miniRef = useRef<HTMLCanvasElement | null>(null);
  const prevBodyOverflow = useRef<string | null>(null);

  const [viewMode, setViewMode] = useState<'processed' | 'raw'>(showProcessed ? 'processed' : 'raw');
  const [zoomRange, setZoomRange] = useState<[number, number] | null>(forcedViewRange ?? null);
  const [hover, setHover] = useState<{ time: number; flux: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef<{ x0: number; r0: [number, number] | null } | null>(null);

  useEffect(() => { setZoomRange(forcedViewRange ?? null); }, [forcedViewRange]);
  useEffect(() => { if (showProcessed) setViewMode('processed'); else if (showRaw) setViewMode('raw'); }, [showRaw, showProcessed]);

  const handleProcessedBtn = () => { if (onClickProcessedBtn) onClickProcessedBtn(); setViewMode('processed'); };
  const handleRawBtn = () => { if (onClickRawBtn) onClickRawBtn(); setViewMode('raw'); };

  const data = viewMode === 'raw' ? rawCurve : processedCurve;

  const bounds = useMemo(() => ({
    minT: Math.min(...data.time),
    maxT: Math.max(...data.time),
    minF: Math.min(...data.flux),
    maxF: Math.max(...data.flux)
  }), [data]);

  const clampRange = (r: [number, number]) => {
    if (r[0] >= r[1]) return r;
    const minSpan = (bounds.maxT - bounds.minT) * 1e-9;
    const lo = Math.max(bounds.minT, Math.min(r[0], bounds.maxT - minSpan));
    const hi = Math.min(bounds.maxT, Math.max(r[1], bounds.minT + minSpan));
    return [lo, hi] as [number, number];
  };

  useEffect(() => {
    if (selectedCandidate == null) return;
    const c = transitCandidates[selectedCandidate];
    if (!c) return;
    const pad = (c.end_time - c.start_time) * 0.8 || (bounds.maxT - bounds.minT) * 0.02;
    setZoomRange(clampRange([Math.max(bounds.minT, c.start_time - pad), Math.min(bounds.maxT, c.end_time + pad)]));
  }, [selectedCandidate, transitCandidates, bounds]);

  // binned helper
  function makeBinned(curve: { time: number[]; flux: number[] }, targetPoints = 600) {
    const n = curve.time.length;
    if (n <= targetPoints) return curve;
    const binSize = Math.ceil(n / targetPoints);
    const times: number[] = [];
    const fluxes: number[] = [];
    for (let i = 0; i < n; i += binSize) {
      const sliceT = curve.time.slice(i, i + binSize);
      const sliceF = curve.flux.slice(i, i + binSize);
      const tAvg = sliceT.reduce((a, b) => a + b, 0) / sliceT.length;
      const fAvg = sliceF.reduce((a, b) => a + b, 0) / sliceF.length;
      times.push(tAvg);
      fluxes.push(fAvg);
    }
    return { time: times, flux: fluxes };
  }
  const binnedProcessed = useMemo(() => makeBinned(processedCurve, 600), [processedCurve]);

  // local detector (frontend)
  const detectLocalCandidates = (curve: { time: number[]; flux: number[] }) : TransitCandidate[] => {
    const t = curve.time;
    const f = curve.flux;
    if (t.length < 20) return [];
    const win = Math.max(3, Math.round(t.length / 300));
    const smooth: number[] = [];
    for (let i = 0; i < f.length; i++) {
      let s = 0, cnt = 0;
      for (let j = i - win; j <= i + win; j++) {
        if (j >= 0 && j < f.length) { s += f[j]; cnt++; }
      }
      smooth.push(s / cnt);
    }
    const inv = smooth.map(v => -v);
    const sorted = inv.slice().sort((a,b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const absdev = sorted.map(v => Math.abs(v - median));
    const mad = absdev.sort((a,b)=>a-b)[Math.floor(absdev.length/2)] || 0.0;
    const threshold = median + Math.max(1.5 * mad, 0.0001);
    const candidatesIdx: number[] = [];
    const minDistPts = Math.max(3, Math.round(win * 1.5));
    for (let i = 1; i < inv.length - 1; i++) {
      if (inv[i] <= threshold) continue;
      if (inv[i] > inv[i-1] && inv[i] >= inv[i+1]) {
        if (candidatesIdx.length > 0 && (i - candidatesIdx[candidatesIdx.length - 1]) < minDistPts) {
          if (inv[i] > inv[candidatesIdx[candidatesIdx.length - 1]]) candidatesIdx[candidatesIdx.length - 1] = i;
        } else {
          candidatesIdx.push(i);
        }
      }
    }
    const results: TransitCandidate[] = candidatesIdx.map(idx => {
      const left = Math.max(0, idx - win*2);
      const right = Math.min(t.length - 1, idx + win*2);
      const center_time = t[idx];
      const start_time = t[left];
      const end_time = t[right];
      const depth = inv[idx] - median;
      const score = mad > 0 ? (depth / mad) : depth;
      return { center_time, start_time, end_time, depth, score };
    });
    return results.sort((a,b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 20);
  };

  useEffect(() => {
    const handler = () => {
      const found = detectLocalCandidates(processedCurve);
      if (onLocalDetect) onLocalDetect(found);
    };
    window.addEventListener('request-local-detect', handler);
    return () => window.removeEventListener('request-local-detect', handler);
  }, [processedCurve, onLocalDetect]);

  // disable page scroll while pointer is inside chart area
  const setPageScrollDisabled = (disable: boolean) => {
    try {
      if (disable) {
        if (prevBodyOverflow.current == null) prevBodyOverflow.current = document.body.style.overflow || '';
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = prevBodyOverflow.current ?? '';
        prevBodyOverflow.current = null;
      }
    } catch (e) {
      // ignore (SSR/no document)
    }
  };

  useEffect(() => {
    return () => {
      // cleanup on unmount
      try { document.body.style.overflow = prevBodyOverflow.current ?? ''; } catch {}
    };
  }, []);

  // DRAW main canvas
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, rect.width) * dpr; canvas.height = Math.max(1, rect.height) * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = rect.width, H = rect.height;
    const pad = { l: 56, r: 12, t: 18, b: 30 };
    const cw = Math.max(1, W - pad.l - pad.r), ch = Math.max(1, H - pad.t - pad.b);
    ctx.clearRect(0, 0, W, H);

    const vr = zoomRange ?? [bounds.minT, bounds.maxT];
    const getPts = (cur: { time: number[]; flux: number[] }) => cur.time.map((tt, i) => ({ t: tt, f: cur.flux[i] })).filter(p => p.t >= vr[0] && p.t <= vr[1]);
    const mainPts = getPts(viewMode === 'raw' ? rawCurve : processedCurve);
    if (!mainPts.length) {
      ctx.fillStyle = '#7a8897'; ctx.font = '13px Inter, system-ui'; ctx.fillText('No data in current range', W/2 - 50, H/2); return;
    }
    const fmin = Math.min(...mainPts.map(p => p.f)), fmax = Math.max(...mainPts.map(p => p.f));
    const scaleX = (t:number) => pad.l + ((t - vr[0])/(vr[1]-vr[0])) * cw;
    const scaleY = (f:number) => pad.t + ch - ((f - fmin)/(fmax - fmin)) * ch;

    // SEGMENTS background
    segments.forEach(s => {
      if (s.end < vr[0] || s.start > vr[1]) return;
      const x1 = scaleX(Math.max(s.start, vr[0]));
      const x2 = scaleX(Math.min(s.end, vr[1]));
      ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x1, pad.t); ctx.lineTo(x1, pad.t + ch); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2, pad.t); ctx.lineTo(x2, pad.t + ch); ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 1)'; ctx.font = '10px Inter, system-ui';
      ctx.fillText('start', Math.max(pad.l + 4, x1 + 4), pad.t + 12);
      ctx.fillText('end', Math.max(pad.l + 4, x2 - 24), pad.t + 12);
    });

    const drawLine = (pts: {t:number;f:number}[], color: string, width = 1.6, dash: number[] | null = null, alpha = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      if (dash) ctx.setLineDash(dash); else ctx.setLineDash([]);
      ctx.beginPath();
      pts.forEach((p, i) => { const x = scaleX(p.t), y = scaleY(p.f); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
      ctx.stroke();
      ctx.restore();
    };

    if (showRaw) {
      const rawPts = getPts(rawCurve);
      if (rawPts.length) drawLine(rawPts, 'rgba(180,200,210,0.22)', 1.2, null, 0.9);
    }
    if (showProcessed) drawLine(getPts(processedCurve), '#36d1c3', 1.8, null, 1);
    if (showBinned) drawLine(getPts(binnedProcessed), '#2bb9a9', 2.4, [6,4], 1);

    // axes ticks
    ctx.fillStyle = 'rgba(170,190,200,0.9)'; ctx.font = '11px Inter, system-ui';
    for (let i=0;i<=4;i++){ const y = pad.t + (ch/4)*i; const v = fmax - (fmax-fmin)*(i/4); ctx.fillText(v.toFixed(2), pad.l - 10, y + 4); }
    ctx.textAlign = 'center';
    for (let i=0;i<=6;i++){ const x = pad.l + (cw/6)*i; const tval = vr[0] + (vr[1]-vr[0])*(i/6); ctx.fillText(tval.toFixed(2), x, H - 8); }
    ctx.textAlign = 'start';

    // transit centers
    transitCandidates.forEach((c, idx) => {
      if (c.end_time < vr[0] || c.start_time > vr[1]) return;
      const cx = scaleX(c.center_time);
      ctx.strokeStyle = idx === selectedCandidate ? 'rgba(255,99,90,0.95)' : 'rgba(255,190,60,0.95)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, pad.t + 6); ctx.lineTo(cx, pad.t + 18); ctx.stroke();
      ctx.fillStyle = idx === selectedCandidate ? 'rgba(255,99,90,1)' : 'rgba(255,190,60,1)';
      ctx.beginPath(); ctx.arc(cx, pad.t + 6, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.font = '11px Inter, system-ui';
      ctx.fillStyle = '#eaf7f4';
      ctx.fillText(`#${idx + 1}`, cx + 6, pad.t + 10);
      ctx.font = '10px Inter, system-ui';
      ctx.fillStyle = 'rgba(200,220,230,0.8)';
      ctx.fillText(`${(c.depth).toFixed(3)}`, cx + 6, pad.t + 22);
    });

    // hover tooltip
    if (hover) {
      const x = scaleX(hover.time), y = scaleY(hover.flux);
      ctx.strokeStyle = 'rgba(255,99,90,0.9)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ch); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke();
      const txt = `T ${hover.time.toFixed(3)}, F ${hover.flux.toFixed(2)}`;
      ctx.font = '12px Inter, system-ui'; const w = ctx.measureText(txt).width + 12;
      const hx = Math.min(Math.max(8, x + 8), W - w - 8);
      ctx.fillStyle = 'rgba(12,16,22,0.95)'; roundRect(ctx, hx, y - 28, w, 22, 6); ctx.fillStyle = '#fff'; ctx.fillText(txt, hx + 6, y - 12);
    }

    // axis titles
    ctx.fillStyle = 'rgba(220,235,245,0.9)'; ctx.font = '12px Inter, system-ui';
    // ctx.fillText('Time (days)', W / 2 - 10, H); ctx.save(); 
    ctx.translate(14, H / 2); ctx.rotate(-Math.PI/2); ctx.fillText('Flux', 0, 0); ctx.restore();

    function roundRect(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number, r:number) {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
      ctx.fill();
    }

  }, [rawCurve, processedCurve, binnedProcessed, transitCandidates, zoomRange, hover, showRaw, showProcessed, showBinned, selectedCandidate, segments]);

  // minimap
  useEffect(() => {
    const cn = miniRef.current; if (!cn) return;
    const ctx = cn.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = cn.getBoundingClientRect();
    cn.width = Math.max(1, rect.width) * dpr; cn.height = Math.max(1, rect.height) * dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
    const W = rect.width, H = rect.height;
    ctx.clearRect(0,0,W,H);
    const tmin = Math.min(...(showProcessed ? processedCurve.time : rawCurve.time));
    const tmax = Math.max(...(showProcessed ? processedCurve.time : rawCurve.time));
    const fmin = Math.min(...(showProcessed ? processedCurve.flux : rawCurve.flux));
    const fmax = Math.max(...(showProcessed ? processedCurve.flux : rawCurve.flux));
    const sx = (t:number) => ((t - tmin) / (tmax - tmin)) * W;
    const sy = (f:number) => H - ((f - fmin) / (fmax - fmin)) * H;
    ctx.strokeStyle = 'rgba(120,140,160,0.12)'; ctx.lineWidth = 1; ctx.beginPath();
    const arrT = showProcessed ? processedCurve.time : rawCurve.time;
    const arrF = showProcessed ? processedCurve.flux : rawCurve.flux;
    arrT.forEach((tt,i) => { const x = sx(tt), y = sy(arrF[i]); if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
    ctx.stroke();
    if (zoomRange) { const x1 = sx(zoomRange[0]), x2 = sx(zoomRange[1]); ctx.fillStyle = 'rgba(54,209,195,0.10)'; ctx.fillRect(x1,0,x2-x1,H); ctx.strokeStyle = 'rgba(54,209,195,0.22)'; ctx.strokeRect(x1,0,x2-x1,H); }
  }, [rawCurve, processedCurve, zoomRange, showProcessed, showRaw]);

  // interactions
  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current; if (!c) return;
    const rect = c.getBoundingClientRect(); const x = e.clientX - rect.left;
    const pad = { l: 56, r: 12 }; const cw = rect.width - pad.l - pad.r;
    const vr = zoomRange ?? [Math.min(...data.time), Math.max(...data.time)];
    const t = vr[0] + ((x - pad.l) / cw) * (vr[1] - vr[0]);
    const pts = data.time.map((tt, i) => ({ t: tt, f: data.flux[i] })).filter(p => p.t >= vr[0] && p.t <= vr[1]);
    if (!pts.length) { setHover(null); return; }
    let nearest = pts[0];
    for (let p of pts) if (Math.abs(p.t - t) < Math.abs(nearest.t - t)) nearest = p;
    setHover({ time: nearest.t, flux: nearest.f });
    if (isPanning && panRef.current) {
      const dx = e.clientX - panRef.current.x0; const rectW = c.getBoundingClientRect().width;
      const span = (panRef.current.r0 ? (panRef.current.r0[1] - panRef.current.r0[0]) : (Math.max(...data.time) - Math.min(...data.time)));
      const dt = -dx / rectW * span;
      if (panRef.current.r0) setZoomRange(clampRange([panRef.current.r0[0] + dt, panRef.current.r0[1] + dt]));
    }
  };
  const onLeave = () => { setHover(null); setIsPanning(false); setPageScrollDisabled(false); };
  const onEnter = () => { setPageScrollDisabled(true); };

  const onDown = (e: React.MouseEvent<HTMLCanvasElement>) => { setIsPanning(true); panRef.current = { x0: e.clientX, r0: zoomRange }; };
  const onUp = () => { setIsPanning(false); panRef.current = null; };
  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    // prevent page scroll (also already disabled by onEnter) and perform zoom
    e.preventDefault();
    e.stopPropagation();
    const c = canvasRef.current; if (!c) return;
    const rect = c.getBoundingClientRect(); const x = e.clientX - rect.left;
    const pad = { l: 56, r: 12 }; const cx = (x - pad.l) / (rect.width - pad.l - pad.r);
    if (cx < 0 || cx > 1) return;
    const vr = zoomRange ?? [Math.min(...data.time), Math.max(...data.time)];
    const span = vr[1] - vr[0]; const zoomFactor = e.deltaY > 0 ? 1.15 : 0.85;
    const centerT = vr[0] + cx * span;
    const newR: [number, number] = [centerT - (centerT - vr[0]) * zoomFactor, centerT + (vr[1] - centerT) * zoomFactor];
    setZoomRange(clampRange(newR));
  };

  return (
    <div className={styles.wrap} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <div className={styles.topControls}>
        <div className={styles.viewBtns}>
          <button className={`${styles.btn} ${viewMode === 'processed' ? styles.active : ''}`} onClick={handleProcessedBtn}>Processed</button>
          <button className={`${styles.btn} ${viewMode === 'raw' ? styles.active : ''}`} onClick={handleRawBtn}>Raw</button>
        </div>
        <div className={styles.controlsRight}>
          <button className={styles.btnGhost} onClick={() => setZoomRange(null)}>Reset</button>
          <button className={styles.btnGhost} onClick={() => {
            if (transitCandidates.length) {
              const c = transitCandidates[0];
              const pad = (c.end_time - c.start_time) * 1.0 || (bounds.maxT - bounds.minT) * 0.02;
              setZoomRange(clampRange([c.start_time - pad, c.end_time + pad]));
            }
          }}>Zoom top candidate</button>
        </div>
      </div>

      <canvas ref={miniRef} className={styles.minimap} />

      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onMouseDown={onDown}
        onMouseUp={onUp}
        onWheel={onWheel}
      />
    </div>
  );
};

export default LightCurveChart;
