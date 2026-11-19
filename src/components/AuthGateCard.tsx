import React, { useState } from 'react';
import { ShieldCheck, LogIn, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface AuthGateCardProps {
  title?: string;
  description?: string;
}

export function AuthGateCard({
  title = 'Sign in to Continue',
  description = 'Sign in with your Google account to create help requests, assist community members, confirm completed help, and access your Digital Proofs of Help.',
}: AuthGateCardProps) {
  const { signInWithGoogle } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 glass-card p-8 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-brand-blue flex items-center justify-center">
        <ShieldCheck size={28} />
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
        {description}
      </p>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 mb-4">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => void handleSignIn()}
        disabled={loading}
        className="w-full min-h-[44px] py-3 px-5 rounded-xl bg-brand-blue text-white font-bold hover:bg-blue-700 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
        Sign In with Google
      </button>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
        Supports testing with separate requester and helper accounts across browsers or sessions.
      </p>
    </div>
  );
}
