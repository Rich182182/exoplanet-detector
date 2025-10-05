🚀 How to Run the Project Locally

This project has two parts:

Backend (FastAPI, Python) → does all the ML predictions.

Frontend (React, Node.js) → user interface that talks to the backend.

To run everything locally, you need to:

Install dependencies (Python + Node.js).

Start the backend server.

Start the frontend app.

Open the app in your browser at http://localhost:3000.

⚠️ Important: the backend needs trained model files (artifacts). Put them in the backend/ folder and make sure the filenames match what’s defined at the top of backend/main.py (e.g. lgb_model.txt, scaler.pkl, feature_cols.pkl, etc.).

✅ Recommended (Conda users)
# Create environment
conda create -n exo python=3.10 -y
conda activate exo

# Install dependencies
conda install -c conda-forge mamba -y || true
mamba install -c conda-forge fastapi uvicorn numpy pandas scipy astropy joblib lightgbm tsfresh scikit-learn python-multipart -y || \
conda install -c conda-forge fastapi uvicorn numpy pandas scipy astropy joblib lightgbm tsfresh scikit-learn python-multipart -y

# Start backend
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload


Open a new terminal (keep backend running):

cd frontend
npm install
npm start

✅ Alternative (venv + pip)

Linux / macOS:

cd backend
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install fastapi uvicorn[standard] numpy pandas scipy astropy joblib lightgbm tsfresh scikit-learn python-multipart
uvicorn main:app --host 0.0.0.0 --port 8000 --reload


Windows (PowerShell):

cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install fastapi uvicorn[standard] numpy pandas scipy astropy joblib lightgbm tsfresh scikit-learn python-multipart
uvicorn main:app --host 0.0.0.0 --port 8000 --reload


Then in a new terminal:

cd frontend
npm install
npm start

🌐 Access

Frontend → http://localhost:3000

Backend API → http://localhost:8000

🔎 Quick API Tests
# Send FITS files
curl -X POST "http://localhost:8000/predict" \
  -F "files=@/path/to/file1.fits" \
  -F "files=@/path/to/file2.fits"

# Send CSV file
curl -X POST "http://localhost:8000/predict_second" \
  -F "csv_file=@/path/to/data.csv"
