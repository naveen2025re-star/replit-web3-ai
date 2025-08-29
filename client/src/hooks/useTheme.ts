import { createContext, useContext, useEffect, useState } from "react";

export type ThemeVariant = 
  | "security"    // Dark blue/purple - current default
  | "nature"      // Green/earth tones
  | "ocean"       // Blue/cyan tones
  | "sunset"      // Orange/pink/purple gradients
  | "cyber"       // Neon green/purple matrix style
  | "minimal"     // Clean white/gray
  | "adaptive";   // Smart context-aware theming

export interface ThemeConfig {
  name: string;
  description: string;
  emoji: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
  };
  gradients: {
    primary: string;
    hero: string;
    sidebar: string;
  };
}

export const THEME_CONFIGS: Record<ThemeVariant, ThemeConfig> = {
  security: {
    name: "Security Pro",
    description: "Professional dark theme optimized for security analysis",
    emoji: "🛡️",
    colors: {
      primary: "hsl(217, 91%, 60%)",
      secondary: "hsl(217, 32%, 17%)",
      accent: "hsl(224, 71%, 4%)",
      background: "hsl(222, 84%, 5%)",
      surface: "hsl(222, 47%, 11%)",
      text: "hsl(210, 40%, 98%)",
      muted: "hsl(215, 20%, 65%)"
    },
    gradients: {
      primary: "linear-gradient(135deg, hsl(217, 91%, 60%), hsl(224, 71%, 4%))",
      hero: "linear-gradient(135deg, hsl(222, 84%, 5%), hsl(217, 32%, 17%))",
      sidebar: "linear-gradient(180deg, hsl(222, 47%, 11%), hsl(222, 84%, 5%))"
    }
  },
  nature: {
    name: "Forest Guardian",
    description: "Earthy greens inspired by forest canopies",
    emoji: "🌲",
    colors: {
      primary: "hsl(142, 71%, 45%)",
      secondary: "hsl(120, 25%, 15%)",
      accent: "hsl(88, 50%, 35%)",
      background: "hsl(120, 25%, 8%)",
      surface: "hsl(120, 25%, 12%)",
      text: "hsl(120, 15%, 90%)",
      muted: "hsl(120, 15%, 65%)"
    },
    gradients: {
      primary: "linear-gradient(135deg, hsl(142, 71%, 45%), hsl(88, 50%, 35%))",
      hero: "linear-gradient(135deg, hsl(120, 25%, 8%), hsl(120, 25%, 15%))",
      sidebar: "linear-gradient(180deg, hsl(120, 25%, 12%), hsl(120, 25%, 8%))"
    }
  },
  ocean: {
    name: "Deep Ocean",
    description: "Calming blues of ocean depths",
    emoji: "🌊",
    colors: {
      primary: "hsl(195, 85%, 55%)",
      secondary: "hsl(210, 50%, 15%)",
      accent: "hsl(195, 75%, 35%)",
      background: "hsl(210, 50%, 6%)",
      surface: "hsl(210, 50%, 10%)",
      text: "hsl(195, 25%, 92%)",
      muted: "hsl(195, 25%, 68%)"
    },
    gradients: {
      primary: "linear-gradient(135deg, hsl(195, 85%, 55%), hsl(195, 75%, 35%))",
      hero: "linear-gradient(135deg, hsl(210, 50%, 6%), hsl(210, 50%, 15%))",
      sidebar: "linear-gradient(180deg, hsl(210, 50%, 10%), hsl(210, 50%, 6%))"
    }
  },
  sunset: {
    name: "Sunset Glow",
    description: "Warm oranges and purples of twilight",
    emoji: "🌅",
    colors: {
      primary: "hsl(25, 95%, 58%)",
      secondary: "hsl(320, 25%, 15%)",
      accent: "hsl(280, 60%, 45%)",
      background: "hsl(320, 25%, 6%)",
      surface: "hsl(320, 25%, 10%)",
      text: "hsl(25, 25%, 92%)",
      muted: "hsl(25, 25%, 68%)"
    },
    gradients: {
      primary: "linear-gradient(135deg, hsl(25, 95%, 58%), hsl(280, 60%, 45%))",
      hero: "linear-gradient(135deg, hsl(320, 25%, 6%), hsl(25, 25%, 15%))",
      sidebar: "linear-gradient(180deg, hsl(320, 25%, 10%), hsl(320, 25%, 6%))"
    }
  },
  cyber: {
    name: "Cyber Matrix",
    description: "Electric neon greens with matrix vibes",
    emoji: "💚",
    colors: {
      primary: "hsl(120, 100%, 50%)",
      secondary: "hsl(120, 100%, 10%)",
      accent: "hsl(300, 100%, 50%)",
      background: "hsl(120, 100%, 2%)",
      surface: "hsl(120, 100%, 5%)",
      text: "hsl(120, 100%, 85%)",
      muted: "hsl(120, 50%, 60%)"
    },
    gradients: {
      primary: "linear-gradient(135deg, hsl(120, 100%, 50%), hsl(300, 100%, 50%))",
      hero: "linear-gradient(135deg, hsl(120, 100%, 2%), hsl(120, 100%, 10%))",
      sidebar: "linear-gradient(180deg, hsl(120, 100%, 5%), hsl(120, 100%, 2%))"
    }
  },
  minimal: {
    name: "Clean Minimal",
    description: "Clean light theme for focused work",
    emoji: "🤍",
    colors: {
      primary: "hsl(210, 100%, 45%)",
      secondary: "hsl(210, 15%, 85%)",
      accent: "hsl(210, 100%, 35%)",
      background: "hsl(0, 0%, 98%)",
      surface: "hsl(0, 0%, 100%)",
      text: "hsl(210, 15%, 15%)",
      muted: "hsl(210, 15%, 45%)"
    },
    gradients: {
      primary: "linear-gradient(135deg, hsl(210, 100%, 45%), hsl(210, 100%, 35%))",
      hero: "linear-gradient(135deg, hsl(0, 0%, 98%), hsl(210, 15%, 85%))",
      sidebar: "linear-gradient(180deg, hsl(0, 0%, 100%), hsl(0, 0%, 98%))"
    }
  },
  adaptive: {
    name: "Adaptive Chameleon",
    description: "Smart theme that adapts to context and time",
    emoji: "🦎",
    colors: {
      primary: "hsl(217, 91%, 60%)",
      secondary: "hsl(217, 32%, 17%)",
      accent: "hsl(224, 71%, 4%)",
      background: "hsl(222, 84%, 5%)",
      surface: "hsl(222, 47%, 11%)",
      text: "hsl(210, 40%, 98%)",
      muted: "hsl(215, 20%, 65%)"
    },
    gradients: {
      primary: "linear-gradient(135deg, hsl(217, 91%, 60%), hsl(224, 71%, 4%))",
      hero: "linear-gradient(135deg, hsl(222, 84%, 5%), hsl(217, 32%, 17%))",
      sidebar: "linear-gradient(180deg, hsl(222, 47%, 11%), hsl(222, 84%, 5%))"
    }
  }
};

export interface ThemeContextType {
  currentTheme: ThemeVariant;
  themeConfig: ThemeConfig;
  setTheme: (theme: ThemeVariant) => void;
  isAdaptive: boolean;
  adaptiveContext: {
    timeOfDay: 'morning' | 'day' | 'evening' | 'night';
    auditSeverity?: 'low' | 'medium' | 'high' | 'critical';
    userActivity: 'idle' | 'active' | 'focused';
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function useAdaptiveTheme(context?: Partial<ThemeContextType['adaptiveContext']>) {
  const [adaptiveTheme, setAdaptiveTheme] = useState<ThemeVariant>('security');
  
  useEffect(() => {
    // Time-based adaptation
    const hour = new Date().getHours();
    let timeBasedTheme: ThemeVariant = 'security';
    
    if (hour >= 6 && hour < 12) {
      timeBasedTheme = 'minimal'; // Morning - clean and bright
    } else if (hour >= 12 && hour < 17) {
      timeBasedTheme = 'ocean'; // Afternoon - calm and focused
    } else if (hour >= 17 && hour < 21) {
      timeBasedTheme = 'sunset'; // Evening - warm and relaxing
    } else {
      timeBasedTheme = 'security'; // Night - dark and professional
    }
    
    // Context-based adaptation
    if (context?.auditSeverity) {
      switch (context.auditSeverity) {
        case 'critical':
          timeBasedTheme = 'cyber'; // High alert
          break;
        case 'high':
          timeBasedTheme = 'sunset'; // Warning colors
          break;
        case 'medium':
          timeBasedTheme = 'ocean'; // Moderate attention
          break;
        case 'low':
          timeBasedTheme = 'nature'; // Safe and calm
          break;
      }
    }
    
    setAdaptiveTheme(timeBasedTheme);
  }, [context]);
  
  return adaptiveTheme;
}

export { ThemeContext };