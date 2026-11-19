import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, AlertTriangle, Loader2, Droplet, Radio } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { AuthGateCard } from '../components/AuthGateCard';
import { RequestCategory, RequestUrgency } from '../types';

const CATEGORIES: RequestCategory[] = [
  'Emergency',
  'Blood',
  'Money',
  'Food',
  'Medicine',
  'Transport',
  'Education',
  'Shelter',
  'Volunteer',
  'Other',
];

const URGENCIES: RequestUrgency[] = ['Normal', 'High', 'Urgent', 'Immediate'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export function RequestPage() {
  const { firebaseUser, authReady, addRequest } = useAppContext();
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<{
    category?: string;
    bloodGroup?: string;
    priority?: string;
    location?: string;
    description?: string;
  } | null>(null);

  const [showManual, setShowManual] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RequestCategory>('Food');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [urgency, setUrgency] = useState<RequestUrgency>('Normal');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [units, setUnits] = useState('1');
  const [amountNeeded, setAmountNeeded] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        title="Sign in to Create a Help Request"
        description="Sign in with your Google account so your request gets a unique tracking ID (HC-XXXXX) and real-time completion updates."
      />
    );
  }

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/parse-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI parsing failed');
      setAiResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to parse request with AI. Use the manual form below.');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmAiRequest = async () => {
    if (!aiResult) return;
    setSubmitting(true);
    setError(null);
    try {
      const cat = (CATEGORIES.includes(aiResult.category as RequestCategory)
        ? aiResult.category
        : 'Other') as RequestCategory;
      const prio = (URGENCIES.includes(aiResult.priority as RequestUrgency)
        ? aiResult.priority
        : 'Normal') as RequestUrgency;
      const desc = aiResult.description || prompt;
      await addRequest({
        title: `${cat} Assistance: ${desc.slice(0, 64)}`,
        category: cat,
        description: desc,
        location: aiResult.location || 'Community Area',
        time: prio,
        bloodGroup: aiResult.bloodGroup || undefined,
        units: aiResult.bloodGroup ? 1 : undefined,
      });
      navigate('/history');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create help request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3 || description.trim().length < 3 || !location.trim()) {
      setError('Please enter a title, description, and approximate location.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await addRequest({
        title: title.trim(),
        category,
        description: description.trim(),
        location: location.trim(),
        time: urgency,
        bloodGroup: category === 'Blood' ? bloodGroup : undefined,
        units: category === 'Blood' ? Number(units) || 1 : undefined,
        amountNeeded: category === 'Money' ? Number(amountNeeded) || 1000 : undefined,
      });
      navigate('/history');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to post help request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
          Request Help
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Every new request receives a unique Request ID and real-time completion tracking.
        </p>
      </div>

      <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl p-4 flex items-start gap-4">
        <div className="p-3 bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 rounded-full shrink-0">
          <AlertTriangle size={22} />
        </div>
        <div>
          <h2 className="font-bold text-red-900 dark:text-red-200 mb-1">Emergency Notice</h2>
          <p className="text-red-700 dark:text-red-300 text-sm mb-3">
            If someone is in immediate physical danger, contact local emergency services first.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowManual(true);
                setCategory('Emergency');
                setUrgency('Immediate');
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-red-700 transition-colors"
            >
              Pre-fill Emergency Request
            </button>
            <button
              type="button"
              onClick={() => navigate('/blood?tab=request')}
              className="bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2 rounded-xl font-bold text-xs hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors inline-flex items-center gap-1.5"
            >
              <Droplet size={14} className="fill-red-600 text-red-600" />
              <span>Need Blood Donors? Open Blood Broadcast Form</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3" role="alert">
          {error}
        </p>
      )}

      {/* AI Assistant Box */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-brand-blue/10 p-3 rounded-full text-brand-blue">
            <Bot size={22} />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white">
              HelpConnect AI Assistant
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Type naturally and confirm before publishing
            </p>
          </div>
        </div>

        <form onSubmit={handleAiSubmit} className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., Need grocery assistance near Anna Nagar, Madurai today..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 pr-16 min-h-[110px] focus:outline-none focus:ring-2 focus:ring-brand-blue/40 resize-none text-slate-800 dark:text-slate-100 text-sm"
          />
          <button
            type="submit"
            disabled={isProcessing || !prompt.trim()}
            aria-label="Parse request with AI"
            className="absolute bottom-3.5 right-3.5 bg-brand-blue text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </form>

        {aiResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-4"
          >
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Confirm parsed details:
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Category</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {aiResult.category}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Priority</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {aiResult.priority}
                </span>
              </div>
              {aiResult.bloodGroup && (
                <div>
                  <span className="text-xs text-slate-500 block">Blood Group</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {aiResult.bloodGroup}
                  </span>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-xs text-slate-500 block">Location</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {aiResult.location || 'Community Area'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-slate-500 block">Description</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {aiResult.description}
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void confirmAiRequest()}
              className="w-full min-h-[44px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors inline-flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Post Help Request
            </button>
          </motion.div>
        )}
      </div>

      {/* Toggle / Manual Form */}
      {!showManual ? (
        <button
          type="button"
          onClick={() => setShowManual(true)}
          className="w-full min-h-[44px] py-3.5 rounded-xl font-bold text-brand-blue bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors text-sm"
        >
          Fill out detailed request form
        </button>
      ) : (
        <form onSubmit={handleManualSubmit} className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">
              Request Details Form
            </h2>
            <button
              type="button"
              onClick={() => setShowManual(false)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Hide
            </button>
          </div>

          <div>
            <label htmlFor="req-title" className="block text-sm font-semibold mb-1.5">
              Request Title
            </label>
            <input
              id="req-title"
              type="text"
              required
              minLength={3}
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Grocery Assistance for Elderly Neighbor"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="req-cat" className="block text-sm font-semibold mb-1.5">
                Category
              </label>
              <select
                id="req-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as RequestCategory)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="req-urgency" className="block text-sm font-semibold mb-1.5">
                Urgency
              </label>
              <select
                id="req-urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as RequestUrgency)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                {URGENCIES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {category === 'Blood' && (
            <div className="space-y-3 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-950/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-red-800 dark:text-red-200 flex items-center gap-1.5">
                  <Radio size={14} /> Want automatic compatible blood donor matching & broadcast alerts?
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/blood?tab=request')}
                  className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                >
                  Use Full Blood Donor Broadcast
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="req-blood" className="block text-sm font-semibold mb-1.5">
                    Blood Group
                  </label>
                  <select
                    id="req-blood"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="req-units" className="block text-sm font-semibold mb-1.5">
                    Units Needed
                  </label>
                  <input
                    id="req-units"
                    type="number"
                    min={1}
                    max={20}
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {category === 'Money' && (
            <div>
              <label htmlFor="req-amt" className="block text-sm font-semibold mb-1.5">
                Amount Required (₹)
              </label>
              <input
                id="req-amt"
                type="number"
                min={100}
                max={1000000}
                required
                value={amountNeeded}
                onChange={(e) => setAmountNeeded(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          )}

          <div>
            <label htmlFor="req-loc" className="block text-sm font-semibold mb-1.5">
              Approximate Area / Location
            </label>
            <input
              id="req-loc"
              type="text"
              required
              maxLength={140}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Neighborhood or city (exact home address stays private)"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div>
            <label htmlFor="req-desc" className="block text-sm font-semibold mb-1.5">
              Describe Your Need
            </label>
            <textarea
              id="req-desc"
              rows={3}
              required
              minLength={3}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what help is needed and when."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[46px] py-3.5 rounded-xl bg-brand-blue text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            POST HELP REQUEST
          </button>
        </form>
      )}
    </div>
  );
}
