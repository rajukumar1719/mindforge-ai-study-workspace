import React from 'react';
import type { CanvasSettings } from '../../canvas';

interface ToolbarProps {
  settings: CanvasSettings;
  onSettingsChange: (newSettings: CanvasSettings) => void;
}

const PALETTE_COLORS = [
  { label: 'Charcoal', value: '#111111' },
  { label: 'Indigo', value: '#4f46e5' },
  { label: 'Rose', value: '#e11d48' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Violet', value: '#7c3aed' },
];

const BRUSH_SIZES = [
  { label: 'Fine (2px)', value: 2, dotSize: 'w-1.5 h-1.5' },
  { label: 'Normal (4px)', value: 4, dotSize: 'w-2.5 h-2.5' },
  { label: 'Thick (8px)', value: 8, dotSize: 'w-3.5 h-3.5' },
  { label: 'Bold (14px)', value: 14, dotSize: 'w-4.5 h-4.5' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  settings,
  onSettingsChange,
}) => {
  return (
    <aside
      role="toolbar"
      aria-label="Canvas drawing tools"
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg shadow-slate-200/50 max-w-[95vw] overflow-x-auto"
    >
      {/* Tool Selector */}
      <div className="flex items-center">
        <button
          type="button"
          aria-label="Pen Tool (Active)"
          aria-pressed="true"
          title="Pen tool"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="hidden sm:inline">Pen</span>
        </button>
      </div>

      <div className="h-5 w-px bg-slate-200 shrink-0" />

      {/* Color Palette */}
      <div className="flex items-center gap-1 sm:gap-1.5" role="radiogroup" aria-label="Stroke color">
        {PALETTE_COLORS.map((c) => {
          const isSelected = settings.color.toLowerCase() === c.value.toLowerCase();
          return (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Color: ${c.label}`}
              title={c.label}
              onClick={() => onSettingsChange({ ...settings, color: c.value })}
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full transition-transform flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${
                isSelected ? 'scale-110 ring-2 ring-slate-900 ring-offset-1 shadow-xs' : 'hover:scale-105'
              }`}
            >
              <span
                className="w-full h-full rounded-full border border-black/10"
                style={{ backgroundColor: c.value }}
              />
            </button>
          );
        })}
      </div>

      <div className="h-5 w-px bg-slate-200 shrink-0" />

      {/* Brush Size */}
      <div className="flex items-center gap-1 sm:gap-1.5" role="radiogroup" aria-label="Brush size">
        {BRUSH_SIZES.map((b) => {
          const isSelected = settings.width === b.value;
          return (
            <button
              key={b.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Brush size: ${b.label}`}
              title={b.label}
              onClick={() => onSettingsChange({ ...settings, width: b.value })}
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isSelected ? 'bg-slate-100 text-slate-900 border border-slate-300' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span
                className={`rounded-full ${b.dotSize}`}
                style={{ backgroundColor: settings.color }}
              />
            </button>
          );
        })}
      </div>
    </aside>
  );
};
