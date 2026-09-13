import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Collaborator, ConnectionStatus } from '../collaboration';
import { PresenceBadge } from './collaboration/PresenceBadge';

interface RoomHeaderProps {
  roomId: string;
  displayName: string;
  connectionStatus: ConnectionStatus;
  collaborators: Collaborator[];
  currentUserId?: string;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  roomId,
  displayName,
  connectionStatus,
  collaborators,
  currentUserId,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Graceful fallback
    });
  };

  const statusConfig: Record<
    ConnectionStatus,
    { label: string; bg: string; dot: string; title: string }
  > = {
    connected: {
      label: 'Connected',
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      dot: 'bg-emerald-500',
      title: 'Real-time WebSocket connection active',
    },
    connecting: {
      label: 'Connecting...',
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      dot: 'bg-amber-500 animate-pulse',
      title: 'Connecting to room real-time gateway',
    },
    reconnecting: {
      label: 'Reconnecting...',
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      dot: 'bg-amber-500 animate-ping',
      title: 'Connection lost; attempting to reconnect...',
    },
    disconnected: {
      label: 'Disconnected',
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      dot: 'bg-rose-500',
      title: 'Real-time server unreachable',
    },
  };

  const currentStatus = statusConfig[connectionStatus];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md px-4 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
        {/* Brand & Room Identifier */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 group p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title="Leave room and return to Home"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shadow-indigo-600/30">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-900 hidden md:inline">SyncDraw</span>
          </Link>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Room ID Badge & Copy Button */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-mono font-bold tracking-wider px-2 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
              Room: {roomId}
            </span>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="Copy room invite link"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-700 font-semibold hidden sm:inline">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Real Presence, User Identity & Real-time Connection Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Real Collaborator Presence */}
          {collaborators.length > 0 && (
            <PresenceBadge
              collaborators={collaborators}
              currentUserId={currentUserId}
            />
          )}

          {/* User Name */}
          <div className="text-right hidden lg:block">
            <div className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">
              {displayName}
            </div>
            <div className="text-[10px] text-slate-400">You</div>
          </div>

          {/* Dynamic Connection Status */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${currentStatus.bg}`}
            title={currentStatus.title}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${currentStatus.dot}`} />
            <span>{currentStatus.label}</span>
          </div>

          <Link
            to="/"
            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
            title="Exit room"
          >
            Leave
          </Link>
        </div>
      </div>
    </header>
  );
};
