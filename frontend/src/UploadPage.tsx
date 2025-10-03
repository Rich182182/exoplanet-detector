// src/UploadPage.tsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

type PredictResultV1 = {
  exoplanet: boolean;
  probability: number;
};

type PredictResultV2Row = {
  index: number;
  probability: number;
  exoplanet: boolean;
  features: Record<string, number | null>;
};

type PredictResultV2 = {
  count: number;
  results: PredictResultV2Row[];
};

// Запасной порядок признаков (если /model2/meta не доступен)
const FALLBACK_FEATURE_ORDER = [
  "koi_period",
  "koi_time0bk",
  "koi_duration",
  "koi_depth",
  "koi_prad",
  "koi_teq",
  "koi_insol",
  "koi_tce_plnt_num",
  "koi_steff",
  "koi_slogg",
  "koi_srad",
  "koi_kepmag",
];

// Человекочитаемые подписи (фолбэк)
const FALLBACK_HUMAN: Record<string, string> = {
  koi_period: "Период (дни)",
  koi_time0bk: "Время центра (BJD)",
  koi_duration: "Длительность (дни)",
  koi_depth: "Глубина транзита",
  koi_prad: "Радиус планеты (R⊕)",
  koi_teq: "Экв. температура (K)",
  koi_insol: "Инсоляция",
  koi_tce_plnt_num: "Номер TCE/планеты",
  koi_steff: "T_eff (K)",
  koi_slogg: "log(g)",
  koi_srad: "Радиус звезды (R☉)",
  koi_kepmag: "Kp magnitude",
};

const UploadPage: React.FC = () => {
  const navigate = useNavigate();

  // --- модель 1 (существующая) ---
  const [fitsFiles, setFitsFiles] = useState<FileList | null>(null);
  const [resultV1, setResultV1] = useState<PredictResultV1 | null>(null);
  const fitsInputRef = useRef<HTMLInputElement | null>(null);
  const [loadingV1, setLoadingV1] = useState(false);

  // --- модель 2 (новая, ниже на той же странице) ---
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const [featureColsV2, setFeatureColsV2] = useState<string[] | null>(null);
  const [humanNamesV2, setHumanNamesV2] = useState<Record<string, string> | null>(null);
  const [fieldsV2, setFieldsV2] = useState<Record<string, string>>({});
  const [resultV2, setResultV2] = useState<PredictResultV2 | null>(null);
  const [loadingV2, setLoadingV2] = useState(false);

  // Получаем метаданные модели v2 (feature_cols + human names). Если не доступно — используем fallback.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get("http://localhost:8000/model2/meta", { timeout: 5000 });
        if (!cancelled && res.data && Array.isArray(res.data.feature_cols)) {
          setFeatureColsV2(res.data.feature_cols);
          setHumanNamesV2(res.data.human_names || {});
        }
      } catch (e) {
        // если не получилось — оставим null и используем FALLBACK_* позже
        console.warn("model2/meta fetch failed:", e);
        setFeatureColsV2(null);
        setHumanNamesV2(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ----------------- HANDLERS MODEL 1 (FITS) -----------------
  const handleFitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFitsFiles(e.target.files);
  };

  const clearFits = () => {
    setFitsFiles(null);
    if (fitsInputRef.current) fitsInputRef.current.value = "";
  };

  const submitFits = async () => {
    if (!fitsFiles || fitsFiles.length === 0) {
      alert("Выберите хотя бы один FITS-файл для первой модели.");
      return;
    }
    const formData = new FormData();
    for (let i = 0; i < fitsFiles.length; i++) {
      formData.append("files", fitsFiles[i]);
    }
    setLoadingV1(true);
    try {
      const res = await axios.post("http://localhost:8000/predict", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      const data = res.data;
      setResultV1({ exoplanet: !!data.exoplanet, probability: Number(data.probability) });
      localStorage.setItem("analysisData", JSON.stringify(data));
    } catch (err: any) {
      console.error(err);
      if (err?.response?.data?.detail) {
        alert(`Ошибка сервера: ${err.response.data.detail}`);
      } else {
        alert("Ошибка при отправке FITS (см консоль).");
      }
    } finally {
      setLoadingV1(false);
    }
  };

  const goToAnalysis = () => {
    navigate("/analysis");
  };

  // ----------------- HELPERS & RENDER DATA FOR V2 -----------------
  const colsToRender = featureColsV2 && featureColsV2.length > 0 ? featureColsV2 : FALLBACK_FEATURE_ORDER;
  const humanLabel = (feat: string) =>
    (humanNamesV2 && humanNamesV2[feat]) ? humanNamesV2[feat] : (FALLBACK_HUMAN[feat] || feat);

  // проверка — есть ли ручной ввод вообще (любое поле заполнено)
  const manualAnyFilled = () => {
    return colsToRender.some((k) => {
      const v = fieldsV2[k];
      return v !== undefined && v !== null && String(v).trim() !== "";
    });
  };

  // ручной ввод валиден только если оба обязательных поля заполнены и не 0
  const manualHasRequired = () => {
    const t = fieldsV2["koi_time0bk"];
    const d = fieldsV2["koi_duration"];
    if (!t || String(t).trim() === "") return false;
    if (!d || String(d).trim() === "") return false;
    const tn = Number(t);
    const dn = Number(d);
    if (!isFinite(tn) || !isFinite(dn)) return false;
    if (tn === 0 || dn === 0) return false;
    return true;
  };

  // ----------------- HANDLERS MODEL 2 (v2) -----------------
  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
    } else {
      setCsvFile(null);
    }
  };

  const clearCsv = () => {
    setCsvFile(null);
    if (csvInputRef.current) csvInputRef.current.value = "";
  };

  const handleFieldChangeV2 = (k: string, v: string) => {
    setFieldsV2((prev) => ({ ...prev, [k]: v }));
  };

  const submitV2 = async () => {
    setResultV2(null);

    const useManual = manualHasRequired(); // по условию — ручной ввод только если оба обязательных заполнены и != 0

    if (!useManual && !csvFile) {
      if (manualAnyFilled()) {
        alert("Если вы заполнили поля вручную, то обязательно укажите koi_time0bk и koi_duration (и они не должны быть 0). Иначе загрузите CSV.");
        return;
      }
      alert("Для модели v2: заполните обязательные поля вручную или загрузите CSV.");
      return;
    }

    const formData = new FormData();

    if (useManual) {
      // прикладываем все признаки в порядке featureColsV2 (или fallback). Если поле не задано — пустая строка.
      colsToRender.forEach((col) => {
        formData.append(col, fieldsV2[col] ? String(fieldsV2[col]) : "");
      });
    } else {
      // используем CSV — только .csv
      if (!csvFile) {
        alert("CSV не выбран.");
        return;
      }
      if (!csvFile.name.toLowerCase().endsWith(".csv")) {
        alert("Только CSV-файлы принимаются для модели v2.");
        return;
      }
      formData.append("csv_file", csvFile);
    }

    setLoadingV2(true);
    try {
      const res = await axios.post("http://localhost:8000/predict_second", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      setResultV2(res.data as PredictResultV2);
      localStorage.setItem("analysisData_v2", JSON.stringify(res.data));
    } catch (err: any) {
      console.error(err);
      if (err?.response?.data?.detail) {
        alert(`Ошибка сервера: ${err.response.data.detail}`);
      } else {
        alert("Ошибка при отправке данных в модель v2 (см консоль).");
      }
    } finally {
      setLoadingV2(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Проверка экзопланеты по сигналу</h1>

      {/* ===== Модель 1 (оригинальная) ===== */}
      <section style={{ border: "1px solid #ddd", padding: 14, marginBottom: 20 }}>
        <h2>Модель 1 — FITS → /predict</h2>
        <div style={{ marginBottom: 8 }}>
          <input
            ref={fitsInputRef}
            type="file"
            multiple
            accept=".fits"
            onChange={handleFitsChange}
          />
          <button onClick={clearFits} style={{ marginLeft: 8 }}>Очистить файлы</button>
        </div>
        <div style={{ marginTop: 8 }}>
          <button onClick={submitFits} disabled={!fitsFiles || loadingV1}>
            {loadingV1 ? "Отправка..." : "Загрузить файлы и проверить"}
          </button>
        </div>

        {resultV1 && (
          <div style={{ marginTop: 12 }}>
            <h3>Результат Модели 1</h3>
            <p>Вероятность: {(resultV1.probability * 100).toFixed(2)}%</p>
            <p>Экзопланета: {resultV1.exoplanet ? "Да" : "Нет"}</p>
            <button onClick={goToAnalysis}>Проверить анализ</button>
          </div>
        )}
      </section>

      {/* ===== Модель 2 (v2) — ниже на той же странице ===== */}
      <section style={{ border: "1px solid #ddd", padding: 14 }}>
        <h2>Модель 2 — простая (ручной ввод или CSV) — /predict_second</h2>
        <p>
          Правило: <b>ручной ввод</b> используется только если оба поля <i>koi_time0bk</i> и <i>koi_duration</i>
          заполнены и не равны 0. В противном случае будет использован CSV (если загружен). Если ничего не введено — предупреждение.
        </p>

        <div style={{ marginTop: 10 }}>
          <h4>Ручной ввод (если вы используете ручной ввод — заполните хотя бы koi_time0bk и koi_duration)</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {colsToRender.map((col) => (
              <div key={col}>
                <label style={{ fontSize: 12 }}>{humanLabel(col)}</label>
                <input
                  type="number"
                  step="any"
                  value={fieldsV2[col] ?? ""}
                  onChange={(e) => handleFieldChangeV2(col, e.target.value)}
                  style={{ width: "100%", padding: 6, marginTop: 4 }}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <h4>ИЛИ: загрузите CSV (обрабатываются все строки)</h4>
          <div>
            <input ref={csvInputRef} type="file" accept=".csv" onChange={handleCsvChange} />
            <button onClick={clearCsv} style={{ marginLeft: 8 }}>Очистить файл CSV</button>
          </div>

          <div style={{ marginTop: 8, fontSize: 13 }}>
            <div>CSV с заголовками — сопоставление по именам (работает для разных миссий). Если имена не распознаны — будет сопоставление по порядку колонок.</div>

            <div style={{ marginTop: 8 }}>
              <b>Ожидаемый порядок/имена колонок (подсказка):</b>
              <div style={{ marginTop: 6 }}>
                {(featureColsV2 || FALLBACK_FEATURE_ORDER).map((c, i) => (
                  <div key={c} style={{ fontSize: 12 }}>
                    <b>{i + 1}.</b> {c} — {humanLabel(c)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={submitV2} disabled={loadingV2}>
            {loadingV2 ? "Отправка..." : "Отправить в модель v2"}
          </button>
        </div>

        {resultV2 && (
          <div style={{ marginTop: 16 }}>
            <h3>Результаты модели v2 ({resultV2.count})</h3>
            <div>
              {resultV2.results.map((r) => (
                <div key={r.index} style={{ border: "1px solid #eee", padding: 8, marginBottom: 8 }}>
                  <div><b>Строка #{r.index}</b></div>
                  <div>Вероятность: {(r.probability * 100).toFixed(2)}%</div>
                  <div>Экзопланета: {r.exoplanet ? "Да" : "Нет"}</div>
                  <details>
                    <summary>Входные признаки</summary>
                    <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(r.features, null, 2)}</pre>
                  </details>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default UploadPage;
