import React, { useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';

interface ClearConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ClearConfirmDialog: React.FC<ClearConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus the cancel or confirm button on mount
      confirmBtnRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Clear this canvas?"
      description="All drawings will be removed from this local canvas."
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          This action can also be reverted using Undo (<kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200 text-slate-700">Ctrl+Z</kbd>).
        </p>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
          >
            Clear Canvas
          </button>
        </div>
      </div>
    </Modal>
  );
};
