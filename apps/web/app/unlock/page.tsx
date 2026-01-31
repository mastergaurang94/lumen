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
import { deriveKey } from '@/lib/crypto';
import { isUnlocked, setKey } from '@/lib/crypto/key-context';
import { createStorageService } from '@/lib/storage/dexie-storage';
import { verifyKeyCheck } from '@/lib/storage/metadata';

export default function UnlockPage() {
  const router = useRouter();
  const storageRef = React.useRef(createStorageService());
  const [passphrase, setPassphrase] = React.useState('');
  const [showPassphrase, setShowPassphrase] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [isCheckingVault, setIsCheckingVault] = React.useState(true);

  React.useEffect(() => {
    // Ensure vault exists before showing unlock UI.
    const checkVault = async () => {
      const metadata = await storageRef.current.getVaultMetadata();
      if (!metadata?.vault_initialized) {
        router.replace('/setup');
        return;
      }
      if (isUnlocked()) {
        router.replace('/session');
        return;
      }
      setIsCheckingVault(false);
    };

    checkVault();
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passphrase || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      const metadata = await storageRef.current.getVaultMetadata();
      if (!metadata?.vault_initialized || !metadata.key_check) {
        router.replace('/setup');
        return;
      }

      // Verify passphrase by decrypting the key check sentinel.
      const key = await deriveKey(passphrase, metadata.salt, metadata.kdf_iterations);
      const isValid = await verifyKeyCheck(key, metadata.key_check);
      if (!isValid) {
        setError('Incorrect passphrase. Try again.');
        setIsSubmitting(false);
        return;
      }

      setKey(key);
      router.push('/session');
    } catch (unlockError) {
      console.error('Failed to unlock vault', unlockError);
      setError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isCheckingVault) {
    return (
      <AuthPageLayout showBack={false}>
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout
      showBack={false}
      backHref="/login"
      footer={
        <PrivacyFooter>
          Your passphrase unlocks your data locally.
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
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-accent" />
            </div>
          </div>
          <h1 className="font-display text-4xl font-light tracking-tight text-foreground">
            Unlock your vault
          </h1>
          <p className="text-muted-foreground">Enter your passphrase to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <label htmlFor="passphrase" className="text-sm text-foreground/80 block">
              Passphrase
            </label>
            <div className="relative">
              <Input
                id="passphrase"
                type={showPassphrase ? 'text' : 'password'}
                placeholder="Enter your passphrase"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                disabled={isSubmitting}
                className={cn(
                  'pr-10',
                  error && 'border-destructive focus-visible:ring-destructive',
                )}
                autoComplete="current-password"
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
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="flex gap-3 p-4 rounded-lg bg-accent/10 border border-accent/20">
            <AlertTriangle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Forgot your passphrase?</p>
              <p className="text-sm text-muted-foreground">
                It cannot be recovered. Losing it means losing access to your local session history.
              </p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!passphrase || isSubmitting}
            className="w-full h-12 text-base"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Spinner size="md" />
                <span>Unlocking...</span>
              </span>
            ) : (
              'Unlock'
            )}
          </Button>
          <p className="text-xs text-muted-foreground/70 text-center">
            Forgot your passphrase? It can&apos;t be recovered yet.
          </p>
        </form>
      </motion.div>
    </AuthPageLayout>
  );
}
