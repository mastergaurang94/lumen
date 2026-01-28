"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Menu,
  Sun,
  Moon,
  Monitor,
  Sunrise,
  CloudSun,
  Sunset,
  Clock,
  X,
} from "lucide-react";
import { useTimeOfDay } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* Menu button */}
      <button
        onClick={() => setOpen(true)}
        className="p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Menu className="h-7 w-7" strokeWidth={2} />
        <span className="sr-only">Open menu</span>
      </button>

      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/10 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar panel */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 bg-background border-r border-border/50 shadow-xl",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6">
            <span className="text-3xl font-light tracking-wide text-foreground">
              Lumen
            </span>
            <button
              onClick={() => setOpen(false)}
              className="p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-6 w-6" strokeWidth={1.5} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 px-6 py-4 space-y-8">
            <SettingsSection title="Appearance">
              <AppearanceOptions />
              <PaletteOptions />
            </SettingsSection>
          </div>

          {/* Footer */}
          <div className="p-6">
            <p className="text-sm text-muted-foreground/60 leading-relaxed">
              Your data stays on your device.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function SettingsSection({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-base font-medium text-foreground">{title}</h2>
      <div className="space-y-4">
        {children}
      </div>
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
    { value: "system", label: "Auto", icon: Monitor },
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-sm text-muted-foreground">Theme</h3>
      <div className="flex gap-1 flex-wrap">
        {options.map((option) => (
          <OptionButton
            key={option.value}
            active={theme === option.value}
            onClick={() => setTheme(option.value)}
            icon={<option.icon className="h-5 w-5" />}
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
    { value: "auto" as const, label: "Auto", icon: Clock, color: null },
    { value: "morning" as const, label: "Dawn", icon: Sunrise, color: "hsl(200, 30%, 58%)" },
    { value: "afternoon" as const, label: "Day", icon: CloudSun, color: "hsl(135, 18%, 55%)" },
    { value: "evening" as const, label: "Dusk", icon: Sunset, color: "hsl(28, 50%, 59%)" },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-sm text-muted-foreground">Palette</h3>
      <div className="flex gap-1 flex-wrap">
        {options.map((option) => {
          const isActive =
            option.value === "auto"
              ? isAutoTime
              : !isAutoTime && timeOfDay === option.value;
          return (
            <PaletteButton
              key={option.value}
              active={isActive}
              onClick={() => setTimeOfDay(option.value)}
              icon={<option.icon className="h-5 w-5" />}
              label={option.label}
              color={option.color}
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
        "flex flex-col items-center gap-1.5 px-4 py-3 rounded-md text-sm transition-colors min-w-0",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
  icon: React.ReactNode;
  label: string;
  color: string | null;
}

function PaletteButton({ active, onClick, icon, label, color }: PaletteButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 px-4 py-3 rounded-md text-sm transition-colors min-w-0",
        !active && "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
      style={active ? {
        backgroundColor: color || 'hsl(var(--muted))',
        color: color ? 'white' : 'hsl(var(--foreground))'
      } : undefined}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
