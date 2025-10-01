// src/UploadPage.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const UploadPage: React.FC = () => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [result, setResult] = useState<{exoplanet: boolean, probability: number} | null>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const handleUpload = async () => {
    if (!files) return;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    try {
      // Посылаем на бэкенд файлы
      const response = await axios.post('http://localhost:8000/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = response.data;
      setResult({ exoplanet: data.exoplanet, probability: data.probability });
      // Сохраним полный результат для страницы анализа
      localStorage.setItem('analysisData', JSON.stringify(data));
    } catch (error: any) {
    console.error(error);
    if (error.response && error.response.data && error.response.data.detail) {
        alert(`Ошибка сервера: ${error.response.data.detail}`);
    } else {
        alert('Error uploading files');
    }
    }
  };

  const handleAnalyze = () => {
    // Переход на страницу анализа
    navigate('/analysis');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Проверка экзопланеты по сигналу</h1>
      <input type="file" multiple onChange={handleFileChange} />
      <br />
      <button onClick={handleUpload} disabled={!files}>Загрузить файлы и проверить</button>
      {result && (
        <div style={{ marginTop: '20px' }}>
          <h2>Результат:</h2>
          <p>Вероятность: {(result.probability * 100).toFixed(1)}%</p>
          <p>Объект является экзопланетой: {result.exoplanet ? 'Да' : 'Нет'}</p>
          <button onClick={handleAnalyze}>Проверить самому (анализ)</button>
        </div>
      )}
    </div>
  );
};

export default UploadPage;
