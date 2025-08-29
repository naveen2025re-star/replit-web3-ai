import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { useTheme, THEME_CONFIGS, ThemeVariant } from '@/hooks/useTheme';
import { Palette, Clock, Zap } from 'lucide-react';

export function ThemeSwitcher() {
  const { currentTheme, setTheme, isAdaptive, themeConfig } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeChange = (theme: ThemeVariant) => {
    setTheme(theme);
    setIsOpen(false);
    
    // Show brief feedback
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300';
    toast.textContent = `Theme changed to ${THEME_CONFIGS[theme].name}`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
  };

  const getThemeIcon = (theme: ThemeVariant) => {
    return THEME_CONFIGS[theme].emoji;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg relative"
          title={`Current: ${themeConfig.name}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{getThemeIcon(currentTheme)}</span>
            {isAdaptive && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-64 bg-slate-900 border-slate-700 text-white" 
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="flex items-center gap-2 text-slate-300">
          <Palette className="h-4 w-4" />
          Theme Chameleon
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700" />
        
        {/* Smart Adaptive Theme */}
        <DropdownMenuItem 
          onClick={() => handleThemeChange('adaptive')}
          className={`cursor-pointer hover:bg-slate-800 focus:bg-slate-800 ${
            currentTheme === 'adaptive' ? 'bg-slate-800 text-green-400' : ''
          }`}
        >
          <div className="flex items-center gap-3 w-full">
            <span className="text-lg">🦎</span>
            <div className="flex-1">
              <div className="font-medium flex items-center gap-2">
                Adaptive Chameleon
                <Zap className="h-3 w-3 text-green-400" />
              </div>
              <div className="text-xs text-slate-400">
                Smart context-aware theming
              </div>
            </div>
            {currentTheme === 'adaptive' && (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-slate-700" />
        <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider">
          Manual Themes
        </DropdownMenuLabel>
        
        {/* Manual Theme Options */}
        {(Object.entries(THEME_CONFIGS) as [ThemeVariant, typeof THEME_CONFIGS[ThemeVariant]][])
          .filter(([key]) => key !== 'adaptive')
          .map(([key, config]) => (
            <DropdownMenuItem 
              key={key}
              onClick={() => handleThemeChange(key)}
              className={`cursor-pointer hover:bg-slate-800 focus:bg-slate-800 ${
                currentTheme === key ? 'bg-slate-800' : ''
              }`}
            >
              <div className="flex items-center gap-3 w-full">
                <span className="text-lg">{config.emoji}</span>
                <div className="flex-1">
                  <div className="font-medium">{config.name}</div>
                  <div className="text-xs text-slate-400">
                    {config.description}
                  </div>
                </div>
                {currentTheme === key && (
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
        
        <DropdownMenuSeparator className="bg-slate-700" />
        
        {/* Current Status */}
        <div className="px-2 py-2 text-xs text-slate-500">
          <div className="flex items-center justify-between">
            <span>Current:</span>
            <span className="text-slate-300">{themeConfig.name}</span>
          </div>
          {isAdaptive && (
            <div className="flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3" />
              <span>Auto-adapting to context</span>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}