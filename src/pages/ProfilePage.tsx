import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  MapPin,
  Shield,
  LogOut,
  FileCheck2,
  Clock,
  Bell,
  User as UserIcon,
  Edit3,
  Save,
  Droplet,
  Phone,
  Mail,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { AuthGateCard } from '../components/AuthGateCard';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BloodGroup } from '../types';

const HELP_CATEGORIES = [
  'Blood Donation',
  'Money',
  'Food',
  'Medicine Assistance',
  'Transport',
  'Education',
  'Emergency Support',
  'Volunteering',
  'Other',
];

export function ProfilePage() {
  const { firebaseUser, authReady, user, proofs, signOutUser, updateDonorProfile } =
    useAppContext();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [location, setLocation] = useState(user.location);
  const [bloodGroup, setBloodGroup] = useState(user.bloodGroup);
  const [canProvide, setCanProvide] = useState<string[]>(user.canProvide);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!authReady) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="h-48 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <AuthGateCard
        title="Sign in to View Your Profile"
        description="View your verified community profile, confirmed Digital Proofs, and volunteer impact statistics."
      />
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setSaving(true);
    setMessage(null);

    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        displayName: name.trim(),
        approximateArea: location.trim(),
        bloodGroup,
        updatedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'users', firebaseUser.uid, 'private', 'info'), {
        helpCategories: canProvide,
        updatedAt: serverTimestamp(),
      });

      await updateDonorProfile({
        displayName: name.trim(),
        approximateArea: location.trim(),
        city: location.trim(),
        bloodGroup: bloodGroup as BloodGroup | '',
      });

      setSaving(false);
      setIsEditing(false);
      setMessage('Profile & donor blood group synced successfully!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: unknown) {
      setSaving(false);
      setMessage(err instanceof Error ? err.message : 'Failed to update profile.');
    }
  };

  const toggleCategory = (cat: string) => {
    setCanProvide((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="glass-card p-8 relative overflow-hidden card-3d">
        <div className="absolute top-0 left-0 w-full h-28 bg-gradient-to-r from-brand-blue via-indigo-600 to-cyan-500 opacity-25" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 mt-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            {user.profilePhoto ? (
              <img
                src={user.profilePhoto}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 shadow-xl object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 bg-blue-100 dark:bg-blue-950 text-brand-blue flex items-center justify-center shadow-xl">
                <UserIcon size={36} />
              </div>
            )}

            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                {user.name}
                {user.verified && <CheckCircle2 className="text-brand-blue" size={20} />}
              </h1>
              <p className="text-xs font-mono font-bold text-brand-blue mt-0.5">
                User ID: HC-{user.id.slice(0, 6).toUpperCase()}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-1 mt-1">
                <MapPin size={15} /> {user.location}
              </p>
              {user.verified && (
                <p className="text-xs font-semibold text-brand-green mt-1">
                  Verified Community Member · {proofs.length} Digital Proofs
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/profile/public"
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-brand-blue inline-flex items-center gap-1.5"
            >
              Public Profile
            </Link>
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-brand-blue inline-flex items-center gap-1.5"
            >
              <Edit3 size={14} /> {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
          {message}
        </div>
      )}

      {isEditing && (
        <form onSubmit={handleSaveProfile} className="glass-card p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Edit Your Profile</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Location / Area</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
              Help Categories I Can Provide
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {HELP_CATEGORIES.map((cat) => {
                const isSelected = canProvide.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`p-2 rounded-xl text-xs font-medium border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-brand-blue bg-blue-50 dark:bg-blue-950/60 text-brand-blue font-semibold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {isSelected && <CheckCircle2 size={14} className="text-brand-blue shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={14} /> Save Profile Changes
              </>
            )}
          </button>
        </form>
      )}

      {/* Verified stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-extrabold text-brand-blue tabular-nums">
            {user.stats.peopleHelped}
          </p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
            Confirmed Helps
          </p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-extrabold text-brand-green tabular-nums">
            {user.stats.requestsCompleted}
          </p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
            Verified Proof Helper
          </p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-extrabold text-brand-orange tabular-nums">
            {user.stats.volunteerHours}
          </p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
            Verified Hours
          </p>
        </div>
      </div>

      {/* Quick Navigation Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/proofs"
          className="glass-card p-4 flex items-center gap-3 hover:border-brand-blue transition-colors"
        >
          <FileCheck2 size={20} className="text-brand-blue" />
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">My Digital Proofs</p>
            <p className="text-xs text-slate-500">Download PDFs & share QR links</p>
          </div>
        </Link>
        <Link
          to="/history"
          className="glass-card p-4 flex items-center gap-3 hover:border-brand-blue transition-colors"
        >
          <Clock size={20} className="text-brand-green" />
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Help History</p>
            <p className="text-xs text-slate-500">Confirm or mark assistance completed</p>
          </div>
        </Link>
        <Link
          to="/blood"
          className="glass-card p-4 flex items-center gap-3 hover:border-red-400 transition-colors"
        >
          <Droplet size={20} className="text-red-600" />
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Blood Donor Hub</p>
            <p className="text-xs text-slate-500">Donor availability, alerts & blood requests</p>
          </div>
        </Link>
        <Link
          to="/notifications"
          className="glass-card p-4 flex items-center gap-3 hover:border-brand-blue transition-colors"
        >
          <Bell size={20} className="text-amber-500" />
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Notifications</p>
            <p className="text-xs text-slate-500">Real-time completion & blood alerts</p>
          </div>
        </Link>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield size={18} className="text-slate-400" /> Available to Help With
        </h2>
        <div className="flex flex-wrap gap-2">
          {user.canProvide.map((item) => (
            <span
              key={item}
              className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-brand-blue text-xs font-bold rounded-lg"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void signOutUser()}
        className="w-full min-h-[44px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-100 inline-flex items-center justify-center gap-2 transition-colors"
      >
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  );
}
