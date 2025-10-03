# backend/main.py
"""
FastAPI backend для локального использования.
Принимает один или несколько FITS-файлов (одной планеты, разные кварталы),
выполняет предобработку почти идентичную pipeline (resample -> detrend -> interpolation),
извлекает признаки с tsfresh (EfficientFCParameters), масштабирует, применяет LightGBM
и возвращает JSON с:
 - бинарным предсказанием (экзопланета / нет),
 - вероятностью,
 - топ-20 признаков (имя + значение),
 - сырая кривая (time, flux) и обработанная кривая (time, flux).
Большинство ключевых мест прокомментированы подробно.
"""
import re
import unicodedata
from fastapi import HTTPException
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from scipy.signal import find_peaks, peak_widths
from scipy.stats import median_abs_deviation
import numpy as np
import pandas as pd
import joblib
import lightgbm as lgb
from astropy.io import fits
from io import BytesIO
import re
import os
from typing import List, Tuple, Optional
from scipy.signal import medfilt, savgol_filter
from tsfresh import extract_features
from tsfresh.feature_extraction import EfficientFCParameters
from fastapi import Form
from io import StringIO

# -------------------------
# Конфигурация / пути к артефактам модели
# -------------------------
MODEL_PATH = "lgb_model.txt"
SCALER_PATH = "scaler.pkl"
FEATURE_COLS_PATH = "feature_cols.pkl"
BINARY_COLS_PATH = "binary_cols.pkl"
CONTINOUS_COLS_PATH = "continouos_cols.pkl"
BEST_THRESHOLD_PATH = "best_threshold.pkl"

# Параметры предобработки
STEP_DAYS = 1.0 / 24.0
MED_KERNEL_HOURS = 25
MIN_POINTS_AFTER_CLEAN = 50
TSFRESH_PARAMS = EfficientFCParameters()
TSFRESH_N_JOBS = 1

# CORS origins
FRONTEND_ORIGINS = ["http://localhost:3000"]


MODEL2_PATH = "lgb_model_v2.txt"     # или 'model_v2.pkl' если sklearn
SCALER2_PATH = "scaler_v2.pkl"
IMPUTER2_PATH = "imputer_v2.pkl"
FEATURE_COLS2_PATH = "feature_cols_v2.pkl"
BEST_THRESHOLD2_PATH = "best_threshold_v2.pkl"
# ---------------------------

# попытка загрузить артефакты v2 (не падаем, если их нет)
def load_artifacts_v2():
    if not os.path.exists(MODEL2_PATH):
        raise RuntimeError(f"Model v2 file not found: {MODEL2_PATH}")
    if not os.path.exists(SCALER2_PATH):
        raise RuntimeError(f"Scaler v2 file not found: {SCALER2_PATH}")
    if not os.path.exists(IMPUTER2_PATH):
        raise RuntimeError(f"Imputer v2 file not found: {IMPUTER2_PATH}")
    if not os.path.exists(FEATURE_COLS2_PATH):
        raise RuntimeError(f"Feature cols v2 file not found: {FEATURE_COLS2_PATH}")

    # model: try LightGBM booster first, else joblib.load
    try:
        model2 = lgb.Booster(model_file=MODEL2_PATH)
    except Exception:
        try:
            model2 = joblib.load(MODEL2_PATH)
        except Exception as e:
            raise RuntimeError(f"Cannot load model v2: {e}")

    scaler2 = joblib.load(SCALER2_PATH)
    imputer2 = joblib.load(IMPUTER2_PATH)
    feature_cols2 = joblib.load(FEATURE_COLS2_PATH)

    best_threshold2 = 0.5
    if os.path.exists(BEST_THRESHOLD2_PATH):
        try:
            best_threshold2 = joblib.load(BEST_THRESHOLD2_PATH)
        except Exception:
            best_threshold2 = 0.5

    return model2, scaler2, imputer2, feature_cols2, best_threshold2

# глобальные переменные (попробуем загрузить при старте)
try:
    model2, scaler2, imputer2, FEATURE_COLS2, BEST_THRESHOLD2 = load_artifacts_v2()
    print("Model v2 loaded.")
except Exception as e:
    model2 = scaler2 = imputer2 = FEATURE_COLS2 = BEST_THRESHOLD2 = None
    print(f"Model v2 not loaded: {e}")

# Ожидаемые ключи пользовательских полей (человеческие имена можно формировать фронтом)
REQUIRED_FIELDS_V2 = ["koi_time0bk", "koi_duration"]

def _map_csv_to_features_v2(df: pd.DataFrame, feature_cols: List[str]) -> pd.DataFrame:
    """
    Робастное сопоставление столбцов CSV к признакам модели v2:
      1) нормализация имени колонки и попытка сопоставить по синонимам
      2) если какие-то EXPECTED не сопоставлены — заполнить их значениями
         оставшихся csv-столбцов в порядке (fallback по порядку)
      3) отсутствующие столбцы -> NaN
    """
    # исходные колонки
    csv_cols = list(df.columns)
    # нормализуем и создаём словарь col_norm -> orig_name
    norm_to_orig = {}
    for c in csv_cols:
        norm = _normalize_colname(c)
        norm_to_orig[norm] = c

    mapped_expected = {}  # expected -> orig csv col name
    used_csv_cols = set()

    # pass 1: по имени/синонимам
    for orig_col in csv_cols:
        norm = _normalize_colname(orig_col)
        matched = _match_by_name(norm)
        if matched and matched not in mapped_expected:
            mapped_expected[matched] = orig_col
            used_csv_cols.add(orig_col)

    # pass 2: также попробуем прямое совпадение нормализованного имени с expected
    for orig_col in csv_cols:
        if orig_col in used_csv_cols:
            continue
        norm = _normalize_colname(orig_col)
        for exp in feature_cols:
            exp_norm = _normalize_colname(exp)
            if exp_norm == norm and exp not in mapped_expected:
                mapped_expected[exp] = orig_col
                used_csv_cols.add(orig_col)
                break

    # pass 3: заполнение оставшихся expected по порядку неиспользованных csv колонок
    remaining_csv = [c for c in csv_cols if c not in used_csv_cols]
    rem_iter = iter(remaining_csv)
    for exp in feature_cols:
        if exp in mapped_expected:
            continue
        try:
            candidate = next(rem_iter)
            mapped_expected[exp] = candidate
            used_csv_cols.add(candidate)
        except StopIteration:
            # больше колонок нет — оставляем NaN
            mapped_expected[exp] = None

    # создаём итоговый DF в нужном порядке
    out = pd.DataFrame()
    for exp in feature_cols:
        src = mapped_expected.get(exp)
        if src is None:
            out[exp] = np.nan
        else:
            out[exp] = pd.to_numeric(df[src], errors='coerce')

    return out

def _prepare_and_predict_v2(df_features: pd.DataFrame):
    """
    df_features: DataFrame с колонками, сопоставимыми к FEATURE_COLS2 (после _map_csv_to_features_v2)
    Возвращает список результатов
    """
    if model2 is None or imputer2 is None or scaler2 is None or FEATURE_COLS2 is None:
        raise RuntimeError("Model v2 artifacts not loaded")

    # заполним пропуски через imputer (импутер ожидает 2D)
    try:
        X_imp = pd.DataFrame(imputer2.transform(df_features), columns=df_features.columns, index=df_features.index)
    except Exception:
        X_imp = df_features.fillna(df_features.median())

    # масштабируем: применяем scaler ко всем столбцам, если scaler был обучен на тех же столбцах
    try:
        X_scaled = pd.DataFrame(scaler2.transform(X_imp), columns=X_imp.columns, index=X_imp.index)
    except Exception:
        # если трансформ не подошёл — используем X_imp как есть
        X_scaled = X_imp

    # final X: reindex по FEATURE_COLS2 (чтобы порядок совпадал)
    X_final = X_scaled.reindex(columns=FEATURE_COLS2, fill_value=0.0)

    # predict
    try:
        if isinstance(model2, lgb.Booster):
            prob = model2.predict(X_final)
        else:
            prob = model2.predict_proba(X_final)[:,1]
    except Exception as e:
        raise RuntimeError(f"Model v2 predict error: {e}")

    results = []
    for i, p in enumerate(prob):
        results.append({
            "index": int(i),
            "probability": float(p),
            "exoplanet": bool(p > BEST_THRESHOLD2),
            "features": {col: (None if pd.isna(df_features.iloc[i][col]) else float(df_features.iloc[i][col])) for col in df_features.columns}
        })
    return results

def _normalize_colname(name: str) -> str:
    """
    Нормализует имя колонки: lowercase, убираем диакритику,
    оставляем только буквенно-цифровые символы, удаляем mission prefixes.
    """
    if name is None:
        return ""
    s = str(name).lower().strip()
    # remove diacritics
    s = ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))
    # replace separators
    s = re.sub(r'[\s\-\.\:]+', '_', s)
    # remove brackets/quotes
    s = re.sub(r'[^\w]', '', s)
    # remove common mission prefixes
    for p in ['koi', 'kep', 'kepler', 'tess', 'ktwo', 'epic', 'tic', 'gaia']:
        if s.startswith(p):
            s = s[len(p):]
    # remove leading underscores/digits
    s = s.strip('_0123456789')
    return s

# список ожидаемых признаков (в порядке, который был при обучении)
EXPECTED_COLS_V2 = [
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
    "koi_kepmag"
]

# синонимы/токены для распознавания по именам
SYNONYMS = {
    "koi_period": ["period", "per", "orbitalperiod", "p"],
    "koi_time0bk": ["time0", "t0", "epoch", "center", "transitcenter"],
    "koi_duration": ["duration", "dur", "length", "transitduration"],
    "koi_depth": ["depth", "depthppm", "transitdepth", "dip"],
    "koi_prad": ["prad", "planetradius", "radiusplanet", "rplanet"],
    "koi_teq": ["teq", "eqtemp", "equilibriumtemp", "teqk"],
    "koi_insol": ["insol", "instellation", "insolation", "flux", "irradiance"],
    "koi_tce_plnt_num": ["tce", "plntnum", "planetnum", "tce_num"],
    "koi_steff": ["steff", "teff", "st_teff", "teff_star"],
    "koi_slogg": ["slogg", "logg", "st_logg"],
    "koi_srad": ["srad", "rstar", "st_radius", "radiusstar"],
    "koi_kepmag": ["kepmag", "kp", "mag", "kpmag", "kep_mag"]
}

def _match_by_name(colname_norm: str) -> Optional[str]:
    """Попытка сопоставить нормализованное имя колонки к одному из EXPECTED_COLS_V2"""
    if not colname_norm:
        return None
    for expected, tokens in SYNONYMS.items():
        for tok in tokens:
            if tok in colname_norm:
                return expected
    return None

def human_label_from_feature(feat: str) -> str:
    """Простая генерация человекочитаемой метки из имени фичи."""
    mapping = {
        "koi_period": "Период (дни)",
        "koi_time0bk": "Время центра (BJD)",
        "koi_duration": "Длительность (дни)",
        "koi_depth": "Глубина транзита",
        "koi_prad": "Радиус планеты (R⊕)",
        "koi_teq": "Экв. температура (K)",
        "koi_insol": "Инсоляция",
        "koi_tce_plnt_num": "Номер TCE/планеты",
        "koi_steff": "T_eff (K)",
        "koi_slogg": "log(g)",
        "koi_srad": "Радиус звезды (R☉)",
        "koi_kepmag": "Kp magnitude"
    }
    return mapping.get(feat, feat.replace('_', ' ').title())
# -------------------------
# Инициализация FastAPI и загрузка моделей/артефактов
# -------------------------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_artifacts():
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(f"Model file not found: {MODEL_PATH}")
    if not os.path.exists(SCALER_PATH):
        raise RuntimeError(f"Scaler file not found: {SCALER_PATH}")
    if not os.path.exists(FEATURE_COLS_PATH):
        raise RuntimeError(f"Feature columns file not found: {FEATURE_COLS_PATH}")
    if not os.path.exists(BINARY_COLS_PATH):
        raise RuntimeError(f"Binary cols file not found: {BINARY_COLS_PATH}")
    if not os.path.exists(CONTINOUS_COLS_PATH):
        raise RuntimeError(f"Continous cols file not found: {CONTINOUS_COLS_PATH}")

    model = lgb.Booster(model_file=MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    feature_cols = joblib.load(FEATURE_COLS_PATH)
    binary_cols = joblib.load(BINARY_COLS_PATH)
    continouos_cols = joblib.load(CONTINOUS_COLS_PATH)

    best_threshold = 0.5
    if os.path.exists(BEST_THRESHOLD_PATH):
        try:
            best_threshold = joblib.load(BEST_THRESHOLD_PATH)
        except Exception:
            best_threshold = 0.5

    return model, scaler, feature_cols, binary_cols, continouos_cols, best_threshold

model, scaler, FEATURE_COLS, BINARY_COLS, CONTINOUS_COLS, BEST_THRESHOLD = load_artifacts()

# -------------------------
# Утилиты для чтения FITS и предобработки
# -------------------------

def _find_time_and_flux_in_hdu(hdu) -> Tuple[Optional[str], Optional[str]]:
    """
    Поиск колонок 'TIME' и 'SAP_FLUX' (или других похожих) в HDU с таблицей.
    Возвращает имена колонок (time_col, flux_col) или (None,None).
    """
    # ✅ УБРАЛИ ГЛОБАЛЬНУЮ ПЕРЕМЕННУЮ ОТСЮДА
    names = []
    try:
        names = [n for n in hdu.names]
    except Exception:
        try:
            names = list(hdu.columns.names)
        except Exception:
            names = []

    time_col = None
    flux_col = None
    for col in names:
        c = col.lower()
        if ('time' in c) and (time_col is None):
            time_col = col
        if 'sap_flux' in c:
            flux_col = col
            break
        if ('flux' in c) and (flux_col is None):
            flux_col = col
    return time_col, flux_col


def read_time_flux_from_fitsbytes(fbytes: bytes) -> Tuple[np.ndarray, np.ndarray]:
    """
    Открывает FITS из байтового объекта, находит таблицу с TIME и FLUX,
    возвращает два numpy массива (time, flux).
    """
    bio = BytesIO(fbytes)
    with fits.open(bio, memmap=False) as hdul:
        table_hdu = None
        for h in hdul:
            if getattr(h, 'data', None) is not None:
                try:
                    cols = list(h.columns.names)
                except Exception:
                    cols = []
                if len(cols) > 0:
                    table_hdu = h
                    break
        if table_hdu is None:
            raise ValueError("No table HDU with columns found in FITS")

        tcol, fcol = _find_time_and_flux_in_hdu(table_hdu)
        if tcol is None or fcol is None:
            available = []
            try:
                available = list(table_hdu.columns.names)
            except Exception:
                available = []
            raise ValueError(f"Cannot find TIME/FLUX columns. Available: {available}")

        data = table_hdu.data
        time = np.array(data[tcol]).astype(float)
        flux = np.array(data[fcol]).astype(float)
        return time, flux

def _safe_kernel(k):
    """Гарантирует нечётность и минимум 3."""
    k = int(max(3, int(k)))
    if k % 2 == 0:
        k += 1
    return k

def resample_to_1h_and_detrend(t: np.ndarray, f: np.ndarray,
                               step_days: float = STEP_DAYS,
                               med_kernel_hours: int = MED_KERNEL_HOURS) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
    """
    1) Ресемплим в 1-часовые боксы
    2) Интерполируем пропуски
    3) Детренд медианным фильтром
    """
    if t is None or f is None or len(t) < 3:
        return None, None

    mask = np.isfinite(t) & np.isfinite(f)
    if not np.any(mask):
        return None, None
    t = t[mask]
    f = f[mask]

    if len(t) < 3:
        return None, None

    tmin = float(np.min(t)); tmax = float(np.max(t))
    step = float(step_days)
    grid = np.arange(tmin, tmax + step / 2.0, step)
    if len(grid) < 3:
        return None, None

    inds = np.floor((t - tmin) / step).astype(int)
    valid = (inds >= 0) & (inds < len(grid))
    if not np.any(valid):
        return None, None
    inds_valid = inds[valid]
    f_valid = f[valid].astype(float)

    flux_grid = np.full(len(grid), np.nan, dtype=float)
    unique_inds = np.unique(inds_valid)
    for i in unique_inds:
        mask_i = inds_valid == i
        flux_grid[i] = np.sum(f_valid[mask_i])

    nan_mask = np.isnan(flux_grid)
    if nan_mask.all():
        return None, None

    idx = np.arange(len(grid))
    notnan = ~nan_mask
    if nan_mask.any():
        flux_grid[nan_mask] = np.interp(idx[nan_mask], idx[notnan], flux_grid[notnan])

    kernel = _safe_kernel(med_kernel_hours)
    if kernel >= len(flux_grid):
        kernel = _safe_kernel(max(3, len(flux_grid) // 2))
    try:
        trend = medfilt(flux_grid, kernel_size=kernel)
    except Exception:
        wl = kernel if kernel % 2 == 1 else kernel + 1
        if wl >= len(flux_grid):
            wl = max(3, len(flux_grid) - (1 - (len(flux_grid) % 2)))
        trend = savgol_filter(flux_grid, window_length=wl, polyorder=2, mode='nearest')

    flux_detr = flux_grid - trend
    return grid, flux_detr

def clean_column_name(col: str) -> str:
    """Очистка имён колонок от спецсимволов."""
    clean = col.replace('"', '').replace("'", '').replace('\\', '')
    clean = clean.replace('[', '').replace(']', '')
    clean = clean.replace('{', '').replace('}', '')
    clean = clean.replace(':', '_').replace(',', '_')
    clean = clean.replace(' ', '_').replace('(', '').replace(')', '')
    clean = re.sub('_+', '_', clean)
    clean = clean.strip('_')
    return clean

def detect_suspicious_regions(time: np.ndarray, flux: np.ndarray, 
                              num_regions: int = 5) -> List[dict]:
    """Обнаруживает подозрительные регионы (возможные транзиты)."""
    if len(time) < 10:
        return []
    
    flux_median = np.median(flux)
    flux_std = np.std(flux)
    window_size = max(5, len(flux) // 100)
    
    anomaly_scores = []
    for i in range(len(flux)):
        start = max(0, i - window_size // 2)
        end = min(len(flux), i + window_size // 2)
        window = flux[start:end]
        window_median = np.median(window)
        score = flux_median - window_median
        anomaly_scores.append(score)
    
    anomaly_scores = np.array(anomaly_scores)
    threshold = flux_std * 1.5
    candidates = []
    
    i = 0
    while i < len(anomaly_scores):
        if anomaly_scores[i] > threshold:
            start_idx = i
            while i < len(anomaly_scores) and anomaly_scores[i] > threshold * 0.5:
                i += 1
            end_idx = i
            
            margin = (end_idx - start_idx) * 2
            region_start = max(0, start_idx - margin)
            region_end = min(len(time), end_idx + margin)
            
            candidates.append({
                'start': float(time[region_start]),
                'end': float(time[region_end]),
                'center': float(time[(start_idx + end_idx) // 2]),
                'depth': float(np.mean(anomaly_scores[start_idx:end_idx])),
                'duration': float(time[end_idx] - time[start_idx]) if end_idx < len(time) else 0
            })
        i += 1
    
    candidates.sort(key=lambda x: x['depth'], reverse=True)
    return candidates[:num_regions]

def detect_quarters_from_gaps(time: np.ndarray, flux: np.ndarray, 
                              gap_threshold_days: float = 5.0) -> List[dict]:
    """
    Автоматично визначає квартали (quarters/сегменти) на основі великих розривів у часі.
    
    Parameters:
    -----------
    time : np.ndarray
        Масив часу (в днях)
    flux : np.ndarray
        Масив потоку
    gap_threshold_days : float
        Мінімальний розрив (в днях) між кварталами. За замовчуванням 5 днів.
    
    Returns:
    --------
    List[dict] : Список сегментів з полями index, start, end, center, n_points
    """
    if len(time) < 2:
        return []
    
    # Знаходимо різниці між послідовними точками
    time_diffs = np.diff(time)
    
    # Знаходимо індекси, де різниця більша за поріг (це межі кварталів)
    gap_indices = np.where(time_diffs > gap_threshold_days)[0]
    
    # Створюємо список початків кварталів
    # gap_indices[i] - це останній індекс ПЕРЕД розривом
    # gap_indices[i] + 1 - це перший індекс ПІСЛЯ розриву
    quarter_starts = [0]  # Перший квартал починається з 0
    for gap_idx in gap_indices:
        quarter_starts.append(gap_idx + 1)
    
    # Створюємо сегменти
    segments = []
    for i, start_idx in enumerate(quarter_starts):
        # Визначаємо кінець квартала
        if i < len(quarter_starts) - 1:
            end_idx = quarter_starts[i + 1] - 1
        else:
            end_idx = len(time) - 1
        
        # Часові межі
        t_start = float(time[start_idx])
        t_end = float(time[end_idx])
        t_center = (t_start + t_end) / 2.0
        n_points = end_idx - start_idx + 1
        
        segments.append({
            'index': i,
            'start': t_start,
            'end': t_end,
            'center': t_center,
            'n_points': n_points,
            'start_idx': int(start_idx),
            'end_idx': int(end_idx)
        })
    
    return segments

def calculate_folded_curve(time: np.ndarray, flux: np.ndarray, 
                           period: Optional[float] = None) -> dict:
    """Создаёт phase-folded curve."""
    if len(time) < 10:
        return {'phase': [], 'flux': [], 'period': 0}
    
    if period is None:
        period = (np.max(time) - np.min(time)) / 10.0
    
    if period <= 0:
        period = 1.0
    
    phase = np.mod(time - np.min(time), period) / period
    sort_idx = np.argsort(phase)
    phase_sorted = phase[sort_idx]
    flux_sorted = flux[sort_idx]
    
    return {
        'phase': phase_sorted.tolist(),
        'flux': flux_sorted.tolist(),
        'period': float(period)
    }

def detect_transit_candidates(time: np.ndarray, flux: np.ndarray, n_candidates: int = 20,
                              min_prominence: float = None, min_width_pts: int = 2,
                              min_snr: float = 3.0) -> List[dict]:
    """Робастная детекция транзитов."""
    candidates = []
    if len(time) < 10:
        return candidates

    inv = -flux
    mad = median_abs_deviation(flux, scale='normal')
    if mad == 0:
        mad = np.std(flux) if np.std(flux) > 0 else 1.0

    if min_prominence is None:
        min_prominence = 2.0 * mad

    peaks, props = find_peaks(inv, prominence=min_prominence, distance=3)
    if len(peaks) == 0:
        return []

    widths_res = peak_widths(inv, peaks, rel_height=0.5)
    widths = widths_res[0]
    left_ips = widths_res[2].astype(int)
    right_ips = widths_res[3].astype(int)

    prelim = []
    for i, p in enumerate(peaks):
        depth = float(props['prominences'][i])
        width_pts = int(max(1, np.round(widths[i])))
        snr = depth / (mad if mad > 0 else 1.0)
        prelim.append({
            'peak_idx': int(p),
            'center': float(time[p]),
            'depth': depth,
            'width_pts': width_pts,
            'left_idx': int(left_ips[i]),
            'right_idx': int(right_ips[i]),
            'snr': float(snr)
        })

    filtered = [c for c in prelim if c['width_pts'] >= min_width_pts and c['snr'] >= min_snr]
    if not filtered:
        filtered = prelim

    if filtered:
        widths_list = [c['width_pts'] for c in filtered]
        med_width = max(1, int(np.median(widths_list)))
        clusters = []
        filtered_sorted = sorted(filtered, key=lambda x: x['center'])
        current = filtered_sorted[0].copy()
        for c in filtered_sorted[1:]:
            if abs(c['center'] - current['center']) <= (med_width * 1.0 * (time[1] - time[0])):
                current['depth'] = max(current['depth'], c['depth'])
                current['left_idx'] = min(current['left_idx'], c['left_idx'])
                current['right_idx'] = max(current['right_idx'], c['right_idx'])
                current['center'] = (current['center'] + c['center']) / 2.0
                current['snr'] = max(current['snr'], c['snr'])
            else:
                clusters.append(current)
                current = c.copy()
        clusters.append(current)
    else:
        clusters = []

    clusters_sorted = sorted(clusters, key=lambda x: x['depth'], reverse=True)[:n_candidates]
    final = []
    for c in clusters_sorted:
        pidx = int(c['peak_idx'])
        left = max(0, int(c['left_idx']))
        right = min(len(time)-1, int(c['right_idx']))
        center = float(c['center'])
        depth = float(c['depth'])
        duration = float(time[right] - time[left]) if right > left else 0.0
        score = float(c['snr'])
        final.append({
            'center_time': center,
            'start_time': float(time[left]),
            'end_time': float(time[right]),
            'depth': depth,
            'score': score
        })

    return final

# -------------------------
# Основной эндпоинт /predict
# -------------------------
@app.post("/predict")
async def predict(files: List[UploadFile] = File(...)):
    """
    Принимает FITS-файлы и возвращает предсказание экзопланеты.
    """
    # ✅ ЛОКАЛЬНАЯ ПЕРЕМЕННАЯ для подсчёта FITS файлов
    fits_count = 0
    
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded")

    time_list = []
    flux_list = []

    for uploaded in files:
        filename = uploaded.filename
        if not filename.lower().endswith('.fits'):
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {filename}")
        try:
            fb = await uploaded.read()
            t_part, f_part = read_time_flux_from_fitsbytes(fb)
            if t_part is not None and f_part is not None and len(t_part) > 0:
                time_list.append(t_part)
                flux_list.append(f_part)
                # ✅ УВЕЛИЧИВАЕМ СЧЁТЧИК для каждого успешно прочитанного файла
                fits_count += 1
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error reading {filename}: {str(e)}")

    if len(time_list) == 0:
        raise HTTPException(status_code=400, detail="No valid time/flux data found in uploaded files.")
    
    tcat = np.concatenate(time_list)
    fcat = np.concatenate(flux_list)

    order = np.argsort(tcat)
    tcat = tcat[order]
    fcat = fcat[order]

    mask_good = np.isfinite(tcat) & np.isfinite(fcat)
    tcat = tcat[mask_good]
    fcat = fcat[mask_good]

    if len(tcat) < MIN_POINTS_AFTER_CLEAN:
        raise HTTPException(status_code=400, detail=f"Not enough valid points after cleaning: {len(tcat)}")

    raw_curve_time = tcat.tolist()
    raw_curve_flux = fcat.tolist()

    if len(fcat) > 5:
        med = np.median(fcat)
        mad = np.median(np.abs(fcat - med))
        if mad == 0:
            mad = np.std(fcat) if np.std(fcat) > 0 else 1.0
        spike_mask = (np.abs(fcat - med) < 10 * mad)
        if spike_mask.sum() < len(spike_mask):
            tcat = tcat[spike_mask]
            fcat = fcat[spike_mask]

    grid, flux_detr = resample_to_1h_and_detrend(tcat, fcat, step_days=STEP_DAYS, med_kernel_hours=MED_KERNEL_HOURS)
    if grid is None or flux_detr is None:
        raise HTTPException(status_code=500, detail="Failed to resample/detrend signal")

    if len(flux_detr) < MIN_POINTS_AFTER_CLEAN:
        raise HTTPException(status_code=400, detail=f"Too few points after resampling/detrending: {len(flux_detr)}")

    processed_curve_time = grid.tolist()
    processed_curve_flux = flux_detr.tolist()

    df_tsf = pd.DataFrame({
        'id': 1,
        'time': np.arange(len(flux_detr), dtype=float),
        'flux': flux_detr
    })

    try:
        X_feats = extract_features(df_tsf, column_id='id', column_sort='time', column_value='flux',
                                   default_fc_parameters=TSFRESH_PARAMS, n_jobs=TSFRESH_N_JOBS)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"tsfresh extract_features failed: {str(e)}")

    X_feats = X_feats.fillna(0)
    X_feats.columns = [clean_column_name(c) for c in X_feats.columns]

    missing_cols = [c for c in FEATURE_COLS if c not in X_feats.columns]
    if missing_cols:
        for c in missing_cols:
            X_feats[c] = 0.0
    X_new = X_feats.reindex(columns=FEATURE_COLS, fill_value=0.0)

    cont_cols_present = [c for c in CONTINOUS_COLS if c in X_new.columns]
    if len(cont_cols_present) > 0:
        try:
            X_new.loc[:, cont_cols_present] = scaler.transform(X_new[cont_cols_present])
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Scaler transform failed: {str(e)}")

    try:
        proba = model.predict(X_new)
        proba_val = float(proba[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model prediction failed: {str(e)}")

    is_exo = bool(proba_val > 0.52)

    try:
        importances = model.feature_importance(importance_type='gain')
        feat_imp_pairs = list(zip(FEATURE_COLS, importances))
        feat_imp_pairs_sorted = sorted(feat_imp_pairs, key=lambda x: x[1], reverse=True)
        top_k = feat_imp_pairs_sorted[:20]
        top_features_list = []
        for name, imp in top_k:
            val = float(X_new.iloc[0].get(name, 0.0))
            top_features_list.append({'name': name, 'value': val, 'importance': float(imp)})
    except Exception:
        top_features_list = []
    
    suspicious_regions = detect_suspicious_regions(grid, flux_detr, num_regions=5)
    
    estimated_period = None
    if suspicious_regions and len(suspicious_regions) >= 2:
        estimated_period = abs(suspicious_regions[1]['center'] - suspicious_regions[0]['center'])
    
    folded_data = calculate_folded_curve(grid, flux_detr, period=estimated_period)
    
    try:
        transit_candidates = detect_transit_candidates(grid, flux_detr, n_candidates=5)
    except Exception:
        transit_candidates = []

    # ✅ Сегменты создаются ЛОКАЛЬНО на основе ЛОКАЛЬНОГО счётчика
    try:
        num_segments = fits_count  # используем локальную переменную
        segs = []
        tmin = float(grid[0]); tmax = float(grid[-1])
        for si in range(num_segments):
            s = tmin + (tmax - tmin) * si / num_segments
            e = tmin + (tmax - tmin) * (si + 1) / num_segments
            segs.append({'index': si, 'start': s, 'end': e, 'center': (s + e) / 2.0})
    except Exception:
        segs = []

    # ✅ Формируем НОВЫЙ результат для каждого запроса
    result = {
        'exoplanet': is_exo,
        'probability': proba_val,
        'features': top_features_list,
        'raw_curve': {'time': raw_curve_time, 'flux': raw_curve_flux},
        'processed_curve': {'time': processed_curve_time, 'flux': processed_curve_flux},
        'FITS_value': fits_count,  # ✅ локальная переменная
        'suspicious_regions': suspicious_regions,
        'folded_curve': folded_data,
        'transit_candidates': transit_candidates,
        'segments': segs
    }

    return JSONResponse(result)

@app.get("/model2/meta")
def model2_meta():
    if FEATURE_COLS2 is None:
        raise HTTPException(status_code=500, detail="Model v2 not loaded")
    human = {feat: human_label_from_feature(feat) for feat in FEATURE_COLS2}
    return {"feature_cols": FEATURE_COLS2, "human_names": human}

@app.post("/predict_second")
async def predict_second(
    csv_file: Optional[UploadFile] = File(None),
    # ручные поля — принимаем только те, что реально нужны (можно расширять)
    koi_time0bk: Optional[str] = Form(None),
    koi_duration: Optional[str] = Form(None),
    # Дополнительно — остальные признаки в виде необязательных form полей (общая обработка ниже)
    # Не обязательно перечислять все — клиент пришлёт нужные поля.
):
    """
    Логика:
     - если ручной ввод и оба REQUIRED_FIELDS_V2 заполнены (и не 0) -> используем ручной ввод (1 строка)
     - иначе если csv_file указан -> используем CSV
     - иначе -> ошибка (нужно что-то ввести)
    """
    if model2 is None:
        raise HTTPException(status_code=500, detail="Model v2 not loaded on server.")

    # Собираем наличие ручного ввода (проверяем только обязательные поля)
    manual_has_required = False
    try:
        t = float(koi_time0bk) if koi_time0bk is not None and koi_time0bk != "" else None
    except:
        t = None
    try:
        d = float(koi_duration) if koi_duration is not None and koi_duration != "" else None
    except:
        d = None

    if t is not None and d is not None and t != 0 and d != 0:
        manual_has_required = True

    if manual_has_required:
        # собираем все incoming form поля (fastapi сохраняет их в request.form, но мы принимаем основные)
        # Создаём DataFrame с единственной строкой. Для простоты — берём только feature names из FEATURE_COLS2:
        row = {}
        for feat in FEATURE_COLS2:
            # пробуем получить из form: FastAPI прокинет поля как аргументы; но если не перечислили — просто None
            # здесь мы используем koi_time0bk и koi_duration уже полученные, остальные ставим NaN
            if feat == "koi_time0bk":
                row[feat] = t
            elif feat == "koi_duration":
                row[feat] = d
            else:
                # если поле пришло в form как ключ — можно получить через request (сложнее),
                # но обычно пользователь заполнил минимум — оставим NaN (импутер заполнит)
                row[feat] = np.nan
        df = pd.DataFrame([row])
    else:
        # используем CSV
        if csv_file is None:
            raise HTTPException(status_code=400, detail="No valid manual input and no CSV provided for model v2.")
        if not csv_file.filename.lower().endswith(".csv"):
            raise HTTPException(status_code=400, detail="Only CSV files accepted for predict_second.")
        content = await csv_file.read()
        try:
            s = content.decode("utf-8")
        except:
            s = content.decode("latin1")
        df_raw = pd.read_csv(StringIO(s), header=0)
        if df_raw.shape[0] == 0:
            raise HTTPException(status_code=400, detail="CSV is empty.")
        # маппим csv в expected features
        df = _map_csv_to_features_v2(df_raw, FEATURE_COLS2)
        # проверим, что у каждой строки есть обязательные поля (после маппинга)
        missing_req = df['koi_time0bk'].isna() | df['koi_duration'].isna()
        if missing_req.any():
            # если какие-то строки не имеют обязательных значений — сообщим индексы
            bad_idx = list(df[missing_req].index)
            raise HTTPException(status_code=400, detail=f"CSV rows missing required fields koi_time0bk or koi_duration at rows: {bad_idx}")

    # теперь предсказание
    try:
        results = _prepare_and_predict_v2(df)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction v2 failed: {e}")

    return JSONResponse({"count": len(results), "results": results})