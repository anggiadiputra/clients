import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { apiResendOtp, apiForgotPassword, apiResetPassword } from '../lib/api';
import { Globe, Mail, Lock, ArrowLeft, Eye, EyeOff, X, CheckCircle2 } from 'lucide-react';
// Globe kept as fallback when settings.logo is empty


declare global {
  interface Window {
    turnstile: any;
    onTurnstileLoad: () => void;
  }
}

export default function LoginPage() {
  const [step, setStep] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const turnstileRef = useRef<string | null>(null);
  const turnstileForgotRef = useRef<string | null>(null);

  // Lupa Password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

  const [forgotErr, setForgotErr] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  async function handleRequestForgotOtp(e: React.FormEvent) {
    e.preventDefault();
    setForgotErr(null);
    setForgotMsg(null);
    setForgotLoading(true);
    try {
      const res = await apiForgotPassword(forgotEmail, turnstileForgotRef.current || undefined);
      turnstileForgotRef.current = null;
      try { window.turnstile?.reset?.('#turnstile-forgot-widget'); } catch {}
      setForgotMsg(res.message);
      setForgotStep('reset');
    } catch (err: any) {
      setForgotErr(err.message || 'Gagal mengirim OTP reset password');
      turnstileForgotRef.current = null;
      try { window.turnstile?.reset?.('#turnstile-forgot-widget'); } catch {}
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotErr(null);
    setForgotMsg(null);
    if (forgotNewPass.length < 6) {
      setForgotErr('Password baru minimal 6 karakter');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await apiResetPassword(forgotEmail, forgotOtp, forgotNewPass);
      setForgotMsg(res.message);
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotStep('request');
        setForgotEmail('');
        setForgotOtp('');
        setForgotNewPass('');
        setForgotMsg(null);
      }, 2000);
    } catch (err: any) {
      setForgotErr(err.message || 'Gagal mereset password');
    } finally {
      setForgotLoading(false);
    }
  }

  const { isAuthenticated, loginStep1, loginStep2 } = useAuth();

  const { settings } = useSettings();
  const navigate = useNavigate();

  // Redirect to dashboard if already authenticated (e.g. login from another tab)
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);


  useEffect(() => {
    const siteKey = settings.turnstileSiteKey?.trim();
    if (step !== 'password' || !siteKey) return;

    let isMounted = true;
    let checkInterval: any;

    const renderWidget = () => {
      if (!isMounted) return;
      const el = document.getElementById('turnstile-widget');
      if (el && window.turnstile && !el.hasChildNodes()) {
        try {
          window.turnstile.render('#turnstile-widget', {
            sitekey: siteKey,
            theme: 'light',
            callback: (token: string) => { turnstileRef.current = token; },
            'expired-callback': () => { turnstileRef.current = null; },
            'error-callback': (err: any) => {
              console.error('Turnstile widget error:', err);
              turnstileRef.current = null;
            },
          });
        } catch (e) {
          console.error('Error rendering Turnstile:', e);
        }
      }
    };

    const scriptUrl = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    let script = document.querySelector(`script[src="${scriptUrl}"]`) as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setTimeout(renderWidget, 50);
      };
      document.head.appendChild(script);
    } else if (window.turnstile) {
      setTimeout(renderWidget, 50);
    }

    checkInterval = setInterval(() => {
      if (window.turnstile) {
        renderWidget();
        const el = document.getElementById('turnstile-widget');
        if (el && el.hasChildNodes()) {
          clearInterval(checkInterval);
        }
      }
    }, 150);

    return () => {
      isMounted = false;
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [step, settings.turnstileSiteKey]);

  useEffect(() => {
    const siteKey = settings.turnstileSiteKey?.trim();
    if (!showForgotModal || forgotStep !== 'request' || !siteKey) return;

    let isMounted = true;
    let checkInterval: any;

    const renderForgotWidget = () => {
      if (!isMounted) return;
      const el = document.getElementById('turnstile-forgot-widget');
      if (el && window.turnstile && !el.hasChildNodes()) {
        try {
          window.turnstile.render('#turnstile-forgot-widget', {
            sitekey: siteKey,
            theme: 'light',
            callback: (token: string) => { turnstileForgotRef.current = token; },
            'expired-callback': () => { turnstileForgotRef.current = null; },
            'error-callback': (err: any) => {
              console.error('Turnstile forgot widget error:', err);
              turnstileForgotRef.current = null;
            },
          });
        } catch (e) {
          console.error('Error rendering Turnstile for forgot password:', e);
        }
      }
    };

    const scriptUrl = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    let script = document.querySelector(`script[src="${scriptUrl}"]`) as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setTimeout(renderForgotWidget, 50);
      };
      document.head.appendChild(script);
    } else if (window.turnstile) {
      setTimeout(renderForgotWidget, 50);
    }

    checkInterval = setInterval(() => {
      if (window.turnstile) {
        renderForgotWidget();
        const el = document.getElementById('turnstile-forgot-widget');
        if (el && el.hasChildNodes()) {
          clearInterval(checkInterval);
        }
      }
    }, 150);

    return () => {
      isMounted = false;
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [showForgotModal, forgotStep, settings.turnstileSiteKey]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginStep1(email, password, turnstileRef.current || undefined);
      // Reset Turnstile token — it is one-shot
      turnstileRef.current = null;
      try { window.turnstile?.reset?.('#turnstile-widget'); } catch {}
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Login gagal');
      turnstileRef.current = null;
      try { window.turnstile?.reset?.('#turnstile-widget'); } catch {}
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      await loginStep2(email, otp);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'OTP salah');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (countdown > 0) return;
    try {
      await apiResendOtp(email);
      setCountdown(30);
      const interval = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(interval); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch {
      setError('Gagal kirim ulang OTP');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--page-background, #f0f2f5)' }}>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg max-w-sm w-full overflow-hidden">
        <div className="px-6 py-8 text-center">
          {settings.logo ? (
            <img src={settings.logo} alt={settings.projectName} className="max-h-12 w-auto rounded-xl object-contain mx-auto mb-4" />
          ) : (
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mx-auto mb-4">
              <Globe className="w-6 h-6 text-white" />
            </div>
          )}
          {!settings.logo && <h1 className="text-xl font-bold text-gray-900">{settings.projectName}</h1>}
          <p className="text-sm text-gray-500 mt-1">
            {step === 'password' ? 'Masuk dengan email & password' : 'Masukkan kode OTP 6 digit'}
          </p>
        </div>

        {error && (
          <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-800 text-sm">
            {error}
          </div>
        )}

        {step === 'password' ? (
          <form onSubmit={handlePasswordSubmit} className="px-6 pb-8 space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="email@example.com"
                autoFocus
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="Password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setShowForgotModal(true);
                  setForgotStep('request');
                  setForgotMsg(null);
                  setForgotErr(null);
                }}
                className="text-xs text-gray-500 hover:text-black hover:underline"
              >
                Lupa password?
              </button>
            </div>

            {settings.turnstileSiteKey && (
              <div id="turnstile-widget" className="flex justify-center"></div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password || (!!settings.turnstileSiteKey && !turnstileRef.current)}
              className="w-full px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Memeriksa...' : 'Lanjut'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="px-6 pb-8 space-y-4">
            <button
              type="button"
              onClick={() => setStep('password')}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>

            <p className="text-xs text-gray-500 text-center">
              Kode OTP dikirim ke <span className="font-semibold text-gray-900">{email}</span>
            </p>

            <div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-2xl text-center font-bold tracking-[0.5em] text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="000000"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifikasi...' : 'Verifikasi & Masuk'}
            </button>

            <p className="text-center text-xs text-gray-400">
              Tidak terima kode?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0}
                className="text-black font-semibold hover:underline disabled:text-gray-300 disabled:no-underline"
              >
                {countdown > 0 ? `Kirim ulang (${countdown}s)` : 'Kirim ulang'}
              </button>
            </p>
          </form>
        )}
      </div>

      {/* Modal Lupa Password */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-1">Reset Password</h2>
            <p className="text-xs text-gray-500 mb-4">
              {forgotStep === 'request'
                ? 'Masukkan email terdaftar untuk menerima kode OTP reset password.'
                : 'Masukkan kode OTP yang dikirim ke email dan buat password baru.'}
            </p>

            {forgotMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                {forgotMsg}
              </div>
            )}

            {forgotErr && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-800 text-xs">
                {forgotErr}
              </div>
            )}

            {forgotStep === 'request' ? (
              <form onSubmit={handleRequestForgotOtp} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="email@example.com"
                    required
                  />
                </div>
                {settings.turnstileSiteKey && (
                  <div id="turnstile-forgot-widget" className="flex justify-center my-2"></div>
                )}
                <button
                  type="submit"
                  disabled={forgotLoading || !forgotEmail || (!!settings.turnstileSiteKey && !turnstileForgotRef.current)}
                  className="w-full px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {forgotLoading ? 'Mengirim OTP...' : 'Kirim Kode OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Kode OTP (6 Digit)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-center font-bold tracking-widest text-sm text-gray-900"
                    placeholder="000000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Password Baru</label>
                  <div className="relative">
                    <input
                      type={showForgotPass ? 'text' : 'password'}
                      value={forgotNewPass}
                      onChange={(e) => setForgotNewPass(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400"
                      placeholder="Minimal 6 karakter"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotPass(!showForgotPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showForgotPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading || forgotOtp.length !== 6 || !forgotNewPass}
                  className="w-full px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {forgotLoading ? 'Mereset...' : 'Simpan Password Baru'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

