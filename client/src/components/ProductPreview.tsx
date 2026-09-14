import React from 'react';

export const ProductPreview: React.FC = () => {
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
      <div className="relative rounded-2xl border border-slate-200 bg-white p-2 sm:p-3 shadow-xl shadow-slate-200/50">
        {/* Mock Browser/Canvas Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/70 rounded-t-xl text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            </div>
            <span className="ml-2 font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-200/60 text-slate-700">
              Room: DESIGN-SYNC
            </span>
          </div>

          {/* Collaborator Avatars & Connection State Preview */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5 overflow-hidden">
              <div
                className="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white shadow-2xs"
                style={{ backgroundColor: '#4f46e5' }}
                title="Alice"
              >
                A
              </div>
              <div
                className="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white shadow-2xs"
                style={{ backgroundColor: '#059669' }}
                title="Bob"
              >
                B
              </div>
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Connected</span>
            </div>
          </div>
        </div>

        {/* Canvas Body Mockup */}
        <div className="relative h-72 sm:h-96 w-full rounded-b-xl overflow-hidden bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] bg-slate-50/60 flex flex-col items-center justify-between p-4 sm:p-6">
          {/* Authentic Vector Drawing Preview (Freehand Curves + Highlighter) */}
          <svg
            viewBox="0 0 600 240"
            className="w-full h-full max-h-60 sm:max-h-72 pointer-events-none"
            fill="none"
          >
            {/* Highlighter Stroke (Semi-Transparent Yellow) */}
            <path
              d="M 60 140 Q 180 120, 320 135 T 520 125"
              stroke="#f59e0b"
              strokeWidth="20"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.35"
            />

            {/* Smooth Charcoal Pen Stroke by Alice */}
            <path
              d="M 70 80 C 130 30, 220 160, 300 90 S 430 40, 500 100"
              stroke="#111111"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Smooth Indigo Pen Stroke */}
            <path
              d="M 120 160 Q 220 190, 340 165 T 480 180"
              stroke="#4f46e5"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Sketch annotation text */}
            <text x="75" y="70" className="fill-slate-400 text-[11px] font-mono">
              Vector stroke synchronization
            </text>
          </svg>

          {/* Bob's Live Collaborative Cursor Mockup */}
          <div
            className="absolute top-28 right-24 sm:right-40 pointer-events-none flex items-start gap-1 z-10 transition-transform"
            style={{ transform: 'translate(0, 0)' }}
          >
            {/* SVG Pointer Arrow */}
            <svg
              className="w-4 h-4 drop-shadow-xs"
              viewBox="0 0 24 24"
              fill="#059669"
              stroke="#ffffff"
              strokeWidth="1.5"
            >
              <path d="M3 3l7 18 3-7 7-3L3 3z" />
            </svg>
            {/* Bob's Name Badge */}
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs"
              style={{ backgroundColor: '#059669' }}
            >
              Bob (Sketching)
            </span>
          </div>

          {/* Authentic Floating Toolbar Preview */}
          <div className="relative z-10 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-lg shadow-slate-300/30">
            <span className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-2xs flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Pen
            </span>
            <span className="px-2.5 py-1 rounded-xl text-slate-600 hover:text-slate-900 font-medium text-xs">
              Highlight
            </span>
            <span className="px-2.5 py-1 rounded-xl text-slate-600 hover:text-slate-900 font-medium text-xs">
              Eraser
            </span>
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
            <span className="w-4 h-4 rounded-full ring-2 ring-slate-900 ring-offset-1" style={{ backgroundColor: '#111111' }} />
            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: '#4f46e5' }} />
            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: '#e11d48' }} />
            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: '#059669' }} />
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
            <span className="text-xs text-slate-500 font-medium px-1">Undo</span>
            <span className="text-xs text-slate-500 font-medium px-1">Redo</span>
          </div>
        </div>
      </div>
    </section>
  );
};
