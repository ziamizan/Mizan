import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Heart,
  LogOut,
  Moon,
  Sun,
  Utensils,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { PortalRole } from '../types';
import { cn } from '../lib/utils';

type ManagedPortalRole = 'HOSPITAL' | 'HOMEAGE';

interface PortalDefinition {
  role: ManagedPortalRole;
  title: string;
  scope: string;
  description: string;
  capabilities: string[];
  actionLabel: string;
  targetPath: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accentText: string;
  accentBg: string;
  buttonClass: string;
}

const PORTAL_CATALOG: Record<ManagedPortalRole, PortalDefinition> = {
  HOSPITAL: {
    role: 'HOSPITAL',
    title: 'Hospital Portal',
    scope: 'Medical & Blood Operations Only',
    description:
      'Dedicated clinical workspace for requesting blood from community donors, reviewing accepted donor details, and searching previous blood donation history.',
    capabilities: [
      'Request blood directly to registered community donors',
      'View full details of accepted blood donors & schedule donations',
      'Searchable previous blood request & donation history',
      'Strict blood-only workspace — zero food data',
    ],
    actionLabel: 'Enter Hospital Portal',
    targetPath: '/hospital',
    icon: Building2,
    accentText: 'text-blue-700 dark:text-blue-300',
    accentBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900',
    buttonClass:
      'bg-blue-600 hover:bg-blue-700 text-white focus-visible:ring-blue-500',
  },
  HOMEAGE: {
    role: 'HOMEAGE',
    title: 'Orphanage Food Donation Portal',
    scope: 'Food Rescue & Distribution Only',
    description:
      'Dedicated orphanage and food-rescue workspace for accepting surplus food donations, coordinating pickups, fulfilling meal assistance, and tracking funds.',
    capabilities: [
      'Surplus food acceptance & pickup scheduling',
      'Community food assistance fulfillment',
      'Volunteer coordination & verified food funds',
      'Donation certificates — zero hospital data',
    ],
    actionLabel: 'Enter Orphanage Portal',
    targetPath: '/orphanage',
    icon: Utensils,
    accentText: 'text-emerald-700 dark:text-emerald-300',
    accentBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900',
    buttonClass:
      'bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500',
  },
};

const ROLE_DEFAULT_PATH: Record<PortalRole, string> = {
  HOSPITAL: '/hospital',
  HOMEAGE: '/orphanage',
  ADMIN: '/',
  USER: '/',
};

export function PortalSelectionPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const {
    firebaseUser,
    availableRoles,
    hasMultipleRoles,
    isDemo,
    selectPortal,
    signOutUser,
  } = useAppContext();

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  const managedRoles = availableRoles.filter(
    (role): role is ManagedPortalRole => role === 'HOSPITAL' || role === 'HOMEAGE'
  );

  // Strictly enforce: this page ONLY appears for authenticated users with multiple portals (Hospital + Homeage)
  if (!hasMultipleRoles || managedRoles.length < 2) {
    const singleRole = availableRoles[0] || 'USER';
    return <Navigate to={ROLE_DEFAULT_PATH[singleRole]} replace />;
  }

  const authorizedPortals = managedRoles.map((role) => PORTAL_CATALOG[role]);

  const handleEnterPortal = (portal: PortalDefinition) => {
    selectPortal(portal.role);
    navigate(portal.targetPath, { replace: true });
  };

  const handleSignOut = async () => {
    await signOutUser();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Minimal 3-Zone Top Bar — Zero cross-portal navigation links */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-lg tracking-tight whitespace-nowrap shrink-0">
            <Heart size={18} className="text-blue-600 dark:text-blue-400 fill-blue-600/20" />
            <span>HelpConnect</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate">
            <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
              {firebaseUser.displayName || 'Authenticated Account'}
            </span>
            {firebaseUser.email && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{firebaseUser.email}</span>
              </>
            )}
            {isDemo && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-700 dark:text-amber-300 font-medium">Demo Session</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Central Portal Selection Workspace — Hospital & Homeage Only */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 sm:py-16 flex flex-col justify-center">
        <div className="max-w-2xl space-y-3 mb-10">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span>Portal Selector</span>
            <span aria-hidden="true">·</span>
            <span>2 Isolated Portals</span>
            <span aria-hidden="true">·</span>
            <span>Hospital &amp; Orphanage</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
            Choose the portal you want to open
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Your account has access to both organization portals. Each portal loads in its own isolated interface with separate navigation and data streams so Hospital medical work and Orphanage food operations never overlap.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {authorizedPortals.map((portal) => {
            const Icon = portal.icon;
            return (
              <section
                key={portal.role}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 flex flex-col justify-between gap-6 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={cn(
                        'w-11 h-11 rounded-xl border flex items-center justify-center shrink-0',
                        portal.accentBg,
                        portal.accentText
                      )}
                    >
                      <Icon size={20} />
                    </div>
                    <span className={cn('text-xs font-medium', portal.accentText)}>
                      {portal.scope}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {portal.title}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {portal.description}
                    </p>
                  </div>

                  <ul className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    {portal.capabilities.map((cap) => (
                      <li key={cap} className="flex items-start gap-2">
                        <span className="text-slate-400 dark:text-slate-500 select-none">—</span>
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleEnterPortal(portal)}
                  className={cn(
                    'w-full py-3 px-4 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 whitespace-nowrap',
                    portal.buttonClass
                  )}
                >
                  <span>{portal.actionLabel}</span>
                  <ArrowRight size={16} />
                </button>
              </section>
            );
          })}
        </div>

        <footer className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Hospital and Orphanage portals load strictly separate modules with no shared navigation bar.
          </span>
          <span>Switch portals anytime from your active workspace header.</span>
        </footer>
      </main>
    </div>
  );
}

export default PortalSelectionPage;
