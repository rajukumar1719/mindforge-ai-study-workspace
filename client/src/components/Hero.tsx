import React from 'react';

interface HeroProps {
  onCreateRoomClick: () => void;
  onJoinRoomClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onCreateRoomClick,
  onJoinRoomClick,
}) => {
  return (
    <section className="pt-16 pb-12 sm:pt-24 sm:pb-16 text-center px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Product Capabilities Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-Time Collaborative Whiteboard</span>
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Draw together.
            <br />
            <span className="text-indigo-600">Create in real time.</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            A collaborative canvas where teams can sketch, brainstorm, and create together with real-time synchronization.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onCreateRoomClick}
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs shadow-indigo-600/25 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Room</span>
          </button>

          <button
            type="button"
            onClick={onJoinRoomClick}
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 rounded-xl border border-slate-300 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span>Join Room</span>
          </button>
        </div>
      </div>
    </section>
  );
};
