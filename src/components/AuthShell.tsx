import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Heart,
  HandHelping,
  Users,
  Share2,
  ShieldCheck,
  Cpu,
  Zap,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import communityIllustration from '../assets/images/helpconnect_community_3d_1794998318679.jpg';

interface AuthShellProps {
  children: React.ReactNode;
  compactBrandOnMobile?: boolean;
}

const PARTICLES = [
  { id: 'p1', left: '8%', top: '14%', size: 4, delay: 0, duration: 9 },
  { id: 'p2', left: '22%', top: '76%', size: 5, delay: 1.5, duration: 11 },
  { id: 'p3', left: '38%', top: '24%', size: 3, delay: 0.8, duration: 8 },
  { id: 'p4', left: '54%', top: '84%', size: 4, delay: 2.1, duration: 10 },
  { id: 'p5', left: '72%', top: '18%', size: 5, delay: 0.4, duration: 12 },
  { id: 'p6', left: '88%', top: '62%', size: 4, delay: 1.9, duration: 9 },
  { id: 'p7', left: '15%', top: '48%', size: 3, delay: 2.8, duration: 10 },
  { id: 'p8', left: '92%', top: '28%', size: 3, delay: 1.1, duration: 11 },
];

const FEATURE_CARDS = [
  {
    title: 'Trusted Community',
    subtitle: 'Verified members & Digital Proofs',
    icon: ShieldCheck,
    accent: 'text-cyan-600 dark:text-cyan-300 bg-cyan-500/10 dark:bg-cyan-500/15 border-cyan-500/20 dark:border-cyan-400/25',
  },
  {
    title: 'Smart AI Matching',
    subtitle: 'Right helpers matched instantly',
    icon: Cpu,
    accent: 'text-teal-600 dark:text-teal-300 bg-teal-500/10 dark:bg-teal-500/15 border-teal-500/20 dark:border-teal-400/25',
  },
  {
    title: 'Real-Time Assistance',
    subtitle: 'Live progress & secure chat',
    icon: Zap,
    accent: 'text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-500/20 dark:border-indigo-400/25',
  },
];

const COMMUNITY_STATS = [
  { value: '12,540+', label: 'People Helped' },
  { value: '8,420+', label: 'Active Helpers' },
  { value: '3,240+', label: 'Successful Connections' },
];

export function AuthShell({ children, compactBrandOnMobile = false }: AuthShellProps) {
  const prefersReducedMotion = useReducedMotion();
  const { theme, toggleTheme } = useTheme();
  const [imgFailed, setImgFailed] = useState(false);

  const isDark = theme === 'dark';

  return (
    <div
      className={`relative min-h-screen w-full overflow-x-hidden flex items-center justify-center py-10 px-4 sm:px-6 lg:px-10 transition-colors duration-300 ${
        isDark ? 'bg-[#060b1e] text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Floating Light/Dark Mode Switcher in Top Right Corner */}
      <div className="absolute top-5 right-5 sm:top-6 sm:right-8 z-30">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          className={`px-3.5 py-2 rounded-2xl text-xs font-semibold backdrop-blur-xl border transition-all duration-200 flex items-center gap-2 shadow-lg ${
            isDark
              ? 'bg-slate-900/80 border-white/15 text-cyan-300 hover:bg-slate-800 shadow-cyan-500/10'
              : 'bg-white/90 border-slate-200 text-slate-700 hover:bg-slate-50 shadow-slate-900/10'
          }`}
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Background Atmosphere & Gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: isDark
              ? 'radial-gradient(ellipse 75% 55% at 15% 15%, rgba(56, 189, 248, 0.16), transparent 60%), radial-gradient(ellipse 65% 55% at 85% 20%, rgba(124, 58, 237, 0.22), transparent 60%), radial-gradient(ellipse 70% 60% at 50% 95%, rgba(20, 184, 166, 0.16), transparent 60%), linear-gradient(145deg, #050919 0%, #0d1538 48%, #1d1242 100%)'
              : 'radial-gradient(ellipse 75% 55% at 15% 15%, rgba(14, 116, 144, 0.10), transparent 60%), radial-gradient(ellipse 65% 55% at 85% 20%, rgba(109, 40, 217, 0.10), transparent 60%), radial-gradient(ellipse 70% 60% at 50% 95%, rgba(13, 148, 136, 0.10), transparent 60%), linear-gradient(145deg, #f8fafc 0%, #e2e8f0 48%, #cbd5e1 100%)',
          }}
        />

        {/* Subtle 3D Perspective Grid Floor */}
        <div
          className={`absolute inset-x-0 bottom-0 h-[42vh] opacity-${isDark ? '20' : '10'}`}
          style={{
            backgroundImage: isDark
              ? 'linear-gradient(to right, rgba(56, 189, 248, 0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.14) 1px, transparent 1px)'
              : 'linear-gradient(to right, rgba(14, 116, 144, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(14, 116, 144, 0.12) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            transform: 'perspective(680px) rotateX(62deg) scale(1.35)',
            transformOrigin: 'bottom center',
            maskImage: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
          }}
        />

        {/* Subtle Animated Particles */}
        {isDark &&
          PARTICLES.map((p) => (
            <motion.span
              key={p.id}
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
              }}
              className="absolute rounded-full bg-cyan-300/60 shadow-[0_0_12px_rgba(34,211,238,0.6)]"
              animate={
                prefersReducedMotion
                  ? undefined
                  : {
                      y: [0, -24, 0],
                      opacity: [0.25, 0.75, 0.25],
                    }
              }
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}

        {/* Floating 3D Glass Icons */}
        <motion.div
          className={`hidden md:flex absolute top-[10%] left-[44%] w-12 h-12 rounded-2xl backdrop-blur-md border items-center justify-center shadow-lg ${
            isDark
              ? 'bg-white/5 border-cyan-300/20 text-cyan-300 shadow-[0_12px_32px_rgba(6,182,212,0.18)]'
              : 'bg-white/60 border-cyan-500/20 text-cyan-700 shadow-[0_12px_32px_rgba(6,182,212,0.1)]'
          }`}
          animate={prefersReducedMotion ? undefined : { y: [0, -14, 0], rotate: [-4, 4, -4] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Heart className="w-5 h-5 fill-cyan-400/20" />
        </motion.div>

        <motion.div
          className={`hidden md:flex absolute bottom-[12%] left-[47%] w-12 h-12 rounded-2xl backdrop-blur-md border items-center justify-center shadow-lg ${
            isDark
              ? 'bg-white/5 border-teal-300/20 text-teal-300 shadow-[0_12px_32px_rgba(20,184,166,0.18)]'
              : 'bg-white/60 border-teal-500/20 text-teal-700 shadow-[0_12px_32px_rgba(20,184,166,0.1)]'
          }`}
          animate={prefersReducedMotion ? undefined : { y: [0, 14, 0], rotate: [5, -5, 5] }}
          transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        >
          <HandHelping className="w-5 h-5" />
        </motion.div>
      </div>

      {/* Main Split Two-Section Container */}
      <div className="relative z-10 w-full max-w-[1260px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* LEFT SECTION – BRAND EXPERIENCE */}
        <motion.section
          initial={prefersReducedMotion ? false : { opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className={`lg:col-span-6 order-2 lg:order-1 space-y-6 ${
            compactBrandOnMobile ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Logo + Tagline */}
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 via-teal-400 to-indigo-500 p-[1.5px] shadow-[0_10px_30px_rgba(6,182,212,0.35)] shrink-0">
              <div
                className={`w-full h-full rounded-[14px] flex items-center justify-center ${
                  isDark ? 'bg-[#0b1332]' : 'bg-white'
                }`}
              >
                <Heart
                  className={`w-7 h-7 ${isDark ? 'text-cyan-300' : 'text-cyan-600'} fill-cyan-400/25`}
                />
              </div>
            </div>
            <div>
              <h2
                className={`text-2xl font-extrabold tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                HelpConnect
              </h2>
              <p
                className={`text-xs sm:text-sm font-medium tracking-wide ${
                  isDark ? 'text-cyan-300' : 'text-cyan-700 font-semibold'
                }`}
              >
                One Request. One Helper. One Better Life.
              </p>
            </div>
          </div>

          {/* Hero Statement */}
          <div className="space-y-3">
            <h1
              className={`text-3xl sm:text-4xl lg:text-[42px] font-extrabold leading-[1.15] tracking-tight text-balance ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Every helping hand creates a{' '}
              <span className="bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-600 bg-clip-text text-transparent">
                better world.
              </span>
            </h1>
            <p
              className={`text-sm sm:text-base leading-relaxed max-w-xl ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              Connect with people who need assistance and discover people who are ready to make a
              difference.
            </p>
          </div>

          {/* 3D Community Illustration Showcase */}
          <motion.div
            whileHover={prefersReducedMotion ? undefined : { y: -4, scale: 1.01 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`relative rounded-3xl overflow-hidden border shadow-xl ${
              isDark
                ? 'border-white/15 bg-slate-900/55 shadow-[0_24px_60px_-15px_rgba(6,182,212,0.28)]'
                : 'border-slate-300/80 bg-white/70 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.1)]'
            }`}
          >
            {!imgFailed ? (
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <img
                  src={communityIllustration}
                  alt="3D community members helping and connecting with each other on HelpConnect"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover"
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${
                    isDark
                      ? 'from-[#060b1e]/85 via-[#060b1e]/20'
                      : 'from-slate-950/80 via-slate-950/25'
                  } to-transparent`}
                  aria-hidden="true"
                />
                <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-white">
                      Humanity Powered by Real-Time Trust
                    </p>
                    <p className="text-xs text-cyan-200/90 mt-0.5">
                      Verified assistance tracking &amp; digital proof of help
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-white shrink-0">
                    <HandHelping className="w-4 h-4 text-teal-300" />
                    <span>Live Network</span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`aspect-[16/10] w-full flex flex-col items-center justify-center p-6 text-center ${
                  isDark
                    ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white'
                    : 'bg-gradient-to-br from-slate-100 via-indigo-50 to-slate-200 text-slate-900'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center mb-3 text-cyan-500">
                  <Users className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold">HelpConnect Community Network</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Neighbors, volunteers, and donors united in real time.
                </p>
              </div>
            )}
          </motion.div>

          {/* Three Compact Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FEATURE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className={`rounded-2xl backdrop-blur-xl border p-3.5 transition-colors duration-200 ${
                    isDark
                      ? 'bg-white/[0.06] border-white/10 hover:border-cyan-400/35 hover:bg-white/[0.09]'
                      : 'bg-white/80 border-slate-200/90 hover:border-cyan-500/40 hover:bg-white shadow-sm'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-2.5 ${card.accent}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3
                    className={`text-xs font-bold whitespace-nowrap truncate ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {card.title}
                  </h3>
                  <p
                    className={`text-[11px] mt-1 leading-snug ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {card.subtitle}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Floating Community Statistics Bar */}
          <div
            className={`rounded-2xl backdrop-blur-xl border p-4 shadow-xl ${
              isDark
                ? 'bg-gradient-to-r from-white/[0.07] via-cyan-500/[0.08] to-teal-500/[0.07] border-white/15'
                : 'bg-gradient-to-r from-white via-cyan-50/70 to-teal-50/70 border-slate-200 shadow-slate-900/5'
            }`}
          >
            <div
              className={`grid grid-cols-3 gap-3 divide-x ${
                isDark ? 'divide-white/10' : 'divide-slate-200'
              }`}
            >
              {COMMUNITY_STATS.map((stat, idx) => (
                <div key={stat.label} className={idx > 0 ? 'pl-3 sm:pl-4' : ''}>
                  <p
                    className={`text-lg sm:text-xl font-extrabold tabular-nums tracking-tight ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {stat.value}
                  </p>
                  <p
                    className={`text-[11px] sm:text-xs font-medium mt-0.5 ${
                      isDark ? 'text-cyan-200/85' : 'text-cyan-800'
                    }`}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* RIGHT SECTION – 3D GLASSMORPHISM AUTH CARD */}
        <motion.section
          initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 order-1 lg:order-2 w-full max-w-[520px] mx-auto"
        >
          {/* Compact mobile brand header */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 p-[1.5px] shadow-lg shadow-cyan-500/25">
              <div
                className={`w-full h-full rounded-[10px] flex items-center justify-center ${
                  isDark ? 'bg-[#0b1332]' : 'bg-white'
                }`}
              >
                <Heart
                  className={`w-5 h-5 ${isDark ? 'text-cyan-300' : 'text-cyan-600'} fill-cyan-400/25`}
                />
              </div>
            </div>
            <div>
              <p
                className={`text-lg font-extrabold leading-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                HelpConnect
              </p>
              <p
                className={`text-[11px] font-medium ${
                  isDark ? 'text-cyan-300' : 'text-cyan-700'
                }`}
              >
                One Request. One Helper. One Better Life.
              </p>
            </div>
          </div>

          <div
            className={`relative rounded-3xl backdrop-blur-2xl border shadow-2xl overflow-hidden ${
              isDark
                ? 'bg-slate-900/65 border-white/15 shadow-[0_28px_90px_-15px_rgba(6,182,212,0.28)] text-slate-100'
                : 'bg-white/85 border-slate-200/90 shadow-[0_28px_90px_-15px_rgba(15,23,42,0.12)] text-slate-900'
            }`}
          >
            {/* Luminous 3D Top Rim */}
            <div
              className="h-1 w-full bg-gradient-to-r from-cyan-400 via-teal-300 to-violet-400"
              aria-hidden="true"
            />
            <div className="p-6 sm:p-8">{children}</div>
          </div>

          <p
            className={`text-center text-xs mt-5 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Protected by encrypted authentication &amp; privacy-first community controls.
          </p>
        </motion.section>
      </div>
    </div>
  );
}
