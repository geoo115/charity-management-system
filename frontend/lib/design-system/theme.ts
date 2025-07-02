/**
 * Enhanced Theme System
 * Comprehensive theming with dark mode, accessibility, and responsive design
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Brand colors
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
  
  // Semantic colors
  success: {
    50: string;
    100: string;
    500: string;
    600: string;
    900: string;
  };
  
  warning: {
    50: string;
    100: string;
    500: string;
    600: string;
    900: string;
  };
  
  error: {
    50: string;
    100: string;
    500: string;
    600: string;
    900: string;
  };
  
  info: {
    50: string;
    100: string;
    500: string;
    600: string;
    900: string;
  };
  
  // Neutral colors
  gray: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
  
  // Surface colors
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface ThemeTypography {
  fontFamily: {
    sans: string[];
    serif: string[];
    mono: string[];
  };
  
  fontSize: {
    xs: [string, { lineHeight: string }];
    sm: [string, { lineHeight: string }];
    base: [string, { lineHeight: string }];
    lg: [string, { lineHeight: string }];
    xl: [string, { lineHeight: string }];
    '2xl': [string, { lineHeight: string }];
    '3xl': [string, { lineHeight: string }];
    '4xl': [string, { lineHeight: string }];
    '5xl': [string, { lineHeight: string }];
    '6xl': [string, { lineHeight: string }];
  };
  
  fontWeight: {
    thin: string;
    extralight: string;
    light: string;
    normal: string;
    medium: string;
    semibold: string;
    bold: string;
    extrabold: string;
    black: string;
  };
  
  letterSpacing: {
    tighter: string;
    tight: string;
    normal: string;
    wide: string;
    wider: string;
    widest: string;
  };
}

export interface ThemeSpacing {
  0: string;
  px: string;
  0.5: string;
  1: string;
  1.5: string;
  2: string;
  2.5: string;
  3: string;
  3.5: string;
  4: string;
  5: string;
  6: string;
  7: string;
  8: string;
  9: string;
  10: string;
  11: string;
  12: string;
  14: string;
  16: string;
  20: string;
  24: string;
  28: string;
  32: string;
  36: string;
  40: string;
  44: string;
  48: string;
  52: string;
  56: string;
  60: string;
  64: string;
  72: string;
  80: string;
  96: string;
}

export interface ThemeBreakpoints {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

export interface ThemeAnimations {
  transition: {
    none: string;
    all: string;
    default: string;
    colors: string;
    opacity: string;
    shadow: string;
    transform: string;
  };
  
  duration: {
    75: string;
    100: string;
    150: string;
    200: string;
    300: string;
    500: string;
    700: string;
    1000: string;
  };
  
  ease: {
    linear: string;
    in: string;
    out: string;
    'in-out': string;
  };
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  breakpoints: ThemeBreakpoints;
  animations: ThemeAnimations;
  borderRadius: {
    none: string;
    sm: string;
    default: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    full: string;
  };
  boxShadow: {
    sm: string;
    default: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    inner: string;
    none: string;
  };
}

// Light theme configuration
export const lightTheme: ThemeColors = {
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    900: '#14532d',
  },
  
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    900: '#78350f',
  },
  
  error: {
    50: '#fef2f2',
    100: '#fecaca',
    500: '#ef4444',
    600: '#dc2626',
    900: '#7f1d1d',
  },
  
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    900: '#1e3a8a',
  },
  
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  
  background: '#ffffff',
  foreground: '#0f172a',
  card: '#ffffff',
  cardForeground: '#0f172a',
  popover: '#ffffff',
  popoverForeground: '#0f172a',
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  accent: '#f1f5f9',
  accentForeground: '#0f172a',
  destructive: '#ef4444',
  destructiveForeground: '#f8fafc',
  border: '#e2e8f0',
  input: '#e2e8f0',
  ring: '#22c55e',
};

// Dark theme configuration
export const darkTheme: ThemeColors = {
  primary: {
    50: '#052e16',
    100: '#14532d',
    200: '#166534',
    300: '#15803d',
    400: '#16a34a',
    500: '#22c55e',
    600: '#4ade80',
    700: '#86efac',
    800: '#bbf7d0',
    900: '#dcfce7',
    950: '#f0fdf4',
  },
  
  success: {
    50: '#14532d',
    100: '#166534',
    500: '#22c55e',
    600: '#4ade80',
    900: '#dcfce7',
  },
  
  warning: {
    50: '#78350f',
    100: '#92400e',
    500: '#f59e0b',
    600: '#fbbf24',
    900: '#fef3c7',
  },
  
  error: {
    50: '#7f1d1d',
    100: '#991b1b',
    500: '#ef4444',
    600: '#f87171',
    900: '#fecaca',
  },
  
  info: {
    50: '#1e3a8a',
    100: '#1e40af',
    500: '#3b82f6',
    600: '#60a5fa',
    900: '#dbeafe',
  },
  
  gray: {
    50: '#030712',
    100: '#111827',
    200: '#1f2937',
    300: '#374151',
    400: '#4b5563',
    500: '#6b7280',
    600: '#9ca3af',
    700: '#d1d5db',
    800: '#e5e7eb',
    900: '#f3f4f6',
    950: '#f9fafb',
  },
  
  background: '#0f172a',
  foreground: '#f8fafc',
  card: '#1e293b',
  cardForeground: '#f8fafc',
  popover: '#1e293b',
  popoverForeground: '#f8fafc',
  muted: '#334155',
  mutedForeground: '#94a3b8',
  accent: '#334155',
  accentForeground: '#f8fafc',
  destructive: '#ef4444',
  destructiveForeground: '#f8fafc',
  border: '#334155',
  input: '#334155',
  ring: '#22c55e',
};

// Typography configuration
export const typography: ThemeTypography = {
  fontFamily: {
    sans: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      '"Noto Sans"',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
      '"Noto Color Emoji"'
    ],
    serif: [
      'ui-serif',
      'Georgia',
      'Cambria',
      '"Times New Roman"',
      'Times',
      'serif'
    ],
    mono: [
      'ui-monospace',
      'SFMono-Regular',
      '"SF Mono"',
      'Consolas',
      '"Liberation Mono"',
      'Menlo',
      'monospace'
    ]
  },
  
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
    '6xl': ['3.75rem', { lineHeight: '1' }],
  },
  
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// Spacing configuration
export const spacing: ThemeSpacing = {
  0: '0px',
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',
};

// Breakpoints configuration
export const breakpoints: ThemeBreakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Animations configuration
export const animations: ThemeAnimations = {
  transition: {
    none: 'none',
    all: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    default: 'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    colors: 'color, background-color, border-color, text-decoration-color, fill, stroke 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    shadow: 'box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  duration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },
  
  ease: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// Create complete theme objects
export const createTheme = (mode: ThemeMode): Theme => {
  const colors = mode === 'dark' ? darkTheme : lightTheme;
  
  return {
    mode,
    colors,
    typography,
    spacing,
    breakpoints,
    animations,
    borderRadius: {
      none: '0px',
      sm: '0.125rem',
      default: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      '2xl': '1rem',
      '3xl': '1.5rem',
      full: '9999px',
    },
    boxShadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      default: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
      none: '0 0 #0000',
    },
  };
};

// Default themes
export const themes = {
  light: createTheme('light'),
  dark: createTheme('dark'),
};

// Accessibility helpers
export const accessibilityHelpers = {
  // Focus ring styles
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
  
  // Screen reader only text
  srOnly: 'sr-only',
  
  // High contrast mode detection
  highContrast: '@media (prefers-contrast: high)',
  
  // Reduced motion detection
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  
  // Color scheme preference
  colorScheme: {
    light: '@media (prefers-color-scheme: light)',
    dark: '@media (prefers-color-scheme: dark)',
  },
  
  // Touch target sizes
  touchTarget: {
    sm: 'min-h-[44px] min-w-[44px]', // iOS minimum
    md: 'min-h-[48px] min-w-[48px]', // Android minimum
    lg: 'min-h-[56px] min-w-[56px]', // Recommended
  },
};

// Utility functions
export const themeUtils = {
  // Get color with opacity
  withOpacity: (color: string, opacity: number) => `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
  
  // Convert hex to RGB
  hexToRgb: (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  },
  
  // Get contrast ratio
  getContrastRatio: (color1: string, color2: string) => {
    // Simplified contrast ratio calculation
    // In a real implementation, you'd want a more robust function
    const rgb1 = themeUtils.hexToRgb(color1);
    const rgb2 = themeUtils.hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return 1;
    
    const luminance1 = (0.299 * rgb1.r + 0.587 * rgb1.g + 0.114 * rgb1.b) / 255;
    const luminance2 = (0.299 * rgb2.r + 0.587 * rgb2.g + 0.114 * rgb2.b) / 255;
    
    const brighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);
    
    return (brighter + 0.05) / (darker + 0.05);
  },
  
  // Check if color meets WCAG contrast requirements
  meetsWCAG: (color1: string, color2: string, level: 'AA' | 'AAA' = 'AA') => {
    const ratio = themeUtils.getContrastRatio(color1, color2);
    return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
  },
};

export default themes; 