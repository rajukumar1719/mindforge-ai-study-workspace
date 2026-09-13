import React from 'react';
import type { CanvasSettings, DrawingTool } from '../../canvas';
import { TOOL_DEFAULT_WIDTHS } from '../../canvas';

interface ToolbarProps {
  settings: CanvasSettings;
  onSettingsChange: (newSettings: CanvasSettings) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearClick: () => void;
  onExportClick: () => void;
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
  { label: 'Normal (4px)', value: 4, dotSize: 'w-2 h-2' },
  { label: 'Medium (8px)', value: 8, dotSize: 'w-3 h-3' },
  { label: 'Broad (14px)', value: 14, dotSize: 'w-4 h-4' },
  { label: 'Heavy (24px)', value: 24, dotSize: 'w-5 h-5' },
];

export const Toolbar: React.FC<ToolbarProps> = React.memo(({
  settings,
  onSettingsChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearClick,
  onExportClick,
}) => {
  const isEraser = settings.tool === 'eraser';

  const handleToolSelect = (tool: DrawingTool) => {
    if (settings.tool === tool) return;
    // When switching tools, apply sensible default width if appropriate
    const defaultWidth = TOOL_DEFAULT_WIDTHS[tool];
    onSettingsChange({
      ...settings,
      tool,
      width: tool === 'highlighter' ? Math.max(14, settings.width) : (tool === 'eraser' ? Math.max(14, settings.width) : defaultWidth),
    });
  };

  return (
    <aside
      role="toolbar"
      aria-label="Canvas drawing tools and controls"
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 sm:gap-2.5 p-1.5 sm:p-2 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl shadow-slate-300/40 max-w-[96vw] overflow-x-auto select-none"
    >
      {/* 1. Drawing Tools (Pen, Highlighter, Eraser) */}
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Tool selection">
        {/* Pen Button */}
        <button
          type="button"
          role="radio"
          aria-checked={settings.tool === 'pen'}
          aria-label="Pen Tool (P)"
          title="Pen (P)"
          onClick={() => handleToolSelect('pen')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            settings.tool === 'pen'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="hidden md:inline">Pen</span>
        </button>

        {/* Highlighter Button */}
        <button
          type="button"
          role="radio"
          aria-checked={settings.tool === 'highlighter'}
          aria-label="Highlighter Tool (H)"
          title="Highlighter (H)"
          onClick={() => handleToolSelect('highlighter')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            settings.tool === 'highlighter'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="hidden md:inline">Highlight</span>
        </button>

        {/* Eraser Button */}
        <button
          type="button"
          role="radio"
          aria-checked={settings.tool === 'eraser'}
          aria-label="Eraser Tool (E)"
          title="Eraser (E)"
          onClick={() => handleToolSelect('eraser')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            settings.tool === 'eraser'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="hidden md:inline">Eraser</span>
        </button>
      </div>

      <div className="h-5 w-px bg-slate-200 shrink-0" />

      {/* 2. Color Palette (Disabled / Dimmed when Eraser is active) */}
      <div
        className={`flex items-center gap-1 sm:gap-1.5 transition-opacity ${
          isEraser ? 'opacity-30 pointer-events-none' : 'opacity-100'
        }`}
        role="radiogroup"
        aria-label="Stroke color"
      >
        {PALETTE_COLORS.map((c) => {
          const isSelected = !isEraser && settings.color.toLowerCase() === c.value.toLowerCase();
          return (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Color: ${c.label}`}
              title={isEraser ? 'Color disabled for Eraser' : c.label}
              disabled={isEraser}
              onClick={() => onSettingsChange({ ...settings, color: c.value })}
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-transform flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${
                isSelected ? 'scale-115 ring-2 ring-slate-900 ring-offset-1 shadow-xs' : 'hover:scale-105'
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

      {/* 3. Brush Size Presets */}
      <div className="flex items-center gap-0.5 sm:gap-1" role="radiogroup" aria-label="Brush size">
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
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isSelected ? 'bg-slate-100 text-slate-900 border border-slate-300' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span
                className={`rounded-full ${b.dotSize}`}
                style={{ backgroundColor: isEraser ? '#64748b' : settings.color }}
              />
            </button>
          );
        })}
      </div>

      <div className="h-5 w-px bg-slate-200 shrink-0" />

      {/* 4. Canvas Actions: Undo, Redo, Clear, Export */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {/* Undo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo drawing operation (Ctrl+Z)"
          title="Undo (Ctrl+Z)"
          className={`p-1.5 sm:p-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            canUndo ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-300 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 10h10a5 5 0 015 5v2m0 0l-4-4m4 4l4-4M3 10l4-4m-4 4l4 4" />
          </svg>
        </button>

        {/* Redo */}
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo drawing operation (Ctrl+Shift+Z)"
          title="Redo (Ctrl+Shift+Z)"
          className={`p-1.5 sm:p-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            canRedo ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-300 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 10H11a5 5 0 00-5 5v2m0 0l4-4m-4 4l-4-4m15-4l-4-4m4 4l-4 4" />
          </svg>
        </button>

        {/* Clear Canvas */}
        <button
          type="button"
          onClick={onClearClick}
          aria-label="Clear Canvas"
          title="Clear Canvas"
          className="p-1.5 sm:p-2 text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>

        {/* Export PNG */}
        <button
          type="button"
          onClick={onExportClick}
          aria-label="Export Canvas as PNG"
          title="Export PNG"
          className="p-1.5 sm:p-2 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>
    </aside>
  );
});

Toolbar.displayName = 'Toolbar';

