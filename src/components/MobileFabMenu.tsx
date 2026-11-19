import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Heart, PlusCircle, Droplet, HandCoins, FileCheck2, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export function MobileFabMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const actions = [
    {
      label: 'Request Help',
      icon: PlusCircle,
      path: '/request',
      color: 'bg-brand-blue text-white',
    },
    {
      label: 'Browse Requests',
      icon: Compass,
      path: '/feed',
      color: 'bg-brand-green text-white',
    },
    {
      label: 'Blood Requests',
      icon: Droplet,
      path: '/feed',
      color: 'bg-brand-red text-white',
    },
    {
      label: 'Financial Help',
      icon: HandCoins,
      path: '/feed',
      color: 'bg-brand-orange text-white',
    },
    {
      label: 'Digital Proofs',
      icon: FileCheck2,
      path: '/proofs',
      color: 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900',
    },
  ];

  const handleSelect = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div ref={menuRef} className="md:hidden fixed bottom-20 right-4 z-50">
      {/* Expanded Actions Menu */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 mb-2 w-56 glass glass-card p-2 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 flex flex-col gap-1.5">
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>Quick Actions</span>
            <Heart size={12} className="text-brand-red fill-brand-red" />
          </div>
          {actions.map((act) => (
            <button
              key={act.label}
              type="button"
              onClick={() => handleSelect(act.path)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left text-xs font-semibold text-slate-700 dark:text-slate-200 card-3d"
            >
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm', act.color)}>
                <act.icon size={14} />
              </div>
              <span className="truncate">{act.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Quick Actions Menu"
        className={cn(
          'w-14 h-14 rounded-full bg-brand-blue text-white shadow-xl shadow-blue-500/30 flex items-center justify-center transition-transform duration-200 card-3d active:scale-95',
          isOpen && 'rotate-45 bg-slate-900 dark:bg-white dark:text-slate-900'
        )}
      >
        {isOpen ? <X size={24} /> : <Plus size={26} />}
      </button>
    </div>
  );
}
