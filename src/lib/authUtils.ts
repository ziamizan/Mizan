export const HELP_VOLUNTEER_OPTIONS = [
  'Blood Donation',
  'Food Assistance',
  'Financial Assistance',
  'Medicine Assistance',
  'Transport',
  'Education',
  'Emergency Support',
  'Volunteering',
  'Other',
] as const;

export const BLOOD_GROUP_OPTIONS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string, defaultCountryCode = '+91'): string {
  const cleaned = phone.replace(/[\s\-().]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) {
    return '+' + cleaned.slice(1).replace(/\D/g, '');
  }
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${defaultCountryCode}${digits}`;
  }
  if (digits.length > 10) {
    return `+${digits}`;
  }
  return `${defaultCountryCode}${digits}`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));
}

export function isValidPhone(phone: string, defaultCountryCode = '+91'): boolean {
  const normalized = normalizePhone(phone, defaultCountryCode);
  return /^\+[1-9]\d{7,14}$/.test(normalized);
}

export async function sha256Hex(raw: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function buildIdentifierDocId(
  type: 'email' | 'mobile',
  normalizedValue: string
): Promise<string> {
  const hex = await sha256Hex(`${type}:${normalizedValue}`);
  return `${type}_${hex}`;
}

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  barColor: string;
  textColor: string;
  checks: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  if (!password) {
    return {
      score: 0,
      label: 'Too Weak',
      barColor: 'bg-slate-700',
      textColor: 'text-slate-400',
      checks,
    };
  }

  let points = 0;
  if (checks.minLength) points += 1;
  if (checks.hasUpper && checks.hasLower) points += 1;
  if (checks.hasNumber) points += 1;
  if (checks.hasSpecial || password.length >= 12) points += 1;

  const score = Math.min(4, Math.max(1, points)) as 1 | 2 | 3 | 4;

  const mapping: Record<
    1 | 2 | 3 | 4,
    { label: PasswordStrengthResult['label']; barColor: string; textColor: string }
  > = {
    1: { label: 'Weak', barColor: 'bg-rose-500', textColor: 'text-rose-400' },
    2: { label: 'Fair', barColor: 'bg-amber-500', textColor: 'text-amber-400' },
    3: { label: 'Strong', barColor: 'bg-cyan-400', textColor: 'text-cyan-300' },
    4: { label: 'Very Strong', barColor: 'bg-emerald-400', textColor: 'text-emerald-300' },
  };

  return {
    score,
    ...mapping[score],
    checks,
  };
}

export async function compressAvatarFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (JPG, PNG, or WebP).');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected photo.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Invalid image format.'));
    el.src = dataUrl;
  });

  const maxDim = 256;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const targetW = Math.max(1, Math.round(img.width * scale));
  const targetH = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to process image in this browser.');

  ctx.drawImage(img, 0, 0, targetW, targetH);

  let quality = 0.78;
  let output = canvas.toDataURL('image/jpeg', quality);
  while (output.length > 100000 && quality > 0.35) {
    quality -= 0.12;
    output = canvas.toDataURL('image/jpeg', quality);
  }

  if (output.length > 115000) {
    throw new Error('Profile photo is too large even after compression. Please use a smaller image.');
  }

  return output;
}

export function formatFirebaseAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: string }).code)
      : '';
  const fallback =
    err instanceof Error ? err.message : 'Authentication could not be completed. Please try again.';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password. Please double-check your credentials and try again.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Your password must be at least 6 characters long (8+ with mixed characters recommended).';
    case 'auth/too-many-requests':
      return 'Too many attempts detected. Please wait a few moments before trying again.';
    case 'auth/network-request-failed':
      return 'Network error detected. Please check your internet connection and retry.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in window was closed before completing authentication.';
    case 'auth/popup-blocked':
      return 'Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.';
    case 'auth/operation-not-allowed':
      return 'This sign-in provider is not enabled yet in Firebase Console (Authentication > Sign-in method). Please enable it or use Google Sign-In.';
    case 'auth/invalid-phone-number':
      return 'Please enter a valid mobile number including country code (e.g., +91 9876543210).';
    case 'auth/invalid-verification-code':
      return 'The 6-digit OTP code you entered is incorrect. Please check and try again.';
    case 'auth/code-expired':
      return 'This OTP verification code has expired. Please request a new code.';
    case 'auth/credential-already-in-use':
      return 'This mobile number is already linked to another HelpConnect account.';
    case 'auth/requires-recent-login':
      return 'For your security, please verify your session again before updating your password.';
    case 'auth/expired-action-code':
    case 'auth/invalid-action-code':
      return 'This recovery link or code has expired or already been used. Please request a new reset email.';
    default:
      return fallback;
  }
}
