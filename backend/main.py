from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Exoplanet Detector API")

# CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Фронтенд порт
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Exoplanet Detector API is running"}

@app.post("/predict/")
async def predict(files: list[UploadFile] = File(...)):
    # Пока заглушка
    return {"result": "Exoplanet detected!", "features": [], "raw_curve": [], "processed_curve": []}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)