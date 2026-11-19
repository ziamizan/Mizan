import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Droplet,
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import {
  ConfirmationResult,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  linkWithPhoneNumber,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAppContext } from '../context/AppContext';
import { AuthShell } from '../components/AuthShell';
import {
  BLOOD_GROUP_OPTIONS,
  HELP_VOLUNTEER_OPTIONS,
  buildIdentifierDocId,
  compressAvatarFile,
  evaluatePasswordStrength,
  formatFirebaseAuthError,
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizePhone,
} from '../lib/authUtils';

const COUNTRY_CODES = [
  { code: '+91', label: 'IN +91' },
  { code: '+1', label: 'US +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+971', label: 'AE +971' },
  { code: '+65', label: 'SG +65' },
  { code: '+61', label: 'AU +61' },
];

export function RegisterPage() {
  const { setAwaitingRegistrationVerification, signOutUser } = useAppContext();
  const navigate = useNavigate();

  // Stage 1: Registration details, Stage 2: Account verification
  const [stage, setStage] = useState<'form' | 'verify'>('form');

  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [selectedHelpCategories, setSelectedHelpCategories] = useState<string[]>([
    'Volunteering',
  ]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Stage 2 verification state
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredMobile, setRegisteredMobile] = useState('');
  const [emailVerifiedDone, setEmailVerifiedDone] = useState(false);
  const [mobileVerifiedDone, setMobileVerifiedDone] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [phoneConfirmResult, setPhoneConfirmResult] = useState<ConfirmationResult | null>(null);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const passwordStrength = evaluatePasswordStrength(password);

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const t = window.setInterval(() => {
      setEmailCooldown((p) => (p > 0 ? p - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [emailCooldown]);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = window.setInterval(() => {
      setOtpCooldown((p) => (p > 0 ? p - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [otpCooldown]);

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
    };
  }, []);

  const toggleHelpCategory = (category: string) => {
    setSelectedHelpCategories((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]
    );
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressAvatarFile(file);
      setPhotoDataUrl(compressed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to upload profile photo.');
    }
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
    const verifier = new RecaptchaVerifier(auth, 'register-recaptcha-container', {
      size: 'invisible',
    });
    recaptchaRef.current = verifier;
    return verifier;
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const trimmedName = fullName.trim();
    const cleanedEmail = normalizeEmail(email);
    const formattedPhone = normalizePhone(mobile, countryCode);
    const trimmedCity = city.trim();
    const trimmedState = stateName.trim();

    if (trimmedName.length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!mobile.trim() || !isValidPhone(formattedPhone, countryCode)) {
      setError('Please enter a valid mobile number (for example, 9876543210).');
      return;
    }
    if (!cleanedEmail || !isValidEmail(cleanedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long for strong security.');
      return;
    }
    if (passwordStrength.score < 2) {
      setError('Please choose a stronger password with mixed letters and numbers.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both password fields.');
      return;
    }
    if (!trimmedCity || !trimmedState) {
      setError('Please enter both your city and state.');
      return;
    }
    if (selectedHelpCategories.length === 0) {
      setError('Please select at least one way you would like to help the community.');
      return;
    }
    if (!acceptedTerms) {
      setError('Please accept the Terms of Service and Privacy Policy to create an account.');
      return;
    }

    setLoading(true);
    try {
      // Duplicate email and mobile check via non-PII SHA-256 registry
      const [emailHashId, mobileHashId] = await Promise.all([
        buildIdentifierDocId('email', cleanedEmail),
        buildIdentifierDocId('mobile', formattedPhone),
      ]);

      const [existingEmailSnap, existingMobileSnap] = await Promise.all([
        getDoc(doc(db, 'account_identifiers', emailHashId)),
        getDoc(doc(db, 'account_identifiers', mobileHashId)),
      ]);

      if (existingEmailSnap.exists()) {
        setError('An account with this email address already exists. Please sign in instead.');
        setLoading(false);
        return;
      }
      if (existingMobileSnap.exists()) {
        setError('This mobile number is already registered with another HelpConnect account.');
        setLoading(false);
        return;
      }

      // Hold user in registration verification step after auth creation
      setAwaitingRegistrationVerification(true);

      const cred = await createUserWithEmailAndPassword(auth, cleanedEmail, password);
      const fbUser = cred.user;

      await updateProfile(fbUser, {
        displayName: trimmedName.slice(0, 80),
      });

      const approximateArea = `${trimmedCity}, ${trimmedState}`.slice(0, 120);
      const fullLocation = `${trimmedCity}, ${trimmedState}`.slice(0, 200);
      const helpList = selectedHelpCategories.slice(0, 15);

      const batch = writeBatch(db);

      batch.set(doc(db, 'users', fbUser.uid), {
        uid: fbUser.uid,
        displayName: trimmedName.slice(0, 80),
        photoUrl: photoDataUrl || '',
        bloodGroup: bloodGroup || '',
        approximateArea,
        canProvide: helpList,
        verified: false,
        peopleHelped: 0,
        requestsCompleted: 0,
        volunteerHours: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'users', fbUser.uid, 'private', 'info'), {
        uid: fbUser.uid,
        email: cleanedEmail,
        mobile: formattedPhone,
        city: trimmedCity.slice(0, 80),
        state: trimmedState.slice(0, 80),
        fullLocation,
        helpCategories: helpList,
        mobileVerified: false,
        termsAcceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'account_identifiers', emailHashId), {
        identifierType: 'email',
        uid: fbUser.uid,
        createdAt: serverTimestamp(),
      });

      batch.set(doc(db, 'account_identifiers', mobileHashId), {
        identifierType: 'mobile',
        uid: fbUser.uid,
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      try {
        await sendEmailVerification(fbUser);
        setEmailCooldown(30);
        setNotice(`Verification link sent to ${cleanedEmail}. Please verify your email and mobile below.`);
      } catch {
        setNotice('Account created! Please use the verification controls below to verify your email and mobile.');
      }

      setRegisteredEmail(cleanedEmail);
      setRegisteredMobile(formattedPhone);
      setStage('verify');
    } catch (err: unknown) {
      setAwaitingRegistrationVerification(false);
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    setError(null);
    const current = auth.currentUser;
    if (!current) {
      setError('Session expired. Please sign in to resend verification.');
      return;
    }
    setVerifyingEmail(true);
    try {
      await sendEmailVerification(current);
      setEmailCooldown(30);
      setNotice(`Verification link resent to ${registeredEmail}. Check your inbox or spam folder.`);
    } catch (err: unknown) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleCheckEmailVerified = async () => {
    setError(null);
    const current = auth.currentUser;
    if (!current) {
      setError('Session expired. Please sign in again.');
      return;
    }
    setVerifyingEmail(true);
    try {
      await current.reload();
      if (current.emailVerified) {
        setEmailVerifiedDone(true);
        await updateDoc(doc(db, 'users', current.uid), {
          verified: true,
          updatedAt: serverTimestamp(),
        });
        setNotice('Email address verified successfully!');
      } else {
        setError('Your email is not verified yet. Please click the verification link in your inbox, then check again.');
      }
    } catch (err: unknown) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleSendRegistrationMobileOtp = async () => {
    setError(null);
    const current = auth.currentUser;
    if (!current) {
      setError('Session expired. Please sign in again.');
      return;
    }
    setSendingOtp(true);
    try {
      const verifier = getOrCreateRecaptcha();
      const result = await linkWithPhoneNumber(current, registeredMobile, verifier);
      setPhoneConfirmResult(result);
      setOtpRequested(true);
      setOtpCooldown(30);
      setNotice(`6-digit OTP sent to ${registeredMobile}.`);
    } catch (err: unknown) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleConfirmRegistrationOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phoneConfirmResult) {
      setError('Please request a new OTP code first.');
      return;
    }
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError('Please enter the 6-digit OTP sent to your mobile number.');
      return;
    }
    setVerifyingOtp(true);
    try {
      await phoneConfirmResult.confirm(otpCode.trim());
      const current = auth.currentUser;
      if (current) {
        await updateDoc(doc(db, 'users', current.uid, 'private', 'info'), {
          mobileVerified: true,
          updatedAt: serverTimestamp(),
        });
      }
      setMobileVerifiedDone(true);
      setNotice('Mobile number verified via OTP!');
    } catch (err: unknown) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleFinishAndGoToLogin = async () => {
    setLoading(true);
    try {
      await signOutUser();
    } finally {
      setLoading(false);
      navigate('/login', {
        replace: true,
        state: {
          notice: emailVerifiedDone
            ? 'Your HelpConnect account is verified! Sign in with your email and password to continue.'
            : 'Account created! Verify your email link if needed and sign in to HelpConnect.',
        },
      });
    }
  };

  return (
    <AuthShell compactBrandOnMobile>
      <div id="register-recaptcha-container" />

      {stage === 'form' ? (
        <>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Create New Account
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Join HelpConnect to request help or volunteer nearby.
              </p>
            </div>
            <Link
              to="/login"
              className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1 whitespace-nowrap shrink-0 mt-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-400/35 text-xs text-rose-200 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleCreateAccount} noValidate className="space-y-4">
            {/* Profile Photo Optional Upload */}
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
              <div className="relative shrink-0">
                {photoDataUrl ? (
                  <div className="relative">
                    <img
                      src={photoDataUrl}
                      alt="Profile preview"
                      className="w-14 h-14 rounded-full object-cover border-2 border-cyan-400/60"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoDataUrl('')}
                      aria-label="Remove profile photo"
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border border-white/25 text-white flex items-center justify-center hover:bg-rose-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                    <UserIcon className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white">Profile Photo (Optional)</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Helps build trust when accepting or requesting assistance.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-cyan-200 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{photoDataUrl ? 'Change' : 'Upload'}</span>
              </button>
            </div>

            {/* Full Name + Blood Group */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8">
                <label
                  htmlFor="reg-fullname"
                  className="block text-xs font-semibold text-slate-200 mb-1.5"
                >
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25"
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label
                  htmlFor="reg-blood"
                  className="block text-xs font-semibold text-slate-200 mb-1.5"
                >
                  Blood Group
                </label>
                <div className="relative">
                  <Droplet className="w-3.5 h-3.5 text-rose-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    id="reg-blood"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full min-h-[44px] pl-8 pr-2 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-xs font-medium text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">Optional</option>
                    {BLOOD_GROUP_OPTIONS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Mobile Number + Email */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label
                  htmlFor="reg-mobile"
                  className="block text-xs font-semibold text-slate-200 mb-1.5"
                >
                  Mobile Number
                </label>
                <div className="flex gap-2">
                  <select
                    aria-label="Country code"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="min-h-[44px] px-2.5 rounded-xl bg-slate-900/90 border border-white/15 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400"
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
                      id="reg-mobile"
                      type="tel"
                      required
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="98765 43210"
                      className="w-full min-h-[44px] pl-10 pr-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25 tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-semibold text-slate-200 mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25"
                  />
                </div>
              </div>
            </div>

            {/* City & State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="reg-city"
                  className="block text-xs font-semibold text-slate-200 mb-1.5"
                >
                  City
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-city"
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g., Chennai"
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-state"
                  className="block text-xs font-semibold text-slate-200 mb-1.5"
                >
                  State
                </label>
                <input
                  id="reg-state"
                  type="text"
                  required
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="e.g., Tamil Nadu"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25"
                />
              </div>
            </div>

            {/* Password & Strength Meter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-semibold text-slate-200 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full min-h-[44px] pl-10 pr-10 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-confirm-password"
                  className="block text-xs font-semibold text-slate-200 mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full min-h-[44px] pl-10 pr-10 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Strength Bar */}
            {password && (
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
                <p className="text-[11px] text-slate-400">
                  Use 8+ characters with uppercase, lowercase, numbers, and a symbol.
                </p>
              </div>
            )}

            {/* How would you like to help? */}
            <div>
              <p className="block text-xs font-semibold text-slate-200 mb-2">
                How would you like to help?
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {HELP_VOLUNTEER_OPTIONS.map((option) => {
                  const selected = selectedHelpCategories.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleHelpCategory(option)}
                      aria-pressed={selected}
                      className={`min-h-[38px] px-2.5 py-2 rounded-xl border text-left text-[11px] font-semibold transition-all flex items-center justify-between gap-1.5 ${
                        selected
                          ? 'bg-cyan-500/20 border-cyan-400/70 text-cyan-100 shadow-sm shadow-cyan-500/20'
                          : 'bg-white/[0.04] border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{option}</span>
                      {selected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Terms & Privacy Policy */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-white/25 bg-white/10 text-cyan-400 focus:ring-cyan-400/40 shrink-0"
                />
                <span className="text-xs text-slate-300 leading-relaxed">
                  I agree to the HelpConnect{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2 font-semibold"
                  >
                    Terms of Service &amp; Privacy Policy
                  </button>
                  .
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:to-teal-300 text-slate-950 text-sm font-bold shadow-[0_12px_32px_-6px_rgba(34,211,238,0.5)] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-60 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account &amp; Verify</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-white/10 text-center">
            <p className="text-xs text-slate-300">
              Already registered on HelpConnect?{' '}
              <Link
                to="/login"
                className="font-bold text-cyan-300 hover:text-cyan-200 underline underline-offset-4 ml-1"
              >
                Login Here
              </Link>
            </p>
          </div>
        </>
      ) : (
        /* STAGE 2: ACCOUNT VERIFICATION (EMAIL + MOBILE OTP) */
        <div className="space-y-5">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-300 mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Account Security Verification</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Verify Your Account
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Confirm your email and mobile number before signing in to HelpConnect.
            </p>
          </div>

          {notice && (
            <div
              role="status"
              className="p-3.5 rounded-2xl bg-cyan-500/15 border border-cyan-400/35 text-xs text-cyan-100 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-400/35 text-xs text-rose-200 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Email Verification Card */}
          <div className="rounded-2xl bg-white/[0.05] border border-white/15 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">1. Email Verification</p>
                  <p className="text-xs text-slate-300 truncate mt-0.5">{registeredEmail}</p>
                </div>
              </div>
              {emailVerifiedDone ? (
                <span className="text-xs font-bold text-emerald-300 inline-flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-4 h-4" /> Verified
                </span>
              ) : (
                <span className="text-xs font-semibold text-amber-300 shrink-0">Pending</span>
              )}
            </div>

            {!emailVerifiedDone && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={verifyingEmail}
                  onClick={handleCheckEmailVerified}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-xs font-bold text-cyan-100 inline-flex items-center gap-1.5 transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                  {verifyingEmail ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>I&apos;ve Verified My Email</span>
                </button>
                <button
                  type="button"
                  disabled={verifyingEmail || emailCooldown > 0}
                  onClick={handleResendVerificationEmail}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-semibold text-slate-200 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {emailCooldown > 0 ? `Resend in ${emailCooldown}s` : 'Resend Email'}
                </button>
              </div>
            )}
          </div>

          {/* Mobile OTP Verification Card */}
          <div className="rounded-2xl bg-white/[0.05] border border-white/15 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">2. Mobile OTP Verification</p>
                  <p className="text-xs text-slate-300 truncate mt-0.5 tabular-nums">
                    {registeredMobile}
                  </p>
                </div>
              </div>
              {mobileVerifiedDone ? (
                <span className="text-xs font-bold text-emerald-300 inline-flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-4 h-4" /> Verified
                </span>
              ) : (
                <span className="text-xs font-semibold text-amber-300 shrink-0">Pending</span>
              )}
            </div>

            {!mobileVerifiedDone && !otpRequested && (
              <button
                type="button"
                disabled={sendingOtp}
                onClick={handleSendRegistrationMobileOtp}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-xs font-bold text-teal-100 inline-flex items-center gap-2 transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {sendingOtp ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <KeyRound className="w-3.5 h-3.5" />
                )}
                <span>Send Mobile OTP</span>
              </button>
            )}

            {!mobileVerifiedDone && otpRequested && (
              <form onSubmit={handleConfirmRegistrationOtp} className="space-y-2.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit OTP"
                    className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white tracking-[0.2em] font-mono placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:border-teal-400"
                  />
                  <button
                    type="submit"
                    disabled={verifyingOtp}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0 disabled:opacity-60"
                  >
                    {verifyingOtp ? 'Checking...' : 'Verify OTP'}
                  </button>
                </div>
                <button
                  type="button"
                  disabled={sendingOtp || otpCooldown > 0}
                  onClick={handleSendRegistrationMobileOtp}
                  className="text-xs text-cyan-300 hover:text-cyan-200 disabled:text-slate-500"
                >
                  {otpCooldown > 0 ? `Resend OTP in ${otpCooldown}s` : 'Resend Mobile OTP'}
                </button>
              </form>
            )}
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleFinishAndGoToLogin}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:to-teal-300 text-slate-950 text-sm font-bold shadow-[0_12px_32px_-6px_rgba(34,211,238,0.5)] transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>
                  {emailVerifiedDone
                    ? 'Account Verified — Continue to Login'
                    : 'Continue to Login'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Terms & Privacy Policy Modal */}
      {showTermsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="HelpConnect Terms and Privacy Policy"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/15 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Terms &amp; Privacy Policy</h3>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                aria-label="Close terms dialog"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-300 space-y-2.5 leading-relaxed max-h-60 overflow-y-auto pr-1">
              <p>
                <strong className="text-white">Privacy Protection:</strong> HelpConnect isolates
                sensitive contact information (email address, mobile number, and full city/state
                details) in private database records accessible only to you and authorized
                safety administrators.
              </p>
              <p>
                <strong className="text-white">Community Integrity:</strong> Helpers and
                requesters commit to honest, respectful coordination. Passwords are encrypted
                exclusively by the authentication provider and never stored as plain text.
              </p>
              <p>
                <strong className="text-white">Verified Proofs:</strong> Digital Proof of Help
                certificates display only privacy-safe display names and verified request IDs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAcceptedTerms(true);
                setShowTermsModal(false);
              }}
              className="w-full min-h-[42px] rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold"
            >
              Accept &amp; Close
            </button>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
