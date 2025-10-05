// src/UploadPage.tsx
import React, { useRef, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import backIcon from './components/weui_back-filled.png'; // Adjust path if needed
// вставь этот код в верхнюю часть файла (например под импорты)

// Полностью замените текущий ResultsTable на этот код

// Замените текущий ResultsTable на этот код

type ResItem = {
  index?: number;
  probability: number;
  exoplanet: boolean;
  features?: { [k: string]: any };
};

type ResultsTableProps = {
  results: ResItem[];
  parsedData: any[]; // из parseCSV (koi_* keys)
  manualData: { [k: string]: any } | null; // koi_* keys
};

function prettyKey(k: string) {
  return k.startsWith("koi_") ? k.slice(4) : k;
}

export function ResultsTable({ results, parsedData, manualData }: ResultsTableProps) {
  const [sortBy, setSortBy] = useState<"row" | "prob" | "exo">("prob");
  const [asc, setAsc] = useState<boolean>(false); // по умолчанию — по убыванию вероятности
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  // --- Настройки внешнего вида ---
  const tableMaxWidth = 700;           // ширина таблицы
  const headerBgColor = "#000000";     // фон хедера — чёрный
  const headerTextColor = "#FFFFFF";   // цвет текста хедера
  const thPadding = "6px 8px";
  const tdPadding = "6px 8px";
  const colWidths = {
    row: 80,
    prob: 120,
    exo: 120,
    actions: 80
  };
  // --------------------------------------------------

  const toggleSort = (col: "row" | "prob" | "exo") => {
    if (col === sortBy) {
      setAsc(!asc);
    } else {
      setSortBy(col);
      setAsc(col === "row" ? true : false);
    }
  };

  const sorted = useMemo(() => {
    const arr = [...results];
    const cmp = (a: ResItem, b: ResItem) => {
      if (sortBy === "row") {
        const ai = a.index ?? 0;
        const bi = b.index ?? 0;
        return ai - bi;
      } else if (sortBy === "prob") {
        return a.probability - b.probability;
      } else {
        const av = a.exoplanet ? 1 : 0;
        const bv = b.exoplanet ? 1 : 0;
        return av - bv;
      }
    };
    arr.sort((A, B) => (asc ? cmp(A, B) : -cmp(A, B)));
    return arr;
  }, [results, sortBy, asc]);

  const toggleExpand = (idx: number) => setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));

  const renderFeaturesFor = (r: ResItem) => {
    let featObj: { [k: string]: any } = {};
    if (r.features && Object.keys(r.features).length > 0) {
      featObj = r.features as any;
    } else if (typeof r.index === "number" && parsedData && parsedData[r.index]) {
      featObj = parsedData[r.index];
    } else if (manualData) {
      featObj = manualData;
    }
    return featObj;
  };

  const Arrow = ({ up }: { up: boolean }) => <span style={{ marginLeft: 6, fontSize: 12 }}>{up ? "▲" : "▼"}</span>;

  // Стили контейнера/таблицы (центрирование + бордер)
  const outerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center", // центрируем как якорь
    marginTop: 18,
    
  };
  const innerWrapper: React.CSSProperties = {
    width: "100%",
    maxWidth: tableMaxWidth,
    
  };
  const headerTextStyle: React.CSSProperties = {
    fontSize: '3.5vh',
    fontWeight: 700,
    marginBottom: 20,
    
    textAlign: "center" as const,
  };
  const tableWrapperStyle: React.CSSProperties = {
    border: `1px solid ${BORDER}`,
    overflow: "hidden",
    width: "100%",
    borderRadius: 15,
};
  const tblStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
    color: "#dfe7ee",
    margin: "0 auto", // ещё раз центр внутри wrapper
    
    overflow: "hidden",
  };
  const headtb: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    background: WHITE,
    color: BLACK  ,
  };
  
  const thBase: React.CSSProperties = {
    padding: thPadding,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    cursor: "pointer",
    userSelect: "none",
    textAlign: "center" as const,
    background: WHITE,
    color: BLACK,
    fontSize: '1.7vh',
    fontWeight: 700,
    verticalAlign: "bottom" as const,
};

// Стили для первой и последней ячейки
const thFirst: React.CSSProperties = {
    ...thBase,
    borderTopLeftRadius: 15, 
};

const thLast: React.CSSProperties = {
    ...thBase,
    borderTopRightRadius: 15,
};
  const tdBase: React.CSSProperties = {
    padding: tdPadding,
    fontSize: '1.5vh',
    textAlign: "center" as const,
    alignItems: "center",
    verticalAlign: "center" as const,
    
  };
  const dispositionStyle: React.CSSProperties = {
    fontWeight: 700
    
  };

  return (
    <div style={outerStyle}>
      <div style={innerWrapper}>
        {/* Верхний текст — количество рядов */}
        <div style={headerTextStyle}>Results ({results ? results.length : 0} rows)</div>
        <div style={tableWrapperStyle}>
        <table style={tblStyle}>
          <thead style={headtb}>
             <tr>
              <th style={{ ...thFirst, width: colWidths.row }} onClick={() => toggleSort("row")}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                  <span style={{ marginTop: 10 }}>Row number</span>
                  {sortBy === "row" ? (
                    <span style={{ fontSize: 18 }}>{asc ? '▾' : '▴'}</span>
                  ) : (
                    <span style={{ opacity: 0.5, fontSize: 18 }}>▾▴</span>
                  )}
                </div>
              </th>
              
              <th style={{ ...thBase, width: colWidths.prob }} onClick={() => toggleSort("prob")}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0}}>
                  <span>Percent %</span>
                  {sortBy === "prob" ? (
                    <span style={{ fontSize: 18 }}>{asc ? '▾' : '▴'}</span>
                  ) : (
                    <span style={{ opacity: 0.5, fontSize: 18 }}>▾▴</span>
                  )}
                </div>
              </th>
              
              <th style={{ ...thBase, width: colWidths.exo }} onClick={() => toggleSort("exo")}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                  <span>Disposition</span>
                  {sortBy === "exo" ? (
                    <span style={{ fontSize: 18 }}>{asc ? '▾' : '▴'}</span>
                  ) : (
                    <span style={{ opacity: 0.5, fontSize: 18 }}>▾▴</span>
                  )}
                </div>
              </th>
              
              <th style={{ ...thLast, width: colWidths.actions, textAlign: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                  <span>Actions</span>
                  <span style={{ opacity: 0.5, fontSize: 18, color: WHITE }}>▾▴</span>
                  </div>
              </th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((r, i) => {
              const idx = r.index ?? i;
              const probPct = (r.probability * 100);
              const disp = r.exoplanet ? "Candidate" : "Not Candidate";
              const isExpanded = !!expanded[idx];

              return (
                <React.Fragment key={idx + "-" + i}>
                  <tr onClick={() => toggleExpand(idx)} style={{ cursor: "pointer", background: isExpanded ? "rgba(255,255,255,0.02)" : "transparent" }}>
                    <td style={{ ...tdBase }}>{idx}</td>
                    <td style={{ ...tdBase }}>{isFinite(probPct) ? probPct.toFixed(2) + "%" : "N/A"}</td>
                    <td style={{ ...tdBase, ...dispositionStyle }}>{disp}</td>
                    <td style={{ ...tdBase,  }}>
                      <button
                        style={{
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "none",
                          cursor: "pointer",
                          minWidth: '4vw',
                          fontSize: '1.3vh',
                        }}
                        onClick={(e) => { e.stopPropagation(); toggleExpand(idx); }}
                      >
                        {isExpanded ? "Hide" : "Show"}
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={4} style={{ padding: 8, background: "rgba(255,255,255,0.01)" }}>
                        <div style={{ fontSize: 13 }}>
                          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: '1.7vh', }}>Features:</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                            {Object.entries(renderFeaturesFor(r)).length === 0 ? (
                              <div style={{ color: "#bfc9d4" }}>No features available</div>
                            ) : (
                              Object.entries(renderFeaturesFor(r)).map(([k, v]) => (
                                <div key={k} style={{ minWidth: 120, padding: 6, borderRadius: 6, background: "rgba(0,0,0,0.25)" }}>
                                  <div style={{ fontSize: 11, color: "#a8b3c2" }}>{prettyKey(k)}</div>
                                  <div style={{ fontWeight: 700 }}>{v === null || v === undefined || v === "" ? "N/A" : String(v)}</div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}



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
    alignItems: "center",
    justifyContent: "center",
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
    zIndex: 3,
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
            <h1 style={styles.title}>Choose the model</h1>
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
                <div style={styles.descText}>This model achieves 80% precision and 96% recall in exoplanet candidate classification, trained on preprocessed raw light curves from transit missions, making it semi-universal for any transit-based mission data. The preprocessing pipeline applied to raw photometric curves allows the model to generalize across different observational campaigns while maintaining high sensitivity to genuine planetary signals.</div>
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
                <div style={styles.descText}>This model demonstrates superior performance with 90% precision and 96% accuracy, trained on engineered features extracted from NASA archive data across multiple transit missions, making it fully universal for exoplanet validation. The model requires some both photometric curve characteristics and stellar system parameters, enabling comprehensive candidate assessment through multi-dimensional feature space analysis.</div>
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
To use this model, prepare one or more files containing time-series photometry with two required columns: "time" and "flux", representing the temporal sequence and normalized stellar brightness measurements respectively. The model accepts both single-file and multi-file inputs for several quarters observation of single target, processing it through the same preprocessing pipeline used during training before generating classification predictions.            </p>
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

  // manualData for display: use "field-like" names (no koi_ prefix) so user sees same keys they typed
  const inputData = {
    period: koiPeriod ?? "",
    time0bk: koiTime0bk,
    duration: koiDuration,
    depth: koiDepth ?? "",
    prad: koiPrad ?? "",
    teq: koiTeq ?? "",
    insol: koiInsol ?? "",
    tce_plnt_num: koiTcePlntNum ?? "",
    steff: koiSteff ?? "",
    slogg: koiSlogg ?? "",
    srad: koiSrad ?? "",
    kepmag: koiKepmag ?? "",
  };
  setManualData(inputData);

  const fd = new FormData();
  // keep required koi_ keys so backend recognizes manual input
  fd.append("koi_time0bk", koiTime0bk);
  fd.append("koi_duration", koiDuration);
  // Also append the same values under "field" names (without koi_) so front can display exact field names
  fd.append("period", koiPeriod ?? "");
  fd.append("time0bk", koiTime0bk);
  fd.append("duration", koiDuration);
  fd.append("depth", koiDepth ?? "");
  fd.append("prad", koiPrad ?? "");
  fd.append("teq", koiTeq ?? "");
  fd.append("insol", koiInsol ?? "");
  fd.append("tce_plnt_num", koiTcePlntNum ?? "");
  fd.append("steff", koiSteff ?? "");
  fd.append("slogg", koiSlogg ?? "");
  fd.append("srad", koiSrad ?? "");
  fd.append("kepmag", koiKepmag ?? "");

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
            Input data can be provided either manually or via CSV file containing the following features in order: "period", "time0bk", "duration", "depth", "prad", "teq", "insol", "tce_plnt_num", "steff", "slogg", "srad", "kepmag", where column headers must match exactly or features must appear in this precise sequence. The standardized feature set encompasses transit geometry, planetary characteristics, stellar properties, and observational metrics derived from the preprocessing pipeline validated across Kepler, K2, and TESS missions.


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
          <div style={{ cursor: "pointer", marginTop: 40 }} onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })}>
            <img src={backIcon} alt="Back" style={{ width: 54, height: 24}} /> {/* Removed filter to keep original white color */}
          </div>
        </div>

        {/* results */}
        {resultV2 && (
          <ResultsTable results={resultV2.results ?? []} parsedData={parsedData} manualData={manualData} />
        )}
      </div>
    </div>
  );
}
