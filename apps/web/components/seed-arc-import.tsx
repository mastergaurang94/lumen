'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Copy, Check, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StorageService } from '@/lib/storage';
import type { UserArc } from '@/types/storage';

const HELPER_PROMPT = `Based on everything you know about me from our conversations, write a 1-2 page summary of who I am — what I care about, what I'm working through, my key relationships, my values, and what a wise companion should know to truly see me. Write it as prose, not bullet points.`;

const MIN_LENGTH = 50;

type SeedArcImportProps = {
  userId: string;
  storage: StorageService;
};

export function SeedArcImport({ userId, storage }: SeedArcImportProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [text, setText] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [helperOpen, setHelperOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const canSave = text.trim().length >= MIN_LENGTH;

  // Keep refs current for the unmount auto-save effect.
  const textRef = React.useRef(text);
  const savedRef = React.useRef(saved);
  React.useEffect(() => {
    textRef.current = text;
  }, [text]);
  React.useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  const saveArc = React.useCallback(
    async (content: string) => {
      const now = new Date().toISOString();
      const arc: UserArc = {
        user_id: userId,
        arc_markdown: content,
        last_session_number: 0,
        version: 0,
        created_at: now,
        updated_at: now,
      };
      await storage.saveArc(arc);
    },
    [userId, storage],
  );

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await saveArc(text.trim());
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save on unmount (e.g. user clicks "Let's go" without explicitly saving).
  React.useEffect(() => {
    return () => {
      const trimmed = textRef.current.trim();
      if (!savedRef.current && trimmed.length >= MIN_LENGTH) {
        void saveArc(trimmed);
      }
    };
  }, [saveArc]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(HELPER_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text for manual copy
    }
  };

  // Success state
  if (saved) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-accent/5 border border-accent/15 rounded-xl p-5 text-center space-y-2"
      >
        <CheckCircle2 className="h-6 w-6 text-accent mx-auto" />
        <p className="text-sm font-medium text-foreground">
          Saved — Lumen will know you from day one
        </p>
      </motion.div>
    );
  }

  return (
    <div className="bg-muted/50 border border-muted-foreground/10 rounded-xl overflow-hidden text-left">
      {/* Collapsed trigger */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-start gap-3 min-w-0">
          <Sparkles className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-foreground">
            Already talked to another AI? Bring that context here
          </p>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </motion.div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste anything about yourself — a bio, notes, or output from another AI"
                className="w-full min-h-[120px] rounded-lg border border-muted-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent/30 resize-y"
                rows={5}
              />

              {/* Helper prompt section */}
              <div>
                <button
                  onClick={() => setHelperOpen(!helperOpen)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <motion.span
                    animate={{ rotate: helperOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="inline-block"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </motion.span>
                  Not sure what to paste? Ask your other AI this
                </button>
                <AnimatePresence>
                  {helperOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 relative">
                        <div className="bg-background border border-muted-foreground/10 rounded-lg p-3 pr-10 text-xs text-muted-foreground italic leading-relaxed">
                          {HELPER_PROMPT}
                        </div>
                        <button
                          onClick={handleCopy}
                          className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-muted transition-colors"
                          aria-label={copied ? 'Copied' : 'Copy prompt'}
                          title={copied ? 'Copied' : 'Copy prompt'}
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5 text-accent" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Save button */}
              <Button
                onClick={handleSave}
                disabled={!canSave || saving}
                size="sm"
                className="w-full"
              >
                {saving ? 'Saving...' : 'Save context'}
              </Button>
              {text.length > 0 && !canSave && (
                <p className="text-xs text-muted-foreground/60 text-center">
                  A bit more would help — aim for a paragraph or two
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
