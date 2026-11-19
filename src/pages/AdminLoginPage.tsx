import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Building2,
  Utensils,
  Droplet,
  History,
  HeartHandshake,
  PackageCheck,
  Sparkles,
  LayoutGrid,
  UserPlus,
} from 'lucide-react';
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleAuthProvider } from '../lib/firebase';
import { useAppContext } from '../context/AppContext';
import { formatFirebaseAuthError } from '../lib/authUtils';
import { cn } from '../lib/utils';

type PortalLoginTab = 'HOSPITAL' | 'HOMEAGE';

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

export function AdminLoginPage() {
  const { loginAsDemoPortal, loginAsDemoMultiRole } = useAppContext();
  const navigate = useNavigate();

  const [activePortal, setActivePortal] = useState<PortalLoginTab>('HOSPITAL');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchPortal = (next: PortalLoginTab) => {
    setActivePortal(next);
    setIdentifier('');
    setPassword('');
    setForgotMode(false);
    setError(null);
    setNotice(null);
  };

  const resolveOrgEmail = async (raw: string, expectedRole: PortalLoginTab): Promise<string> => {
    const cleaned = raw.trim().toLowerCase();
    if (cleaned.includes('@')) return cleaned;
    const uname = cleaned.replace(/[^a-z0-9_-]/g, '');
    if (!uname) {
      throw new Error(
        expectedRole === 'HOSPITAL'
          ? 'Enter a valid hospital email or username.'
          : 'Enter a valid Orphanage email or username.'
      );
    }
    const snap = await getDoc(doc(db, 'org_usernames', uname));
    if (!snap.exists()) {
      throw new Error(
        expectedRole === 'HOSPITAL'
          ? 'No Hospital account found for this username.'
          : 'No Orphanage account found for this username.'
      );
    }
    const data = snap.data() as { email?: string; role?: string };
    if (data.role !== expectedRole || !data.email) {
      throw new Error(
        expectedRole === 'HOSPITAL'
          ? 'This username does not belong to a Hospital account.'
          : 'This username does not belong to an Orphanage account.'
      );
    }
    return data.email;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!identifier.trim()) {
      setError('Please enter your email or username.');
      return;
    }

    setLoading(true);
    try {
      if (activePortal === 'HOSPITAL') {
        const targetEmail = await resolveOrgEmail(identifier, 'HOSPITAL');
        if (forgotMode) {
          await sendPasswordResetEmail(auth, targetEmail);
          setNotice(`Password reset link sent to ${targetEmail}.`);
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Please enter your hospital password.');
          setLoading(false);
          return;
        }
        const cred = await signInWithEmailAndPassword(auth, targetEmail, password);
        const hospSnap = await getDoc(doc(db, 'hospital_users', cred.user.uid));
        if (!hospSnap.exists()) {
          await signOut(auth);
          setError('Access denied. This account is not registered for the Hospital Portal.');
          return;
        }
        const hospData = hospSnap.data() as { status?: string };
        if (hospData.status !== 'ACTIVE') {
          await signOut(auth);
          setError('This Hospital account is currently deactivated.');
          return;
        }
        sessionStorage.setItem('helpconnect_active_portal', 'HOSPITAL');
        navigate('/hospital', { replace: true });
      } else {
        const targetEmail = await resolveOrgEmail(identifier, 'HOMEAGE');
        if (forgotMode) {
          await sendPasswordResetEmail(auth, targetEmail);
          setNotice(`Password reset link sent to ${targetEmail}.`);
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Please enter your Orphanage password.');
          setLoading(false);
          return;
        }
        const cred = await signInWithEmailAndPassword(auth, targetEmail, password);
        const homSnap = await getDoc(doc(db, 'homeage_users', cred.user.uid));
        if (!homSnap.exists()) {
          await signOut(auth);
          setError('Access denied. This account is not registered for the Orphanage Portal.');
          return;
        }
        const homData = homSnap.data() as { status?: string };
        if (homData.status !== 'ACTIVE') {
          await signOut(auth);
          setError('This Orphanage account is currently deactivated.');
          return;
        }
        sessionStorage.setItem('helpconnect_active_portal', 'HOMEAGE');
        navigate('/orphanage', { replace: true });
      }
    } catch (err) {
      setError(
        err instanceof Error && !('code' in err) ? err.message : formatFirebaseAuthError(err)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGooglePortalLogin = async () => {
    setError(null);
    setNotice(null);
    setGoogleLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const [hospSnap, homSnap] = await Promise.all([
        getDoc(doc(db, 'hospital_users', cred.user.uid)),
        getDoc(doc(db, 'homeage_users', cred.user.uid)),
      ]);

      if (activePortal === 'HOSPITAL') {
        if (hospSnap.exists()) {
          const hospData = hospSnap.data() as { status?: string };
          if (hospData.status !== 'ACTIVE') {
            await signOut(auth);
            setError('This Hospital account is currently deactivated.');
            return;
          }
          sessionStorage.setItem('helpconnect_active_portal', 'HOSPITAL');
          navigate('/hospital', { replace: true });
          return;
        }
        if (homSnap.exists()) {
          await signOut(auth);
          setError(
            'This Google account is registered for the Orphanage Portal. Switch to the Orphanage tab or use a separate Google account for the Hospital Portal.'
          );
          return;
        }
        navigate('/hospital/login?mode=register&google=1', { replace: true });
      } else {
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
            'This Google account is registered for the Hospital Portal. Switch to the Hospital tab or use a separate Google account for the Orphanage Portal.'
          );
          return;
        }
        navigate('/orphanage/login?mode=register&google=1', { replace: true });
      }
    } catch (err) {
      setError(
        err instanceof Error && !('code' in err) ? err.message : formatFirebaseAuthError(err)
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDemoLogin = async (role: PortalLoginTab) => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await loginAsDemoPortal(role);
      navigate(role === 'HOSPITAL' ? '/hospital' : '/orphanage', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMultiRoleLogin = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await loginAsDemoMultiRole();
      navigate('/portals', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        'min-h-screen flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden transition-colors duration-300',
        activePortal === 'HOSPITAL'
          ? 'bg-gradient-to-br from-sky-950 via-blue-950 to-slate-950 text-white'
          : 'bg-gradient-to-br from-emerald-950 via-slate-950 to-orange-950/80 text-white'
      )}
    >
      <div className="w-full max-w-lg relative z-10 space-y-5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <Link to="/login" className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Back to User Login
          </Link>
          <span className="font-mono uppercase tracking-wider text-slate-300 font-semibold">
            2 Isolated Portals
          </span>
        </div>

        {/* 2 Separate Login Portal Tabs: Hospital & Homeage ONLY */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <button
            type="button"
            onClick={() => switchPortal('HOSPITAL')}
            className={cn(
              'py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all whitespace-nowrap',
              activePortal === 'HOSPITAL'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-blue-300 hover:bg-slate-800/70'
            )}
          >
            <Building2 size={15} />
            <span>Hospital Portal</span>
          </button>

          <button
            type="button"
            onClick={() => switchPortal('HOMEAGE')}
            className={cn(
              'py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all whitespace-nowrap',
              activePortal === 'HOMEAGE'
                ? 'bg-gradient-to-r from-emerald-600 to-orange-500 text-white shadow-md'
                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/70'
            )}
          >
            <Utensils size={15} />
            <span>Orphanage Portal</span>
          </button>
        </div>

        {/* Portal Card */}
        <div
          className={cn(
            'rounded-3xl bg-slate-900/95 border p-7 sm:p-8 shadow-2xl space-y-6',
            activePortal === 'HOSPITAL'
              ? 'border-blue-500/40'
              : 'border-emerald-500/40'
          )}
        >
          {/* Portal Header */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center border',
                  activePortal === 'HOSPITAL'
                    ? 'bg-blue-500/15 border-blue-400/40 text-blue-300'
                    : 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                )}
              >
                {activePortal === 'HOSPITAL' ? <Building2 size={24} /> : <Utensils size={24} />}
              </div>

              <span
                className={cn(
                  'text-xs font-semibold',
                  activePortal === 'HOSPITAL' ? 'text-blue-300' : 'text-emerald-300'
                )}
              >
                {activePortal === 'HOSPITAL' ? 'Hospital Work Only' : 'Orphanage Only'}
              </span>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight">
              {activePortal === 'HOSPITAL'
                ? 'Hospital Management Login'
                : 'Orphanage Food Donation Login'}
            </h1>

            <p className="text-xs text-slate-400 leading-relaxed">
              {activePortal === 'HOSPITAL'
                ? 'Strictly isolated Hospital Portal to request blood directly from community donors, view donor details, and search previous blood donation history. Food & Orphanage data is never shown here.'
                : 'Strictly isolated Orphanage Portal for Surplus Food Donations, Pickup Requests, Food Assistance, and Volunteers. Hospital & Blood data is never shown here.'}
            </p>
          </div>

          {/* Scope Indicators */}
          {activePortal === 'HOSPITAL' ? (
            <div className="grid grid-cols-2 gap-2.5 text-[11px] font-semibold">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-200 flex items-center gap-2">
                <Droplet size={14} className="text-rose-400 shrink-0" />
                <span>Request Blood to People</span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-200 flex items-center gap-2">
                <History size={14} className="text-sky-400 shrink-0" />
                <span>Accepted Donors &amp; History</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 text-[11px] font-semibold">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-200 flex items-center gap-2">
                <PackageCheck size={14} className="text-emerald-400 shrink-0" />
                <span>Surplus Food Pickups</span>
              </div>
              <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-200 flex items-center gap-2">
                <HeartHandshake size={14} className="text-orange-400 shrink-0" />
                <span>Food Requests Only</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200">
              {notice}
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="portal-id" className="block text-xs font-semibold text-slate-300 mb-1.5">
                {activePortal === 'HOSPITAL'
                  ? 'Hospital Email or Username'
                  : 'Orphanage Email or Username'}
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="portal-id"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    activePortal === 'HOSPITAL'
                      ? 'hospital@medcenter.org or username'
                      : 'orphanage@foodrescue.org or username'
                  }
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            {!forgotMode && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="portal-pass" className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true);
                      setError(null);
                      setNotice(null);
                    }}
                    className="text-xs font-semibold text-sky-300 hover:text-sky-200"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="portal-pass"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60',
                activePortal === 'HOSPITAL'
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-gradient-to-r from-emerald-600 to-orange-500 hover:from-emerald-500 hover:to-orange-400'
              )}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <span>
                    {forgotMode
                      ? 'Send Password Reset'
                      : activePortal === 'HOSPITAL'
                        ? 'Sign In to Hospital Portal'
                        : 'Sign In to Orphanage Portal'}
                  </span>
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
                className="w-full text-xs text-slate-400 hover:text-white py-1"
              >
                Return to Sign In
              </button>
            )}
          </form>

          {/* GOOGLE AUTH + INSTANT DEMO LOGIN SECTION */}
          {!forgotMode && (
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[11px]">
                  <span className="px-2.5 bg-slate-900 text-slate-400 font-semibold">
                    Or continue with Google
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={loading || googleLoading}
                onClick={() => void handleGooglePortalLogin()}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold flex items-center justify-center gap-2.5 shadow-sm transition-colors disabled:opacity-60"
              >
                {googleLoading ? (
                  <Loader2 size={15} className="animate-spin text-blue-600" />
                ) : (
                  <GoogleLogo />
                )}
                <span>
                  {activePortal === 'HOSPITAL'
                    ? 'Continue with Google — Hospital Portal'
                    : 'Continue with Google — Orphanage Portal'}
                </span>
              </button>

              <div className="pt-3 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold uppercase tracking-wider text-slate-400 inline-flex items-center gap-1.5">
                    <Sparkles size={12} className="text-amber-400" /> Instant Demo Access
                  </span>
                  <span className="text-slate-500">Strict role isolation active</span>
                </div>

              <button
                type="button"
                disabled={loading}
                onClick={() => void handleDemoLogin(activePortal)}
                className={cn(
                  'w-full py-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all disabled:opacity-60',
                  activePortal === 'HOSPITAL'
                    ? 'bg-blue-500/15 hover:bg-blue-500/25 border-blue-400/40 text-blue-200'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/40 text-emerald-200'
                )}
              >
                {activePortal === 'HOSPITAL' ? (
                  <>
                    <Building2 size={15} />
                    <span>Demo Login — Hospital Blood Portal</span>
                  </>
                ) : (
                  <>
                    <Utensils size={15} />
                    <span>Demo Login — Orphanage Portal (Food Rescue Only)</span>
                  </>
                )}
              </button>

              <Link
                to={
                  activePortal === 'HOSPITAL'
                    ? '/hospital/login?mode=register'
                    : '/orphanage/login?mode=register'
                }
                className={cn(
                  'w-full py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors',
                  activePortal === 'HOSPITAL'
                    ? 'bg-slate-950 hover:bg-slate-800 border-blue-500/40 text-blue-200'
                    : 'bg-slate-950 hover:bg-slate-800 border-emerald-500/40 text-emerald-200'
                )}
              >
                <UserPlus size={14} />
                <span>
                  {activePortal === 'HOSPITAL'
                    ? 'Create New Hospital Account'
                    : 'Create New Orphanage Account'}
                </span>
              </Link>

                <button
                  type="button"
                  disabled={loading || googleLoading}
                  onClick={() => void handleDemoMultiRoleLogin()}
                  className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  <LayoutGrid size={14} />
                  <span>Demo Multi-Role (Hospital &amp; Orphanage Selector)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
