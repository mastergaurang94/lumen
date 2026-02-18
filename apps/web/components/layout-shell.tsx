'use client';

import * as React from 'react';
import { Sidebar } from '@/components/sidebar';

interface LayoutShellProps {
  children: React.ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col md:min-h-screen h-[100dvh] max-h-[100dvh] overflow-hidden overscroll-none md:h-auto md:max-h-none md:overflow-visible md:overscroll-auto">
      {/* Floating menu button - top left corner */}
      <div className="fixed top-6 left-6 z-50">
        <Sidebar />
      </div>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain md:overflow-visible md:overscroll-auto">
        {children}
      </main>
    </div>
  );
}
