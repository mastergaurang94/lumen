import Link from 'next/link';
import { LayoutShell } from '@/components/layout-shell';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <LayoutShell>
      <div className="atmosphere flex-1 flex flex-col items-center justify-center px-6 sm:px-8 lg:px-12">
        <div className="relative z-10 max-w-2xl w-full text-center space-y-10">
          {/* Main heading with display font */}
          <div className="space-y-5 opacity-0 animate-fade-in-up">
            <h1 className="font-display text-5xl sm:text-6xl font-light tracking-tight text-foreground">
              Welcome to Lumen
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed font-light">
              Good conversation lives here.
            </p>
          </div>

          {/* Subtle divider */}
          <div className="opacity-0 animate-fade-in animation-delay-200">
            <div className="mx-auto w-16 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          {/* Session prompt and CTA */}
          <div className="space-y-6 opacity-0 animate-fade-in-up animation-delay-300">
            <p className="text-lg text-muted-foreground/80">Got your tea?</p>
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link href="/login">Get started</Link>
            </Button>
          </div>
        </div>
      </div>

      <footer className="relative z-10 py-10 text-center opacity-0 animate-fade-in animation-delay-500">
        <p className="text-sm text-muted-foreground/70 max-w-md mx-auto leading-relaxed">
          Your sessions are stored locally and encrypted.
          <br />
          We never use your data for training.
        </p>
      </footer>
    </LayoutShell>
  );
}
