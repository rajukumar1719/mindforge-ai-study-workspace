import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { RoomHeader } from '../components/RoomHeader';
import { Canvas, type CanvasRef } from '../components/canvas/Canvas';
import { CursorOverlay, type CursorOverlayRef } from '../components/collaboration/CursorOverlay';
import { Toolbar } from '../components/canvas/Toolbar';
import { ClearConfirmDialog } from '../components/canvas/ClearConfirmDialog';
import { normalizeRoomId, isValidRoomId } from '../utils/roomId';
import { getUserSession, setUserSession } from '../utils/storage';
import {
  applyOperation,
  revertOperation,
  exportCanvasToPng,
  TOOL_DEFAULT_WIDTHS,
} from '../canvas';
import { createCollaborationClient, type CollaborationClient } from '../collaboration';
import type { UserSession } from '../types';
import type { Stroke, CanvasSettings, CanvasOperation } from '../canvas';
import type { Collaborator, ConnectionStatus } from '../collaboration';

export const RoomPage: React.FC = () => {
  const { roomId: rawRoomId } = useParams<{ roomId: string }>();
  const roomId = rawRoomId ? normalizeRoomId(rawRoomId) : '';
  const isRoomValid = isValidRoomId(roomId);

  const canvasRef = useRef<CanvasRef>(null);
  const cursorOverlayRef = useRef<CursorOverlayRef>(null);
  const clientRef = useRef<CollaborationClient | null>(null);

  const [session, setSession] = useState<UserSession | null>(() => getUserSession());
  const [directJoinName, setDirectJoinName] = useState<string>('');
  const [joinError, setJoinError] = useState<string | null>(null);

  // Drawing state: Canonical collection of finalized strokes
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  // Logical undo and redo operation history stacks
  const [undoStack, setUndoStack] = useState<CanvasOperation[]>([]);
  const [redoStack, setRedoStack] = useState<CanvasOperation[]>([]);

  // Clear confirmation modal state
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

  // Canvas tool and brush settings
  const [settings, setSettings] = useState<CanvasSettings>({
    tool: 'pen',
    color: '#111111',
    width: 4,
  });

  // Real-Time Collaboration & Presence State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  const displayName = session?.displayName || '';
  const hasSession = Boolean(session && session.displayName);

  // Establish real-time connection lifecycle strictly when user is in the room
  useEffect(() => {
    if (!hasSession || !isRoomValid || !roomId || !displayName) return;

    const client = createCollaborationClient({
      roomId,
      displayName,
      onStatusChange: (status) => {
        setConnectionStatus(status);
      },
      onRoomJoined: (data) => {
        setCurrentUserId(data.user.id);
        setCollaborators(data.collaborators);
      },
      onUserJoined: (data) => {
        setCollaborators((prev) => {
          if (prev.some((c) => c.id === data.user.id)) return prev;
          return [...prev, data.user];
        });
      },
      onUserLeft: (data) => {
        setCollaborators((prev) => prev.filter((c) => c.id !== data.userId));
        // Discard any active strokes for the disconnected user to prevent ghost strokes
        canvasRef.current?.cleanRemoteStrokesForUser(data.userId);
        cursorOverlayRef.current?.removeRemoteCursor(data.userId);
      },
      onCursorUpdate: (data) => {
        cursorOverlayRef.current?.updateRemoteCursor(data.userId, data.x, data.y);
      },
      onSyncState: (data) => {
        // Hydrate canvas with room's authoritative finalized strokes
        setStrokes(data.strokes);
      },
      onDrawStart: (data) => {
        canvasRef.current?.handleRemoteDrawStart(data);
      },
      onDrawUpdate: (data) => {
        canvasRef.current?.handleRemoteDrawUpdate(data);
      },
      onDrawEnd: (data) => {
        canvasRef.current?.handleRemoteDrawEnd(data);
      },
      onEraseStrokes: (data) => {
        const idSet = new Set(data.strokeIds);
        setStrokes((prev) => prev.filter((s) => !idSet.has(s.id)));
      },
      onError: (err) => {
        console.error('[Room Collaboration Error]:', err.code, err.message);
      },
    });

    clientRef.current = client;

    return () => {
      clientRef.current = null;
      client.disconnect();
    };
  }, [hasSession, isRoomValid, roomId, displayName]);

  // Handles new drawing and erasing operations
  const handleOperation = useCallback((op: CanvasOperation) => {
    setStrokes((prev) => applyOperation(prev, op));
    setUndoStack((prev) => [...prev, op]);
    setRedoStack([]); // New operation clears redo branch
  }, []);

  // Undo recent logical operation
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const lastOp = undoStack[undoStack.length - 1]!;
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, lastOp]);
    setStrokes((prev) => revertOperation(prev, lastOp));
  }, [undoStack]);

  // Redo reverted operation
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextOp = redoStack[redoStack.length - 1]!;
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [...prev, nextOp]);
    setStrokes((prev) => applyOperation(prev, nextOp));
  }, [redoStack]);

  // Confirm clear canvas
  const handleConfirmClear = () => {
    setIsClearDialogOpen(false);
    if (strokes.length === 0) return;

    const clearOp: CanvasOperation = {
      type: 'clear-canvas',
      strokes: [...strokes],
    };
    handleOperation(clearOp);
  };

  // Export PNG
  const handleExportPng = async () => {
    const canvasEl = canvasRef.current?.getCanvasElement();
    if (!canvasEl) return;
    const filename = `syncdraw-${roomId || 'canvas'}.png`;
    const success = await exportCanvasToPng(canvasEl, filename);
    if (!success) {
      alert('Unable to export the canvas. Please try again.');
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if the user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // Undo: Ctrl+Z / Cmd+Z (without Shift)
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y
      if (
        (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z') ||
        (!isMac && isCtrlOrCmd && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Tool shortcuts (single keys, no modifiers)
      if (!isCtrlOrCmd && !e.altKey) {
        if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          setSettings((prev) => ({ ...prev, tool: 'pen', width: TOOL_DEFAULT_WIDTHS.pen }));
        } else if (e.key.toLowerCase() === 'h') {
          e.preventDefault();
          setSettings((prev) => ({
            ...prev,
            tool: 'highlighter',
            width: Math.max(14, prev.width),
          }));
        } else if (e.key.toLowerCase() === 'e') {
          e.preventDefault();
          setSettings((prev) => ({
            ...prev,
            tool: 'eraser',
            width: Math.max(14, prev.width),
          }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);

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

  // Active Interactive Drawing Workspace with Real-Time Presence
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100">
      {/* Room Header with Real Presence and Live Socket Connection Status */}
      <RoomHeader
        roomId={roomId}
        displayName={displayName}
        connectionStatus={connectionStatus}
        collaborators={collaborators}
        currentUserId={currentUserId}
      />

      {/* Drawing Canvas Area */}
      <main className="relative flex-1 w-full h-full flex flex-col overflow-hidden">
        <Canvas
          ref={canvasRef}
          userId={displayName}
          settings={settings}
          strokes={strokes}
          onOperation={handleOperation}
          onRemoteStrokeComplete={(stroke) => {
            setStrokes((prev) => {
              if (prev.some((s) => s.id === stroke.id)) return prev;
              return [...prev, stroke];
            });
          }}
          onLocalDrawStart={(data) => clientRef.current?.sendDrawStart(data)}
          onLocalDrawMove={(strokeId, point) => clientRef.current?.queueStrokePoint(strokeId, point)}
          onLocalDrawEnd={(strokeId) => clientRef.current?.sendDrawEnd(strokeId)}
          onLocalErase={(strokeIds) => {
            if (strokeIds.length > 0) {
              const operationId = `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              clientRef.current?.sendEraseStrokes({ operationId, strokeIds });
            }
          }}
          onLocalCursorMove={(point) => clientRef.current?.sendCursorMove(point.x, point.y)}
        />

        {/* Live Collaborative Cursor Overlay Layer */}
        <CursorOverlay
          ref={cursorOverlayRef}
          collaborators={collaborators}
          currentUserId={currentUserId}
        />

        {/* Floating Toolbar with Full Toolset */}
        <Toolbar
          settings={settings}
          onSettingsChange={setSettings}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClearClick={() => setIsClearDialogOpen(true)}
          onExportClick={handleExportPng}
        />

        {/* Clear Confirmation Dialog */}
        <ClearConfirmDialog
          isOpen={isClearDialogOpen}
          onConfirm={handleConfirmClear}
          onCancel={() => setIsClearDialogOpen(false)}
        />
      </main>
    </div>
  );
};
