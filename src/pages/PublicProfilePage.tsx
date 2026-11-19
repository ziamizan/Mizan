import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, MapPin, Award, ArrowLeft, Share2, Shield, Heart } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export function PublicProfilePage() {
  const { userId } = useParams<{ userId?: string }>();
  const { user, proofs } = useAppContext();

  const isSelf = !userId || userId === user.id || userId === 'me';
  const profileName = isSelf ? user.name : 'Community Member';
  const profileLocation = isSelf ? user.location : 'Chennai, Tamil Nadu';
  const profilePhoto = isSelf ? user.profilePhoto : '';
  const helperProofsCount = proofs.filter((p) => p.proofStatus === 'VALID').length;

  const handleShare = () => {
    if (navigator.share) {
      void navigator.share({
        title: `${profileName} - HelpConnect Profile`,
        url: window.location.href,
      });
    } else {
      void navigator.clipboard.writeText(window.location.href);
      alert('Profile link copied to clipboard!');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-brand-blue"
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <button
          type="button"
          onClick={handleShare}
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-brand-blue inline-flex items-center gap-1.5 card-3d"
        >
          <Share2 size={14} /> Share Profile
        </button>
      </div>

      {/* Public Profile Header Card */}
      <div className="glass-card p-8 relative overflow-hidden card-3d">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-brand-blue via-indigo-600 to-cyan-500 opacity-25" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 mt-4">
          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt={profileName}
              referrerPolicy="no-referrer"
              className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 shadow-xl object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 bg-blue-100 dark:bg-blue-950 text-brand-blue flex items-center justify-center shadow-xl">
              <Heart size={36} className="fill-brand-blue" />
            </div>
          )}

          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
              {profileName}
              <CheckCircle2 className="text-brand-blue" size={20} />
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-1 mt-1">
              <MapPin size={15} /> {profileLocation}
            </p>
            <p className="text-xs font-semibold text-brand-green mt-1 inline-flex items-center gap-1">
              <Shield size={14} /> Verified Community Contributor · ID: HC-{user.id.slice(0, 6).toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center card-3d">
          <p className="text-3xl font-extrabold text-brand-blue tabular-nums">
            {helperProofsCount || user.stats.peopleHelped}
          </p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
            People Helped
          </p>
        </div>
        <div className="glass-card p-4 text-center card-3d">
          <p className="text-3xl font-extrabold text-brand-green tabular-nums">
            {user.stats.requestsCompleted}
          </p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
            Success Rate
          </p>
        </div>
        <div className="glass-card p-4 text-center card-3d">
          <p className="text-3xl font-extrabold text-brand-orange tabular-nums">
            {user.stats.volunteerHours}h
          </p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
            Volunteer Hours
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Award size={18} className="text-amber-500" /> Earned Achievement Badges
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-center">
            <span className="text-2xl">🤝</span>
            <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">First Helper</p>
            <p className="text-[10px] text-slate-500">Provided initial assistance</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
            <span className="text-2xl">⭐</span>
            <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">Trusted Member</p>
            <p className="text-[10px] text-slate-500">Verified account status</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-center">
            <span className="text-2xl">🛡️</span>
            <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">Community Hero</p>
            <p className="text-[10px] text-slate-500">Active responder</p>
          </div>
        </div>
      </div>

      {/* Available to Help With */}
      <div className="glass-card p-6">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
          Can Provide Support In
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
    </div>
  );
}
