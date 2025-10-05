import React from 'react';
import './RangeSlider.css';

interface RangeSliderProps {
  min: number;
  max: number;
  value: { min: number; max: number };
  onChange: (value: { min: number; max: number }) => void;
}

function RangeSlider({ min, max, value, onChange }: RangeSliderProps) {
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(Number(e.target.value), value.max - 1);
    onChange({ ...value, min: newMin });
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(Number(e.target.value), value.min + 1);
    onChange({ ...value, max: newMax });
  };

  const minPos = ((value.min - min) / (max - min)) * 100;
  const maxPos = ((value.max - min) / (max - min)) * 100;

  return (
    <div className="range-slider-container">
        <div className="range-slider-inputs">
            <input type="number" className="range-input-field" value={value.min} onChange={(e) => onChange({ ...value, min: Number(e.target.value) })} />
            <input type="number" className="range-input-field" value={value.max} onChange={(e) => onChange({ ...value, max: Number(e.target.value) })} />
        </div>
        <div className="range-slider-track-container">
            <div className="range-slider-track" />
            <div className="range-slider-range" style={{ left: `${minPos}%`, right: `${100 - maxPos}%` }} />
            <input
                type="range"
                min={min}
                max={max}
                value={value.min}
                onChange={handleMinChange}
                className="range-thumb range-thumb-min"
            />
            <input
                type="range"
                min={min}
                max={max}
                value={value.max}
                onChange={handleMaxChange}
                className="range-thumb range-thumb-max"
            />
        </div>
    </div>
  );
}

export default RangeSlider;
