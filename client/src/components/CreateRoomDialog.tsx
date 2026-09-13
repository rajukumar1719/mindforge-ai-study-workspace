import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './ui/Modal';
import { generateRoomId } from '../utils/roomId';
import { setUserSession } from '../utils/storage';

interface CreateRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateRoomDialog: React.FC<CreateRoomDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = displayName.trim();

    if (!trimmed) {
      setError('Please enter a display name.');
      return;
    }

    if (trimmed.length < 2) {
      setError('Display name must be at least 2 characters.');
      return;
    }

    if (trimmed.length > 30) {
      setError('Display name must not exceed 30 characters.');
      return;
    }

    setError(null);
    setUserSession(trimmed);
    const newRoomId = generateRoomId();

    onClose();
    navigate(`/room/${newRoomId}`);
  };

  const handleClose = () => {
    setError(null);
    setDisplayName('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create a Collaborative Room"
      description="Start a fresh canvas and invite your teammates with a shareable room link."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="create-display-name"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
          >
            Your Name
          </label>
          <input
            id="create-display-name"
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g., Alex Chen"
            maxLength={30}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            autoComplete="name"
          />
          {error && (
            <p role="alert" className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          )}
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Create Room
          </button>
        </div>
      </form>
    </Modal>
  );
};
