import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Droplet,
  Utensils,
  Banknote,
  Pill,
  Car,
  BookOpen,
  AlertTriangle,
  Users,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Clock,
  MapPin,
  Building2,
  HeartHandshake,
  CheckCircle2,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { RequestCategory } from '../types';
import {
  FOOD_HERO_IMAGE,
  getEffectiveFoodStatus,
  getFoodCategoryImage,
  getRemainingTimeLabel,
} from '../lib/foodHelpers';
import { MoneyDonationModal } from '../components/MoneyDonationModal';
import heroIllustration from '../assets/images/helpconnect_hero_3d_1795001104252.jpg';

const CATEGORIES: Array<{
  name: RequestCategory | string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  to: string;
}> = [
  {
    name: 'Blood',
    label: 'Blood Donation',
    description: 'Find compatible blood donors & verified hospital blood support.',
    icon: Droplet,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    to: '/blood',
  },
  {
    name: 'Food',
    label: 'Food Rescue & Meals',
    description: 'Share surplus meals or find available food donations nearby.',
    icon: Utensils,
    color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    to: '/food',
  },
  {
    name: 'Money',
    label: 'Financial Help',
    description: 'Contribute verified funds for food and community relief.',
    icon: Banknote,
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    to: '/food-assistance',
  },
  {
    name: 'Medicine',
    label: 'Medicine Assistance',
    description: 'Connect for vital medical supplies & prescriptions.',
    icon: Pill,
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    to: '/feed?category=Medicine',
  },
  {
    name: 'Transport',
    label: 'Transport Help',
    description: 'Arrange travel or emergency rides.',
    icon: Car,
    color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    to: '/feed?category=Transport',
  },
  {
    name: 'Education',
    label: 'Education Support',
    description: 'Books, mentorship & learning resources.',
    icon: BookOpen,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    to: '/feed?category=Education',
  },
  {
    name: 'Emergency',
    label: 'Emergency Help',
    description: 'Find urgent community support & immediate response.',
    icon: AlertTriangle,
    color: 'text-red-600 bg-red-500/10 border-red-500/20',
    to: '/feed?category=Emergency',
  },
];

const WORK_STEPS = [
  {
    step: '01',
    title: 'POST OR SHARE',
    desc: 'Post an assistance request, blood alert, or surplus food donation in under a minute.',
  },
  {
    step: '02',
    title: 'SMART ROUTING',
    desc: 'Blood alerts reach Hospitals & compatible donors; food goes to Orphanages & nearby helpers.',
  },
  {
    step: '03',
    title: 'COORDINATE SAFELY',
    desc: 'Privacy-protected contacts unlock only on acceptance with built-in direct messaging.',
  },
  {
    step: '04',
    title: 'VERIFIED IMPACT',
    desc: 'Every completed help or food handover issues a tamper-evident Digital Proof Certificate.',
  },
];

const SUCCESS_STORIES = [
  {
    title: '140 Wedding Meals Rescued in 35 Minutes',
    org: 'Sunrise Marriage Hall → Hope Kitchen Orphanage',
    quote: 'Instead of wasting fresh dinner trays after our reception, a registered Orphanage collected and served 140 residents the same night.',
  },
  {
    title: 'Critical O+ Blood Units Verified & Fulfilled',
    org: 'City Care Hospital Blood Desk',
    quote: 'Within 12 minutes of hospital verification, 4 matched donors responded and completed the transfusion schedule on time.',
  },
  {
    title: 'Weekly Dry Rations Funded by Community',
    org: 'Verified Razorpay Food Relief',
    quote: 'Transparent progress bars let 18 neighbors pool ₹4,500 to cover monthly groceries for three single-parent households.',
  },
];

export function LandingPage() {
  const { impact, foodDonations, foodAssistanceRequests, volunteerRegistrations } = useAppContext();
  const [moneyModalOpen, setMoneyModalOpen] = useState(false);

  const activeFoodListings = foodDonations
    .filter((d) => d.availableQuantity > 0 && getEffectiveFoodStatus(d) !== 'Expired')
    .slice(0, 3);

  const urgentFoodReqs = foodAssistanceRequests
    .filter((r) => r.status !== 'Completed')
    .slice(0, 3);

  const totalMealsShared =
    1420 +
    foodDonations.reduce((acc, d) => acc + Math.max(0, d.servingsCount), 0);
  const totalFoodDonors =
    86 + new Set(foodDonations.map((d) => d.donorId)).size + volunteerRegistrations.length;

  return (
    <div className="space-y-20 pb-16">
      {/* 1. EXISTING HELPCONNECT HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white p-8 sm:p-12 lg:p-16 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-blue/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-xs font-bold text-cyan-300">
              <Sparkles size={14} />
              <span>WELCOME TO HELPCONNECT</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-balance">
              Helping People.{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-brand-blue bg-clip-text text-transparent">
                Connecting Hearts.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
              Find the help you need or become the helping hand someone is waiting for. Connect for
              emergency blood donation, surplus food rescue, verified hospitals, and
              community assistance.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Link
                to="/request"
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 text-sm font-extrabold shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <span>I NEED HELP</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/feed"
                className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all backdrop-blur-md"
              >
                <span>I WANT TO HELP</span>
                <Users size={16} />
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-bold">
              <Link
                to="/blood"
                className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-200 inline-flex items-center gap-1.5"
              >
                <Droplet size={14} /> Blood Donation Hub
              </Link>
              <Link
                to="/food"
                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 inline-flex items-center gap-1.5"
              >
                <Utensils size={14} /> Available Surplus Food
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-full max-w-md rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-slate-900/50 backdrop-blur-xl"
            >
              <img
                src={heroIllustration}
                alt="HelpConnect 3D Community Illustration"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-semibold text-cyan-200">
                <span>One Request. One Helper. One Better Life.</span>
                <ShieldCheck size={18} className="text-brand-green" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. SMART FOOD DONATION & FOOD RESCUE PORTAL HERO (Green, Orange & White Theme) */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-200/80 dark:border-emerald-900/60 overflow-hidden shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
          <div className="lg:col-span-7 p-8 sm:p-10 lg:p-12 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <Utensils size={14} />
              <span>SMART FOOD DONATION &amp; FOOD RESCUE PORTAL</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Don&apos;t Waste Food.{' '}
              <span className="text-emerald-600 dark:text-emerald-400">Share Food.</span>{' '}
              <span className="text-orange-500">Save Lives.</span>
            </h2>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              Connect surplus food with people who need it. Every meal shared makes a difference.
            </p>

            {/* 4 Primary Food Portal Buttons */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 pt-1">
              <Link
                to="/food-donate"
                className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold shadow-md shadow-emerald-500/20 inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Utensils size={16} /> Donate Food
              </Link>
              <Link
                to="/food-assistance"
                className="px-5 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-extrabold shadow-md shadow-orange-500/20 inline-flex items-center justify-center gap-2 transition-colors"
              >
                <HeartHandshake size={16} /> Request Food
              </Link>
              <button
                type="button"
                onClick={() => setMoneyModalOpen(true)}
                className="px-5 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Banknote size={16} /> Donate Money
              </button>
              <Link
                to="/food"
                className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-950 hover:bg-orange-50 dark:hover:bg-slate-800 border border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <span>Find Available Food</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            {/* Live Food Impact Strip */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {totalMealsShared.toLocaleString()}+
                </p>
                <p className="text-[11px] font-bold text-slate-500">Total Meals Shared</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-orange-500 tabular-nums">
                  {(impact.peopleHelped + 320).toLocaleString()}+
                </p>
                <p className="text-[11px] font-bold text-slate-500">Total People Helped</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {totalFoodDonors}+
                </p>
                <p className="text-[11px] font-bold text-slate-500">Active Food Donors</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 h-full min-h-[300px] relative">
            <img
              src={FOOD_HERO_IMAGE}
              alt="Fresh surplus food ready for community rescue"
              className="w-full h-full object-cover min-h-[320px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/75 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-white space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-orange-300">
                Real-Time Food Rescue Network
              </p>
              <p className="text-sm font-semibold">
                Restaurants, homes, bakeries &amp; registered Orphanages fighting hunger together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. LIVE AVAILABLE FOOD DONATIONS & URGENT FOOD REQUESTS */}
      <section className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Available &amp; Recently Posted Food Donations
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Fresh surplus food available for immediate pickup before the collection deadline.
            </p>
          </div>
          <Link
            to="/food"
            className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 hover:underline"
          >
            View All Nearby Food <ArrowRight size={14} />
          </Link>
        </div>

        {activeFoodListings.length === 0 ? (
          <div className="glass-card p-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-emerald-100 dark:border-slate-800">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold">Have surplus meals or groceries right now?</h3>
              <p className="text-xs text-slate-500">
                Post your first food donation and notify local Orphanages and nearby families instantly.
              </p>
            </div>
            <Link
              to="/food-donate"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold whitespace-nowrap"
            >
              + Post Food Donation
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {activeFoodListings.map((d) => {
              const timer = getRemainingTimeLabel(d.collectionDeadline);
              return (
                <Link
                  key={d.id}
                  to="/food"
                  className="glass-card overflow-hidden group hover:border-emerald-400 transition-all"
                >
                  <div className="relative h-40">
                    <img
                      src={getFoodCategoryImage(d.category, d.imageUrl)}
                      alt={d.foodName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-slate-950/75 text-white text-[11px] font-bold tabular-nums">
                      <Clock size={11} className="inline mr-1" />
                      {timer.label}
                    </span>
                  </div>
                  <div className="p-4 space-y-1.5">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      {d.category} · {d.donorType}
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                      {d.foodName}
                    </h3>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {d.availableQuantity} {d.quantityUnit} available · Serves ~{d.servingsCount}
                    </p>
                    <p className="text-xs text-slate-500 inline-flex items-center gap-1">
                      <MapPin size={12} className="text-orange-500" /> {d.pickupArea}, {d.city}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Urgent Food Requests Preview */}
        {urgentFoodReqs.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Urgent Food Assistance Requests
              </h3>
              <Link
                to="/food-assistance"
                className="text-xs font-extrabold text-orange-600 dark:text-orange-400 inline-flex items-center gap-1 hover:underline"
              >
                Support Requests <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {urgentFoodReqs.map((r) => (
                <Link
                  key={r.id}
                  to="/food-assistance"
                  className="glass-card p-4 border-orange-200/70 dark:border-slate-800 hover:border-orange-400 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-bold">
                      {r.urgencyLevel}
                    </span>
                    <span className="font-mono text-slate-400">{r.assistanceId}</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {r.foodRequirement}
                  </h4>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {r.peopleRequiringFood} people · {r.city} · {r.fulfilledQuantity}/{r.requiredQuantity} {r.requiredUnit}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 4. QUICK HELP CATEGORIES */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            What Kind of Help Do You Need?
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Find the right support across medical, food rescue, and neighborhood services.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.label}
                to={cat.to}
                className="glass-card p-5 group hover:border-brand-blue transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-4 ${cat.color}`}
                  >
                    <Icon size={22} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-blue transition-colors">
                    {cat.label}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs font-semibold text-brand-blue">
                  <span>Explore</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 5. COMMUNITY STATISTICS & SUCCESS STORIES */}
      <section className="space-y-8">
        <div className="glass-card p-8 sm:p-12">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Together, We Make a Difference.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Real-time community impact verified by confirmed digital proofs and handover certificates.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <p className="text-3xl sm:text-4xl font-extrabold text-brand-blue tabular-nums">
                {impact.peopleHelped.toLocaleString()}+
              </p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">People Helped</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <p className="text-3xl sm:text-4xl font-extrabold text-brand-green tabular-nums">
                {impact.activeHelpers.toLocaleString()}+
              </p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">Active Helpers</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <p className="text-3xl sm:text-4xl font-extrabold text-brand-orange tabular-nums">
                {impact.donations.toLocaleString()}+
              </p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">Successful Connections</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <p className="text-3xl sm:text-4xl font-extrabold text-indigo-500 tabular-nums">
                {impact.communitiesConnected}+
              </p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">Communities Connected</p>
            </div>
          </div>
        </div>

        {/* Success Stories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {SUCCESS_STORIES.map((story) => (
            <div key={story.title} className="glass-card p-6 space-y-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={14} /> Verified Story
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {story.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                &ldquo;{story.quote}&rdquo;
              </p>
              <p className="text-[11px] font-bold text-slate-400 pt-1">{story.org}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. HOW HELPCONNECT WORKS */}
      <section className="space-y-10">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Helping Someone Is This Simple.
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Four clear steps from request to verified completion.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {WORK_STEPS.map((s) => (
            <div key={s.step} className="glass-card p-6 relative space-y-3">
              <span className="text-3xl font-extrabold text-brand-blue/30 dark:text-brand-blue/40 font-mono">
                {s.step}
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{s.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. CALL-TO-ACTION */}
      <section className="text-center py-12 px-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white space-y-6 shadow-xl">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Someone Out There Needs Your Help Today.
        </h2>
        <p className="text-sm sm:text-base text-emerald-50 max-w-lg mx-auto leading-relaxed">
          Share surplus meals, donate blood, contribute verified funds, or volunteer nearby.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            to="/food-donate"
            className="px-6 py-3.5 rounded-2xl bg-white text-emerald-700 text-xs font-extrabold hover:bg-emerald-50 transition-all shadow-lg"
          >
            DONATE FOOD
          </Link>
          <Link
            to="/request"
            className="px-6 py-3.5 rounded-2xl bg-slate-900/30 hover:bg-slate-900/50 border border-white/25 text-white text-xs font-extrabold transition-all backdrop-blur-md"
          >
            REQUEST HELP
          </Link>
          <Link
            to="/food-assistance"
            className="px-6 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold transition-all shadow-lg"
          >
            BECOME A FOOD VOLUNTEER
          </Link>
        </div>
      </section>

      {/* 8. FOOTER WITH DEDICATED MANAGEMENT PORTAL ACCESS */}
      <footer className="pt-12 pb-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-blue text-white flex items-center justify-center shadow-md">
              <Heart size={20} className="fill-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">HelpConnect</p>
              <p className="text-[11px] text-slate-400">One Request. One Helper. One Better Life.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 font-semibold text-slate-600 dark:text-slate-300">
            <Link to="/hospital/login" className="hover:text-blue-600 inline-flex items-center gap-1">
              <Building2 size={13} /> Hospital Portal
            </Link>
            <Link to="/orphanage/login" className="hover:text-emerald-600 inline-flex items-center gap-1">
              <Utensils size={13} /> Orphanage Portal
            </Link>
            <Link to="/verify" className="hover:text-brand-blue">
              Verify Certificate
            </Link>
            <Link to="/report-issue" className="hover:text-brand-blue">
              Contact &amp; Support
            </Link>
          </div>
        </div>

        <div className="text-center pt-6 border-t border-slate-100 dark:border-slate-800/80">
          <p>© 2026 HelpConnect. Making Communities Stronger.</p>
        </div>
      </footer>

      <MoneyDonationModal
        open={moneyModalOpen}
        onClose={() => setMoneyModalOpen(false)}
        defaultTargetType="GENERAL_FUND"
      />
    </div>
  );
}
