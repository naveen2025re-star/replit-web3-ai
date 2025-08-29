import React, { useEffect, useState, ReactNode } from 'react';
import { ThemeContext, ThemeVariant, THEME_CONFIGS, useAdaptiveTheme } from '@/hooks/useTheme';

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeVariant;
}

export function ThemeProvider({ children, defaultTheme = 'security' }: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeVariant>(() => {
    // Try to load theme from localStorage
    const saved = localStorage.getItem('chameleon-theme');
    return (saved as ThemeVariant) || defaultTheme;
  });

  const adaptiveTheme = useAdaptiveTheme();

  // Determine the actual theme to use
  const effectiveTheme = currentTheme === 'adaptive' ? adaptiveTheme : currentTheme;
  const themeConfig = THEME_CONFIGS[effectiveTheme];

  // Apply theme CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const config = THEME_CONFIGS[effectiveTheme];
    
    // Apply color variables
    root.style.setProperty('--primary', config.colors.primary);
    root.style.setProperty('--secondary', config.colors.secondary);
    root.style.setProperty('--accent', config.colors.accent);
    root.style.setProperty('--background', config.colors.background);
    root.style.setProperty('--surface', config.colors.surface);
    root.style.setProperty('--text', config.colors.text);
    root.style.setProperty('--muted', config.colors.muted);

    // Apply to card and other semantic colors
    root.style.setProperty('--card', config.colors.surface);
    root.style.setProperty('--card-foreground', config.colors.text);
    root.style.setProperty('--popover', config.colors.surface);
    root.style.setProperty('--popover-foreground', config.colors.text);
    root.style.setProperty('--primary', config.colors.primary);
    root.style.setProperty('--primary-foreground', config.colors.background);
    root.style.setProperty('--secondary', config.colors.secondary);
    root.style.setProperty('--secondary-foreground', config.colors.text);
    root.style.setProperty('--muted', config.colors.secondary);
    root.style.setProperty('--muted-foreground', config.colors.muted);
    root.style.setProperty('--accent', config.colors.accent);
    root.style.setProperty('--accent-foreground', config.colors.text);
    root.style.setProperty('--border', config.colors.secondary);
    root.style.setProperty('--input', config.colors.secondary);
    root.style.setProperty('--ring', config.colors.accent);

    // Apply gradients as custom properties
    root.style.setProperty('--gradient-primary', config.gradients.primary);
    root.style.setProperty('--gradient-hero', config.gradients.hero);
    root.style.setProperty('--gradient-sidebar', config.gradients.sidebar);

    // Apply sidebar colors
    root.style.setProperty('--sidebar', config.colors.surface);
    root.style.setProperty('--sidebar-foreground', config.colors.text);
    root.style.setProperty('--sidebar-primary', config.colors.primary);
    root.style.setProperty('--sidebar-primary-foreground', config.colors.background);
    root.style.setProperty('--sidebar-accent', config.colors.secondary);
    root.style.setProperty('--sidebar-accent-foreground', config.colors.text);
    root.style.setProperty('--sidebar-border', config.colors.secondary);
    root.style.setProperty('--sidebar-ring', config.colors.accent);
    
    // Add theme class for conditional styling
    root.className = root.className.replace(/theme-\w+/g, '') + ` theme-${effectiveTheme}`;
    
    // Add smooth transition for theme changes
    if (!root.style.transition.includes('color')) {
      root.style.transition = 'color 0.3s ease, background-color 0.3s ease, border-color 0.3s ease';
    }
  }, [effectiveTheme]);

  const setTheme = (theme: ThemeVariant) => {
    setCurrentTheme(theme);
    localStorage.setItem('chameleon-theme', theme);
  };

  // Context for adaptive theming
  const getTimeOfDay = (): 'morning' | 'day' | 'evening' | 'night' => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'day';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  };

  const contextValue = {
    currentTheme,
    themeConfig,
    setTheme,
    isAdaptive: currentTheme === 'adaptive',
    adaptiveContext: {
      timeOfDay: getTimeOfDay(),
      userActivity: 'active' as const,
    }
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}