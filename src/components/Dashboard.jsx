import { COMPETENCIES, REVIEW_SCHEDULE } from '../data/pipData';
import { today, formatDate, dayOfPIP, weekOfPIP, daysRemaining, progressPercent, getNextMilestone } from '../utils/dates';

export default function Dashboard({ data, onNavigate }) {
  const now = today();
  const day = dayOfPIP(now);
  const week = weekOfPIP(now);
  const remaining = daysRemaining(now);
  const pct = progressPercent(now);
  const milestone = getNextMilestone(now);

  const todayLog = data.dailyLogs?.[now];
  const todayEntries = todayLog?.entries?.length || 0;
  const todayComps = new Set((todayLog?.entries || []).flatMap(e => e.competencies || []));

  const weekCompIds = new Set();
  Object.entries(data.dailyLogs || {}).forEach(([d, log]) => {
    if (weekOfPIP(d) === week) {
      (log.entries || []).forEach(e => (e.competencies || []).forEach(id => weekCompIds.add(id)));
    }
  });

  const totalEntries = Object.values(data.dailyLogs || {}).reduce(
    (sum, log) => sum + (log.entries?.length || 0), 0
  );

  return (
    <div className="space-y-6">
      {/* Progress banner */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
          <div>
            <p className="text-slate-500 text-sm">{formatDate(now)}</p>
            <h2 className="text-3xl font-bold text-slate-800">Day {day} <span className="text-lg font-normal text-slate-400">of 60</span></h2>
            <p className="text-sm text-slate-500 mt-1">Week {week} &middot; {remaining} days remaining</p>
          </div>
          <button
            onClick={() => onNavigate('daily')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-sm transition-colors text-sm"
          >
            📝 Log Today
          </button>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-1 text-right">{pct}% complete</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Today's entries" value={todayEntries} sub={`${todayComps.size}/8 competencies`} color="indigo" />
        <StatCard label="This week" value={`${weekCompIds.size}/8`} sub="competencies covered" color="amber" />
        <StatCard label="Total entries" value={totalEntries} sub="all time" color="emerald" />
        <StatCard
          label="Next milestone"
          value={milestone ? `${milestone.daysUntil}d` : '—'}
          sub={milestone?.review || 'Complete'}
          color="rose"
        />
      </div>

      {/* Next milestone */}
      {milestone && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="font-semibold text-amber-800 mb-1">📅 Upcoming: {milestone.review}</h3>
          <p className="text-amber-700 text-sm">
            {formatDate(milestone.date)} &middot; {milestone.daysUntil} day{milestone.daysUntil !== 1 ? 's' : ''} away
          </p>
        </div>
      )}

      {/* Competency coverage this week */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-700 mb-4">Week {week} Competency Coverage</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {COMPETENCIES.map(c => {
            const covered = weekCompIds.has(c.id);
            return (
              <div
                key={c.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
                  covered ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className="text-xl">{c.icon}</span>
                <span className={`text-sm font-medium ${covered ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {c.name}
                </span>
                {covered && <span className="ml-auto text-emerald-500 text-sm">✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Review schedule */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-700 mb-4">Review Schedule</h3>
        <div className="space-y-2">
          {REVIEW_SCHEDULE.map((r, i) => {
            const isPast = r.date < now;
            const isNext = milestone && r.date === milestone.date;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm ${
                  isNext ? 'bg-indigo-50 border border-indigo-200 font-medium' :
                  isPast ? 'text-slate-400' : ''
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  isPast ? 'bg-slate-300' : isNext ? 'bg-indigo-500' : 'bg-slate-200'
                }`} />
                <span className="w-20 flex-shrink-0 font-medium">{r.timing}</span>
                <span className="flex-1">{r.review}</span>
                <span className="text-xs text-slate-400">{formatDate(r.date)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  const colors = {
    indigo:  'bg-indigo-50 text-indigo-700',
    amber:   'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    rose:    'bg-rose-50 text-rose-700',
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-60 mt-0.5">{sub}</p>
    </div>
  );
}
