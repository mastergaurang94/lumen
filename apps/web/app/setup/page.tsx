'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { AuthPageLayout, PrivacyFooter } from '@/components/auth-page-layout';
import { cn } from '@/lib/utils';

type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return 'weak';

  let score = 0;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return 'weak';
  if (score === 2) return 'fair';
  if (score === 3) return 'good';
  return 'strong';
}

// Uses theme-aware colors - accent for positive states, muted for neutral/weak
const strengthConfig: Record<PasswordStrength, { label: string; color: string; width: string }> = {
  weak: { label: 'Weak', color: 'bg-muted-foreground/40', width: 'w-1/4' },
  fair: { label: 'Fair', color: 'bg-muted-foreground/60', width: 'w-2/4' },
  good: { label: 'Good', color: 'bg-accent/80', width: 'w-3/4' },
  strong: { label: 'Strong', color: 'bg-accent', width: 'w-full' },
};

export default function SetupPage() {
  const router = useRouter();
  const [passphrase, setPassphrase] = React.useState('');
  const [confirmPassphrase, setConfirmPassphrase] = React.useState('');
  const [showPassphrase, setShowPassphrase] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [touched, setTouched] = React.useState({ passphrase: false, confirm: false });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const strength = getPasswordStrength(passphrase);
  const strengthInfo = strengthConfig[strength];

  const hasPassphrase = passphrase.length > 0;
  const hasConfirm = confirmPassphrase.length > 0;
  const passwordsMatch = passphrase === confirmPassphrase;
  const isMinLength = passphrase.length >= 8;

  const showMismatchError = touched.confirm && hasConfirm && !passwordsMatch;
  const canSubmit = hasPassphrase && hasConfirm && passwordsMatch && isMinLength && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);

    // Simulate encryption setup (in future, this will derive key and setup storage)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Navigate to session page
    router.push('/session');
  };

  return (
    <AuthPageLayout
      backHref="/login"
      footer={
        <PrivacyFooter>
          Your passphrase encrypts your data locally.
          <br />
          It never leaves your device.
        </PrivacyFooter>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-sm space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-accent" />
            </div>
          </div>
          <h1 className="font-display text-4xl font-light tracking-tight text-foreground">
            Secure your data
          </h1>
          <p className="text-muted-foreground">Create a passphrase to encrypt your sessions</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Passphrase input */}
          <div className="space-y-3">
            <label htmlFor="passphrase" className="text-sm text-foreground/80 block">
              Passphrase
            </label>
            <div className="relative">
              <Input
                id="passphrase"
                type={showPassphrase ? 'text' : 'password'}
                placeholder="Enter a passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, passphrase: true }))}
                disabled={isSubmitting}
                className="pr-10"
                autoComplete="new-password"
                aria-describedby={hasPassphrase ? 'passphrase-strength' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                disabled={isSubmitting}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
              >
                {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Strength indicator */}
            {hasPassphrase && (
              <div className="space-y-1.5 pt-1" id="passphrase-strength">
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={false}
                    animate={{
                      width:
                        strengthInfo.width === 'w-full'
                          ? '100%'
                          : strengthInfo.width === 'w-3/4'
                            ? '75%'
                            : strengthInfo.width === 'w-2/4'
                              ? '50%'
                              : '25%',
                    }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={cn(
                      'h-full rounded-full transition-colors duration-300',
                      strengthInfo.color,
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Strength: <span className="text-foreground">{strengthInfo.label}</span>
                  {!isMinLength && ' · Minimum 8 characters'}
                </p>
              </div>
            )}
          </div>

          {/* Confirm passphrase input */}
          <div className="space-y-3">
            <label htmlFor="confirm" className="text-sm text-foreground/80 block">
              Confirm passphrase
            </label>
            <div className="relative">
              <Input
                id="confirm"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm your passphrase"
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                disabled={isSubmitting}
                className={cn(
                  'pr-10',
                  showMismatchError && 'border-destructive focus:ring-destructive',
                )}
                autoComplete="new-password"
                aria-invalid={showMismatchError}
                aria-describedby={showMismatchError ? 'confirm-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                disabled={isSubmitting}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                aria-label={
                  showConfirm ? 'Hide confirmation passphrase' : 'Show confirmation passphrase'
                }
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {showMismatchError && (
              <p id="confirm-error" className="text-xs text-destructive" role="alert">
                Passphrases don&apos;t match
              </p>
            )}
          </div>

          {/* Warning */}
          <div className="flex gap-3 p-4 rounded-lg bg-accent/10 border border-accent/20">
            <AlertTriangle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                This passphrase cannot be recovered
              </p>
              <p className="text-sm text-muted-foreground">
                If you forget it, your session history will be permanently inaccessible. We cannot
                reset it for you.
              </p>
            </div>
          </div>

          {/* Submit button */}
          <Button type="submit" disabled={!canSubmit} className="w-full h-12 text-base">
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Spinner size="md" />
                <span>Setting up...</span>
              </span>
            ) : (
              'Continue'
            )}
          </Button>
        </form>
      </motion.div>
    </AuthPageLayout>
  );
}
