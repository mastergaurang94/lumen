'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatSessionDate } from '@/lib/format';
import { trackEvent } from '@/lib/analytics';

interface SessionClosureProps {
  sessionDate: Date;
  partingWords?: string | null;
  actionSteps?: string[];
  isSummaryLoading?: boolean;
}

export function SessionClosure({
  sessionDate,
  partingWords,
  actionSteps = [],
  isSummaryLoading = false,
}: SessionClosureProps) {
  const [showActionSteps, setShowActionSteps] = React.useState(false);
  const [shareStatus, setShareStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [shareMethod, setShareMethod] = React.useState<'share' | 'copy' | null>(null);

  // Calculate suggested next session (7 days from session date)
  const suggestedNextSession = React.useMemo(() => {
    const date = new Date(sessionDate);
    date.setDate(date.getDate() + 7);
    return date;
  }, [sessionDate]);

  const canShare = Boolean(partingWords || actionSteps.length > 0);

  const buildShareText = React.useCallback(() => {
    const lines: string[] = [];
    if (partingWords) {
      lines.push(`“${partingWords}”`);
      lines.push('');
    }
    if (actionSteps.length > 0) {
      lines.push('What came up:');
      for (const step of actionSteps.slice(0, 5)) {
        lines.push(`- ${step}`);
      }
      lines.push('');
    }
    lines.push('Shared from Lumen');
    if (typeof window !== 'undefined') {
      lines.push(window.location.origin);
    }
    return lines.join('\n');
  }, [actionSteps, partingWords]);

  const handleShare = React.useCallback(async () => {
    if (!canShare) return;

    setShareStatus('idle');
    setShareMethod(null);
    const shareText = buildShareText();
    trackEvent('share_reflection_clicked', {
      has_parting_words: Boolean(partingWords),
      action_steps_count: actionSteps.length,
    });

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Lumen reflection',
          text: shareText,
        });
        trackEvent('share_reflection_completed', { method: 'web_share' });
        setShareStatus('success');
        setShareMethod('share');
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        trackEvent('share_reflection_completed', { method: 'copy' });
        setShareStatus('success');
        setShareMethod('copy');
        return;
      }

      throw new Error('Sharing unavailable');
    } catch (error) {
      const errorName = error instanceof DOMException ? error.name : undefined;
      const isCancelled =
        errorName === 'AbortError' ||
        (error instanceof Error && error.message.toLowerCase().includes('abort'));
      if (isCancelled) {
        trackEvent('share_reflection_cancelled', { method: 'web_share' });
        setShareStatus('idle');
        setShareMethod(null);
        return;
      }
      console.error('Share failed', error);
      setShareStatus('error');
    }
  }, [actionSteps.length, buildShareText, canShare, partingWords]);

  return (
    <div className="atmosphere min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-md space-y-10 text-center"
        >
          {/* Completion indicator */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                <Check className="h-7 w-7 text-accent" strokeWidth={2.5} />
              </div>
              {/* Ambient glow */}
              <div className="absolute inset-0 rounded-full bg-accent/5 blur-xl scale-150" />
            </div>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="space-y-2"
          >
            <h1 className="font-display text-3xl font-light tracking-tight text-foreground">
              Until next time
            </h1>
            <p className="text-muted-foreground">{formatSessionDate(sessionDate)}</p>
          </motion.div>

          {/* Parting words - something meaningful to carry forward */}
          {isSummaryLoading && !partingWords && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="py-6"
            >
              <div className="relative">
                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-16 h-px bg-border" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-16 h-px bg-border" />
                <div className="py-6 px-4 flex flex-col items-center gap-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 className="h-5 w-5 text-accent" />
                  </motion.div>
                  <motion.p
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-sm text-muted-foreground"
                  >
                    Wrapping up...
                  </motion.p>
                </div>
              </div>
            </motion.div>
          )}
          {partingWords && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="py-6"
            >
              <div className="relative">
                {/* Subtle divider lines */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-16 h-px bg-border" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-16 h-px bg-border" />

                <blockquote className="py-6 px-4">
                  <p className="font-display text-xl leading-relaxed text-foreground italic">
                    &ldquo;{partingWords}&rdquo;
                  </p>
                </blockquote>
              </div>
            </motion.div>
          )}

          {/* Next session suggestion */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="flex items-center justify-center gap-2 text-muted-foreground"
          >
            <Calendar className="h-4 w-4" />
            <p className="text-sm">
              See you around{' '}
              <span className="text-foreground">{formatSessionDate(suggestedNextSession)}</span>
            </p>
          </motion.div>

          {/* Action steps - collapsible */}
          {actionSteps.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.5 }}
            >
              <button
                onClick={() => setShowActionSteps(!showActionSteps)}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
              >
                <span>
                  {showActionSteps ? 'Hide' : 'View'} what came up
                  {!showActionSteps && ` (${actionSteps.length})`}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    showActionSteps ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {showActionSteps && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <ul className="mt-4 space-y-3 text-left">
                      {actionSteps.map((step, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1, duration: 0.3 }}
                          className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                        >
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-xs text-accent font-medium">
                            {index + 1}
                          </span>
                          <span className="text-sm text-foreground leading-relaxed">{step}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Return home */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="pt-4 space-y-3"
          >
            <div className="space-y-2">
              <Button
                variant="default"
                className="w-full h-12 text-base"
                onClick={handleShare}
                disabled={!canShare}
              >
                Share reflection
              </Button>
              {shareStatus === 'success' && (
                <p className="text-xs text-muted-foreground">
                  {shareMethod === 'copy'
                    ? 'Copied to clipboard.'
                    : 'Shared. Thank you for spreading the word.'}
                </p>
              )}
              {shareStatus === 'error' && (
                <p className="text-xs text-muted-foreground">Could not share. Try again.</p>
              )}
            </div>
            <Link href="/">
              <Button variant="outline" className="w-full h-12 text-base">
                Return home
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
