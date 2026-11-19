import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Utensils,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  ArrowLeft,
  HeartHandshake,
  PackageCheck,
  Sparkles,
  UserPlus,
  LogIn,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleAuthProvider } from '../lib/firebase';
import { useAppContext } from '../context/AppContext';
import { formatFirebaseAuthError } from '../lib/authUtils';
import { cn } from '../lib/utils';

function GoogleLogo({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
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
  );
}

const HOMEAGE_ORG_TYPES = [
  "Orphanage / Children's Home",
  'Old Age Home / Shelter',
  'Community Kitchen',
  'NGO / Food Rescue Trust',
  'Homeless Shelter',
  'Charitable Trust',
];

export function HomeageLoginPage() {
  const { loginAsDemoPortal, registerHomeageAccount } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<'login' | 'register'>(
    searchParams.get('mode') === 'register' ? 'register' : 'login'
  );

  // Sign In state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  // Create Homeage Account state
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState(HOMEAGE_ORG_TYPES[0]);
  const [regNumber, setRegNumber] = useState('');
  const [dailyCapacity, setDailyCapacity] = useState<number>(60);
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [username, setUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmedSafety, setConfirmedSafety] = useState(false);

  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const prefillFromGoogleUser = (fbUser: FirebaseUser) => {
    setGoogleUser(fbUser);
    const email = (fbUser.email || '').trim().toLowerCase();
    if (email) {
      setRegEmail(email);
      const base = email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 24);
      setUsername((prev) => prev || (base.length >= 3 ? `${base}_org` : `orphanage_${Date.now().toString().slice(-4)}`));
    }
    if (fbUser.displayName) {
      setContactPerson((prev) => prev || fbUser.displayName || '');
    }
  };

  useEffect(() => {
    if (searchParams.get('google') === '1' && auth.currentUser) {
      prefillFromGoogleUser(auth.currentUser);
      setMode('register');
      setNotice('Google account connected! Fill in your Orphanage details below to finish creating your portal account.');
    }
  }, [searchParams]);

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setForgotMode(false);
    setError(null);
    setNotice(null);
  };

  const resolveEmail = async (raw: string): Promise<string> => {
    const cleaned = raw.trim().toLowerCase();
    if (cleaned.includes('@')) return cleaned;
    const uname = cleaned.replace(/[^a-z0-9_-]/g, '');
    if (!uname) throw new Error('Enter a valid Orphanage email or username.');
    const snap = await getDoc(doc(db, 'org_usernames', uname));
    if (!snap.exists()) {
      throw new Error('No Orphanage account found for this username.');
    }
    const data = snap.data() as { email?: string; role?: string };
    if (data.role !== 'HOMEAGE' || !data.email) {
      throw new Error('This username does not belong to a registered Orphanage account.');
    }
    return data.email;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!identifier.trim()) {
      setError('Please enter your Orphanage email or username.');
      return;
    }

    setLoading(true);
    try {
      const targetEmail = await resolveEmail(identifier);

      if (forgotMode) {
        await sendPasswordResetEmail(auth, targetEmail);
        setNotice(`Password reset link sent to ${targetEmail}.`);
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Please enter your password.');
        setLoading(false);
        return;
      }

      const cred = await signInWithEmailAndPassword(auth, targetEmail, password);
      const homUserSnap = await getDoc(doc(db, 'homeage_users', cred.user.uid));
      if (!homUserSnap.exists()) {
        await signOut(auth);
        setError('Access denied. This account is not registered for the Orphanage Portal.');
        return;
      }
      const homData = homUserSnap.data() as { status?: string };
      if (homData.status !== 'ACTIVE') {
        await signOut(auth);
        setError('This Orphanage account is currently deactivated.');
        return;
      }
      sessionStorage.setItem('helpconnect_active_portal', 'HOMEAGE');
      navigate('/orphanage', { replace: true });
    } catch (err) {
      setError(
        err instanceof Error && !('code' in err) ? err.message : formatFirebaseAuthError(err)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setNotice(null);
    setGoogleLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const [homSnap, hospSnap] = await Promise.all([
        getDoc(doc(db, 'homeage_users', cred.user.uid)),
        getDoc(doc(db, 'hospital_users', cred.user.uid)),
      ]);

      if (homSnap.exists()) {
        const homData = homSnap.data() as { status?: string };
        if (homData.status !== 'ACTIVE') {
          await signOut(auth);
          setError('This Orphanage account is currently deactivated.');
          return;
        }
        sessionStorage.setItem('helpconnect_active_portal', 'HOMEAGE');
        navigate('/orphanage', { replace: true });
        return;
      }

      if (hospSnap.exists()) {
        await signOut(auth);
        setError(
          'This Google account is already registered for the Hospital Portal. Please use a separate Google account for the Orphanage Portal.'
        );
        return;
      }

      prefillFromGoogleUser(cred.user);
      setMode('register');
      setForgotMode(false);
      setNotice(
        'Google account verified! Complete your Orphanage details below to activate your Orphanage Portal account.'
      );
    } catch (err) {
      setError(
        err instanceof Error && !('code' in err) ? err.message : formatFirebaseAuthError(err)
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setGoogleUser(null);
    setNotice(null);
    setError(null);
    await signOut(auth).catch(() => {});
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const isGoogleSignup = Boolean(googleUser && auth.currentUser?.uid === googleUser.uid);

    if (!confirmedSafety) {
      setError('Please confirm your food handling safety commitment and accurate organization details.');
      return;
    }
    if (!isGoogleSignup) {
      if (regPassword.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (regPassword !== confirmPassword) {
        setError('Password and Confirm Password do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      await registerHomeageAccount({
        name: orgName,
        organizationType: orgType,
        registrationNumber: regNumber.trim() || undefined,
        dailyCapacity: Math.max(1, Number(dailyCapacity) || 1),
        contactPerson,
        mobile,
        email: isGoogleSignup && googleUser?.email ? googleUser.email : regEmail,
        address,
        city,
        state: stateName,
        postalCode: postalCode.trim() || undefined,
        username,
        password: isGoogleSignup ? undefined : regPassword,
        useCurrentAuthUser: isGoogleSignup,
      });
      navigate('/orphanage', { replace: true });
    } catch (err) {
      setError(
        err instanceof Error && !('code' in err) ? err.message : formatFirebaseAuthError(err)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoHomeageLogin = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await loginAsDemoPortal('HOMEAGE');
      navigate('/orphanage', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 flex flex-col justify-center items-center px-4 py-10">
      <div className={cn('w-full space-y-5', mode === 'register' ? 'max-w-2xl' : 'max-w-md')}>
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold"
          >
            <ArrowLeft size={14} /> Back to HelpConnect Login
          </Link>
          <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            Food Rescue Portal
          </span>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 p-7 sm:p-8 shadow-xl shadow-emerald-900/5 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/25">
                <Utensils size={24} />
              </div>

              {/* Sign In / Create Account Switcher */}
              <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors',
                    mode === 'login'
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  )}
                >
                  <LogIn size={13} /> Sign In
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors',
                    mode === 'register'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  )}
                >
                  <UserPlus size={13} /> Create Account
                </button>
              </div>
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {mode === 'register'
                ? 'Register Orphanage Account'
                : 'Orphanage Food Donation Portal'}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {mode === 'register'
                ? 'Create an Orphanage & Shelter account with complete organization details to receive surplus food donations, schedule pickups, and fulfill community meal assistance.'
                : 'Dedicated Orphanage & shelter sign-in to receive surplus food donations, coordinate pickups, and fulfill community food assistance requests.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-[11px] font-semibold">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <PackageCheck size={14} className="text-emerald-600 shrink-0" />
              <span>Surplus Food Pickup</span>
            </div>
            <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900 text-orange-800 dark:text-orange-300 flex items-center gap-2">
              <HeartHandshake size={14} className="text-orange-600 shrink-0" />
              <span>Food Assistance Only</span>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-200 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-200">
              {notice}
            </div>
          )}

          {mode === 'login' ? (
            <>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="hmg-id"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5"
                  >
                    Orphanage Email or Username
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="hmg-id"
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="orphanage@foodrescue.org or username"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                {!forgotMode && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="hmg-pass"
                        className="block text-xs font-bold text-slate-700 dark:text-slate-200"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotMode(true);
                          setError(null);
                          setNotice(null);
                        }}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 dark:text-emerald-400"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        id="hmg-pass"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter orphanage password"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-orange-500 hover:from-emerald-700 hover:to-orange-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <span>{forgotMode ? 'Send Password Reset' : 'Sign In to Orphanage Portal'}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                {forgotMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(false);
                      setError(null);
                      setNotice(null);
                    }}
                    className="w-full text-xs text-slate-500 hover:text-slate-800 py-1"
                  >
                    Return to Orphanage Sign In
                  </button>
                )}
              </form>

              {!forgotMode && (
                <div className="space-y-4">
                  {/* Google Sign-In Divider + Button */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                    </div>
                    <div className="relative flex justify-center text-[11px]">
                      <span className="px-2.5 bg-white dark:bg-slate-900 text-slate-400 font-semibold">
                        Or sign in with Google
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={loading || googleLoading}
                    onClick={() => void handleGoogleAuth()}
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white text-xs font-bold flex items-center justify-center gap-2.5 shadow-sm transition-colors disabled:opacity-60"
                  >
                    {googleLoading ? (
                      <Loader2 size={15} className="animate-spin text-emerald-600" />
                    ) : (
                      <GoogleLogo />
                    )}
                    <span>Continue with Google</span>
                  </button>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                        <Sparkles size={12} className="text-amber-500" /> Instant Demo Access
                      </span>
                      <span className="text-slate-400">Food rescue only</span>
                    </div>
                    <button
                      type="button"
                      disabled={loading || googleLoading}
                      onClick={() => void handleDemoHomeageLogin()}
                      className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-extrabold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                    >
                      <Utensils size={15} />
                      <span>Demo Login — Orphanage Portal (Food Rescue Only)</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-5">
              {/* Google Quick Registration Banner */}
              {googleUser ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0 overflow-hidden">
                      {googleUser.photoURL ? (
                        <img
                          src={googleUser.photoURL}
                          alt={googleUser.displayName || 'Google user'}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <GoogleLogo />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                        <span>Connected with Google</span>
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                        {googleUser.email}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDisconnectGoogle()}
                    className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0"
                  >
                    Use Email &amp; Password instead
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={loading || googleLoading}
                  onClick={() => void handleGoogleAuth()}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white text-xs font-bold flex items-center justify-center gap-2.5 shadow-sm transition-colors disabled:opacity-60"
                >
                  {googleLoading ? (
                    <Loader2 size={15} className="animate-spin text-emerald-600" />
                  ) : (
                    <GoogleLogo />
                  )}
                  <span>Sign up with Google (No password needed)</span>
                </button>
              )}
              {/* Section 1: Orphanage Organization Details */}
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  1. Orphanage &amp; Organization Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Orphanage / Organization Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. Hope Children's Orphanage & Kitchen"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Organization Type *
                    </label>
                    <select
                      value={orgType}
                      onChange={(e) => setOrgType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    >
                      {HOMEAGE_ORG_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Registration / Trust Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value)}
                      placeholder="e.g. NGO-TN-2026-4410"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Daily People Served / Meal Capacity *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50000}
                      required
                      value={dailyCapacity}
                      onChange={(e) => setDailyCapacity(Math.max(1, Number(e.target.value) || 1))}
                      placeholder="e.g. 80"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Coordinator & Location */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  2. Coordinator Contact &amp; Shelter Address
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Coordinator / Contact Person *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="e.g. Lakshmi Narayanan"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Official Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="+91 98409 33112"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Complete Orphanage Street Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Door No., Street, Area / Landmark"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Chennai"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                        State *
                      </label>
                      <input
                        type="text"
                        required
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        placeholder="Tamil Nadu"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                        PIN Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="600020"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Portal Login Credentials */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  3. Orphanage Portal Login Credentials
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Organization Email *
                    </label>
                    <input
                      type="email"
                      required
                      readOnly={Boolean(googleUser?.email)}
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="care@yourorphanage.org"
                      className={cn(
                        'w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600',
                        googleUser?.email
                          ? 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-85 cursor-not-allowed'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700'
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Portal Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) =>
                        setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                      }
                      placeholder="e.g. hope_orphanage_chennai"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  {!googleUser && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                          Password (min 6 chars) *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Create secure password"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                          Confirm Password *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900">
                <input
                  type="checkbox"
                  checked={confirmedSafety}
                  onChange={(e) => setConfirmedSafety(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  I confirm that our Orphanage/organization details are accurate and that all collected surplus food will be handled hygienically and distributed strictly to people in need.
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-orange-500 hover:from-emerald-700 hover:to-orange-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Create Orphanage Account</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              {mode === 'login' ? (
                <>
                  New Orphanage / shelter?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    Create Orphanage Account
                  </button>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    Sign In
                  </button>
                </>
              )}
            </span>
            <Link
              to="/portals/login"
              className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              All Portals
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
