import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import type { Collaborator } from '../../collaboration';

export interface CursorOverlayRef {
  updateRemoteCursor: (userId: string, x: number, y: number) => void;
  removeRemoteCursor: (userId: string) => void;
  clearAll: () => void;
}

interface CursorOverlayProps {
  collaborators: Collaborator[];
  currentUserId?: string;
}

interface CursorNode {
  el: HTMLDivElement;
  timeoutId: number;
}

/**
 * GPU-composited Remote Cursor Overlay Layer.
 * Renders multiplayer cursors via CSS 3D transforms to eliminate canvas redraws and React state churn.
 */
export const CursorOverlay = forwardRef<CursorOverlayRef, CursorOverlayProps>(({
  collaborators,
  currentUserId,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorsMap = useRef<Map<string, CursorNode>>(new Map());
  const collaboratorsRef = useRef<Collaborator[]>(collaborators);

  // Keep collaborators ref in sync with prop updates
  useEffect(() => {
    collaboratorsRef.current = collaborators;

    // Prune any cursors for users who have departed
    const activeUserIds = new Set(collaborators.map((c) => c.id));
    for (const [userId, cursorNode] of cursorsMap.current.entries()) {
      if (!activeUserIds.has(userId)) {
        window.clearTimeout(cursorNode.timeoutId);
        cursorNode.el.remove();
        cursorsMap.current.delete(userId);
      }
    }
  }, [collaborators]);

  useImperativeHandle(ref, () => ({
    updateRemoteCursor: (userId: string, x: number, y: number) => {
      // Do not render local user's own cursor
      if (userId === currentUserId) return;

      const container = containerRef.current;
      if (!container) return;

      let cursorNode = cursorsMap.current.get(userId);

      if (!cursorNode) {
        const collaborator = collaboratorsRef.current.find((c) => c.id === userId);
        const name = collaborator?.name || 'Collaborator';
        const color = collaborator?.color || '#4f46e5';

        const el = document.createElement('div');
        el.className = 'absolute top-0 left-0 pointer-events-none will-change-transform';
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        el.style.transition = 'transform 60ms linear, opacity 180ms ease-out';
        el.style.opacity = '1';
        el.style.zIndex = '30';

        // Cursor SVG Icon + Name Tag
        el.innerHTML = `
          <div class="relative flex flex-col items-start select-none">
            <svg class="w-4 h-4 -rotate-12 drop-shadow-sm" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.25));">
              <path d="M5.65 12.37H5.46L5.32 12.5L0.5 16.88V1.2L11.78 12.37H5.65Z" fill="${color}" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>
            </svg>
            <div class="mt-0.5 ml-3.5 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white shadow-xs whitespace-nowrap leading-tight" style="background-color: ${color};">
              ${escapeHtml(name)}
            </div>
          </div>
        `;

        container.appendChild(el);

        // Staleness timer: fade out after 6 seconds of inactivity
        const timeoutId = window.setTimeout(() => {
          el.style.opacity = '0';
        }, 6000);

        cursorNode = { el, timeoutId };
        cursorsMap.current.set(userId, cursorNode);
      } else {
        // Move existing cursor smoothly
        cursorNode.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        cursorNode.el.style.opacity = '1';

        // Reset staleness countdown
        window.clearTimeout(cursorNode.timeoutId);
        cursorNode.timeoutId = window.setTimeout(() => {
          if (cursorNode) {
            cursorNode.el.style.opacity = '0';
          }
        }, 6000);
      }
    },

    removeRemoteCursor: (userId: string) => {
      const cursorNode = cursorsMap.current.get(userId);
      if (cursorNode) {
        window.clearTimeout(cursorNode.timeoutId);
        cursorNode.el.remove();
        cursorsMap.current.delete(userId);
      }
    },

    clearAll: () => {
      for (const [, cursorNode] of cursorsMap.current.entries()) {
        window.clearTimeout(cursorNode.timeoutId);
        cursorNode.el.remove();
      }
      cursorsMap.current.clear();
    },
  }), [currentUserId]);

  // Clean up all timers and DOM elements on unmount
  useEffect(() => {
    const map = cursorsMap.current;
    return () => {
      for (const [, cursorNode] of map.entries()) {
        window.clearTimeout(cursorNode.timeoutId);
        cursorNode.el.remove();
      }
      map.clear();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden z-20"
      aria-hidden="true"
    />
  );
});

CursorOverlay.displayName = 'CursorOverlay';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
