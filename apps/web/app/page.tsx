import { LayoutShell } from "@/components/layout-shell";

export default function HomePage() {
  return (
    <LayoutShell>
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-8 lg:px-12">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-light tracking-tight text-foreground">
              Welcome to Lumen
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Weekly coaching that builds self-trust — not dependence.
            </p>
          </div>

          <div className="pt-4">
            <p className="text-lg text-muted-foreground">
              Set aside about 60 minutes for your session.
            </p>
          </div>
        </div>
      </div>

      <footer className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Your sessions are stored locally and encrypted. We never use your data for training.
        </p>
      </footer>
    </LayoutShell>
  );
}
