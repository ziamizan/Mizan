import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import {
  ConfirmationResult,
  RecaptchaVerifier,
  confirmPasswordReset,
  sendPasswordResetEmail,
  signInWithPhoneNumber,
  updatePassword,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAppContext } from '../context/AppContext';
import { AuthShell } from '../components/AuthShell';
import {
  evaluatePasswordStrength,
  formatFirebaseAuthError,
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizePhone,
} from '../lib/authUtils';

type RecoveryChannel = 'email' | 'mobile';
type RecoveryStep = 'identify' | 'verify' | 'newPassword' | 'success';

const COUNTRY_CODES = [
  { code: '+91', label: 'IN +91' },
  { code: '+1', label: 'US +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+971', label: 'AE +971' },
  { code: '+65', label: 'SG +65' },
  { code: '+61', label: 'AU +61' },
];

export function ForgotPasswordPage() {
  const { setAwaitingRegistrationVerification, signOutUser } = useAppContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [channel, setChannel] = useState<RecoveryChannel>('email');
  const [step, setStep] = useState<RecoveryStep>('identify');

  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile, setMobile] = useState('');

  const [oobCode, setOobCode] = useState('');
  const [verifiedAccountLabel, setVerifiedAccountLabel] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const passwordStrength = evaluatePasswordStrength(newPassword);

  // Detect ?mode=resetPassword&oobCode=... from Firebase email recovery link
  useEffect(() => {
    const code = searchParams.get('oobCode');
    const mode = searchParams.get('mode');
    if (code && (!mode || mode === 'resetPassword')) {
      setLoading(true);
      setError(null);
      verifyPasswordResetCode(auth, code)
        .then((accountEmail) => {
          setChannel('email');
          setOobCode(code);
          setVerifiedAccountLabel(accountEmail);
          setStep('newPassword');
        })
        .catch((err) => {
          setError(formatFirebaseAuthError(err));
        })
        .finally(() => setLoading(false));
    }
  }, [searchParams]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [resendCooldown]);

  useEffect(() => {
    return () => {
      if (recaptchaRef.current) {
        try {
          recaptchaRef.current.clear();
        } catch {
          // ignore
        }
        recaptchaRef.current = null;
      }
      setAwaitingRegistrationVerification(false);
    };
  }, [setAwaitingRegistrationVerification]);

  const getOrCreateRecaptcha = () => {
    if (recaptchaRef.current) {
      try {
        recaptchaRef.current.clear();
      } catch {
        // ignore
      }
      recaptchaRef.current = null;
    }
    const verifier = new RecaptchaVerifier(auth, 'forgot-recaptcha-container', {
      size: 'invisible',
    });
    recaptchaRef.current = verifier;
    return verifier;
  };

  const handleSendRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (channel === 'email') {
      const cleanedEmail = normalizeEmail(email);
      if (!cleanedEmail || !isValidEmail(cleanedEmail)) {
        setError('Please enter your registered email address.');
        return;
      }
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, cleanedEmail, {
          url: `${window.location.origin}/forgot-password`,
        });
        setVerifiedAccountLabel(cleanedEmail);
        setResendCooldown(30);
        setStep('verify');
        setNotice(`A secure recovery link has been sent to ${cleanedEmail}.`);
      } catch (err: unknown) {
        setError(formatFirebaseAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Mobile OTP recovery
    const formattedPhone = normalizePhone(mobile, countryCode);
    if (!mobile.trim() || !isValidPhone(formattedPhone, countryCode)) {
      setError('Please enter your registered mobile number.');
      return;
    }

    setLoading(true);
    try {
      setAwaitingRegistrationVerification(true);
      const verifier = getOrCreateRecaptcha();
      const result = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(result);
      setVerifiedAccountLabel(formattedPhone);
      setResendCooldown(30);
      setStep('verify');
      setNotice(`A 6-digit recovery OTP was sent to ${formattedPhone}.`);
    } catch (err: unknown) {
      setAwaitingRegistrationVerification(false);
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (channel === 'email') {
      // Extract oobCode if user pasted the entire reset URL or raw code
      let extractedCode = oobCode.trim();
      if (extractedCode.includes('oobCode=')) {
        try {
          const parsed = new URL(extractedCode);
          extractedCode = parsed.searchParams.get('oobCode') || extractedCode;
        } catch {
          const match = extractedCode.match(/oobCode=([^&]+)/);
          if (match) extractedCode = decodeURIComponent(match[1]);
        }
      }
      if (!extractedCode) {
        setError('Please open the recovery link in your email or paste the recovery code below.');
        return;
      }
      setLoading(true);
      try {
        const accountEmail = await verifyPasswordResetCode(auth, extractedCode);
        setOobCode(extractedCode);
        setVerifiedAccountLabel(accountEmail);
        setStep('newPassword');
      } catch (err: unknown) {
        setError(formatFirebaseAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Verify Mobile OTP
    if (!confirmationResult) {
      setError('OTP session expired. Please request a new verification code.');
      setStep('identify');
      return;
    }
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError('Please enter the 6-digit OTP code sent to your mobile number.');
      return;
    }

    setLoading(true);
    try {
      await confirmationResult.confirm(otpCode.trim());
      setStep('newPassword');
      setNotice(null);
    } catch (err: unknown) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (passwordStrength.score < 2) {
      setError('Please pick a stronger password with mixed letters and numbers.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);
    try {
      if (channel === 'email' && oobCode) {
        await confirmPasswordReset(auth, oobCode, newPassword);
      } else if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        await signOutUser();
      } else {
        throw new Error('Recovery verification session is missing. Please restart password recovery.');
      }
      setAwaitingRegistrationVerification(false);
      setStep('success');
    } catch (err: unknown) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const currentStepNumber =
    step === 'identify' ? 1 : step === 'verify' ? 2 : step === 'newPassword' ? 3 : 4;

  return (
    <AuthShell compactBrandOnMobile>
      <div id="forgot-recaptcha-container" />

      {/* Top Navigation & Progress */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <Link
          to="/login"
          onClick={() => setAwaitingRegistrationVerification(false)}
          className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Login</span>
        </Link>
        <span className="text-xs font-mono text-slate-300 tabular-nums">
          Step {currentStepNumber} of 4
        </span>
      </div>

      {/* Step Progress Track */}
      <div className="grid grid-cols-4 gap-1.5 mb-6" aria-hidden="true">
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className={`h-1.5 rounded-full transition-colors duration-300 ${
              currentStepNumber >= idx
                ? 'bg-gradient-to-r from-cyan-400 to-teal-400'
                : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      {notice && step !== 'success' && (
        <div
          role="status"
          className="mb-4 p-3.5 rounded-2xl bg-cyan-500/15 border border-cyan-400/35 text-xs text-cyan-100 flex items-start gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-400/35 text-xs text-rose-200 flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* STEP 1: IDENTIFY ACCOUNT */}
      {step === 'identify' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Forgot Password?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Enter your registered email or mobile number to verify your identity.
            </p>
          </div>

          <div
            className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-white/[0.06] border border-white/10"
            role="tablist"
            aria-label="Recovery method"
          >
            <button
              type="button"
              role="tab"
              aria-selected={channel === 'email'}
              onClick={() => {
                setChannel('email');
                setError(null);
              }}
              className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                channel === 'email'
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/25'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Link</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={channel === 'mobile'}
              onClick={() => {
                setChannel('mobile');
                setError(null);
              }}
              className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                channel === 'mobile'
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/25'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Mobile OTP</span>
            </button>
          </div>

          <form onSubmit={handleSendRecovery} noValidate className="space-y-4">
            {channel === 'email' ? (
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-semibold text-slate-200 mb-1.5"
                >
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="forgot-mobile"
                  className="block text-xs font-semibold text-slate-200 mb-1.5"
                >
                  Registered Mobile Number
                </label>
                <div className="flex gap-2">
                  <select
                    aria-label="Country dialing code"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="min-h-[46px] px-3 rounded-xl bg-slate-900/90 border border-white/15 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="forgot-mobile"
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="98765 43210"
                      className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25 tabular-nums"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:to-teal-300 text-slate-950 text-sm font-bold shadow-[0_12px_32px_-6px_rgba(34,211,238,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>
                    {channel === 'email' ? 'Send Recovery Link' : 'Send Verification OTP'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 2: VERIFY LINK OR OTP */}
      {step === 'verify' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Verify Recovery
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {channel === 'email'
                ? `Click the secure link sent to ${verifiedAccountLabel}, or paste the recovery code below to set your new password.`
                : `Enter the 6-digit OTP sent to ${verifiedAccountLabel}.`}
            </p>
          </div>

          <form onSubmit={handleVerifyStep} noValidate className="space-y-4">
            {channel === 'email' ? (
              <div>
                <label
                  htmlFor="forgot-oob-code"
                  className="block text-xs font-semibold text-slate-200 mb-1.5"
                >
                  Recovery Link or Code (from Email)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="forgot-oob-code"
                    type="text"
                    value={oobCode}
                    onChange={(e) => setOobCode(e.target.value)}
                    placeholder="Paste link or oobCode from email"
                    className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25 font-mono"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="forgot-otp"
                  className="block text-xs font-semibold text-slate-200 mb-1.5"
                >
                  6-Digit OTP Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="forgot-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white tracking-[0.25em] font-mono placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:to-teal-300 text-slate-950 text-sm font-bold shadow-[0_12px_32px_-6px_rgba(34,211,238,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify &amp; Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setStep('identify');
                  setError(null);
                  setNotice(null);
                }}
                className="text-slate-300 hover:text-white transition-colors"
              >
                Use a different {channel === 'email' ? 'email' : 'mobile number'}
              </button>
              <button
                type="button"
                disabled={resendCooldown > 0 || loading}
                onClick={handleSendRecovery}
                className="text-cyan-300 hover:text-cyan-200 disabled:text-slate-500"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3 & 4: NEW PASSWORD + CONFIRM NEW PASSWORD */}
      {step === 'newPassword' && (
        <div className="space-y-5">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 mb-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified: {verifiedAccountLabel}</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Set New Password
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Create a strong new password to protect your HelpConnect account.
            </p>
          </div>

          <form onSubmit={handleConfirmNewPassword} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="reset-new-password"
                className="block text-xs font-semibold text-slate-200 mb-1.5"
              >
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reset-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full min-h-[46px] pl-10 pr-11 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((p) => !p)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {newPassword && (
              <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Password Strength</span>
                  <span className={`font-bold ${passwordStrength.textColor}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1.5 rounded-full transition-colors ${
                        passwordStrength.score >= level
                          ? passwordStrength.barColor
                          : 'bg-slate-700/70'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="reset-confirm-password"
                className="block text-xs font-semibold text-slate-200 mb-1.5"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full min-h-[46px] pl-10 pr-11 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:to-teal-300 text-slate-950 text-sm font-bold shadow-[0_12px_32px_-6px_rgba(34,211,238,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 5: PASSWORD RESET SUCCESS */}
      {step === 'success' && (
        <div className="py-4 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center mx-auto text-emerald-300 shadow-[0_0_32px_rgba(16,185,129,0.28)]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Password Reset Successful
            </h2>
            <p className="text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
              Your HelpConnect password has been updated securely. You can now sign in with your new
              credentials.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              navigate('/login', {
                replace: true,
                state: {
                  notice: 'Password reset successful! Sign in with your new password.',
                },
              })
            }
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:to-teal-300 text-slate-950 text-sm font-bold shadow-[0_12px_32px_-6px_rgba(34,211,238,0.5)] transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <span>Return to Login</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </AuthShell>
  );
}
