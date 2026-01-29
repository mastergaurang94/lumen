'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, Sunrise, CloudSun, Sunset, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { useTimeOfDay } from '@/components/theme-provider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { timeOfDay, setTimeOfDay, isAutoTime } = useTimeOfDay();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const timeIcon = {
    morning: <Sunrise className="h-4 w-4" />,
    afternoon: <CloudSun className="h-4 w-4" />,
    evening: <Sunset className="h-4 w-4" />,
  }[timeOfDay];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          {timeIcon}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun className="mr-2 h-4 w-4" />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="mr-2 h-4 w-4" />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="mr-2 h-4 w-4" />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Time of Day</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuRadioGroup
          value={isAutoTime ? 'auto' : timeOfDay}
          onValueChange={(value) =>
            setTimeOfDay(value as 'auto' | 'morning' | 'afternoon' | 'evening')
          }
        >
          <DropdownMenuRadioItem value="auto">
            <Clock className="mr-2 h-4 w-4" />
            Auto
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="morning">
            <Sunrise className="mr-2 h-4 w-4" />
            Morning
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="afternoon">
            <CloudSun className="mr-2 h-4 w-4" />
            Afternoon
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="evening">
            <Sunset className="mr-2 h-4 w-4" />
            Evening
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
