import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setDateTimeZone } from '../utils/datetime';

const SettingsContext = createContext(null);

// Seed the formatter timezone synchronously (from cache) so the first render of
// any page formats dates in the saved zone before the settings fetch resolves.
try { setDateTimeZone(localStorage.getItem('tz') || ''); } catch { /* ignore */ }

const DEFAULTS = {
  theme: 'system',
  default_severity_for_new_bugs: 'Minor',
  default_page_size: 20,
  timezone: '',
  auto_generate_report_after_run: true,
};

// Resolve 'system' to a concrete light/dark using the OS preference.
function resolveTheme(theme) {
  if (theme === 'system') {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme === 'dark' ? 'dark' : 'light';
}

export function SettingsProvider({ children }) {
  // Seed theme from localStorage so the correct theme paints before the fetch resolves.
  const cachedTheme = (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) || DEFAULTS.theme;
  const [settings, setSettings] = useState({ ...DEFAULTS, theme: cachedTheme });
  const [loading, setLoading]   = useState(true);
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(cachedTheme));

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch('/api/settings');
        const json = await res.json();
        if (json.success) { setDateTimeZone(json.data.timezone); setSettings(json.data); }
      } catch { /* keep defaults on failure */ }
      finally { setLoading(false); }
    })();
  }, []);

  // Apply the saved timezone to the shared date formatters (and cache it so the
  // next load formats correctly before the fetch resolves).
  useEffect(() => {
    setDateTimeZone(settings.timezone);
    try { localStorage.setItem('tz', settings.timezone || ''); } catch { /* ignore */ }
  }, [settings.timezone]);

  // Apply the resolved theme to <html>, and follow OS changes while on 'system'.
  useEffect(() => {
    const apply = () => {
      const r = resolveTheme(settings.theme);
      setResolvedTheme(r);
      document.documentElement.setAttribute('data-theme', r);
    };
    apply();
    try { localStorage.setItem('theme', settings.theme); } catch { /* ignore */ }

    if (settings.theme === 'system' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [settings.theme]);

  const updateSettings = useCallback(async (patch) => {
    const res  = await fetch('/api/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to save settings.');
    setDateTimeZone(json.data.timezone);
    setSettings(json.data);
    return json.data;
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, resolvedTheme, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
