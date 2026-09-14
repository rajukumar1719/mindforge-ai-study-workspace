import React, { useState, useRef, useEffect } from 'react';
import type { Collaborator } from '../../collaboration';

interface PresenceBadgeProps {
  collaborators: Collaborator[];
  currentUserId?: string;
}

export const PresenceBadge: React.FC<PresenceBadgeProps> = ({
  collaborators,
  currentUserId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const count = collaborators.length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Presence Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`${count} ${count === 1 ? 'collaborator' : 'collaborators'} online. Click to view roster.`}
        title={`${count} ${count === 1 ? 'collaborator' : 'collaborators'} online (click to view roster)`}
        className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {/* Overlapping Collaborator Avatars with Initials & Overflow */}
        <div className="flex -space-x-1.5 overflow-hidden py-0.5">
          {collaborators.slice(0, 3).map((c) => {
            const initial = c.name ? c.name.charAt(0).toUpperCase() : '?';
            return (
              <span
                key={c.id}
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white ring-2 ring-white shadow-2xs shrink-0"
                style={{ backgroundColor: c.color }}
                title={c.name}
              >
                {initial}
              </span>
            );
          })}
          {collaborators.length > 3 && (
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold bg-slate-100 border border-slate-300 text-slate-700 ring-2 ring-white shadow-2xs shrink-0"
              title={`${collaborators.length - 3} more collaborators`}
            >
              +{collaborators.length - 3}
            </span>
          )}
        </div>

        <span className="hidden sm:inline">
          {count} {count === 1 ? 'collaborator' : 'collaborators'}
        </span>

        <svg
          className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Roster Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 p-3 shadow-xl z-50 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-900 tracking-tight">
              Active in Room
            </span>
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              {count}
            </span>
          </div>

          <ul className="space-y-1 max-h-56 overflow-y-auto">
            {collaborators.map((c) => {
              const isCurrentUser = c.id === currentUserId;
              const initial = c.name ? c.name.charAt(0).toUpperCase() : '?';

              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-slate-50 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Collaborator Avatar Initial Badge with Stable Identity Color */}
                    <div
                      className="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 shadow-2xs"
                      style={{ backgroundColor: c.color }}
                      title={c.name}
                    >
                      {initial}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-slate-800 truncate leading-tight" title={c.name}>
                        {c.name}
                      </span>
                      <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </span>
                    </div>
                  </div>

                  {isCurrentUser && (
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 shrink-0 ml-2">
                      You
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
