import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import type { HealthStatus } from './types';

export const App: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<HealthStatus>('checking');

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
    const controller = new AbortController();

    fetch(`${serverUrl}/health`, { signal: controller.signal })
      .then((res) => {
        if (res.ok) {
          setBackendStatus('healthy');
        } else {
          setBackendStatus('unreachable');
        }
      })
      .catch(() => {
        setBackendStatus('unreachable');
      });

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header backendStatus={backendStatus} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium tracking-wide uppercase">
            Section 1 • Foundation Phase
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              SYNC DRAW
            </h2>
            <p className="text-lg sm:text-xl text-slate-400 font-normal">
              Real-Time Collaborative Canvas
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-2xl backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 text-left">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">System Architecture Foundation</h3>
                <p className="text-xs text-slate-500">Full-stack TypeScript workspace initialized</p>
              </div>
              <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Ready
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                <div className="text-xs text-slate-500 font-mono">CLIENT</div>
                <div className="text-sm font-semibold text-slate-300 mt-1">React + Vite</div>
                <div className="text-xs text-slate-400 mt-1">Tailwind CSS (Strict TS)</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                <div className="text-xs text-slate-500 font-mono">SERVER</div>
                <div className="text-sm font-semibold text-slate-300 mt-1">Node.js + Express</div>
                <div className="text-xs text-slate-400 mt-1">HTTP /health endpoint</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                <div className="text-xs text-slate-500 font-mono">COLLABORATION</div>
                <div className="text-sm font-semibold text-slate-300 mt-1">WebSocket Layer</div>
                <div className="text-xs text-slate-400 mt-1">Planned in Section 2+</div>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Drawing engine, WebSocket protocol, and room management are deferred to subsequent sections.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-600">
        SyncDraw • Real-Time Collaborative Canvas • Section 1 Project Foundation
      </footer>
    </div>
  );
};

export default App;
