'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

type TimeOfDay = 'morning' | 'afternoon' | 'evening';
type PalettePreference = TimeOfDay | 'auto';

const PALETTE_STORAGE_KEY = 'lumen-palette-preference';

interface ThemeContextValue {
  timeOfDay: TimeOfDay;
  setTimeOfDay: (time: PalettePreference) => void;
  isAutoTime: boolean;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();

  // Morning: 5:00 AM – 11:59 AM
  if (hour >= 5 && hour < 12) {
    return 'morning';
  }
  // Afternoon: 12:00 PM – 5:59 PM
  if (hour >= 12 && hour < 18) {
    return 'afternoon';
  }
  // Evening: 6:00 PM – 4:59 AM
  return 'evening';
}

function applyTimeOfDayClass(time: TimeOfDay) {
  const html = document.documentElement;
  html.classList.remove('theme-morning', 'theme-afternoon', 'theme-evening');
  html.classList.add(`theme-${time}`);
}

function loadPalettePreference(): PalettePreference {
  if (typeof window === 'undefined') return 'auto';
  try {
    const stored = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (stored === 'morning' || stored === 'afternoon' || stored === 'evening' || stored === 'auto') {
      return stored;
    }
  } catch {
    // localStorage not available
  }
  return 'auto';
}

function savePalettePreference(preference: PalettePreference) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, preference);
  } catch {
    // localStorage not available
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [timeOfDay, setTimeOfDayState] = React.useState<TimeOfDay>('afternoon');
  const [isAutoTime, setIsAutoTime] = React.useState(true);
  const [mounted, setMounted] = React.useState(false);

  // Initialize on mount - load persisted preference
  React.useEffect(() => {
    setMounted(true);
    const preference = loadPalettePreference();

    if (preference === 'auto') {
      setIsAutoTime(true);
      const currentTime = getTimeOfDay();
      setTimeOfDayState(currentTime);
      applyTimeOfDayClass(currentTime);
    } else {
      setIsAutoTime(false);
      setTimeOfDayState(preference);
      applyTimeOfDayClass(preference);
    }
  }, []);

  // Update time every minute if auto
  React.useEffect(() => {
    if (!mounted || !isAutoTime) return;

    const interval = setInterval(() => {
      const newTime = getTimeOfDay();
      setTimeOfDayState(newTime);
      applyTimeOfDayClass(newTime);
    }, 60000);

    return () => clearInterval(interval);
  }, [isAutoTime, mounted]);

  // Apply class when timeOfDay changes (for manual selection)
  React.useEffect(() => {
    if (!mounted) return;
    applyTimeOfDayClass(timeOfDay);
  }, [timeOfDay, mounted]);

  const setTimeOfDay = React.useCallback((time: PalettePreference) => {
    // Persist the preference
    savePalettePreference(time);

    if (time === 'auto') {
      setIsAutoTime(true);
      const currentTime = getTimeOfDay();
      setTimeOfDayState(currentTime);
      applyTimeOfDayClass(currentTime);
    } else {
      setIsAutoTime(false);
      setTimeOfDayState(time);
      applyTimeOfDayClass(time);
    }
  }, []);

  const value = React.useMemo(
    () => ({
      timeOfDay,
      setTimeOfDay,
      isAutoTime,
    }),
    [timeOfDay, setTimeOfDay, isAutoTime],
  );

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    </NextThemesProvider>
  );
}

export function useTimeOfDay() {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTimeOfDay must be used within a ThemeProvider');
  }
  return context;
}
