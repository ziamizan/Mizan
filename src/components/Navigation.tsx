import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Home,
  PlusCircle,
  Search,
  Heart,
  FileCheck2,
  Clock,
  Bell,
  Sun,
  Moon,
  LogIn,
  ArrowLeftRight,
  User as UserIcon,
  Droplet,
  Utensils,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

export function Navigation() {
  const navigate = useNavigate();
  const {
    firebaseUser,
    hasMultipleRoles,
    clearSelectedPortal,
    notifications,
    signInWithGoogle,
  } = useAppContext();
  const { theme, toggleTheme } = useTheme();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleSwitchPortal = () => {
    clearSelectedPortal();
    navigate('/portals', { replace: true });
  };

  const desktopLinks = [
    { name: 'Home', path: '/' },
    { name: 'Requests', path: '/feed' },
    { name: 'Food Rescue', path: '/food' },
    { name: 'Donate Food', path: '/food-donate' },
    { name: 'Blood Hub', path: '/blood' },
  ];

  const mobileItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Food', path: '/food', icon: Utensils },
    { name: 'Request', path: '/request', icon: PlusCircle, isPrimary: true },
    { name: 'Proofs', path: '/proofs', icon: FileCheck2 },
    { name: 'History', path: '/history', icon: Clock },
  ];

  return (
    <>
      {/* Desktop Top Navigation */}
      <header className="hidden md:flex fixed top-0 w-full z-40 glass px-6 py-3.5 items-center justify-between gap-6">
        {/* Zone 1: Single-line Brand */}
        <Link
          to="/"
          className="flex items-center gap-2 text-brand-blue font-extrabold text-lg whitespace-nowrap shrink-0"
        >
          <Heart className="fill-brand-blue text-brand-blue" size={20} />
          <span>HelpConnect</span>
        </Link>

        {/* Zone 2: Concise Nav Links */}
        <nav className="flex items-center gap-5">
          {desktopLinks.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'text-sm font-semibold whitespace-nowrap shrink-0 transition-colors hover:text-brand-blue',
                  isActive
                    ? 'text-brand-blue underline underline-offset-8 decoration-2'
                    : 'text-slate-600 dark:text-slate-300'
                )
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Zone 3: Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {hasMultipleRoles && (
            <button
              type="button"
              onClick={handleSwitchPortal}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-brand-blue inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <ArrowLeftRight size={14} />
              <span>Portals</span>
            </button>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link
            to="/notifications"
            aria-label="Notifications"
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {firebaseUser ? (
            <Link
              to="/profile"
              className="p-1.5 pr-3 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-brand-blue transition-colors whitespace-nowrap shrink-0"
            >
              {firebaseUser.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={firebaseUser.displayName || 'Profile'}
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <UserIcon size={16} />
              )}
              <span className="max-w-[90px] truncate">
                {firebaseUser.displayName?.split(' ')[0] || 'Profile'}
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-brand-blue inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <LogIn size={14} /> Sign In
            </button>
          )}

          <Link
            to="/request"
            className="px-4 py-2 rounded-full bg-brand-blue text-white text-xs font-bold hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            Request Help
          </Link>
        </div>
      </header>

      {/* Mobile Top Mini Bar */}
      <header className="md:hidden fixed top-0 w-full z-40 glass px-4 py-2.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5 text-brand-blue font-extrabold text-base">
          <Heart className="fill-brand-blue text-brand-blue" size={18} />
          <span>HelpConnect</span>
        </Link>
        <div className="flex items-center gap-1">
          {hasMultipleRoles && (
            <button
              type="button"
              onClick={handleSwitchPortal}
              aria-label="Switch Portal"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300"
            >
              <ArrowLeftRight size={18} />
            </button>
          )}
          <Link
            to="/feed"
            aria-label="Community Requests"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300"
          >
            <Search size={18} />
          </Link>
          <Link
            to="/blood"
            aria-label="Blood Hub"
            className="p-2 rounded-xl text-red-600 dark:text-red-400"
          >
            <Droplet size={18} />
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link
            to="/notifications"
            aria-label="Notifications"
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                {unreadCount}
              </span>
            )}
          </Link>
          <Link
            to="/profile"
            aria-label="Profile"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300"
          >
            <UserIcon size={18} />
          </Link>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 w-full z-40 glass pt-1.5 pb-2 px-4 flex items-center justify-between rounded-t-2xl">
        {mobileItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 transition-all',
                isActive ? 'text-brand-blue' : 'text-slate-500 dark:text-slate-400',
                item.isPrimary &&
                  'relative -top-4 bg-brand-blue text-white p-3.5 rounded-full shadow-lg shadow-blue-500/30'
              )
            }
          >
            <item.icon size={item.isPrimary ? 22 : 19} className={cn(item.isPrimary && 'text-white')} />
            {!item.isPrimary && <span className="text-[10px] font-semibold">{item.name}</span>}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
