import React from 'react';

interface Option {
  value: string;
  label: string;
  icon?: React.ElementType;
}

interface SelectMenuProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}

function SelectMenu({ options, value, onChange }: SelectMenuProps) {
  return (
    <div className="select-menu">
      {options.map(option => {
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            className={`select-option ${value === option.value ? 'active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {Icon && <Icon />}
            <span className="option-dot" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SelectMenu;