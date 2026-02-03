import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ProviderGateProps = {
  llmKeyInput: string;
  llmKeyError: string | null;
  isSavingKey: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

// Gated UI for entering the provider OAuth token before chatting.
export function ProviderGate({
  llmKeyInput,
  llmKeyError,
  isSavingKey,
  onChange,
  onSubmit,
}: ProviderGateProps) {
  return (
    <div className="h-full flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-2xl border border-border/60 bg-background/80 backdrop-blur-md p-6 shadow-sm"
      >
        <div className="space-y-3 text-center">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
            <Shield className="h-6 w-6 text-accent" />
          </div>
          <h1 className="font-display text-xl text-foreground">Connect your provider</h1>
          <p className="text-sm text-muted-foreground">
            To begin your session, add your Claude Code OAuth token (sk-ant-oat...) to begin
            chatting.
          </p>
        </div>
        <div className="mt-6 space-y-3">
          <Input
            type="password"
            placeholder="sk-ant-oat..."
            value={llmKeyInput}
            onChange={(event) => onChange(event.target.value)}
          />
          {llmKeyError && <p className="text-xs text-destructive">{llmKeyError}</p>}
          <Button
            className="w-full h-11"
            onClick={onSubmit}
            disabled={isSavingKey || llmKeyInput.trim().length === 0}
          >
            {isSavingKey ? 'Verifying...' : 'Verify & Save Token'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
