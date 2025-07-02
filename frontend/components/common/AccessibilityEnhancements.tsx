'use client';

import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX, 
  Type, 
  Palette, 
  MousePointer,
  Keyboard,
  Settings,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  SkipForward,
  Focus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
// import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Accessibility settings context
interface AccessibilitySettings {
  fontSize: number;
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  textToSpeech: boolean;
  voiceSpeed: number;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  announceToScreenReader: (message: string) => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
}

const defaultSettings: AccessibilitySettings = {
  fontSize: 16,
  highContrast: false,
  reducedMotion: false,
  screenReaderMode: false,
  keyboardNavigation: true,
  focusIndicators: true,
  colorBlindMode: 'none',
  textToSpeech: false,
  voiceSpeed: 1,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

// Screen reader announcer component
const ScreenReaderAnnouncer: React.FC = () => {
  const [announcement, setAnnouncement] = useState('');
  
  useEffect(() => {
    const announcer = (event: CustomEvent) => {
      setAnnouncement(event.detail.message);
      // Clear after announcement
      setTimeout(() => setAnnouncement(''), 1000);
    };

    window.addEventListener('announce' as any, announcer);
    return () => window.removeEventListener('announce' as any, announcer);
  }, []);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
};

// Skip links component
export const SkipLinks: React.FC = () => {
  const skipLinks = [
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#navigation', label: 'Skip to navigation' },
    { href: '#footer', label: 'Skip to footer' },
  ];

  return (
    <nav className="sr-only focus-within:not-sr-only">
      <ul className="fixed top-0 left-0 z-50 bg-primary text-primary-foreground p-2 space-y-1">
        {skipLinks.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="block px-3 py-2 text-sm font-medium underline focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

// Focus trap component
interface FocusTrapProps {
  children: React.ReactNode;
  active: boolean;
  initialFocus?: React.RefObject<HTMLElement>;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  active,
  initialFocus
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLElement | null>(null);
  const lastFocusableRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    firstFocusableRef.current = focusableElements[0] as HTMLElement;
    lastFocusableRef.current = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus initial element or first focusable element
    const elementToFocus = initialFocus?.current || firstFocusableRef.current;
    elementToFocus?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusableRef.current) {
          lastFocusableRef.current?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusableRef.current) {
          firstFocusableRef.current?.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [active, initialFocus]);

  return <div ref={containerRef}>{children}</div>;
};

// Accessible button component
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  ariaLabel,
  ariaDescribedBy,
  className,
  disabled,
  ...props
}) => {
  const context = useContext(AccessibilityContext);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (context?.settings.textToSpeech && ariaLabel) {
      context.speak(ariaLabel);
    }
    props.onClick?.(e);
  };

  return (
    <Button
      {...props}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      className={cn(
        // Enhanced focus indicators
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
        context?.settings.focusIndicators && 'focus:ring-4',
        context?.settings.highContrast && 'border-2 border-current',
        className
      )}
      style={{
        fontSize: context?.settings.fontSize ? `${context.settings.fontSize}px` : undefined,
      }}
    >
      {loading && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
        />
      )}
      {children}
    </Button>
  );
};

// Accessibility toolbar
export const AccessibilityToolbar: React.FC = () => {
  const context = useContext(AccessibilityContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  if (!context) return null;

  const { settings, updateSettings, speak, stopSpeaking } = context;

  const handleFontSizeChange = (value: number[]) => {
    updateSettings({ fontSize: value[0] });
    document.documentElement.style.fontSize = `${value[0]}px`;
  };

  const handleVoiceSpeedChange = (value: number[]) => {
    updateSettings({ voiceSpeed: value[0] });
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      speak('Text to speech is now enabled');
      setIsSpeaking(true);
    }
  };

  const resetSettings = () => {
    updateSettings(defaultSettings);
    document.documentElement.style.fontSize = '';
    document.documentElement.classList.remove('high-contrast', 'reduced-motion');
    speak('Accessibility settings have been reset');
  };

  return (
    <>
      {/* Floating accessibility button */}
      <motion.div
        className="fixed bottom-4 left-4 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          aria-label="Open accessibility settings"
        >
          <Settings className="h-6 w-6" />
        </Button>
      </motion.div>

      {/* Accessibility panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed left-4 bottom-20 z-50 w-80"
          >
            <Card className="shadow-xl border-2">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="h-5 w-5" />
                  Accessibility Settings
                </CardTitle>
                <CardDescription>
                  Customize your experience for better accessibility
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Font Size */}
                                  <div className="space-y-2">
                    <label className="text-sm font-medium">Font Size</label>
                    <div className="px-3">
                      <input
                        type="range"
                        value={settings.fontSize}
                        onChange={(e) => handleFontSizeChange([parseInt(e.target.value)])}
                        max={24}
                        min={12}
                        step={1}
                        aria-label="Adjust font size"
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>12px</span>
                      <span>{settings.fontSize}px</span>
                      <span>24px</span>
                    </div>
                  </div>

                <Separator />

                {/* Visual Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Visual Settings</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-sm">High Contrast</label>
                      <p className="text-xs text-muted-foreground">
                        Improve text readability
                      </p>
                    </div>
                    <Switch
                      checked={settings.highContrast}
                      onCheckedChange={(checked) => {
                        updateSettings({ highContrast: checked });
                        document.documentElement.classList.toggle('high-contrast', checked);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-sm">Reduced Motion</label>
                      <p className="text-xs text-muted-foreground">
                        Minimize animations
                      </p>
                    </div>
                    <Switch
                      checked={settings.reducedMotion}
                      onCheckedChange={(checked) => {
                        updateSettings({ reducedMotion: checked });
                        document.documentElement.classList.toggle('reduced-motion', checked);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-sm">Enhanced Focus</label>
                      <p className="text-xs text-muted-foreground">
                        Stronger focus indicators
                      </p>
                    </div>
                    <Switch
                      checked={settings.focusIndicators}
                      onCheckedChange={(checked) => updateSettings({ focusIndicators: checked })}
                    />
                  </div>
                </div>

                <Separator />

                {/* Color Blind Support */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Color Blind Support</h4>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span>{settings.colorBlindMode === 'none' ? 'None' : settings.colorBlindMode}</span>
                        <Palette className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => updateSettings({ colorBlindMode: 'none' })}>
                        None
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateSettings({ colorBlindMode: 'protanopia' })}>
                        Protanopia (Red-blind)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateSettings({ colorBlindMode: 'deuteranopia' })}>
                        Deuteranopia (Green-blind)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateSettings({ colorBlindMode: 'tritanopia' })}>
                        Tritanopia (Blue-blind)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Separator />

                {/* Audio Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Audio Settings</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-sm">Text to Speech</label>
                      <p className="text-xs text-muted-foreground">
                        Read content aloud
                      </p>
                    </div>
                    <Switch
                      checked={settings.textToSpeech}
                      onCheckedChange={(checked) => {
                        updateSettings({ textToSpeech: checked });
                        if (checked) speak('Text to speech enabled');
                      }}
                    />
                  </div>

                  {settings.textToSpeech && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Speech Speed</label>
                      <div className="px-3">
                        <input
                          type="range"
                          value={settings.voiceSpeed}
                          onChange={(e) => handleVoiceSpeedChange([parseFloat(e.target.value)])}
                          max={2}
                          min={0.5}
                          step={0.1}
                          aria-label="Adjust speech speed"
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Slow</span>
                        <span>{settings.voiceSpeed}x</span>
                        <span>Fast</span>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={resetSettings}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                  
                  <Button
                    onClick={() => setIsOpen(false)}
                    size="sm"
                    className="flex-1"
                  >
                    Done
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Keyboard navigation helper
export const useKeyboardNavigation = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + 1: Go to main content
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        const mainContent = document.getElementById('main-content');
        mainContent?.focus();
      }
      
      // Alt + 2: Go to navigation
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        const navigation = document.getElementById('navigation');
        navigation?.focus();
      }
      
      // Alt + 3: Go to search
      if (e.altKey && e.key === '3') {
        e.preventDefault();
        const search = document.querySelector('input[type="search"]') as HTMLElement;
        search?.focus();
      }
      
      // Escape: Close modals/dropdowns
      if (e.key === 'Escape') {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement?.getAttribute('role') === 'dialog') {
          const closeButton = activeElement.querySelector('[aria-label="Close"]') as HTMLElement;
          closeButton?.click();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
};

// Main accessibility provider
export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('accessibility-settings');
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    }
    return defaultSettings;
  });

  const speechSynthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  // Save settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessibility-settings', JSON.stringify(settings));
    }
  }, [settings]);

  // Apply settings on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.fontSize = `${settings.fontSize}px`;
      document.documentElement.classList.toggle('high-contrast', settings.highContrast);
      document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
    }
  }, [settings.fontSize, settings.highContrast, settings.reducedMotion]);

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const announceToScreenReader = (message: string) => {
    const event = new CustomEvent('announce', { detail: { message } });
    window.dispatchEvent(event);
  };

  const speak = (text: string) => {
    if (!speechSynthesis || !settings.textToSpeech) return;

    // Stop current speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.voiceSpeed;
    utterance.volume = 0.8;
    
    setCurrentUtterance(utterance);
    speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (speechSynthesis) {
      speechSynthesis.cancel();
      setCurrentUtterance(null);
    }
  };

  const value: AccessibilityContextType = {
    settings,
    updateSettings,
    announceToScreenReader,
    speak,
    stopSpeaking,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      <SkipLinks />
      <ScreenReaderAnnouncer />
      {children}
      <AccessibilityToolbar />
    </AccessibilityContext.Provider>
  );
};

// Hook to use accessibility context
export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

export default {
  AccessibilityProvider,
  AccessibilityToolbar,
  SkipLinks,
  FocusTrap,
  AccessibleButton,
  useAccessibility,
  useKeyboardNavigation,
}; 