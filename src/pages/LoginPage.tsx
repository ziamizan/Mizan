import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  Zap,
} from 'lucide-react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  ConfirmationResult,
  RecaptchaVerifier,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAppContext } from '../context/AppContext';
import { AuthShell } from '../components/AuthShell';
import { useTheme } from '../context/ThemeContext';
import {
  formatFirebaseAuthError,
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizePhone,
} from '../lib/authUtils';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

type LoginMode = 'email' | 'mobile';

const COUNTRY_CODES = [
  { code: '+91', label: 'IN +91' },
  { code: '+1', label: 'US +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+971', label: 'AE +971' },
  { code: '+65', label: 'SG +65' },
  { code: '+61', label: 'AU +61' },
];

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const { signInWithGoogle, loginAsDemo, setAwaitingRegistrationVerification } = useAppContext();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as { notice?: string } | null) || null;

  const [mode, setMode] = useState<LoginMode>('email');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(locationState?.notice || null);
  const [loading, setLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    return () => {
      if (recaptchaRef.current) {
        try {
          recaptchaRef.current.clear();
        } catch {
          // ignore cleanup error
        }
        recaptchaRef.current = null;
      }
    };
  }, []);

  const finishSuccess = () => {
    setAwaitingRegistrationVerification(false);
    setSuccessBanner(true);
    if (onLoginSuccess) {
      onLoginSuccess();
    }
    window.setTimeout(() => {
      navigate('/', { replace: true });
    }, 550);
  };

  const applyPersistence = async () => {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
  };

  const getOrCreateRecaptcha = () => {
    if (recaptchaRef.current) {
      try {
        recaptchaRef.current.clear();
      } catch {
        // ignore
      }
      recaptchaRef.current = null;
    }
    const verifier = new RecaptchaVerifier(auth, 'login-recaptcha-container', {
      size: 'invisible',
    });
    recaptchaRef.current = verifier;
    return verifier;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const cleanedEmail = normalizeEmail(email);
    if (!cleanedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!isValidEmail(cleanedEmail)) {
      setError('Please enter a valid email address (for example, name@domain.com).');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await applyPersistence();
      await signInWithEmailAndPassword(auth, cleanedEmail, password);
      finishSuccess();
    } catch (err: unknown) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSendMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const formattedPhone = normalizePhone(mobile, countryCode);
    if (!mobile.trim() || !isValidPhone(formattedPhone, countryCode)) {
      setError('Please enter a valid mobile number (e.g., 9876543210).');
      return;
    }

    setLoading(true);
    try {
      await applyPersistence();
      const verifier = getOrCreateRecaptcha();
      const result = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(result);
      setOtpStep(true);
      setResendCooldown(30);
      setNotice(`A 6-digit verification code was sent to ${formattedPhone}.`);
    } catch (err: unknown) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!confirmationResult) {
      setError('Verification session expired. Please request a new OTP code.');
      setOtpStep(false);
      return;
    }
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError('Please enter the 6-digit verification code sent to your mobile.');
      return;
    }

    setLoading(true);
    try {
      await confirmationResult.confirm(otpCode.trim());
      finishSuccess();
    } catch (err: unknown) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await applyPersistence();
      await signInWithGoogle();
      finishSuccess();
    } catch (err: unknown) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setError(null);
    loginAsDemo();
    finishSuccess();
  };

  return (
    <AuthShell>
      <div id="login-recaptcha-container" />

      {/* Header */}
      <div className="mb-6">
        <h2
          className={`text-2xl sm:text-[26px] font-extrabold tracking-tight ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          Welcome Back!
        </h2>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          Your community is waiting for you.
        </p>
      </div>

      {/* Login Mode Switcher: Email Address | Mobile Number */}
      <div
        className={`grid grid-cols-2 gap-1.5 p-1 rounded-2xl border mb-5 ${
          isDark ? 'bg-white/[0.06] border-white/10' : 'bg-slate-200/80 border-slate-300/80'
        }`}
        role="tablist"
        aria-label="Login method"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'email'}
          onClick={() => {
            setMode('email');
            setError(null);
            setOtpStep(false);
          }}
          className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${
            mode === 'email'
              ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-lg shadow-cyan-500/25 font-bold'
              : isDark
              ? 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-300/60'
          }`}
        >
          <Mail className="w-3.5 h-3.5 shrink-0" />
          <span>Email Address</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mode === 'mobile'}
          onClick={() => {
            setMode('mobile');
            setError(null);
          }}
          className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${
            mode === 'mobile'
              ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-lg shadow-cyan-500/25 font-bold'
              : isDark
              ? 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-300/60'
          }`}
        >
          <Phone className="w-3.5 h-3.5 shrink-0" />
          <span>Mobile Number</span>
        </button>
      </div>

      {/* Status Messages */}
      {successBanner && (
        <div
          role="status"
          className={`mb-4 p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 ${
            isDark
              ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-200'
              : 'bg-emerald-100 border-emerald-300 text-emerald-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-medium">Signed in! Opening your HelpConnect home page...</span>
        </div>
      )}

      {notice && !successBanner && (
        <div
          role="status"
          className={`mb-4 p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
            isDark
              ? 'bg-cyan-500/15 border-cyan-400/35 text-cyan-100'
              : 'bg-cyan-100 border-cyan-300 text-cyan-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className={`mb-4 p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
            isDark
              ? 'bg-rose-500/15 border-rose-400/35 text-rose-200'
              : 'bg-rose-100 border-rose-300 text-rose-900'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* Email + Password Form */}
      {mode === 'email' && (
        <form onSubmit={handleEmailLogin} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className={`block text-xs font-semibold mb-1.5 ${
                isDark ? 'text-slate-200' : 'text-slate-700'
              }`}
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl border text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                  isDark
                    ? 'bg-white/[0.06] border-white/15 text-white focus:border-cyan-400 focus:ring-cyan-400/25'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-600 focus:ring-cyan-600/20'
                }`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="login-password"
                className={`block text-xs font-semibold ${
                  isDark ? 'text-slate-200' : 'text-slate-700'
                }`}
              >
                Password
              </label>
              <Link
                to="/forgot-password"
                className={`text-xs font-semibold transition-colors ${
                  isDark ? 'text-cyan-300 hover:text-cyan-200' : 'text-cyan-700 hover:text-cyan-900'
                }`}
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={`w-full min-h-[46px] pl-10 pr-11 py-2.5 rounded-xl border text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                  isDark
                    ? 'bg-white/[0.06] border-white/15 text-white focus:border-cyan-400 focus:ring-cyan-400/25'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-600 focus:ring-cyan-600/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className={`w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500/40 ${
                  isDark ? 'border-white/25 bg-white/10' : 'border-slate-400 bg-white'
                }`}
              />
              <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Remember Me
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || successBanner}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:to-teal-300 text-slate-950 text-sm font-bold shadow-[0_12px_32px_-6px_rgba(34,211,238,0.5)] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Login to HelpConnect</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Mobile Number + OTP Form */}
      {mode === 'mobile' && !otpStep && (
        <form onSubmit={handleSendMobileOtp} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="login-mobile"
              className={`block text-xs font-semibold mb-1.5 ${
                isDark ? 'text-slate-200' : 'text-slate-700'
              }`}
            >
              Mobile Number
            </label>
            <div className="flex gap-2">
              <select
                aria-label="Country dialing code"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className={`min-h-[46px] px-3 rounded-xl border text-xs font-semibold focus:outline-none ${
                  isDark
                    ? 'bg-slate-900/90 border-white/15 text-white focus:border-cyan-400'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-600'
                }`}
              >
                {COUNTRY_CODES.map((c) => (
                  <option
                    key={c.code}
                    value={c.code}
                    className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}
                  >
                    {c.label}
                  </option>
                ))}
              </select>
              <div className="relative flex-1">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-mobile"
                  type="tel"
                  autoComplete="tel-national"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="98765 43210"
                  className={`w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl border text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors tabular-nums ${
                    isDark
                      ? 'bg-white/[0.06] border-white/15 text-white focus:border-cyan-400 focus:ring-cyan-400/25'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-600 focus:ring-cyan-600/20'
                  }`}
                />
              </div>
            </div>
            <p className={`text-[11px] mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              We will send a one-time 6-digit SMS verification code to sign you in securely.
            </p>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className={`w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500/40 ${
                  isDark ? 'border-white/25 bg-white/10' : 'border-slate-400 bg-white'
                }`}
              />
              <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Remember Me
              </span>
            </label>
            <Link
              to="/forgot-password"
              className={`text-xs font-semibold transition-colors ${
                isDark ? 'text-cyan-300 hover:text-cyan-200' : 'text-cyan-700 hover:text-cyan-900'
              }`}
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading || successBanner}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:to-teal-300 text-slate-950 text-sm font-bold shadow-[0_12px_32px_-6px_rgba(34,211,238,0.5)] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-60 whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending OTP...</span>
              </>
            ) : (
              <>
                <span>Send Verification OTP</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      )}

      {mode === 'mobile' && otpStep && (
        <form onSubmit={handleVerifyMobileOtp} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="login-otp"
              className={`block text-xs font-semibold mb-1.5 ${
                isDark ? 'text-slate-200' : 'text-slate-700'
              }`}
            >
              6-Digit Verification Code
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                className={`w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl border text-sm tracking-[0.25em] font-mono placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  isDark
                    ? 'bg-white/[0.06] border-white/15 text-white focus:border-cyan-400 focus:ring-cyan-400/25'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-600 focus:ring-cyan-600/20'
                }`}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setOtpStep(false);
                  setOtpCode('');
                  setError(null);
                }}
                className={`transition-colors ${
                  isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Change number
              </button>
              <button
                type="button"
                disabled={resendCooldown > 0 || loading}
                onClick={handleSendMobileOtp}
                className={`transition-colors ${
                  isDark
                    ? 'text-cyan-300 hover:text-cyan-200 disabled:text-slate-500'
                    : 'text-cyan-700 hover:text-cyan-900 disabled:text-slate-400'
                }`}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || successBanner}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:to-teal-300 text-slate-950 text-sm font-bold shadow-[0_12px_32px_-6px_rgba(34,211,238,0.5)] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-60 whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Login to HelpConnect</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Divider */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className={`w-full border-t ${isDark ? 'border-white/10' : 'border-slate-300'}`} />
        </div>
        <div className="relative flex justify-center text-xs">
          <span
            className={`px-3 font-medium rounded-full ${
              isDark ? 'bg-[#0e1535] text-slate-400' : 'bg-white text-slate-500'
            }`}
          >
            Or continue quickly
          </span>
        </div>
      </div>

      {/* Google + Demo Secondary Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || successBanner}
          className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap ${
            isDark
              ? 'bg-white/[0.07] hover:bg-white/[0.12] border-white/15 text-white'
              : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-sm'
          }`}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading || successBanner}
          className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap ${
            isDark
              ? 'bg-teal-500/15 hover:bg-teal-500/25 border-teal-400/30 text-teal-200'
              : 'bg-teal-50 hover:bg-teal-100 border-teal-300 text-teal-800'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-teal-300' : 'text-teal-600'}`} />
          <span>Explore Demo Preview</span>
        </button>
      </div>

      {/* Create New Account CTA */}
      <div className={`mt-6 pt-5 border-t text-center space-y-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          Don&apos;t have an account yet?{' '}
          <Link
            to="/register"
            className={`font-bold underline underline-offset-4 transition-colors ml-1 ${
              isDark ? 'text-cyan-300 hover:text-cyan-200' : 'text-cyan-700 hover:text-cyan-900'
            }`}
          >
            Create New Account
          </Link>
        </p>

        {/* Dedicated Organization Portals (Hospital & Food Homeage Only) */}
        <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Organization Portals
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <Link
              to="/hospital/login"
              className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-colors text-center ${
                isDark
                  ? 'bg-blue-500/10 border-blue-400/25 text-blue-300 hover:bg-blue-500/20'
                  : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Hospital Portal
            </Link>
            <Link
              to="/orphanage/login"
              className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-colors text-center ${
                isDark
                  ? 'bg-emerald-500/10 border-emerald-400/25 text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Orphanage Portal
            </Link>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
