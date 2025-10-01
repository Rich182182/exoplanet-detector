// src/AnalysisPage.tsx
import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';

// Регистрируем chart.js
Chart.register(...registerables);

interface Feature {
  name: string;
  value: number;
}

interface AnalysisData {
  exoplanet: boolean;
  probability: number;
  features: Feature[];
  raw_curve: { time: number[]; flux: number[] };
  processed_curve: { time: number[]; flux: number[] };
}

const AnalysisPage: React.FC = () => {
  const [data, setData] = useState<AnalysisData | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('analysisData');
    if (saved) {
      setData(JSON.parse(saved));
    }
  }, []);

  if (!data) {
    return <div>No data. Go back and upload files first.</div>;
  }

  // Данные для графика сырой кривой
  const rawChartData = {
    labels: data.raw_curve.time,
    datasets: [
      {
        label: 'Сырая кривая',
        data: data.raw_curve.flux,
        borderColor: 'blue',
        backgroundColor: 'lightblue',
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  // Данные для графика обработанной кривой
  const processedChartData = {
    labels: data.processed_curve.time,
    datasets: [
      {
        label: 'Обработанная кривая',
        data: data.processed_curve.flux,
        borderColor: 'green',
        backgroundColor: 'lightgreen',
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', padding: '20px' }}>
      <div style={{ flex: 2, paddingRight: '20px' }}>
        <h2>Графики кривых</h2>
        <Line data={rawChartData} options={{ plugins: { title: { display: true, text: 'Исходная кривая' } } }} />
        <Line data={processedChartData} options={{ plugins: { title: { display: true, text: 'Обработанная кривая' } } }} />
      </div>
      <div style={{ flex: 1, paddingLeft: '20px' }}>
        <h2>Важные признаки</h2>
        <ul>
          {data.features.map((feat, idx) => (
            <li key={idx}>
              <strong>{feat.name}</strong>: {feat.value.toFixed(3)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AnalysisPage;
