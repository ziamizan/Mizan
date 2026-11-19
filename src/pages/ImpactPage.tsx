import React from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { Heart, Activity, HandCoins, Users, MapPin } from 'lucide-react';

export function ImpactPage() {
  const { impact } = useAppContext();

  const stats = [
    { label: 'People Helped', value: impact.peopleHelped.toLocaleString(), icon: Heart, color: 'text-brand-red', bg: 'bg-red-50 dark:bg-red-950/60' },
    { label: 'Blood Connections', value: impact.bloodConnections.toLocaleString(), icon: Activity, color: 'text-brand-blue', bg: 'bg-blue-50 dark:bg-blue-950/60' },
    { label: 'Community Donations', value: `₹${(impact.donations / 100000).toFixed(1)}L`, icon: HandCoins, color: 'text-brand-green', bg: 'bg-emerald-50 dark:bg-emerald-950/60' },
    { label: 'Active Helpers', value: impact.activeHelpers.toLocaleString(), icon: Users, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/60' },
    { label: 'Communities Connected', value: impact.communitiesConnected.toLocaleString(), icon: MapPin, color: 'text-brand-orange', bg: 'bg-orange-50 dark:bg-orange-950/60' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Community Impact</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Every confirmed Digital Proof of Help strengthens measurable community trust.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-8 flex flex-col items-center justify-center text-center card-3d"
          >
            <div className={`p-4 rounded-2xl ${stat.bg} mb-5`}>
              <stat.icon className={stat.color} size={30} />
            </div>
            <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2 tabular-nums">
              {stat.value}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 font-medium">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 glass-card p-8 text-center">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
          Community Recognition Milestones
        </h3>
        <div className="flex flex-wrap justify-center gap-3">
          {['First Help', 'Kindness Starter', 'Blood Supporter', 'Community Helper', 'Trusted Volunteer'].map(
            (badge) => (
              <span
                key={badge}
                className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                {badge}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
