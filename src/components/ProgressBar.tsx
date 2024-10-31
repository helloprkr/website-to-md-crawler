import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface ProgressBarProps {
  progress: number;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const { theme } = useTheme();
  
  return (
    <div className={`
      w-full h-2 rounded-full overflow-hidden backdrop-blur-sm
      ${theme === 'dark' ? 'bg-black/30' : 'bg-white/30'}
      transition-colors duration-300
    `}>
      <div
        className={`
          h-full transition-all duration-300 ease-out
          bg-lime-400
        `}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}