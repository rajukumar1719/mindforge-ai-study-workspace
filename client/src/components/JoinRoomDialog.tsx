import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './ui/Modal';
import { normalizeRoomId, isValidRoomId } from '../utils/roomId';
import { setUserSession } from '../utils/storage';

interface JoinRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialRoomId?: string;
}

export const JoinRoomDialog: React.FC<JoinRoomDialogProps> = ({
  isOpen,
  onClose,
  initialRoomId = '',
}) => {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [roomId, setRoomId] = useState(initialRoomId);
  const [errors, setErrors] = useState<{ displayName?: string; roomId?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = displayName.trim();
    const normalizedId = normalizeRoomId(roomId);
    const newErrors: { displayName?: string; roomId?: string } = {};

    if (!trimmedName) {
      newErrors.displayName = 'Please enter your name to continue.';
    } else if (trimmedName.length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters.';
    } else if (trimmedName.length > 30) {
      newErrors.displayName = 'Display name must not exceed 30 characters.';
    }

    if (!normalizedId) {
      newErrors.roomId = 'Enter a room code to continue.';
    } else if (!isValidRoomId(normalizedId)) {
      newErrors.roomId = 'Invalid room code format (3–24 alphanumeric characters).';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    setUserSession(trimmedName);
    onClose();
    setIsSubmitting(false);
    navigate(`/room/${normalizedId}`);
  };

  const handleClose = () => {
    setErrors({});
    setDisplayName('');
    setRoomId('');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Join an Existing Room"
      description="Enter the shared room code and your display name to enter the canvas."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="join-display-name"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
          >
            Your Name
          </label>
          <input
            id="join-display-name"
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (errors.displayName) setErrors((prev) => ({ ...prev, displayName: undefined }));
            }}
            placeholder="e.g., Jordan Lee"
            maxLength={30}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:bg-slate-50 disabled:text-slate-500"
            autoComplete="name"
          />
          {errors.displayName && (
            <p role="alert" className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errors.displayName}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="join-room-id"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
          >
            Room Code
          </label>
          <input
            id="join-room-id"
            type="text"
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value.toUpperCase());
              if (errors.roomId) setErrors((prev) => ({ ...prev, roomId: undefined }));
            }}
            placeholder="e.g., ABC7KQ"
            maxLength={24}
            disabled={isSubmitting}
            className="w-full font-mono uppercase tracking-wider rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:bg-slate-50 disabled:text-slate-500"
          />
          {errors.roomId && (
            <p role="alert" className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errors.roomId}
            </p>
          )}
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isSubmitting && (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            <span>{isSubmitting ? 'Joining Room...' : 'Join Room'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
