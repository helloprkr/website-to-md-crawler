import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  const { theme } = useTheme();
  
  return (
    <label className="inline-flex items-center cursor-pointer">
      <span className={`mr-3 text-sm font-medium ${
        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
      }`}>
        {label}
      </span>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className={`
          w-11 h-6 rounded-full
          transition-all duration-300
          ${checked ? 'bg-lime-400' : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}
          peer-focus:ring-4
          ${theme === 'dark' ? 'peer-focus:ring-lime-800' : 'peer-focus:ring-lime-300'}
          after:content-['']
          after:absolute after:top-[2px] after:left-[2px]
          after:bg-white
          after:border-gray-300
          after:border
          after:rounded-full
          after:h-5 after:w-5
          after:transition-all
          peer-checked:after:translate-x-full
        `}></div>
      </div>
    </label>
  );
}