import React from 'react';

interface FeatureItem {
  title: string;
  tagline: string;
  description: string;
  status: string;
  icon: React.ReactNode;
}

export const FeatureSection: React.FC = () => {
  const features: FeatureItem[] = [
    {
      title: 'Real-Time Vector Sync',
      tagline: 'Draw together with zero noticeable latency.',
      description: 'Zero-latency local rendering paired with batched vector stroke broadcasting synchronizes pen, highlighter, and eraser smoothly across peers.',
      status: 'Available',
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      title: 'Live Cursors & Presence',
      tagline: 'See who is sketching in the room.',
      description: 'Real-time collaborative cursors with GPU compositor acceleration, stable participant identity colors, and dynamic presence rosters.',
      status: 'Available',
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      title: 'Collaborative Undo & History',
      tagline: 'Independent author-scoped actions.',
      description: 'Immutable operation logs allow teammates to undo their own strokes without destroying a peer\'s contributions, with reversible canvas clear.',
      status: 'Available',
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      title: 'Offline Resilience & Replay',
      tagline: 'Keep creating during network drops.',
      description: 'Local-first architecture queues pending operations in durable storage and automatically reconciles state upon reconnection.',
      status: 'Available',
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="features" className="py-16 bg-white border-t border-slate-200/80 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Core System Capabilities
          </h2>
          <p className="text-sm text-slate-600">
            Engineered from first principles for high-performance real-time teamwork and resilient drawing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                  {feature.icon}
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {feature.status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900">{feature.title}</h3>
                <p className="text-xs font-medium text-indigo-600 mt-0.5">{feature.tagline}</p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
