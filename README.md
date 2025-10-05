# Run Locally — Backend & Frontend (only instructions)

**Goal:** after reading this file you should be able to run both backend (FastAPI) and frontend (React) locally. Only exact copy-paste commands.

---

## Prerequisites
- Python 3.10 (or 3.9+)
- Conda (Miniconda/Anaconda) **preferred** OR Python + venv
- Node.js 16+ and npm (or yarn)

---

## A) Recommended: conda (copy-paste)

```bash
# 1. create and activate conda env
conda create -n exo python=3.10 -y
conda activate exo

# 2. install dependencies (conda-forge)
conda install -c conda-forge mamba -y || true   # optional
mamba install -c conda-forge python=3.10 fastapi uvicorn numpy pandas scipy astropy joblib lightgbm tsfresh scikit-learn python-multipart -y

# 3. start backend
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Open a second terminal (keep backend running) and run the frontend:

```bash
cd frontend
npm install
npm start
```

- Backend base URL: http://localhost:8000
- Frontend dev: http://localhost:3000

---

## B) Alternative: venv + pip (copy-paste)

```bash
# 1. create venv and activate
cd backend
python -m venv .venv
# linux/mac
source .venv/bin/activate
# windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# 2. install packages
pip install --upgrade pip
pip install fastapi uvicorn[standard] numpy pandas scipy astropy joblib lightgbm tsfresh scikit-learn python-multipart

# 3. start backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Then in another terminal start frontend:

```bash
cd frontend
npm install
npm start
```

---

## Quick API checks (curl)

```bash
curl -X POST "http://localhost:8000/predict" -F "files=@/full/path/to/file1.fits" -F "files=@/full/path/to/file2.fits"

curl -X POST "http://localhost:8000/predict_second" -F "csv_file=@/full/path/to/data.csv"
```

