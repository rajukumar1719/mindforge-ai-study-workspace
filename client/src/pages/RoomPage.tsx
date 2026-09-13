import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { RoomHeader } from '../components/RoomHeader';
import { Canvas } from '../components/canvas/Canvas';
import { Toolbar } from '../components/canvas/Toolbar';
import { normalizeRoomId, isValidRoomId } from '../utils/roomId';
import { getUserSession, setUserSession } from '../utils/storage';
import type { UserSession } from '../types';
import type { Stroke, CanvasSettings } from '../canvas';

export const RoomPage: React.FC = () => {
  const { roomId: rawRoomId } = useParams<{ roomId: string }>();
  const roomId = rawRoomId ? normalizeRoomId(rawRoomId) : '';
  const isRoomValid = isValidRoomId(roomId);

  const [session, setSession] = useState<UserSession | null>(() => getUserSession());
  const [directJoinName, setDirectJoinName] = useState<string>('');
  const [joinError, setJoinError] = useState<string | null>(null);

  // Drawing state: Canonical collection of finalized strokes
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  // Canvas settings
  const [settings, setSettings] = useState<CanvasSettings>({
    tool: 'pen',
    color: '#111111',
    width: 4,
  });

  const displayName = session?.displayName || '';
  const hasSession = Boolean(session && session.displayName);

  const handleDirectJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = directJoinName.trim();
    if (!trimmed) {
      setJoinError('Please enter your name to enter the room.');
      return;
    }
    if (trimmed.length < 2) {
      setJoinError('Display name must be at least 2 characters.');
      return;
    }
    if (trimmed.length > 30) {
      setJoinError('Display name must not exceed 30 characters.');
      return;
    }

    setJoinError(null);
    setUserSession(trimmed);
    setSession({ displayName: trimmed });
  };

  const handleStrokeComplete = (newStroke: Stroke) => {
    setStrokes((prev) => [...prev, newStroke]);
  };

  // Malformed Room ID handling
  if (!isRoomValid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Invalid Room Code</h2>
          <p className="text-xs text-slate-600">
            The room identifier <code className="font-mono font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">{rawRoomId || 'empty'}</code> is not valid. Room IDs must be 3–24 alphanumeric characters.
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Direct Link Prompt (when user opens /room/:roomId without an existing session display name)
  if (!hasSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-xl text-center space-y-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto font-bold">
            S
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">Enter Room {roomId}</h2>
            <p className="text-xs text-slate-500 mt-1">
              You were invited to this drawing room. Enter your display name to enter the workspace.
            </p>
          </div>

          <form onSubmit={handleDirectJoinSubmit} className="space-y-4 text-left">
            <div>
              <label
                htmlFor="direct-name"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Your Name
              </label>
              <input
                id="direct-name"
                type="text"
                value={directJoinName}
                onChange={(e) => {
                  setDirectJoinName(e.target.value);
                  if (joinError) setJoinError(null);
                }}
                placeholder="e.g., Taylor Swift"
                maxLength={30}
                autoFocus
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
              {joinError && (
                <p role="alert" className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {joinError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Enter Room
            </button>
          </form>

          <div className="border-t border-slate-100 pt-4">
            <Link to="/" className="text-xs text-slate-500 hover:text-slate-800">
              ← Return to landing page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Active Interactive Drawing Workspace
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100">
      {/* Room Header */}
      <RoomHeader roomId={roomId} displayName={displayName} />

      {/* Drawing Canvas Area */}
      <main className="relative flex-1 w-full h-full flex flex-col overflow-hidden">
        <Canvas
          userId={displayName}
          settings={settings}
          strokes={strokes}
          onStrokeComplete={handleStrokeComplete}
        />

        {/* Floating Toolbar */}
        <Toolbar
          settings={settings}
          onSettingsChange={setSettings}
        />
      </main>
    </div>
  );
};
