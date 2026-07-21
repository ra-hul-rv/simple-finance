'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type ColorThemeContextType = {
  colorTheme: string;
  setColorTheme: (theme: string) => void;
};

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(undefined);

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<string>('selvault');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 1. First try localStorage for immediate UI update
    const saved = localStorage.getItem('sf_color_theme');
    if (saved) {
      setColorThemeState(saved);
      document.documentElement.setAttribute('data-color-theme', saved);
    }
    
    setMounted(true);

    // 2. Fetch from API to ensure we have the user's latest saved preference
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data && data.colorTheme) {
          setColorThemeState(data.colorTheme);
          localStorage.setItem('sf_color_theme', data.colorTheme);
          document.documentElement.setAttribute('data-color-theme', data.colorTheme);
        }
      })
      .catch(console.error);
  }, []);

  const setColorTheme = (theme: string) => {
    setColorThemeState(theme);
    localStorage.setItem('sf_color_theme', theme);
    document.documentElement.setAttribute('data-color-theme', theme);
  };

  if (!mounted) {
    // Prevent hydration mismatch by rendering nothing until we know the theme
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export const useColorTheme = () => {
  const context = useContext(ColorThemeContext);
  if (!context) {
    throw new Error('useColorTheme must be used within a ColorThemeProvider');
  }
  return context;
};
