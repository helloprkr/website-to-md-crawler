import React from 'react';
import { ChevronRight } from 'lucide-react';
import { PageInfo } from '../types';
import { useTheme } from '../context/ThemeContext';

interface PageListProps {
  pages: PageInfo[];
  onTogglePage: (url: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function PageList({ pages, onTogglePage, onSelectAll, onDeselectAll }: PageListProps) {
  const { theme } = useTheme();
  const selectedCount = pages.filter(page => page.isSelected).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          {selectedCount} of {pages.length} pages selected
        </p>
        <div className="space-x-3">
          <button
            onClick={onSelectAll}
            className={`text-sm ${
              theme === 'dark' 
                ? 'text-purple-400 hover:text-purple-300' 
                : 'text-purple-600 hover:text-purple-500'
            }`}
          >
            Select All
          </button>
          <button
            onClick={onDeselectAll}
            className={`text-sm ${
              theme === 'dark' 
                ? 'text-purple-400 hover:text-purple-300' 
                : 'text-purple-600 hover:text-purple-500'
            }`}
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
        {pages.map((page) => (
          <label
            key={page.url}
            className={`
              flex items-start gap-3 p-3 rounded-lg
              ${theme === 'dark'
                ? 'bg-black/20 border-white/5 hover:bg-black/30'
                : 'bg-white/50 border-gray-200/50 hover:bg-white/70'}
              border
              transition-colors cursor-pointer
              group
            `}
          >
            <input
              type="checkbox"
              checked={page.isSelected}
              onChange={() => onTogglePage(page.url)}
              className={`
                mt-1 h-4 w-4 rounded border-2
                ${theme === 'dark'
                  ? 'border-white/20 bg-black/30'
                  : 'border-gray-300 bg-white'}
                text-purple-500 
                focus:ring-purple-500/20
                focus:ring-offset-0 focus:ring-2
                transition-colors
              `}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <ChevronRight
                  className={`w-4 h-4 ${
                    theme === 'dark' ? 'text-purple-400/50' : 'text-purple-600/50'
                  }`}
                  style={{
                    marginLeft: `${(page.level - 1) * 12}px`,
                  }}
                />
                <p className={`text-sm font-medium truncate ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {page.title}
                </p>
              </div>
              <p className={`text-xs truncate mt-1 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
              }`}>
                {page.url}
              </p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}