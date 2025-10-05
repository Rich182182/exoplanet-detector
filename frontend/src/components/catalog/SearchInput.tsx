import React from 'react';
import { Search24Filled } from '@fluentui/react-icons';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <div className="search-input-wrapper">
      <input
        placeholder="Search"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <Search24Filled className="search-icon" />
    </div>
  );
}

export default SearchInput;
