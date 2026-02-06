'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Sun, Moon, Monitor, X } from 'lucide-react';
import { useTimeOfDay } from '@/components/theme-provider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { getAuthSessionInfo, logout } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { isUnlocked, lockVault } from '@/lib/crypto/key-context';
import { db } from '@/lib/db';
import { createStorageService } from '@/lib/storage/dexie-storage';
import { clearLocalUserId } from '@/lib/storage/user';
import { cn } from '@/lib/utils';
import { Z_INDEX } from '@/lib/z-index';

const sidebarVariants = {
  closed: {
    x: '-100%',
    transition: {
      type: 'tween' as const,
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
    },
  },
  open: {
    x: 0,
    transition: {
      type: 'tween' as const,
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

export function Sidebar() {
  const router = useRouter();
  const storageRef = React.useRef(createStorageService());
  const [open, setOpen] = React.useState(false);
  const [vaultInitialized, setVaultInitialized] = React.useState<boolean | null>(null);
  const [vaultUnlocked, setVaultUnlocked] = React.useState(isUnlocked());
  const [retryDisabledUntil, setRetryDisabledUntil] = React.useState<number | null>(null);
  const [authStatus, setAuthStatus] = React.useState<
    'idle' | 'checking' | 'authed' | 'unauth' | 'error'
  >('idle');
  const [authEmail, setAuthEmail] = React.useState<string | null>(null);
  const isDev = process.env.NODE_ENV === 'development';
  const retryDisabled = retryDisabledUntil ? Date.now() < retryDisabledUntil : false;
  const RETRY_COOLDOWN_MS = 10_000;

  React.useEffect(() => {
    const checkVault = async () => {
      const metadata = await storageRef.current.getVaultMetadata();
      setVaultInitialized(Boolean(metadata?.vault_initialized));
      setVaultUnlocked(isUnlocked());
    };

    checkVault();
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const refreshVaultState = async () => {
      const metadata = await storageRef.current.getVaultMetadata();
      const initialized = Boolean(metadata?.vault_initialized);
      setVaultInitialized(initialized);
      setVaultUnlocked(initialized && isUnlocked());
    };

    refreshVaultState();
  }, [open]);

  const refreshAuthSession = React.useCallback(async () => {
    setAuthStatus('checking');
    try {
      const session = await getAuthSessionInfo();
      setAuthEmail(session.email ?? null);
      setAuthStatus('authed');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setAuthStatus('unauth');
        setAuthEmail(null);
      } else {
        setAuthStatus('error');
      }
    }
  }, []);

  const handleRetryAuthSession = React.useCallback(async () => {
    if (retryDisabled) return;
    setRetryDisabledUntil(Date.now() + RETRY_COOLDOWN_MS);
    await refreshAuthSession();
  }, [refreshAuthSession, retryDisabled]);

  React.useEffect(() => {
    let isActive = true;

    const checkSession = async () => {
      try {
        setAuthStatus('checking');
        const session = await getAuthSessionInfo();
        if (!isActive) return;
        setAuthEmail(session.email ?? null);
        setAuthStatus('authed');
      } catch (error) {
        if (!isActive) return;
        if (error instanceof ApiError && error.status === 401) {
          setAuthStatus('unauth');
          setAuthEmail(null);
        } else {
          setAuthStatus('error');
        }
      }
    };

    void checkSession();

    return () => {
      isActive = false;
    };
  }, []);

  React.useEffect(() => {
    if (!open) return;
    void refreshAuthSession();
  }, [open, refreshAuthSession]);

  // Clears the in-memory key and returns to the unlock screen.
  const handleLock = async () => {
    if (!vaultInitialized || !vaultUnlocked) {
      setOpen(false);
      return;
    }
    await lockVault();
    setOpen(false);
    router.push('/unlock');
  };

  const handleReset = async () => {
    // Dev-only reset: clear vault data + local user id to simulate first run.
    await lockVault();
    await db.delete();
    clearLocalUserId();
    setVaultInitialized(false);
    setVaultUnlocked(false);
    setOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      await lockVault();
      setVaultUnlocked(false);
      setOpen(false);
      router.push('/login');
    }
  };

  return (
    <>
      {/* Menu button */}
      <div className="relative inline-flex items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          className="p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <Menu className="h-7 w-7" strokeWidth={1.75} />
          <span className="sr-only">Open menu</span>
        </button>
        {authStatus === 'authed' && <SignedInIndicator email={authEmail} />}
      </div>

      {/* Overlay for click-to-close */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-[2px]"
            style={{ zIndex: Z_INDEX.sidebarOverlay }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.div
        initial="closed"
        animate={open ? 'open' : 'closed'}
        variants={sidebarVariants}
        style={{ zIndex: Z_INDEX.sidebar }}
        className={cn(
          'fixed inset-y-0 left-0 w-80 bg-background border-r border-border/20',
          'shadow-[4px_0_24px_-2px_rgba(0,0,0,0.1),8px_0_16px_-4px_rgba(0,0,0,0.06)]',
          'dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]',
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4">
            <Link
              href="/"
              className="font-display text-3xl font-light tracking-wide text-foreground hover:text-foreground/90 transition-colors"
            >
              Lumen
            </Link>
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
              {isDev && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive/80 hover:text-destructive hover:bg-destructive/5 hover:border-destructive transition-colors"
                >
                  Reset local data
                </button>
              )}
            </SettingsSection>
          </div>

          {/* Footer */}
          <div className="p-6 pt-4 space-y-5">
            <SettingsSection title="Account">
              <div className="space-y-2">
                {authStatus === 'checking' ? (
                  <p className="text-sm text-foreground/80">Checking session…</p>
                ) : authStatus === 'authed' ? (
                  <div className="flex items-center gap-2 text-sm text-foreground/80">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>{authEmail ?? 'Email unavailable'}</span>
                  </div>
                ) : authStatus === 'error' ? (
                  <div className="space-y-2 text-sm text-foreground/80">
                    <p>Unable to check session.</p>
                    <button
                      type="button"
                      onClick={handleRetryAuthSession}
                      disabled={retryDisabled}
                      className={cn(
                        'inline-flex items-center rounded-md border px-2 py-1 text-xs transition-colors',
                        retryDisabled
                          ? 'border-border/20 text-muted-foreground/50 cursor-not-allowed'
                          : 'border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border',
                      )}
                    >
                      {retryDisabled ? 'Retrying soon…' : 'Retry'}
                    </button>
                  </div>
                ) : null}
              </div>
              {authStatus === 'unauth' && (
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-border/40 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border transition-colors"
                >
                  Log in
                </Link>
              )}
              {authStatus === 'authed' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="w-full rounded-lg border border-border/40 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border transition-colors"
                    >
                      Log out
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Log out of Lumen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You can always sign back in with a magic link.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLogout}>Log out</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </SettingsSection>
            {vaultInitialized && vaultUnlocked && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-border/40 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border transition-colors"
                  >
                    Lock vault
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Lock your vault?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You&apos;ll need to enter your passphrase again to access your conversations.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLock}>Lock vault</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
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

function SignedInIndicator({ email }: { email: string | null }) {
  const initials = getInitialsFromEmail(email);

  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-foreground/80">
      {initials}
    </span>
  );
}

function getInitialsFromEmail(email: string | null) {
  if (!email) return 'U';
  const handle = email.split('@')[0] ?? '';
  const parts = handle.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const letters = parts.length > 0 ? parts : [handle];
  const initials = letters
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('');

  return (initials || 'U').toUpperCase();
}
