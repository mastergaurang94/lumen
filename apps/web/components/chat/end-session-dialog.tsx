'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/lib/z-index';

interface EndSessionDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function EndSessionDialog({ onConfirm, onCancel }: EndSessionDialogProps) {
  // Trap focus within dialog
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const cancelButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    // Focus the cancel button on mount
    cancelButtonRef.current?.focus();

    // Handle escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        style={{ zIndex: Z_INDEX.modalBackdrop }}
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <motion.div
        ref={dialogRef}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md"
        style={{ zIndex: Z_INDEX.modal }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg mx-4">
          <h2 id="dialog-title" className="font-display text-xl text-foreground mb-2">
            End this session?
          </h2>
          <p id="dialog-description" className="text-muted-foreground text-sm mb-6">
            Your conversation will be saved locally. Take time to reflect and act on what came up.
          </p>
          <div className="flex gap-3">
            <Button ref={cancelButtonRef} variant="outline" onClick={onCancel} className="flex-1">
              Continue session
            </Button>
            <Button onClick={onConfirm} className="flex-1">
              End session
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
