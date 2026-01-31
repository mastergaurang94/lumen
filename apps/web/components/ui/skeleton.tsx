import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

// Pre-built skeleton compositions for common UI patterns

export function SkeletonText({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            // Last line is shorter for natural text appearance
            i === lines - 1 ? 'w-3/4' : 'w-full',
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonMessage({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('space-y-2', isUser ? 'w-2/3' : 'w-4/5')}>
        {isUser ? (
          <Skeleton className="h-12 rounded-2xl" />
        ) : (
          <>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </>
        )}
      </div>
    </div>
  );
}

export function SkeletonChat() {
  return (
    <div className="space-y-6 p-6">
      <SkeletonMessage />
      <SkeletonMessage isUser />
      <SkeletonMessage />
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl bg-muted/50 p-6 space-y-4', className)}>
      <Skeleton className="h-6 w-1/3" />
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Icon placeholder */}
        <div className="flex justify-center">
          <Skeleton className="h-20 w-20 rounded-full" />
        </div>
        {/* Heading */}
        <div className="space-y-3">
          <Skeleton className="h-10 w-2/3 mx-auto" />
          <Skeleton className="h-5 w-1/2 mx-auto" />
        </div>
        {/* Card */}
        <SkeletonCard />
        {/* Button */}
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    </div>
  );
}
