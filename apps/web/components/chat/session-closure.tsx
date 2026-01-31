'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatSessionDate } from '@/lib/format';

interface SessionClosureProps {
  sessionDate: Date;
  recognitionMoment: string;
  actionSteps: string[];
}

export function SessionClosure({
  sessionDate,
  recognitionMoment,
  actionSteps,
}: SessionClosureProps) {
  const [showActionSteps, setShowActionSteps] = React.useState(false);

  // Calculate suggested next session (7 days from session date)
  const suggestedNextSession = React.useMemo(() => {
    const date = new Date(sessionDate);
    date.setDate(date.getDate() + 7);
    return date;
  }, [sessionDate]);

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
              Session complete
            </h1>
            <p className="text-muted-foreground">{formatSessionDate(sessionDate)}</p>
          </motion.div>

          {/* Recognition moment - the seed to carry forward */}
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
                  &ldquo;{recognitionMoment}&rdquo;
                </p>
              </blockquote>
            </div>
          </motion.div>

          {/* Next session suggestion */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="flex items-center justify-center gap-2 text-muted-foreground"
          >
            <Calendar className="h-4 w-4" />
            <p className="text-sm">
              Suggested next session:{' '}
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
                  {showActionSteps ? 'Hide' : 'View'} action steps
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
            className="pt-4"
          >
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
