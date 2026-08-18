import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react';
import { BASE } from '../lib/api';

interface Settings {
  projectName: string;
  logo: string;
  primaryColor: string;
  pageBackground: string;
  turnstileEnabled: string;
  turnstileSiteKey: string;
  turnstileSecretKey: string;
  fonnteToken: string;
  emailProvider: string;
  kirisanToken: string;
  kirisanChannelKey: string;
  kirisanLoginOtpTemplateId: string;
  kirisanRegisterOtpTemplateId: string;
  kirisanResetPasswordTemplateId: string;
  brevoApiKey: string;
  brevoSenderEmail: string;
  brevoSenderName: string;
  brevoTemplateId: string;
  senderName: string;
  senderAddress: string;
  senderPhone: string;
  senderEmail: string;
  bankAccounts: string;
  termsAndConditions: string;
  s3Endpoint: string;
  s3Region: string;
  s3Bucket: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3PublicUrlBase: string;
}

const defaultSettings: Settings = {
  projectName: 'Client CRM',
  logo: '',
  primaryColor: 'black',
  pageBackground: '#f0f2f5',
  turnstileEnabled: 'true',
  turnstileSiteKey: '',
  turnstileSecretKey: '',
  fonnteToken: '',
  emailProvider: 'kirisan',
  kirisanToken: '',
  kirisanChannelKey: '',
  kirisanLoginOtpTemplateId: '',
  kirisanRegisterOtpTemplateId: '',
  kirisanResetPasswordTemplateId: '',
  brevoApiKey: '',
  brevoSenderEmail: '',
  brevoSenderName: '',
  brevoTemplateId: '',
  senderName: '',
  senderAddress: '',
  senderPhone: '',
  senderEmail: '',
  bankAccounts: '[]',
  termsAndConditions: '1. Pembayaran ditransfer ke rekening yang tertera di atas.\n2. Pembayaran yang telah dilakukan tidak dapat dikembalikan.\n3. Harap lakukan konfirmasi pembayaran setelah melakukan transfer.',
  s3Endpoint: '',
  s3Region: '',
  s3Bucket: '',
  s3AccessKeyId: '',
  s3SecretAccessKey: '',
  s3PublicUrlBase: '',
};


interface SettingsContextType {
  settings: Settings;
  loaded: boolean;
  saving: boolean;
  error: string | null;
  lastSavedAt: number | null;
  updateSettings: (s: Partial<Settings>) => void;
  resetSettings: () => void;
  clearError: () => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  loaded: false,
  saving: false,
  error: null,
  lastSavedAt: null,
  updateSettings: () => {},
  resetSettings: () => {},
  clearError: () => {},
});

function getToken(): string | null {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const inFlight = useRef<AbortController | null>(null);

  // Hydrate from API (DB) on mount when authenticated
  useEffect(() => {
    const controller = new AbortController();
    inFlight.current?.abort();
    inFlight.current = controller;

    const token = getToken();
    if (!token) {
      // Not logged in — fetch public branding settings (no auth needed)
      fetch(`${BASE}/settings/public`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && typeof data === 'object') {
            setSettings((prev) => ({ ...prev, ...data }));
          }
        })
        .catch(() => {})
        .finally(() => setLoaded(true));
      return;
    }

    fetch(`${BASE}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
    .then((res) => {
      // Admin-only endpoint — non-admin users get 403, fall back to public branding.
      if (res.status === 403) {
        return fetch(`${BASE}/settings/branding`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
      }
      return res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`));
    })
    .then((data) => {
      if (data && typeof data === 'object') {
        setSettings((prev) => ({ ...prev, ...data }));
      }
      setError(null);
      setLoaded(true);
    })
    .catch((err) => {
      if (err?.name === 'AbortError') return;
      setError(err?.message || 'Gagal memuat pengaturan dari server');
      setLoaded(true);
    });

    return () => controller.abort();
  }, []);

  // Re-hydrate when auth becomes available (login event from AuthContext)
  const inFlightAuth = useRef<AbortController | null>(null);
  const lastAuthTokenRef = useRef<string>('');

  useEffect(() => {
    function onAuth() {
      const token = getToken();
      if (!token) return;
      // Skip if we already hydrated for this exact token
      if (lastAuthTokenRef.current === token) return;
      lastAuthTokenRef.current = token;
      // Abort any in-flight auth hydration
      inFlightAuth.current?.abort();
      const controller = new AbortController();
      inFlightAuth.current = controller;
      // Try full /api/settings first (admin only); fall back to /api/settings/branding for staff.
      fetch(`${BASE}/settings`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
        .then((res) => {
          if (res.status === 403) {
            return fetch(`${BASE}/settings/branding`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null);
          }
          return res.ok ? res.json() : null;
        })
        .then((data) => {
          if (!data) return;
          // Only update if data actually differs to avoid re-render cascade
          setSettings((prev) => {
            const merged = { ...prev, ...data };
            // Shallow compare — if all keys match, return prev (stable ref)
            const keys = Object.keys(merged) as (keyof Settings)[];
            const changed = keys.some((k) => prev[k] !== merged[k]);
            return changed ? merged : prev;
          });
          setError(null);
          setLoaded(true);
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
        });
    }
    function onLogout() {
      lastAuthTokenRef.current = '';
      inFlightAuth.current?.abort();
      setSettings(defaultSettings);
      setError(null);
      setLoaded(true);
    }
    window.addEventListener('auth:login', onAuth);
    window.addEventListener('auth:logout', onLogout);
    return () => {
      window.removeEventListener('auth:login', onAuth);
      window.removeEventListener('auth:logout', onLogout);
      inFlightAuth.current?.abort();
    };
  }, []);

  const updateSettings = useCallback(async (partial: Partial<Settings>) => {
    const token = getToken();
    if (!token) return;

    setSaving(true);
    setError(null);

    // Optimistically update local context state
    setSettings((prev) => ({ ...prev, ...partial }));

    try {
      const res = await fetch(`${BASE}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(partial),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }

      setError(null);
      setLastSavedAt(Date.now());
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan pengaturan ke server');
    } finally {
      setSaving(false);
    }
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      settings,
      loaded,
      saving,
      error,
      lastSavedAt,
      updateSettings,
      resetSettings,
      clearError,
    }),
    [settings, loaded, saving, error, lastSavedAt, updateSettings, resetSettings, clearError]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
