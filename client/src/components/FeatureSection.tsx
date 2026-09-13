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
      title: 'Real-Time Collaboration',
      tagline: 'Work together on the same canvas.',
      description: 'Low-latency state broadcasting synchronizes drawing actions across all connected participants.',
      status: 'Planned',
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      title: 'Live Presence',
      tagline: 'See who is currently in the room.',
      description: 'Dynamic participant awareness displaying teammate names, active status, and coordinated cursor positions.',
      status: 'Planned',
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      title: 'Fast Canvas',
      tagline: 'Built around efficient canvas rendering.',
      description: 'Native HTML5 Canvas 2D engine engineered for smooth 60fps freehand paths, geometric shapes, and instant redraws.',
      status: 'Planned',
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
    },
    {
      title: 'Room-Based Collaboration',
      tagline: 'Share a room and start creating together.',
      description: 'Isolated URL-safe workspaces allowing instant collaboration with zero friction and straightforward link sharing.',
      status: 'In Progress',
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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
            Key architectural features being developed section-by-section for modern engineering and design teams.
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
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${
                  feature.status === 'In Progress'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-slate-200/60 text-slate-600'
                }`}>
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
