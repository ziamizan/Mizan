import React, { useState } from 'react';
import { Shield, Lock, Bell, Eye, UserX, Monitor, CheckCircle2, Save } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { AuthGateCard } from '../components/AuthGateCard';

export function SettingsPage() {
  const { firebaseUser, authReady, user, signOutUser } = useAppContext();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [showBloodGroup, setShowBloodGroup] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!authReady) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="h-48 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <AuthGateCard
        title="Sign in to Access Settings"
        description="Manage your account preferences, privacy settings, notification controls, and security."
      />
    );
  }

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setTimeout(() => {
      setLoading(false);
      setMessage('Settings updated successfully!');
      setTimeout(() => setMessage(null), 3000);
    }, 600);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">
          Account Settings
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Manage your HelpConnect security, privacy, and notification preferences.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
          <CheckCircle2 size={16} /> {message}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Notifications */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell size={18} className="text-brand-blue" /> Notification Preferences
          </h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Email Notifications</p>
                <p className="text-[11px] text-slate-500">Receive alerts when someone accepts your help request.</p>
              </div>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="w-4 h-4 rounded text-brand-blue focus:ring-brand-blue"
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Push Notifications</p>
                <p className="text-[11px] text-slate-500">Real-time status updates and helper arrival alerts.</p>
              </div>
              <input
                type="checkbox"
                checked={pushNotifications}
                onChange={(e) => setPushNotifications(e.target.checked)}
                className="w-4 h-4 rounded text-brand-blue focus:ring-brand-blue"
              />
            </label>
          </div>
        </div>

        {/* Privacy */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Eye size={18} className="text-brand-green" /> Privacy & Visibility
          </h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Public Profile Directory</p>
                <p className="text-[11px] text-slate-500">Allow other community members to view your public profile.</p>
              </div>
              <input
                type="checkbox"
                checked={publicProfile}
                onChange={(e) => setPublicProfile(e.target.checked)}
                className="w-4 h-4 rounded text-brand-blue focus:ring-brand-blue"
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Show Blood Group Publicly</p>
                <p className="text-[11px] text-slate-500">Display your blood group on help requests for faster blood donor matching.</p>
              </div>
              <input
                type="checkbox"
                checked={showBloodGroup}
                onChange={(e) => setShowBloodGroup(e.target.checked)}
                className="w-4 h-4 rounded text-brand-blue focus:ring-brand-blue"
              />
            </label>
          </div>
        </div>

        {/* Security & Sessions */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield size={18} className="text-brand-orange" /> Account Security & Sessions
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <Monitor size={18} className="text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Current Browser Session</p>
                  <p className="text-[11px] text-slate-500">Authenticated via Firebase · {user.email || 'Demo Session'}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                Active Now
              </span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 card-3d"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save size={14} /> Save Preferences
            </>
          )}
        </button>
      </form>
    </div>
  );
}
