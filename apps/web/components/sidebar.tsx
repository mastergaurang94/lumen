'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Sun, Moon, Monitor, X } from 'lucide-react';
import { useTimeOfDay } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

const sidebarVariants = {
  closed: {
    x: '-100%',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 40,
    },
  },
  open: {
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 40,
    },
  },
};

export function Sidebar() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* Menu button */}
      <button
        onClick={() => setOpen(true)}
        className="p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        <Menu className="h-7 w-7" strokeWidth={1.75} />
        <span className="sr-only">Open menu</span>
      </button>

      {/* Invisible overlay for click-to-close */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.div
        initial="closed"
        animate={open ? 'open' : 'closed'}
        variants={sidebarVariants}
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-80 bg-background border-r border-border/20',
          'shadow-[4px_0_24px_-2px_rgba(0,0,0,0.1),8px_0_16px_-4px_rgba(0,0,0,0.06)]',
          'dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]',
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4">
            <span className="font-display text-3xl font-light tracking-wide text-foreground">
              Lumen
            </span>
            <button
              onClick={() => setOpen(false)}
              className="p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 px-6 py-4 space-y-8">
            <SettingsSection title="Appearance">
              <AppearanceOptions />
              <PaletteOptions />
            </SettingsSection>
          </div>

          {/* Footer */}
          <div className="p-6 pt-4">
            <p className="text-sm text-muted-foreground/50 leading-relaxed">
              Your data stays on your device.
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </h2>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function AppearanceOptions() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const options = [
    { value: 'system', label: 'Auto', icon: Monitor },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm text-foreground/80">Theme</h3>
      <div className="flex gap-2">
        {options.map((option) => (
          <OptionButton
            key={option.value}
            active={theme === option.value}
            onClick={() => setTheme(option.value)}
            icon={<option.icon className="h-4 w-4" strokeWidth={1.5} />}
            label={option.label}
          />
        ))}
      </div>
    </div>
  );
}

function PaletteOptions() {
  const { timeOfDay, setTimeOfDay, isAutoTime } = useTimeOfDay();

  const options = [
    { value: 'auto' as const, label: 'Auto' },
    { value: 'morning' as const, label: 'Dawn' },
    { value: 'afternoon' as const, label: 'Day' },
    { value: 'evening' as const, label: 'Dusk' },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm text-foreground/80">Palette</h3>
      <div className="grid grid-cols-4 gap-2">
        {options.map((option) => {
          const isActive =
            option.value === 'auto' ? isAutoTime : !isAutoTime && timeOfDay === option.value;

          // For auto, show current time's colors
          const swatchPalette = option.value === 'auto' ? timeOfDay : option.value;

          return (
            <PaletteButton
              key={option.value}
              active={isActive}
              onClick={() => setTimeOfDay(option.value)}
              label={option.label}
              swatchClass={`swatch-${swatchPalette}`}
              isAuto={option.value === 'auto'}
            />
          );
        })}
      </div>
    </div>
  );
}

interface OptionButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function OptionButton({ active, onClick, icon, label }: OptionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200',
        active
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

interface PaletteButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  swatchClass: string;
  isAuto: boolean;
}

function PaletteButton({ active, onClick, label, swatchClass, isAuto }: PaletteButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 p-3 rounded-lg text-sm transition-all duration-300',
        active
          ? 'bg-muted ring-2 ring-accent/50 ring-offset-1 ring-offset-background'
          : 'hover:bg-muted/50',
      )}
    >
      {/* Color swatch - uses CSS variables from swatch-* classes */}
      <div
        className={cn(
          'w-10 h-10 rounded-full transition-transform duration-300 relative overflow-hidden bg-[var(--swatch-bg)]',
          swatchClass,
          active && 'scale-110',
        )}
      >
        {/* Accent dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              'rounded-full transition-all duration-300 bg-[var(--swatch-accent)]',
              isAuto ? 'w-4 h-4' : 'w-5 h-5',
            )}
          />
        </div>
        {/* Auto indicator - dashed ring */}
        {isAuto && (
          <div className="absolute inset-1 rounded-full border border-dashed border-[var(--swatch-accent)] opacity-40" />
        )}
      </div>
      <span
        className={cn(
          'text-xs transition-colors duration-200',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
    </button>
  );
}
