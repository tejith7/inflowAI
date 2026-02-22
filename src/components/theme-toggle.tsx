'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" disabled>
                <Sun className="h-4 w-4" />
            </Button>
        );
    }

    const isDark = theme === 'dark';

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full transition-all duration-300 hover:bg-secondary"
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                    >
                        {isDark ? (
                            <Sun className="h-4 w-4 transition-transform duration-300 rotate-0 scale-100" />
                        ) : (
                            <Moon className="h-4 w-4 transition-transform duration-300 rotate-0 scale-100" />
                        )}
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p>Switch to {isDark ? 'light' : 'dark'} mode</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
