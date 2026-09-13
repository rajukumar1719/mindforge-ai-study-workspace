import React from 'react';
import { StatusBadge } from './StatusBadge';
import type { HealthStatus } from '../types';

interface HeaderProps {
  backendStatus: HealthStatus;
}

export const Header: React.FC<HeaderProps> = ({ backendStatus }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            S
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
              SyncDraw
            </h1>
            <p className="text-xs text-slate-400">Collaborative Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">v0.1.0-alpha</span>
          <StatusBadge status={backendStatus} />
        </div>
      </div>
    </header>
  );
};
