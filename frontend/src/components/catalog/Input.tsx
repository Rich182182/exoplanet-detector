import React from 'react';

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

function Input({ value, onChange, placeholder }: InputProps) {
  return (
    <input
      className="input-field"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

export default Input;
