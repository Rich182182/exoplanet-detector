import React, { useState } from 'react';
import { Icon } from '@iconify/react';

interface Option {
  value: string;
  label: string;
  icon?: React.ElementType;
}

interface DropdownMenuProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

function DropdownMenu({ options, value, onChange, placeholder }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`dropdown-menu ${isOpen ? 'open' : ''}`}>
      <button className="dropdown-toggle" onClick={() => setIsOpen(!isOpen)}>
        <span className={!value ? 'placeholder' : ''}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <Icon icon="iconamoon:arrow-up-2-duotone" className={`arrow-icon ${isOpen ? 'arrow-icon-open' : ''}`} />
      </button>
      {isOpen && (
        <ul className="dropdown-options">
          {options.map(option => {
            const IconComponent = option.icon;
            return (
              <li 
                key={option.value} 
                onClick={() => handleSelect(option.value)}
                className={value === option.value ? 'active' : ''}
              >
                {IconComponent && <IconComponent />}
                <span className="option-dot" />
                {option.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default DropdownMenu;
