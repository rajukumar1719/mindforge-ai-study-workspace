import React from 'react';

export const ProductPreview: React.FC = () => {
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
      <div className="relative rounded-2xl border border-slate-200 bg-white p-2 sm:p-3 shadow-xl shadow-slate-200/50">
        {/* Mock Browser/Canvas Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/70 rounded-t-xl text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span className="ml-2 font-mono text-[11px] text-slate-400 hidden sm:inline">canvas://preview-room</span>
          </div>

          {/* Mock Canvas Toolbar */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-lg px-2 py-1 shadow-2xs">
            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[11px]">Pen</span>
            <span className="px-2 py-0.5 text-slate-400 text-[11px]">Rectangle</span>
            <span className="px-2 py-0.5 text-slate-400 text-[11px]">Circle</span>
            <span className="px-2 py-0.5 text-slate-400 text-[11px]">Eraser</span>
            <div className="w-px h-3 bg-slate-200 mx-1" />
            <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 inline-block" />
          </div>

          <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
            100%
          </div>
        </div>

        {/* Canvas Body Mockup */}
        <div className="relative h-64 sm:h-96 w-full rounded-b-xl overflow-hidden bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] bg-slate-50/50 flex flex-col items-center justify-center p-6">
          {/* Static Technical Diagram Illustration */}
          <div className="relative w-full max-w-lg mx-auto pointer-events-none opacity-85">
            <svg viewBox="0 0 500 200" className="w-full h-auto drop-shadow-xs" fill="none">
              {/* Diagram Node: Browser Client */}
              <rect x="20" y="70" width="120" height="60" rx="8" className="fill-white stroke-slate-300" strokeWidth="1.5" />
              <text x="80" y="100" textAnchor="middle" className="fill-slate-800 text-xs font-semibold">Web Client</text>
              <text x="80" y="116" textAnchor="middle" className="fill-slate-400 text-[10px] font-mono">React Canvas</text>

              {/* Arrow 1 */}
              <path d="M140 100 H200" className="stroke-indigo-500" strokeWidth="1.5" strokeDasharray="4 4" />
              <polygon points="200,96 208,100 200,104" className="fill-indigo-500" />
              <text x="174" y="90" textAnchor="middle" className="fill-indigo-600 text-[9px] font-mono">Sync</text>

              {/* Diagram Node: Room Hub */}
              <rect x="210" y="70" width="120" height="60" rx="8" className="fill-indigo-50/50 stroke-indigo-300" strokeWidth="1.5" />
              <text x="270" y="100" textAnchor="middle" className="fill-indigo-950 text-xs font-semibold">SyncHub Server</text>
              <text x="270" y="116" textAnchor="middle" className="fill-indigo-600 text-[10px] font-mono">Room State</text>

              {/* Arrow 2 */}
              <path d="M330 100 H390" className="stroke-indigo-500" strokeWidth="1.5" strokeDasharray="4 4" />
              <polygon points="390,96 398,100 390,104" className="fill-indigo-500" />
              <text x="364" y="90" textAnchor="middle" className="fill-indigo-600 text-[9px] font-mono">Broadcast</text>

              {/* Diagram Node: Peer Client */}
              <rect x="400" y="70" width="90" height="60" rx="8" className="fill-white stroke-slate-300" strokeWidth="1.5" />
              <text x="445" y="100" textAnchor="middle" className="fill-slate-800 text-xs font-semibold">Peer</text>
              <text x="445" y="116" textAnchor="middle" className="fill-slate-400 text-[10px] font-mono">Real-Time</text>
            </svg>
          </div>

          {/* Explicit Static Preview Disclaimer */}
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-slate-200 text-slate-500 text-xs shadow-2xs">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Static architecture illustration • Interactive canvas engine scheduled for Section 3</span>
          </div>
        </div>
      </div>
    </section>
  );
};
