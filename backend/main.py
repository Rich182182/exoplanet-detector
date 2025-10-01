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

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

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

# -------------------------
# Конфигурация / пути к артефактам модели
# -------------------------
MODEL_PATH = "lgb_model.txt"
SCALER_PATH = "scaler.pkl"
FEATURE_COLS_PATH = "feature_cols.pkl"
BINARY_COLS_PATH = "binary_cols.pkl"
CONTINOUS_COLS_PATH = "continouos_cols.pkl"  # именно так у тебя назывался файл
BEST_THRESHOLD_PATH = "best_threshold.pkl"   # опционально (если есть)

# Параметры предобработки (подставлены те же, что в pipeline)
STEP_DAYS = 1.0 / 24.0            # ресемплинг: 1 час = 1/24 дней
MED_KERNEL_HOURS = 25             # kernel для медфильтра (нечётный), как в pipeline
MIN_POINTS_AFTER_CLEAN = 50       # если после очистки мало точек — отклоняем
TSFRESH_PARAMS = EfficientFCParameters()  # используем Efficient набор признаков
TSFRESH_N_JOBS = 1                # для одного примера достаточно 1 процесса

# CORS origins (frontend локально)
FRONTEND_ORIGINS = ["http://localhost:3000"]

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

# Загружаем модель и вспомогательные объекты. Функция-обёртка с ясными ошибками.
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

    # LightGBM модель (сохранённая через save_model)
    model = lgb.Booster(model_file=MODEL_PATH)

    # Скалер, список колонок и разбиение по типам
    scaler = joblib.load(SCALER_PATH)
    feature_cols = joblib.load(FEATURE_COLS_PATH)
    binary_cols = joblib.load(BINARY_COLS_PATH)
    continouos_cols = joblib.load(CONTINOUS_COLS_PATH)

    # Опционально: порог
    best_threshold = 0.5
    if os.path.exists(BEST_THRESHOLD_PATH):
        try:
            best_threshold = joblib.load(BEST_THRESHOLD_PATH)
        except Exception:
            # если файл есть, но читается неправильно — используем 0.5
            best_threshold = 0.5

    return model, scaler, feature_cols, binary_cols, continouos_cols, best_threshold

# Загружаем артефакты при старте приложения (ошибка остановит запуск)
model, scaler, FEATURE_COLS, BINARY_COLS, CONTINOUS_COLS, BEST_THRESHOLD = load_artifacts()

# -------------------------
# Утилиты для чтения FITS и предобработки (копия/адаптация pipeline)
# -------------------------

def _find_time_and_flux_in_hdu(hdu) -> Tuple[Optional[str], Optional[str]]:
    """
    Поиск колонок 'TIME' и 'SAP_FLUX' (или других похожих) в HDU с таблицей.
    Возвращает имена колонок (time_col, flux_col) или (None,None).
    Используем гибкий поиск, учитывая возможные имена.
    """
    names = []
    try:
        names = [n for n in hdu.names]
    except Exception:
        # если нет .names (редко), попадаем сюда
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
        # предпочитаем SAP_FLUX если есть
        if 'sap_flux' in c:
            flux_col = col
            break
        # иначе любой flux-like
        if ('flux' in c) and (flux_col is None):
            flux_col = col
    return time_col, flux_col


def read_time_flux_from_fitsbytes(fbytes: bytes) -> Tuple[np.ndarray, np.ndarray]:
    """
    Открывает FITS из байтового объекта (BytesIO), находит таблицу с TIME и FLUX (сырые SAP_FLUX),
    и возвращает два numpy массива (time, flux) для этого файла.
    Бросает Exception при невозможности прочитать.
    """
    bio = BytesIO(fbytes)
    with fits.open(bio, memmap=False) as hdul:
        # ищем HDU с таблицей данных (обычно HDU[1])
        # но безопасно ищем ближайший HDU с .data и колонками
        table_hdu = None
        for h in hdul:
            if getattr(h, 'data', None) is not None:
                # проверим наличие колонок
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
            # более информативное сообщение
            available = []
            try:
                available = list(table_hdu.columns.names)
            except Exception:
                available = []
            raise ValueError(f"Cannot find TIME/FLUX columns. Available: {available}")

        data = table_hdu.data
        # извлекаем, приводим к numpy и float
        time = np.array(data[tcol]).astype(float)
        flux = np.array(data[fcol]).astype(float)
        return time, flux

# Вспомогательные функции для детренда/ресемплинга — почти копия pipeline

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
    1) Ресемплим (суммируем) точки в 1-часовые боксы (равномерная сетка).
    2) Интерполируем небольшие пропуски линейно.
    3) Строим медианный тренд (medfilt) и вычитаем его => detrended flux.
    Возвращаем (grid_time, flux_detr) или (None, None) при неудаче.
    """
    # Нужны хотя бы несколько точек
    if t is None or f is None or len(t) < 3:
        return None, None

    # убираем NaN/Inf
    mask = np.isfinite(t) & np.isfinite(f)
    if not np.any(mask):
        return None, None
    t = t[mask]
    f = f[mask]

    if len(t) < 3:
        return None, None

    tmin = float(np.min(t)); tmax = float(np.max(t))
    step = float(step_days)
    # создаём grid (включительно)
    grid = np.arange(tmin, tmax + step / 2.0, step)
    if len(grid) < 3:
        return None, None

    # индекс бина для каждой точки
    inds = np.floor((t - tmin) / step).astype(int)
    valid = (inds >= 0) & (inds < len(grid))
    if not np.any(valid):
        return None, None
    inds_valid = inds[valid]
    f_valid = f[valid].astype(float)

    # суммирование значений в каждой клетке
    flux_grid = np.full(len(grid), np.nan, dtype=float)
    unique_inds = np.unique(inds_valid)
    for i in unique_inds:
        mask_i = inds_valid == i
        flux_grid[i] = np.sum(f_valid[mask_i])

    # если все NaN — не годится
    nan_mask = np.isnan(flux_grid)
    if nan_mask.all():
        return None, None

    # интерполяция пропусков (линейная)
    idx = np.arange(len(grid))
    notnan = ~nan_mask
    if nan_mask.any():
        flux_grid[nan_mask] = np.interp(idx[nan_mask], idx[notnan], flux_grid[notnan])

    # детренд (median filter) — быстрый C-алгоритм
    kernel = _safe_kernel(med_kernel_hours)
    if kernel >= len(flux_grid):
        kernel = _safe_kernel(max(3, len(flux_grid) // 2))
    try:
        trend = medfilt(flux_grid, kernel_size=kernel)
    except Exception:
        # fallback к savgol
        wl = kernel if kernel % 2 == 1 else kernel + 1
        if wl >= len(flux_grid):
            wl = max(3, len(flux_grid) - (1 - (len(flux_grid) % 2)))
        trend = savgol_filter(flux_grid, window_length=wl, polyorder=2, mode='nearest')

    flux_detr = flux_grid - trend
    return grid, flux_detr

# -------------------------
# Нормализация/очистка имён колонок (как в обучении)
# -------------------------
def clean_column_name(col: str) -> str:
    """
    Убирает проблемные символы из имён колонок, делает их совместимыми с обучением/JSON.
    Это та же функция, что ты использовал в notebook.
    """
    clean = col.replace('"', '').replace("'", '').replace('\\', '')
    clean = clean.replace('[', '').replace(']', '')
    clean = clean.replace('{', '').replace('}', '')
    clean = clean.replace(':', '_').replace(',', '_')
    clean = clean.replace(' ', '_').replace('(', '').replace(')', '')
    clean = re.sub('_+', '_', clean)
    clean = clean.strip('_')
    return clean

# -------------------------
# Основной эндпоинт /predict
# -------------------------
@app.post("/predict")
async def predict(files: List[UploadFile] = File(...)):
    """
    Принимает один или несколько FITS-файлов (все они - одна целевая звезда, разные кварталы).
    Возвращает JSON:
      - exoplanet: True/False
      - probability: float
      - features: list of top-20 {name, value}
      - raw_curve: {time: [...], flux: [...]}
      - processed_curve: {time: [...], flux: [...]}
    """
    # --- Валидация входа
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded")

    # Списки для объединения всех кварталов
    time_list = []
    flux_list = []

    # Читаем каждый FITS (как bytes), извлекаем TIME и (сырой) FLUX
    for uploaded in files:
        filename = uploaded.filename
        # проверяем расширение
        if not filename.lower().endswith('.fits'):
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {filename}")
        try:
            fb = await uploaded.read()
            t_part, f_part = read_time_flux_from_fitsbytes(fb)
            # добавим части в списки
            if t_part is not None and f_part is not None and len(t_part) > 0:
                time_list.append(t_part)
                flux_list.append(f_part)
        except Exception as e:
            # если один FITS 못 прочитать — возвращаем информативную ошибку
            raise HTTPException(status_code=400, detail=f"Error reading {filename}: {str(e)}")

    # Конкатенируем все кварталы
    if len(time_list) == 0:
        raise HTTPException(status_code=400, detail="No valid time/flux data found in uploaded files.")
    tcat = np.concatenate(time_list)
    fcat = np.concatenate(flux_list)

    # сортируем по времени (на случай, если кварталы перепутаны)
    order = np.argsort(tcat)
    tcat = tcat[order]
    fcat = fcat[order]

    # Быстрая очистка: удаление NaN/Inf
    mask_good = np.isfinite(tcat) & np.isfinite(fcat)
    tcat = tcat[mask_good]
    fcat = fcat[mask_good]

    if len(tcat) < MIN_POINTS_AFTER_CLEAN:
        raise HTTPException(status_code=400, detail=f"Not enough valid points after cleaning: {len(tcat)}")

    # Сохраним исходную (сырую) кривую для графика (преобразуем в списки)
    raw_curve_time = tcat.tolist()
    raw_curve_flux = fcat.tolist()

    # Optional: удаление очевидных одиночных выбросов (простая версия)
    if len(fcat) > 5:
        med = np.median(fcat)
        mad = np.median(np.abs(fcat - med))
        if mad == 0:
            mad = np.std(fcat) if np.std(fcat) > 0 else 1.0
        # отметим точки, которые сильно выше median (всплески) и удалим их
        spike_mask = (np.abs(fcat - med) < 10 * mad)  # порог 10*MAD — консервативно
        if spike_mask.sum() < len(spike_mask):
            tcat = tcat[spike_mask]
            fcat = fcat[spike_mask]

    # Ресемплинг и детренд (тот же алгоритм, что в pipeline)
    grid, flux_detr = resample_to_1h_and_detrend(tcat, fcat, step_days=STEP_DAYS, med_kernel_hours=MED_KERNEL_HOURS)
    if grid is None or flux_detr is None:
        raise HTTPException(status_code=500, detail="Failed to resample/detrend signal")

    if len(flux_detr) < MIN_POINTS_AFTER_CLEAN:
        raise HTTPException(status_code=400, detail=f"Too few points after resampling/detrending: {len(flux_detr)}")

    # Сохранение обработанной кривой (для графика)
    processed_curve_time = grid.tolist()
    processed_curve_flux = flux_detr.tolist()

    # --- Подготовка DataFrame для tsfresh: id=1, time индекс 0..N-1, value=flux_detr
    df_tsf = pd.DataFrame({
        'id': 1,
        'time': np.arange(len(flux_detr), dtype=float),
        'flux': flux_detr
    })

    # Иногда tsfresh может быть капризен, но в общем для одного ряда всё ок
    # Экстракт признаков (EfficientFCParameters — как в pipeline)
    try:
        X_feats = extract_features(df_tsf, column_id='id', column_sort='time', column_value='flux',
                                   default_fc_parameters=TSFRESH_PARAMS, n_jobs=TSFRESH_N_JOBS)
    except Exception as e:
        # Если tsfresh упал, возвращаем понятную ошибку
        raise HTTPException(status_code=500, detail=f"tsfresh extract_features failed: {str(e)}")

    # Заполним NaN нулями (как safety)
    X_feats = X_feats.fillna(0)

    # Приведём имена колонок к формату, как при обучении
    X_feats.columns = [clean_column_name(c) for c in X_feats.columns]

    # Убедимся, что все колонки, на которых обучалась модель, присутствуют
    # Если каких-то нет — добавляем колонку со значением 0
    # Также сохраняем порядок колонок в feature_cols (важно для модели)
    missing_cols = [c for c in FEATURE_COLS if c not in X_feats.columns]
    if missing_cols:
        for c in missing_cols:
            X_feats[c] = 0.0  # ставим 0 если фича не рассчиталась
    # Режектируем только используемые колонки и в нужном порядке
    X_new = X_feats.reindex(columns=FEATURE_COLS, fill_value=0.0)

    # Масштабирование: только по непрерывным колонкам (RobustScaler)
    # Проверяем, что continouos cols существуют в X_new
    cont_cols_present = [c for c in CONTINOUS_COLS if c in X_new.columns]
    bin_cols_present = [c for c in BINARY_COLS if c in X_new.columns]
    # Если каких-то непрерывных колонок нет — они уже добавлены нулями выше
    if len(cont_cols_present) > 0:
        try:
            X_new.loc[:, cont_cols_present] = scaler.transform(X_new[cont_cols_present])
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Scaler transform failed: {str(e)}")

    # Предсказание: модель LightGBM ожидает двумерный массив
    try:
        proba = model.predict(X_new)  # возвращает массив вероятностей
        proba_val = float(proba[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model prediction failed: {str(e)}")

    is_exo = bool(proba_val > 0.497)

    # Получение топ-20 важнейших признаков по importance (gain)
    try:
        importances = model.feature_importance(importance_type='gain')
        # Zip (feature_name, importance) — FEATURE_COLS соответствует порядку в обучении
        feat_imp_pairs = list(zip(FEATURE_COLS, importances))
        # Сортировка по важности
        feat_imp_pairs_sorted = sorted(feat_imp_pairs, key=lambda x: x[1], reverse=True)
        top_k = feat_imp_pairs_sorted[:20]
        # Подготавливаем список словарей {name, value, importance}
        top_features_list = []
        for name, imp in top_k:
            val = float(X_new.iloc[0].get(name, 0.0))
            top_features_list.append({'name': name, 'value': val, 'importance': float(imp)})
    except Exception:
        # В случае ошибки — формируем пустой список
        top_features_list = []

    # Формируем JSON-ответ
    result = {
        'exoplanet': is_exo,
        'probability': proba_val,
        'features': top_features_list,
        'raw_curve': {'time': raw_curve_time, 'flux': raw_curve_flux},
        'processed_curve': {'time': processed_curve_time, 'flux': processed_curve_flux}
    }

    return JSONResponse(result)
