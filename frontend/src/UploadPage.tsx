// src/UploadPage.tsx
import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import backIcon from './components/weui_back-filled.png'; // Adjust path if needed
/**
 * UploadPage.tsx — updated per user's instructions.
 *
 * Main selection screen left as-is (two model buttons + descriptions).
 * Modified pages for v1 (Light Curve) and v2 (Features) only.
 *
 * Key UI rules implemented:
 * - Back button top-left on model pages (aligned with borders)
 * - Upload blocks use "double border" visual (outer + inner)
 * - Inner area has gradient background
 * - Left button: white bg, black text: "Upload FITS files" (v1, multi files) or "Upload file / CSV" (v2 — single file or CSV).
 *   Filenames are shown inside that same left button under the label.
 * - Right button: Submit (white bg, black text)
 * - Space between first and second double border is plain black
 * - V2: second double border with manual fields (styled as black "buttons" with white text but are inputs)
 * - V1: after successful predict show "Analyze manually" button
 *
 * All UI text is in English.
 */

// Colors
const BORDER = "#205295";
const TEXT = "#F5F5F5";
const WHITE = "#FFFFFF";
const BLACK = "#000000";
const BACK = "#2833FE";
const GRADIENT = "#131313";
const GRADIENT1 = "linear-gradient(90deg, #020407 16%, #2833FE 50%, #020407 88%)";
const GRADIENT2 = "linear-gradient(90deg, #2833FE 0%, #020407 50%, #2833FE 100%)";
const GRADIENT3 = "linear-gradient(90deg, #2833FE 4%, #151C82 27%, #020407 50%, #151C82 75%, #2833FE 100%)"; 
const styles: { [k: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    padding: 28,
    background: "#040608",
    color: TEXT,
    fontFamily: "Inter, Roboto, Arial, sans-serif",
    boxSizing: "border-box",
  },
  // selection (unchanged main page area)
  selectionWrap: {
    maxWidth: 1120,
    margin: "0 auto 28px auto",
    display: "flex",
    gap: 20,
    justifyContent: "space-between",
  },
  colBox: {
    flex: "1 1 0",
    display: "flex",
    flexDirection: "column",
    
    gap: 12,
  },
  borderBlock: {
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: 18,
    background: "linear-gradient(180deg, rgba(5,10,16,0.35), rgba(12,24,41,0.2))",
    minHeight: 120,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  bigBtn: {
  width: "100%",
  height: "100%",
  borderRadius: 8,
  background: GRADIENT2,
  border: `1px solid ${BORDER}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
},
btnContent: {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  
  gap: 4,  // Отступ между текстом и подписью (2-6px подкорректируйте)
},
mainText: {
  fontWeight: 700,
  fontSize: 18,
  color: TEXT,
  textAlign: "center",
},
  descText: {
    color: "#cfe1ff",
    fontSize: 14,
    lineHeight: 1.4,
    textAlign: "center",
  },

  // panel wrapper for model pages
  modelWrapper: {
    maxWidth: "70vw",
    margin: "0 auto",
  },
  header: {
    textAlign: "center" as const,
    marginBottom: 12,
    marginTop: 0,
  },
  title: {
    fontSize: 36,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    marginTop: 50,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#c7d3db",
    marginTop: 8,
    marginBottom: 60,
    maxWidth: 820,
    marginLeft: "auto",
    marginRight: "auto",
    textAlign: "center" as const,
  },
  arrow: {
    marginTop: 10,
    fontSize: 24,
    color: "#cbd7e3",
  },
  
  // double border block
  doubleOuter: {
    borderRadius: 10,
    border: `1px solid ${BORDER}`,
    padding: 20,
    background: "transparent",
    marginBottom: 0,
    marginTop: 0,
  },
  doubleInner: {
    borderRadius: 15,
    border: `1px solid ${BORDER}`,
    padding: 14,
    background: GRADIENT3,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 0,
  },
  // upload left button (white bg, black text)
  uploadButtonWhite: {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  padding: "12px 14px",  // Уменьшили вертикальный padding для компенсации двух рядов текста
  borderRadius: 15,
  background: WHITE,
  color: BLACK,
  border: `1px solid ${BORDER}`,
  minWidth: "30%",
  maxWidth: "40%",
  cursor: "pointer",
},
uploadLabel: {
  fontWeight: 700,
  fontSize: '2vh',
},
uploadFilesList: {
  fontSize: '1.8vh',
  color: "#222",
  textAlign: "center",  // Добавил для надёжного центрирования текста внутри (если многострочный)
},
// submit white button (black text) — оставляем как есть, она приоритетная
submitWhite: {
  padding: "12px 25px",
  borderRadius: 15,
  background: WHITE,
  color: BLACK,
  border: `1px solid ${BORDER}`,
  fontWeight: 700,
  cursor: "pointer",
  minWidth: "50%",
  textAlign: "center" as const,
  fontSize: '2vh',
},

  // gap between first and second double border: plain black
  blackGap: {
    height: 18,
    background: "#000",
  },

  // fields double border (for V2 manual fields)
  fieldsOuter: {
    borderRadius: 10,
    border: `1px solid ${BORDER}`,
    padding: 20,
    background: GRADIENT,
    // background: "transparent",
    marginTop: 20,
  },
  fieldsInner: {
    borderRadius: 8,
    // border: `1px solid ${BORDER}`,
    padding: 18,
    background: GRADIENT,
    boxSizing: "border-box",
    
  },

  // fields styled as black buttons with white text (but are inputs)
  fieldButtonInput: {
    display: "block",
    width: "95%",
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${BORDER}`,
    background: BLACK,
    color: WHITE,
    fontSize: 14,
    outline: "none",
  },
  fieldLabelPlain: {
    color: TEXT,
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 8,
    paddingLeft: 100,
    textAlign: "left" as const,
  },
  fieldContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    width: "30vw",
    // padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${BORDER}`,
    background: BLACK,
    cursor: "pointer",
    userSelect: "none",
    zIndex: 3,
  },
  fieldLabelCentered: {
    color: WHITE,
    fontSize: '2vh',
    fontWeight: 700,
    marginBottom: 2,
    marginTop: 6,
    textAlign: "center" as const,
  },
  fieldInputCentered: {
    display: "block",
    width: "100%",
    // padding: "8px 0",
    border: "none",
    background: "transparent",
    color: WHITE,
    fontSize: '1.8vh',
    outline: "none",
    marginBottom: 2,
    textAlign: "center" as const,
  },
  // basic grid and bottom panels (all inside same fieldsInner)
  basicGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 18,
    marginTop: 12,
    marginBottom: 12,
  },
  bottomTwo: {
    display: "flex",
    gap: 12,
    marginTop: 70,
    marginBottom: 20,
    
  },
  bottomCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: 15,
    
  },
  verticalDivider: {
    width: 1,
    background: BORDER,
    margin: "0 8px",
  },

  // centered submit (white bg black text)
  centeredSubmitRow: {
    display: "flex",
    justifyContent: "center",
    marginTop: 30,
    zIndex: 1,
  },
  centeredSubmit: {
    padding: "12px 24px",
    borderRadius: 10,
    background: WHITE,
    color: BLACK,
    border: `1px solid ${BORDER}`,
    fontWeight: 700,
    fontSize: '2vh',
    cursor: "pointer",
    zIndex: 10,
  },

  // back button top-left (aligned with double border level)
  backTopLeft: {
    position: "absolute" as const,
    left: 0,
    top: 0,
    padding: "  70px 15px",
    cursor: "pointer",
    color: "#cfe1ff",
    zIndex: 3,
  },

  // results box and analyze button
  resultBox: {
  marginTop: 12,
  padding: 12,
  borderRadius: 8,
  border: `1px solid rgba(255,255,255,0.04)`,
  background: "rgba(255,255,255,0.02)",
  color: "#dfe7ee",
  textAlign: "left" as const,
},
  analyzeBtn: {
    marginTop: 8,
    padding: "8px 12px",
    borderRadius: 8,
    background: WHITE,
    color: BLACK,
    border: `1px solid ${BORDER}`,
    fontWeight: 700,
    cursor: "pointer",
  },
};

const GlowingCircles= ({ centerX = 50, centerY = 70, size = 400, opacity = 0.8 }) => {
  // centerX and centerY in % (0-100), size in px for radius
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      opacity: opacity,
      width: '100%',
      height: '100%',
      background: `radial-gradient(circle at ${centerX}% ${centerY}%, #1E06A680 0%, transparent ${size}px)`,
      zIndex: 2, // Behind other elements
      pointerEvents: 'none',
      overflow: "visible",
    }} />
  );
};
export default function UploadPage() {
  const navigate = useNavigate();

  // selection (main) left as before (user asked not to touch main selection)
  const [selected, setSelected] = useState<null | "v1" | "v2">(null);

  // V1
  const fitsRef = useRef<HTMLInputElement | null>(null);
  const [fitsFiles, setFitsFiles] = useState<File[]>([]);
  const [loadingV1, setLoadingV1] = useState(false);
  const [resultV1, setResultV1] = useState<any>(null);

  // V2
  const csvRef = useRef<HTMLInputElement | null>(null);
const singleRef = useRef<HTMLInputElement | null>(null);
const [v2File, setV2File] = useState<File | null>(null); // single file or csv
const [loadingV2, setLoadingV2] = useState(false);
const [resultV2, setResultV2] = useState<any>(null);
const [parsedData, setParsedData] = useState<any[]>([]);
const [manualData, setManualData] = useState<any>(null);

// fields for V2 manual
const [koiPeriod, setKoiPeriod] = useState("");
const [koiTime0bk, setKoiTime0bk] = useState("");
const [koiDuration, setKoiDuration] = useState("");
const [koiDepth, setKoiDepth] = useState("");
const [koiPrad, setKoiPrad] = useState("");
const [koiTeq, setKoiTeq] = useState("");
const [koiInsol, setKoiInsol] = useState("");
const [koiTcePlntNum, setKoiTcePlntNum] = useState("");
const [koiSteff, setKoiSteff] = useState("");
const [koiSlogg, setKoiSlogg] = useState("");
const [koiSrad, setKoiSrad] = useState("");
const [koiKepmag, setKoiKepmag] = useState("");


  

  // ========== Main selection UI (LEFT AS IS) ==========
  if (!selected) {
    return (
      
      <div style={styles.page}>
        <div style={{
          inset: 0,                // top:0; right:0; bottom:0; left:0
          pointerEvents: 'none',   // чтобы не блокировать клики
          overflow: 'visible',
          zIndex: 1,               // держим ниже интерактивных элементов (которые у вас zIndex: 3 и т.д.)
        }}>
          <GlowingCircles centerX={0} centerY={1} size={300} />
          <GlowingCircles centerX={100} centerY={60} size={600} />
          <GlowingCircles centerX={30} centerY={75} opacity={0.5} size={400}/>
          {/* Можно добавить/удалять кружки — они остаются absolute внутри этого fixed-контейнера */}
        </div>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <h1 style={styles.title}>UPLOAD YOUR DATA</h1>
            <p style={styles.subtitle}>
              Choose model: Light Curve (FITS) or Features (CSV/manual).
            </p>
            <div style={styles.arrow}>↓</div>
          </div>

          <div style={styles.selectionWrap}>
            <div style={styles.colBox}>
              <div style={styles.borderBlock}>
                <div role="button" style={styles.bigBtn} onClick={() => setSelected("v1")}>
                  <div style={styles.btnContent}>
                    <span style={styles.mainText}>Light Curve Model</span>
                    <span style={styles.descText}>click to view</span>
                  </div>
                </div>            
              </div>
              <div style={styles.borderBlock}>
                <div style={styles.descText}>Process raw FITS light curves — resample, detrend and detect transit signatures automatically.</div>
              </div>
            </div>

            <div style={styles.colBox}>
              <div style={styles.borderBlock}>
                <div role="button" style={styles.bigBtn} onClick={() => setSelected("v2")}>
                  <div style={styles.btnContent}>
                    <span style={styles.mainText}>Features Model</span>
                    <span style={styles.descText}>click to view</span>
                  </div>
                </div>    
              </div>
              <div style={styles.borderBlock}>
                <div style={styles.descText}>Upload CSV of features or enter them manually. Manual mode requires transit time and duration.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== V1 Page (Light Curve) ==========
  if (selected === "v1") {
    // handlers
    const onFitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      const arr: File[] = [];
      for (let i = 0; i < files.length; i++) arr.push(files[i]);
      setFitsFiles(arr);
    };
    const triggerFits = () => fitsRef.current && fitsRef.current.click();

    const submitFits = async () => {
      if (!fitsFiles || fitsFiles.length === 0) {
        alert("Please upload at least one FITS file.");
        return;
      }
      const fd = new FormData();
      fitsFiles.forEach((f) => fd.append("files", f));
      setLoadingV1(true);
      try {
        const res = await axios.post("http://localhost:8000/predict", fd, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 120000,
        });
        setResultV1(res.data);
        localStorage.setItem("analysisData", JSON.stringify(res.data));
      } catch (err: any) {
        console.error(err);
        alert(`Upload failed: ${err?.response?.data?.detail ?? "See console"}`);
      } finally {
        setLoadingV1(false);
      }
    };

    return (
      <div style={styles.page}>
        <div style={{
          inset: 0,                // top:0; right:0; bottom:0; left:0
          pointerEvents: 'none',   // чтобы не блокировать клики
          overflow: 'visible',
          zIndex: 1,               // держим ниже интерактивных элементов (которые у вас zIndex: 3 и т.д.)
        }}>
          <GlowingCircles centerX={0} centerY={1} size={300} />
          <GlowingCircles centerX={100} centerY={60} size={400} />
          <GlowingCircles centerX={30} centerY={75} opacity={0.5} size={400}/>
          {/* Можно добавить/удалять кружки — они остаются absolute внутри этого fixed-контейнера */}
        </div>
        <div style={styles.backTopLeft} onClick={() => setSelected(null)}>← Back</div>
        <div style={styles.modelWrapper}>
          {/* Back button top-left on same visual level as border */}
          

          <div style={styles.header}>
            <h1 style={styles.title}>UPLOAD YOUR DATA</h1>
            <p style={styles.subtitle}>
              Upload FITS files containing time and flux. The backend will auto-detect columns, resample and detrend the signal.
            </p>
            <div style={styles.arrow}>↓</div>
          </div>

          {/* double border (upload) */}
          <div style={styles.doubleOuter}>
            <div style={styles.doubleInner}>
              {/* left: white upload button (shows filenames under label) */}
              <div style={styles.uploadButtonWhite} onClick={triggerFits} role="button" aria-label="Upload FITS files">
                <div style={styles.uploadLabel}>Upload FITS files</div>
                <div style={styles.uploadFilesList}>
                  {fitsFiles.length === 0 
                    ? "Click to choose FITS (multiple allowed)" 
                    : `files uploaded (${fitsFiles.length} file${fitsFiles.length === 1 ? '' : 's'})`
                  }
                </div>
                {/* hidden native input */}
                <input ref={fitsRef} type="file" accept=".fits" multiple onChange={onFitsChange} style={{ display: "none" }} />
              </div>

              {/* right: submit white button */}
              <div style={{ width: "15%", display: "flex", justifyContent: "center" }}>
                <button style={styles.submitWhite} onClick={submitFits} aria-label="Submit FITS">
                  {loadingV1 ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </div>

          {/* gap is plain black */}
          <div style={styles.blackGap} />

          {/* Results + Analyze button (Analyze button appears after prediction) */}
          {resultV1 && (
            <div style={styles.resultBox}>
              <div style={{ fontWeight: 700 }}>Result</div>
              <div style={{ marginTop: 8 }}>Probability: {(resultV1.probability * 100).toFixed?.(2) ?? resultV1.probability}</div>
              <div>Exoplanet: {resultV1.exoplanet ? "Yes" : "No"}</div>
              <button style={styles.analyzeBtn} onClick={() => navigate("/analysis")}>Analyze manually</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========== V2 Page (Features) ==========
  // handlers for V2 upload: allow either single file input or CSV; user can pick one file (single)
  const parseCSV = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').map(line => line.split(',').map(cell => cell.trim().replace(/"/g, '')));
        if (lines.length < 2) {
          reject(new Error('Invalid CSV: too few lines'));
          return;
        }
        const headers = lines[0];
        const rows = lines.slice(1).filter(row => row.length > 0 && row.some(cell => cell));
        const data = rows.map(row => {
          const obj: any = {};
          headers.forEach((header, i) => {
            obj[header.toLowerCase().replace(/\s+/g, '_')] = row[i] || ''; // Normalize keys to match field names
          });
          return obj;
        });
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

const onV2SingleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const f = e.target.files && e.target.files[0];
  if (f) {
    setV2File(f);
    try {
      const data = await parseCSV(f);
      setParsedData(data);
    } catch (err) {
      console.error('CSV parse error:', err);
      setParsedData([]);
    }
  } else {
    setV2File(null);
    setParsedData([]);
  }
};

const triggerV2Single = () => singleRef.current && singleRef.current.click();

const onV2CsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const f = e.target.files && e.target.files[0];
  if (f) {
    setV2File(f);
    try {
      const data = await parseCSV(f);
      setParsedData(data);
    } catch (err) {
      console.error('CSV parse error:', err);
      setParsedData([]);
    }
  } else {
    setV2File(null);
    setParsedData([]);
  }
};

const triggerV2Csv = () => csvRef.current && csvRef.current.click();

const submitV2Csv = async () => {
  if (!v2File) {
    alert("Please choose a CSV file or a single file.");
    return;
  }
  const fd = new FormData();
  // backend expects key 'csv_file' for CSV path — but we allow single file too; backend handles validation
  fd.append("csv_file", v2File);
  setLoadingV2(true);
  try {
    const res = await axios.post("http://localhost:8000/predict_second", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    });
    setResultV2(res.data);
    localStorage.setItem("analysisData_v2", JSON.stringify(res.data));
  } catch (err: any) {
    console.error(err);
    alert(`CSV upload failed: ${err?.response?.data?.detail ?? "See console"}`);
  } finally {
    setLoadingV2(false);
  }
};

const submitV2Manual = async () => {
  // manual requires koiTime0bk and koiDuration non-zero
  const t = Number(koiTime0bk);
  const d = Number(koiDuration);
  if (!isFinite(t) || !isFinite(d) || t === 0 || d === 0) {
    alert("Manual submit requires valid Transit Mid Time (koi_time0bk) and Transit Duration (koi_duration) (non-zero).");
    return;
  }
  const inputData = {
    koi_period: koiPeriod ?? "",
    koi_time0bk: koiTime0bk,
    koi_duration: koiDuration,
    koi_depth: koiDepth ?? "",
    koi_prad: koiPrad ?? "",
    koi_teq: koiTeq ?? "",
    koi_insol: koiInsol ?? "",
    koi_tce_plnt_num: koiTcePlntNum ?? "",
    koi_steff: koiSteff ?? "",
    koi_slogg: koiSlogg ?? "",
    koi_srad: koiSrad ?? "",
    koi_kepmag: koiKepmag ?? "",
  };
  setManualData(inputData);

  const fd = new FormData();
  // required
  fd.append("koi_time0bk", koiTime0bk);
  fd.append("koi_duration", koiDuration);
  // append others (or empty to be imputed)
  fd.append("koi_period", koiPeriod ?? "");
  fd.append("koi_depth", koiDepth ?? "");
  fd.append("koi_prad", koiPrad ?? "");
  fd.append("koi_teq", koiTeq ?? "");
  fd.append("koi_insol", koiInsol ?? "");
  fd.append("koi_tce_plnt_num", koiTcePlntNum ?? "");
  fd.append("koi_steff", koiSteff ?? "");
  fd.append("koi_slogg", koiSlogg ?? "");
  fd.append("koi_srad", koiSrad ?? "");
  fd.append("koi_kepmag", koiKepmag ?? "");

  setLoadingV2(true);
  try {
    const res = await axios.post("http://localhost:8000/predict_second", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    });
    setResultV2(res.data);
    localStorage.setItem("analysisData_v2", JSON.stringify(res.data));
  } catch (err: any) {
    console.error(err);
    alert(`Manual submit failed: ${err?.response?.data?.detail ?? "See console"}`);
  } finally {
    setLoadingV2(false);
  }
};

  return (
    
    <div style={styles.page}>
      <div style={{
          inset: 0,                // top:0; right:0; bottom:0; left:0
          pointerEvents: 'none',   // чтобы не блокировать клики
          overflow: 'visible',
          zIndex: 1,               // держим ниже интерактивных элементов (которые у вас zIndex: 3 и т.д.)
        }}>
          <GlowingCircles centerX={0} centerY={1} size={300} />
          <GlowingCircles centerX={100} centerY={60} size={400} />
          <GlowingCircles centerX={30} centerY={75} opacity={0.5} size={400}/>
          {/* Можно добавить/удалять кружки — они остаются absolute внутри этого fixed-контейнера */}
        </div>
    <div style={styles.backTopLeft} onClick={() => setSelected(null)}>← Back</div>
      <div style={styles.modelWrapper}>
        {/* back button top-left */}
        

        <div style={styles.header}>
          <h1 style={styles.title}>UPLOAD YOUR DATA</h1>
          <p style={styles.subtitle}>
            Provide CSV or a single file, or fill fields manually. Manual mode requires Transit Time and Transit Duration (non-zero).
          </p>
          <div style={styles.arrow}>↓</div>
        </div>
        {/* <GlowingCircles centerX={40} centerY={20} opacity={0.5} /> */}
        {/* first double border: upload (single file or csv) */}
        <div style={styles.doubleOuter}>
          <div style={styles.doubleInner}>
              {/* white button for selecting single file (or CSV) */}
              <div style={styles.uploadButtonWhite} onClick={triggerV2Single} role="button" aria-label="Upload single file or CSV">
                <div style={styles.uploadLabel}>Upload CSV file</div>
                <div style={styles.uploadFilesList}>{v2File ? v2File.name : "Click to choose CSV (one only)"}</div>
                {/* hidden single input */}
                <input ref={singleRef} type="file" accept=".csv" onChange={onV2SingleChange} style={{ display: "none" }} />
              </div>

            <div style={{ width: "15%", display: "flex", justifyContent: "center" }}>
              <button style={styles.submitWhite} onClick={submitV2Csv} aria-label="Submit file/CSV">
                {loadingV2 ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>

        {/* black gap */}
        <div style={styles.blackGap} />

        {/* second double border: manual fields (single block) */}
        <div style={styles.arrow}>↓</div>
        <div style={styles.fieldsOuter}>
          <div style={styles.fieldsInner}>
            
            <div style={{ textAlign: "center", marginBottom: 12, zIndex: 3 }}>
              <div style={{ fontSize: '3.5vh', marginBottom: 27, fontWeight: 700, color: TEXT }}>Basic Planet Information</div>
              </div>

            <div style={styles.basicGrid}>
              <div style={{ ...styles.fieldContainer, background: GRADIENT2 }} onClick={(e) => {
                const input = e.currentTarget.querySelector('input');
                if (input) input.focus();
              }}>
                <div style={styles.fieldLabelCentered}>Orbital Period (days)</div>
                <input 
                  style={styles.fieldInputCentered} 
                  placeholder="Enter orbital period" 
                  value={koiPeriod} 
                  onChange={(e) => setKoiPeriod(e.target.value)} 
                />
              </div>

              <div style={{ ...styles.fieldContainer, background: GRADIENT2 }} onClick={(e) => {
                const input = e.currentTarget.querySelector('input');
                if (input) input.focus();
              }}>
                <div style={styles.fieldLabelCentered}>Transit Mid Time (BJD) *</div>
                <input 
                  style={styles.fieldInputCentered} 
                  placeholder="e.g. 2457000.123" 
                  value={koiTime0bk} 
                  onChange={(e) => setKoiTime0bk(e.target.value)} 
                />
              </div>

              <div style={{ ...styles.fieldContainer, background: GRADIENT1 }} onClick={(e) => {
                const input = e.currentTarget.querySelector('input');
                if (input) input.focus();
              }}>
                <div style={styles.fieldLabelCentered}>Transit Duration (days) *</div>
                <input 
                  style={styles.fieldInputCentered} 
                  placeholder="Duration in days e.g. 0.08" 
                  value={koiDuration} 
                  onChange={(e) => setKoiDuration(e.target.value)} 
                />
              </div>

              <div style={{ ...styles.fieldContainer, background: GRADIENT1 }} onClick={(e) => {
                const input = e.currentTarget.querySelector('input');
                if (input) input.focus();
              }}>
                <div style={styles.fieldLabelCentered}>Transit Depth</div>
                <input 
                  style={styles.fieldInputCentered} 
                  placeholder="e.g. 0.01" 
                  value={koiDepth} 
                  onChange={(e) => setKoiDepth(e.target.value)} 
                />
              </div>

              <div style={{ ...styles.fieldContainer, background: GRADIENT2 }} onClick={(e) => {
                const input = e.currentTarget.querySelector('input');
                if (input) input.focus();
              }}>
                <div style={styles.fieldLabelCentered}>Planet Radius (R⊕)</div>
                <input 
                  style={styles.fieldInputCentered} 
                  placeholder="e.g. 1.5" 
                  value={koiPrad} 
                  onChange={(e) => setKoiPrad(e.target.value)} 
                />
              </div>
            </div>

            {/* bottom two sections inside same block */}
            <div style={styles.bottomTwo}>
              <div style={styles.bottomCol}>
                <div style={{ textAlign: "center",marginBottom: 10, zIndex: 3,fontWeight: 700, fontSize: '3.5vh', color: TEXT }}>Star Parameters</div>
                <div style={{ ...styles.fieldContainer, background: GRADIENT1 }} onClick={(e) => {
                  const input = e.currentTarget.querySelector('input');
                  if (input) input.focus();
                }}>
                  <div style={styles.fieldLabelCentered}>Star Effective Temperature (K)</div>
                  <input 
                    style={styles.fieldInputCentered} 
                    placeholder="e.g. 5778" 
                    value={koiSteff} 
                    onChange={(e) => setKoiSteff(e.target.value)} 
                  />
                </div>
                <div style={{ ...styles.fieldContainer, background: GRADIENT2 }} onClick={(e) => {
                  const input = e.currentTarget.querySelector('input');
                  if (input) input.focus();
                }}>
                  <div style={styles.fieldLabelCentered}>Star Surface Gravity log(g)</div>
                  <input 
                    style={styles.fieldInputCentered} 
                    placeholder="e.g. 4.44" 
                    value={koiSlogg} 
                    onChange={(e) => setKoiSlogg(e.target.value)} 
                  />
                </div>
                <div style={{ ...styles.fieldContainer, background: GRADIENT1 }} onClick={(e) => {
                  const input = e.currentTarget.querySelector('input');
                  if (input) input.focus();
                }}>
                  <div style={styles.fieldLabelCentered}>Star Radius (R☉)</div>
                  <input 
                    style={styles.fieldInputCentered} 
                    placeholder="e.g. 1.0" 
                    value={koiSrad} 
                    onChange={(e) => setKoiSrad(e.target.value)} 
                  />
                </div>
                <div style={{ ...styles.fieldContainer, background: GRADIENT2 }} onClick={(e) => {
                  const input = e.currentTarget.querySelector('input');
                  if (input) input.focus();
                }}>
                  <div style={styles.fieldLabelCentered}>Kepler Magnitude (Kp)</div>
                  <input 
                    style={styles.fieldInputCentered} 
                    placeholder="e.g. 12.5" 
                    value={koiKepmag} 
                    onChange={(e) => setKoiKepmag(e.target.value)} 
                  />
                </div>
              </div>

              <div style={styles.bottomCol}>
                <div style={{ textAlign: "center",marginBottom: 10, fontWeight: 700, zIndex: 3, fontSize: '3.5vh',color: TEXT }}>System Parameters</div>
                <div style={{ ...styles.fieldContainer, background: GRADIENT1 }} onClick={(e) => {
                  const input = e.currentTarget.querySelector('input');
                  if (input) input.focus();
                }}>
                  <div style={styles.fieldLabelCentered}>Equilibrium Temperature (K)</div>
                  <input 
                    style={styles.fieldInputCentered} 
                    placeholder="e.g. 300" 
                    value={koiTeq} 
                    onChange={(e) => setKoiTeq(e.target.value)} 
                  />
                </div>
                <div style={{ ...styles.fieldContainer, background: GRADIENT2 }} onClick={(e) => {
                  const input = e.currentTarget.querySelector('input');
                  if (input) input.focus();
                }}>
                  <div style={styles.fieldLabelCentered}>Insolation</div>
                  <input 
                    style={styles.fieldInputCentered} 
                    placeholder="e.g. 1.0" 
                    value={koiInsol} 
                    onChange={(e) => setKoiInsol(e.target.value)} 
                  />
                </div>
                <div style={{ ...styles.fieldContainer, background: GRADIENT1 }} onClick={(e) => {
                  const input = e.currentTarget.querySelector('input');
                  if (input) input.focus();
                }}>
                  <div style={styles.fieldLabelCentered}>TCE/Planet Number</div>
                  <input 
                    style={styles.fieldInputCentered} 
                    placeholder="e.g. 1" 
                    value={koiTcePlntNum} 
                    onChange={(e) => setKoiTcePlntNum(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            

            {/* centered white submit manual */}
            <div style={styles.centeredSubmitRow}>
              <button style={styles.centeredSubmit} onClick={submitV2Manual} aria-disabled={!koiTime0bk || !koiDuration}>
                {loadingV2 ? "Submitting..." : "Submit Manual"}
              </button>
            </div>
          </div>
        </div>

        {/* hidden native inputs for CSV/single file selection */}
        <input ref={csvRef} type="file" accept=".csv" style={{ display: "none" }} onChange={onV2CsvChange} />
        <input ref={singleRef} type="file" accept="*" style={{ display: "none" }} onChange={onV2SingleChange} />

        {/* bottom back */}
        <div style={{ 
          marginTop: 12, 
          position: "sticky", 
          top: 20, // Добавь это, чтобы sticky работало при достижении верха
          zIndex: 10, // Опционально: чтобы элемент был поверх других
          marginBottom: 20,
        }}>
          <div style={{ cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })}>
            <img src={backIcon} alt="Back" style={{ width: 54, height: 24}} /> {/* Removed filter to keep original white color */}
          </div>
        </div>

        {/* results */}
        {resultV2 && (
  <div>
    <div style={{textAlign: "center" as const, fontSize: 30, marginBottom: 20, fontWeight: 700, marginTop: 30}}>Results ({resultV2.count ?? "?"})</div>
    <div style={styles.resultBox}>
      <div style={{ marginTop: 8 }}>
        {Array.isArray(resultV2.results) ? resultV2.results.map((r: any) => {
          let features = null;
          if (parsedData.length > 0 && r.index !== undefined) {
            features = parsedData[r.index] || {};
          } else if (manualData && resultV2.results.length === 1) {
            features = manualData;
          }
          return (
            <div key={r.index ?? 0} style={{ marginBottom: 10 }}>
              <div><b>Row #{r.index ?? 0}</b> — Probability: {(r.probability * 100).toFixed(2)}% — Exoplanet: {r.exoplanet ? "Yes" : "No"}</div>
              {features && Object.keys(features).length > 0 && (
                <div style={{ marginLeft: 20, fontSize: 12, marginTop: 5 }}>
                  <b>Features:</b>
                  {Object.entries(features).map(([key, val]) => (
                    <div key={key} style={{ marginBottom: 2 }}>
                      {String(key)}: {String(val) || 'N/A'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }) : <div>No results</div>}
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  );
}
