import React, { memo, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Droplet, PlusCircle, RotateCcw, TrendingUp } from 'lucide-react';
import { BloodDonationHistoryRecord, BloodGroup, BloodRequest } from '../types';
import { cn } from '../lib/utils';

const BLOOD_GROUPS: BloodGroup[] = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type TimeRangeMonths = 6 | 12;

interface HospitalAnalyticsDashboardProps {
  bloodRequests: BloodRequest[];
  bloodDonationHistory: BloodDonationHistoryRecord[];
  isDark: boolean;
  onRequestBlood?: () => void;
}

interface MonthlyPoint {
  key: string;
  label: string;
  fullLabel: string;
  requests: number;
  successfulDonations: number;
  unitsCollected: number;
  requestedUnits: number;
  cancelled: number;
}

interface BloodGroupPoint {
  bloodGroup: BloodGroup;
  requestedUnits: number;
  donatedUnits: number;
  requestsCount: number;
  donationsCount: number;
}

function getMonthKey(dateInput?: string | null): string | null {
  if (!dateInput) return null;
  const parsed = new Date(dateInput);
  if (Number.isNaN(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function isRequestFulfilled(req: BloodRequest): boolean {
  return (
    req.status === 'REQUEST_FULFILLED' ||
    req.status === 'DONATION_COMPLETED' ||
    req.hospitalStatus === 'Request Fulfilled' ||
    req.hospitalStatus === 'Donation Completed'
  );
}

function isRequestCancelled(req: BloodRequest): boolean {
  return req.status === 'REQUEST_CANCELLED' || req.hospitalStatus === 'Cancelled';
}

interface CustomTooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
  payload?: MonthlyPoint | BloodGroupPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  label?: string;
  mode: 'monthly' | 'bloodGroup';
}

const ChartTooltip = memo(function ChartTooltip({
  active,
  payload,
  label,
  mode,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const firstPayload = payload[0]?.payload;
  const header =
    mode === 'monthly' && firstPayload && 'fullLabel' in firstPayload
      ? firstPayload.fullLabel
      : mode === 'bloodGroup'
        ? `Blood Group ${label}`
        : label;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-3.5 py-2.5 shadow-lg text-xs min-w-[170px]">
      <p className="font-bold text-slate-900 dark:text-white mb-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
        {header}
      </p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}</span>
            </span>
            <span className="font-bold text-slate-900 dark:text-white tabular-nums">
              {entry.value ?? 0}
            </span>
          </div>
        ))}
        {mode === 'monthly' &&
          firstPayload &&
          'requestedUnits' in firstPayload &&
          firstPayload.requestedUnits > 0 && (
            <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Units Requested</span>
              <span className="font-semibold tabular-nums">{firstPayload.requestedUnits}</span>
            </div>
          )}
      </div>
    </div>
  );
});

const HospitalAnalyticsDashboard = memo(function HospitalAnalyticsDashboard({
  bloodRequests,
  bloodDonationHistory,
  isDark,
  onRequestBlood,
}: HospitalAnalyticsDashboardProps) {
  const [rangeMonths, setRangeMonths] = useState<TimeRangeMonths>(6);
  const [bloodGroupFilter, setBloodGroupFilter] = useState<'ALL' | BloodGroup>('ALL');

  const {
    monthlySeries,
    bloodGroupSeries,
    summary,
    hasAnyDataInView,
  } = useMemo(() => {
    const now = new Date();
    const buckets: MonthlyPoint[] = [];
    const bucketMap = new Map<string, MonthlyPoint>();

    for (let i = rangeMonths - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const shortMonth = MONTH_SHORT[d.getMonth()];
      const yearSuffix = String(d.getFullYear()).slice(-2);
      const spansMultipleYears = rangeMonths === 12 || now.getMonth() < rangeMonths - 1;
      const point: MonthlyPoint = {
        key,
        label: spansMultipleYears ? `${shortMonth} '${yearSuffix}` : shortMonth,
        fullLabel: `${shortMonth} ${d.getFullYear()}`,
        requests: 0,
        successfulDonations: 0,
        unitsCollected: 0,
        requestedUnits: 0,
        cancelled: 0,
      };
      buckets.push(point);
      bucketMap.set(key, point);
    }

    const filteredRequests =
      bloodGroupFilter === 'ALL'
        ? bloodRequests
        : bloodRequests.filter((r) => r.requiredBloodGroup === bloodGroupFilter);

    const filteredHistory =
      bloodGroupFilter === 'ALL'
        ? bloodDonationHistory
        : bloodDonationHistory.filter((h) => h.bloodGroup === bloodGroupFilter);

    const historyRequestIds = new Set<string>();
    const groupMap = new Map<BloodGroup, BloodGroupPoint>();
    for (const group of BLOOD_GROUPS) {
      groupMap.set(group, {
        bloodGroup: group,
        requestedUnits: 0,
        donatedUnits: 0,
        requestsCount: 0,
        donationsCount: 0,
      });
    }

    let totalRequests = 0;
    let totalRequestedUnits = 0;
    let totalActiveRequests = 0;
    let totalCancelledRequests = 0;
    let fulfilledRequestIdsInRange = new Set<string>();

    for (const h of filteredHistory) {
      if (h.bloodRequestId) {
        historyRequestIds.add(h.bloodRequestId);
      }
      const key = getMonthKey(h.donatedAt);
      if (key && bucketMap.has(key)) {
        const bucket = bucketMap.get(key)!;
        const units = Math.max(1, Number(h.unitsDonated) || 1);
        bucket.successfulDonations += 1;
        bucket.unitsCollected += units;
        if (h.bloodRequestId) {
          fulfilledRequestIdsInRange.add(h.bloodRequestId);
        }
        const gp = groupMap.get(h.bloodGroup);
        if (gp) {
          gp.donatedUnits += units;
          gp.donationsCount += 1;
        }
      }
    }

    for (const req of filteredRequests) {
      const createdKey = getMonthKey(req.createdAt);
      if (createdKey && bucketMap.has(createdKey)) {
        const bucket = bucketMap.get(createdKey)!;
        const units = Math.max(1, Number(req.requiredUnits) || 1);
        bucket.requests += 1;
        bucket.requestedUnits += units;
        totalRequests += 1;
        totalRequestedUnits += units;

        if (isRequestCancelled(req)) {
          bucket.cancelled += 1;
          totalCancelledRequests += 1;
        } else if (isRequestFulfilled(req)) {
          fulfilledRequestIdsInRange.add(req.bloodRequestId);
        } else {
          totalActiveRequests += 1;
        }

        const gp = groupMap.get(req.requiredBloodGroup);
        if (gp) {
          gp.requestedUnits += units;
          gp.requestsCount += 1;
        }
      }

      // Include manually fulfilled requests that do not yet have a separate history entry
      if (isRequestFulfilled(req) && !historyRequestIds.has(req.bloodRequestId)) {
        const completedKey = getMonthKey(req.fulfilledAt || req.updatedAt || req.createdAt);
        if (completedKey && bucketMap.has(completedKey)) {
          const bucket = bucketMap.get(completedKey)!;
          const units = Math.max(
            1,
            Number(req.confirmedUnits || req.fulfilledUnits || req.requiredUnits) || 1
          );
          bucket.successfulDonations += 1;
          bucket.unitsCollected += units;
          const gp = groupMap.get(req.requiredBloodGroup);
          if (gp) {
            gp.donatedUnits += units;
            gp.donationsCount += 1;
          }
        }
      }
    }

    const totalSuccessfulDonations = buckets.reduce((sum, b) => sum + b.successfulDonations, 0);
    const totalUnitsCollected = buckets.reduce((sum, b) => sum + b.unitsCollected, 0);
    const eligibleRequests = Math.max(0, totalRequests - totalCancelledRequests);

    // Fulfillment rate compares completed/fulfilled requests or donations against eligible requests
    const fulfilledInRangeCount = filteredRequests.filter((req) => {
      const createdKey = getMonthKey(req.createdAt);
      if (!createdKey || !bucketMap.has(createdKey)) return false;
      return isRequestFulfilled(req) || fulfilledRequestIdsInRange.has(req.bloodRequestId);
    }).length;

    const fulfillmentRate =
      eligibleRequests > 0
        ? Math.min(100, Math.round((fulfilledInRangeCount / eligibleRequests) * 100))
        : totalSuccessfulDonations > 0
          ? 100
          : null;

    // Month-over-month donation delta (current month vs previous month)
    const currentMonthDonations = buckets[buckets.length - 1]?.successfulDonations ?? 0;
    const prevMonthDonations = buckets[buckets.length - 2]?.successfulDonations ?? 0;
    const donationDelta = currentMonthDonations - prevMonthDonations;

    const groupSeries = Array.from(groupMap.values());
    const topDemandedGroup =
      groupSeries
        .filter((g) => g.requestedUnits > 0 || g.donatedUnits > 0)
        .sort((a, b) => b.requestedUnits - a.requestedUnits || b.donatedUnits - a.donatedUnits)[0] ||
      null;

    return {
      monthlySeries: buckets,
      bloodGroupSeries: groupSeries,
      summary: {
        totalRequests,
        totalRequestedUnits,
        totalSuccessfulDonations,
        totalUnitsCollected,
        totalActiveRequests,
        fulfillmentRate,
        donationDelta,
        topDemandedGroup,
      },
      hasAnyDataInView: totalRequests > 0 || totalSuccessfulDonations > 0,
    };
  }, [bloodRequests, bloodDonationHistory, rangeMonths, bloodGroupFilter]);

  const gridStroke = isDark ? '#1e293b' : '#e2e8f0';
  const axisTickColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <section
      aria-label="Hospital Blood Donation Analytics"
      className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
    >
      {/* Header & Controls */}
      <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue dark:text-cyan-400">
            <BarChart3 size={14} />
            <span>Monthly Blood Analytics</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Requests &amp; Successful Donations
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track monthly blood requests, verified donations, and units collected across blood groups.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Blood Group Filter */}
          <label className="sr-only" htmlFor="analytics-blood-group">
            Filter analytics by blood group
          </label>
          <select
            id="analytics-blood-group"
            value={bloodGroupFilter}
            onChange={(e) => setBloodGroupFilter(e.target.value as 'ALL' | BloodGroup)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
          >
            <option value="ALL">All Blood Groups</option>
            {BLOOD_GROUPS.map((group) => (
              <option key={group} value={group}>
                Group {group}
              </option>
            ))}
          </select>

          {/* Range Segmented Control */}
          <div
            role="group"
            aria-label="Chart time range"
            className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700"
          >
            {([6, 12] as TimeRangeMonths[]).map((months) => {
              const active = rangeMonths === months;
              return (
                <button
                  key={months}
                  type="button"
                  onClick={() => setRangeMonths(months)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap',
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  {months} Months
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 divide-x divide-slate-200/70 dark:divide-slate-800">
        <div className="p-4 sm:px-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Requests ({rangeMonths}m)</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {summary.totalRequests}
          </p>
          <p className="text-[11px] text-blue-600 dark:text-cyan-400 font-medium tabular-nums">
            {summary.totalRequestedUnits} unit{summary.totalRequestedUnits === 1 ? '' : 's'} requested
          </p>
        </div>

        <div className="p-4 sm:px-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Successful Donations</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {summary.totalSuccessfulDonations}
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium tabular-nums">
            {summary.donationDelta > 0
              ? `+${summary.donationDelta} vs last month`
              : summary.donationDelta < 0
                ? `${summary.donationDelta} vs last month`
                : 'Steady vs last month'}
          </p>
        </div>

        <div className="p-4 sm:px-5 border-t lg:border-t-0 border-slate-200/70 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Units Collected</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {summary.totalUnitsCollected}
          </p>
          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium tabular-nums">
            {summary.totalSuccessfulDonations > 0
              ? `${(summary.totalUnitsCollected / summary.totalSuccessfulDonations).toFixed(1)} avg units / donation`
              : 'No units recorded yet'}
          </p>
        </div>

        <div className="p-4 sm:px-5 border-t lg:border-t-0 border-slate-200/70 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Fulfillment Rate</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {summary.fulfillmentRate === null ? '—' : `${summary.fulfillmentRate}%`}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tabular-nums">
            {summary.totalActiveRequests} open in progress
          </p>
        </div>
      </div>

      {/* Charts Body */}
      {!hasAnyDataInView ? (
        <div className="p-8 sm:p-10 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center">
            <Droplet size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {bloodGroupFilter === 'ALL'
                ? `No blood activity recorded in the last ${rangeMonths} months`
                : `No ${bloodGroupFilter} activity recorded in the last ${rangeMonths} months`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Create a blood request or switch your filter to view monthly donation performance trends.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {bloodGroupFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setBloodGroupFilter('ALL')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <RotateCcw size={13} />
                Show All Blood Groups
              </button>
            )}
            {onRequestBlood && (
              <button
                type="button"
                onClick={onRequestBlood}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                <PlusCircle size={14} />
                Request Blood
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
          {/* Primary Chart: Monthly Blood Requests vs Successful Donations */}
          <div className="lg:col-span-8 p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Monthly Requests vs. Successful Donations
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Last {rangeMonths} months
                  {bloodGroupFilter !== 'ALL' ? ` · Group ${bloodGroupFilter}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                  Requests
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  Successful Donations
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 rounded-full bg-rose-500" />
                  Units Collected
                </span>
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={monthlySeries}
                  margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: axisTickColor, fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: gridStroke }}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: axisTickColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(15, 23, 42, 0.04)' }}
                    content={<ChartTooltip mode="monthly" />}
                  />
                  <Bar
                    dataKey="requests"
                    name="Blood Requests"
                    fill="#2563EB"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={24}
                  />
                  <Bar
                    dataKey="successfulDonations"
                    name="Successful Donations"
                    fill="#10B981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={24}
                  />
                  <Line
                    type="monotone"
                    dataKey="unitsCollected"
                    name="Units Collected"
                    stroke="#E11D48"
                    strokeWidth={2.25}
                    dot={{ r: 3.5, fill: '#E11D48', strokeWidth: 2, stroke: isDark ? '#0f172a' : '#ffffff' }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Secondary Chart: Demand vs Supply by Blood Group */}
          <div className="lg:col-span-4 p-5 sm:p-6 flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Units by Blood Group
                </h3>
                <TrendingUp size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Requested vs. donated units across groups.
              </p>
            </div>

            <div className="h-[230px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bloodGroupSeries}
                  margin={{ top: 6, right: 6, left: -22, bottom: 0 }}
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                  <XAxis
                    dataKey="bloodGroup"
                    tick={{ fill: axisTickColor, fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: gridStroke }}
                    tickLine={false}
                    dy={4}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: axisTickColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(15, 23, 42, 0.04)' }}
                    content={<ChartTooltip mode="bloodGroup" />}
                  />
                  <Bar
                    dataKey="requestedUnits"
                    name="Requested Units"
                    fill={isDark ? '#3B82F6' : '#60A5FA'}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={14}
                  />
                  <Bar
                    dataKey="donatedUnits"
                    name="Donated Units"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Compact Footnote Summary */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-blue-400" />
                  Requested
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-emerald-500" />
                  Donated
                </span>
              </div>
              {summary.topDemandedGroup && (
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                  Top need:{' '}
                  <strong className="text-rose-600 dark:text-rose-400">
                    {summary.topDemandedGroup.bloodGroup}
                  </strong>{' '}
                  ({summary.topDemandedGroup.requestedUnits}u)
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

export default HospitalAnalyticsDashboard;
