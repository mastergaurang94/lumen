"use client";

import * as React from "react";
import { Sidebar } from "@/components/sidebar";

interface LayoutShellProps {
  children: React.ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Floating menu button - top left corner */}
      <div className="fixed top-6 left-6 z-50">
        <Sidebar />
      </div>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
