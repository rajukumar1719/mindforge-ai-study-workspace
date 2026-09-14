import React, { useState } from 'react';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { ProductPreview } from '../components/ProductPreview';
import { FeatureSection } from '../components/FeatureSection';
import { CreateRoomDialog } from '../components/CreateRoomDialog';
import { JoinRoomDialog } from '../components/JoinRoomDialog';
import type { ActiveModal } from '../types';

export const HomePage: React.FC = () => {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Header */}
      <Header onCreateRoomClick={() => setActiveModal('create')} />

      {/* Main Content */}
      <main className="flex-1">
        <Hero
          onCreateRoomClick={() => setActiveModal('create')}
          onJoinRoomClick={() => setActiveModal('join')}
        />

        <ProductPreview />

        <FeatureSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">SyncDraw</span>
            <span>•</span>
            <span>Real-Time Collaborative Drawing Canvas</span>
          </div>

          {/* Keyboard Shortcuts Quick Reference */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
            <span>Shortcuts:</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-slate-700">P (Pen)</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-slate-700">H (Highlight)</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-slate-700">E (Eraser)</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-slate-700">Ctrl/Cmd+Z (Undo)</span>
          </div>

          <div className="text-slate-400 text-[11px]">
            TypeScript • Canvas 2D • Socket.IO
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CreateRoomDialog
        isOpen={activeModal === 'create'}
        onClose={() => setActiveModal(null)}
      />

      <JoinRoomDialog
        isOpen={activeModal === 'join'}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
};
