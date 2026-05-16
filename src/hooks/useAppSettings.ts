import { useEffect, useRef, useState } from 'react';
import type { Locale, OrderMode } from '../types';
import { shouldSkipPersistentStorage } from '../utils/storageRecovery';

const UI_TRANSITION_MS = 300;
const DEFAULT_DURATION = 30;
const DEFAULT_ORDER_MODE: OrderMode = 'RANDOM';
const DEFAULT_PRACTICE_COUNT = 10;

const isOrderMode = (value: string | null): value is OrderMode => (
  value === 'SEQUENTIAL' || value === 'REVERSE' || value === 'RANDOM'
);

const getPreferredLocale = (): Locale => (
  navigator.language.toLowerCase().startsWith('zh') ? 'zh-TW' : 'en'
);

export function useAppSettings() {
  const [duration, setDuration] = useState<number>(() => {
    if (typeof window === 'undefined' || shouldSkipPersistentStorage) return DEFAULT_DURATION;
    const saved = Number(localStorage.getItem('Sketchref_duration'));
    return Number.isFinite(saved) && saved > 0 ? saved : DEFAULT_DURATION;
  });
  const [orderMode, setOrderMode] = useState<OrderMode>(() => {
    if (typeof window === 'undefined' || shouldSkipPersistentStorage) return DEFAULT_ORDER_MODE;
    const saved = localStorage.getItem('Sketchref_order_mode');
    return isOrderMode(saved) ? saved : DEFAULT_ORDER_MODE;
  });
  const [practiceCount, setPracticeCount] = useState<number>(() => {
    if (typeof window === 'undefined' || shouldSkipPersistentStorage) return DEFAULT_PRACTICE_COUNT;
    const saved = Number(localStorage.getItem('Sketchref_practice_count'));
    return Number.isFinite(saved) && saved > 0 ? saved : DEFAULT_PRACTICE_COUNT;
  });
  const [skipPracticedImages, setSkipPracticedImages] = useState<boolean>(() => {
    if (typeof window === 'undefined' || shouldSkipPersistentStorage) return true;
    const saved = localStorage.getItem('Sketchref_skip_practiced_images');
    return saved === null ? true : saved === 'true';
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    if (shouldSkipPersistentStorage) return window.matchMedia('(prefers-color-scheme: dark)').matches;
    return localStorage.theme === 'dark'
      || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'en';
    if (shouldSkipPersistentStorage) return getPreferredLocale();
    const saved = localStorage.getItem('Sketchref_locale');
    return saved === 'en' || saved === 'zh-TW' ? saved : getPreferredLocale();
  });
  const themeTransitionTimeoutRef = useRef<number | null>(null);

  const toggleTheme = () => {
    const root = document.documentElement;
    root.classList.add('theme-switching');
    setIsDarkMode(prev => !prev);

    if (themeTransitionTimeoutRef.current) {
      window.clearTimeout(themeTransitionTimeoutRef.current);
    }
    themeTransitionTimeoutRef.current = window.setTimeout(() => {
      root.classList.remove('theme-switching');
      themeTransitionTimeoutRef.current = null;
    }, UI_TRANSITION_MS);
  };

  const toggleLocale = () => {
    setLocale(prev => (prev === 'en' ? 'zh-TW' : 'en'));
  };

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      if (!shouldSkipPersistentStorage) {
        localStorage.theme = 'dark';
      }
    } else {
      root.classList.remove('dark');
      if (!shouldSkipPersistentStorage) {
        localStorage.theme = 'light';
      }
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (shouldSkipPersistentStorage) return;
    localStorage.setItem('Sketchref_locale', locale);
  }, [locale]);

  useEffect(() => {
    if (shouldSkipPersistentStorage) return;
    localStorage.setItem('Sketchref_skip_practiced_images', String(skipPracticedImages));
  }, [skipPracticedImages]);

  useEffect(() => {
    if (shouldSkipPersistentStorage) return;
    localStorage.setItem('Sketchref_duration', String(duration));
  }, [duration]);

  useEffect(() => {
    if (shouldSkipPersistentStorage) return;
    localStorage.setItem('Sketchref_order_mode', orderMode);
  }, [orderMode]);

  useEffect(() => {
    if (shouldSkipPersistentStorage) return;
    localStorage.setItem('Sketchref_practice_count', String(practiceCount));
  }, [practiceCount]);

  useEffect(() => (
    () => {
      if (themeTransitionTimeoutRef.current) {
        window.clearTimeout(themeTransitionTimeoutRef.current);
      }
    }
  ), []);

  return {
    duration,
    setDuration,
    orderMode,
    setOrderMode,
    practiceCount,
    setPracticeCount,
    skipPracticedImages,
    setSkipPracticedImages,
    isDarkMode,
    locale,
    toggleLocale,
    toggleTheme,
  };
}
