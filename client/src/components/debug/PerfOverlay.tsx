import React, { useEffect, useState, useRef } from 'react';
import type { ConnectionStatus } from '../../collaboration';

interface PerfOverlayProps {
  activeCollaboratorsCount: number;
  operationsCount: number;
  pendingQueueCount: number;
  connectionStatus: ConnectionStatus;
  getPingLatency?: () => number | null;
}

/**
 * Checks whether performance debug diagnostics HUD should be mounted.
 * Disabled by default in production. Enabled via:
 * 1. Environment variable VITE_PERF_DEBUG=true
 * 2. URL query param `?debug=true` or `?perf=true`
 */
function isPerfDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const search = window.location.search;
  if (search.includes('debug=true') || search.includes('perf=true')) {
    return true;
  }
  return import.meta.env.VITE_PERF_DEBUG === 'true';
}

export const PerfOverlay: React.FC<PerfOverlayProps> = ({
  activeCollaboratorsCount,
  operationsCount,
  pendingQueueCount,
  connectionStatus,
  getPingLatency,
}) => {
  const [fps, setFps] = useState<number>(60);
  const [latency, setLatency] = useState<number | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Measure rolling FPS via requestAnimationFrame
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    lastTimeRef.current = performance.now();

    const measureFps = (now: number) => {
      frameCountRef.current += 1;
      const delta = now - lastTimeRef.current;

      if (delta >= 1000) {
        const calculatedFps = Math.round((frameCountRef.current * 1000) / delta);
        if (active) {
          setFps(Math.min(calculatedFps, 144));
        }
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      if (active) {
        rafIdRef.current = requestAnimationFrame(measureFps);
      }
    };

    rafIdRef.current = requestAnimationFrame(measureFps);

    return () => {
      active = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  // Periodic latency sample (every 3 seconds, strictly in dev debug mode)
  useEffect(() => {
    if (!getPingLatency) return;

    const interval = setInterval(() => {
      const current = getPingLatency();
      if (current !== null) {
        setLatency(current);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [getPingLatency]);

  if (!isPerfDebugEnabled()) {
    return null;
  }

  if (isMinimized) {
    return (
      <button
        type="button"
        onClick={() => setIsMinimized(false)}
        className="fixed top-14 right-3 z-50 px-2.5 py-1 rounded-md bg-slate-900/85 text-emerald-400 font-mono text-[11px] font-bold shadow-lg border border-slate-700 backdrop-blur-sm hover:bg-slate-900 transition-all cursor-pointer"
        title="Open Dev Performance Diagnostics"
      >
        FPS: {fps}
      </button>
    );
  }

  return (
    <aside
      aria-label="Development Performance Diagnostics"
      className="fixed top-14 right-3 z-50 w-64 rounded-xl bg-slate-900/90 text-slate-100 p-3 shadow-2xl border border-slate-700 backdrop-blur-md font-mono text-xs select-none"
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-[11px] uppercase tracking-wider text-slate-200">
            Dev Diagnostics
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded text-[10px] hover:bg-slate-800 transition-colors cursor-pointer"
          title="Minimize diagnostics HUD"
        >
          Hide
        </button>
      </div>

      <div className="space-y-1.5 text-[11px]">
        {/* Approximate FPS */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Rendering FPS:</span>
          <span
            className={`font-bold ${
              fps >= 55 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            {fps} fps
          </span>
        </div>

        {/* Collaborators */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Collaborators:</span>
          <span className="font-semibold text-slate-200">
            {activeCollaboratorsCount} active
          </span>
        </div>

        {/* Operation History */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Operation Log:</span>
          <span className="font-semibold text-slate-200">
            {operationsCount} records
          </span>
        </div>

        {/* Pending Offline Queue */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Pending Queue:</span>
          <span
            className={`font-semibold ${
              pendingQueueCount > 0 ? 'text-amber-400' : 'text-slate-200'
            }`}
          >
            {pendingQueueCount} items
          </span>
        </div>

        {/* Socket Status */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Socket State:</span>
          <span className="capitalize text-slate-300">{connectionStatus}</span>
        </div>

        {/* Latency */}
        {latency !== null && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Est. Latency:</span>
            <span className="text-slate-200">{latency} ms</span>
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-slate-800 text-[9px] text-slate-500 leading-tight">
        Enabled via ?debug=true or VITE_PERF_DEBUG. Not included in production.
      </div>
    </aside>
  );
};
