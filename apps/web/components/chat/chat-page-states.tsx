import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ChatLoadingState() {
  return (
    <div className="atmosphere min-h-screen flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-6"
      >
        <div className="w-12 h-12 rounded-full border-2 border-accent/30 border-t-accent animate-spin mx-auto" />
        <div className="space-y-2">
          <p className="text-foreground font-medium">Connecting to Lumen</p>
          <p className="text-sm text-muted-foreground">Just a moment...</p>
        </div>
      </motion.div>
    </div>
  );
}

type ChatErrorStateProps = {
  onRetry: () => void;
  isRetrying: boolean;
};

export function ChatErrorState({ onRetry, isRetrying }: ChatErrorStateProps) {
  return (
    <div className="atmosphere min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-6 max-w-md"
      >
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Shield className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="space-y-3">
          <h1 className="font-display text-2xl text-foreground">Connection interrupted</h1>
          <p className="text-muted-foreground">
            We couldn&apos;t establish a secure connection. Your data is safe.
          </p>
        </div>
        <Button onClick={onRetry} disabled={isRetrying} className="h-12 px-8">
          {isRetrying ? 'Reconnecting...' : 'Try again'}
        </Button>
      </motion.div>
    </div>
  );
}
