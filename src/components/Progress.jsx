import { COMPETENCIES, MIN_SCORE } from '../data/pipData';
import { weekOfPIP, today, getWeekDates } from '../utils/dates';
import { getDailyLog as getLog } from '../utils/storage';

export default function Progress({ data }) {
  const currentWeek = weekOfPIP(today());

  function weekScores(weekNum) {
    return data.weeklyAssessments?.[weekNum]?.scores || {};
  }

  function weekEntryCount(weekNum) {
    const dates = getWeekDates(weekNum);
    return dates.reduce((sum, d) => sum + (getLog(data, d).entries?.length || 0), 0);
  }

  function weekCompCoverage(weekNum) {
    const dates = getWeekDates(weekNum);
    const ids = new Set();
    dates.forEach(d => {
      (getLog(data, d).entries || []).forEach(e =>
        (e.competencies || []).forEach(id => ids.add(id))
      );
    });
    return ids.size;
  }

  const weeks = Array.from({ length: 8 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Progress</h2>
        <p className="text-slate-500 text-sm">Track your scores and activity across all 8 weeks</p>
      </div>

      {/* Activity overview */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-700 mb-4">Weekly Activity</h3>
        <div className="grid grid-cols-8 gap-2">
          {weeks.map(w => {
            const entries = weekEntryCount(w);
            const comps = weekCompCoverage(w);
            const isCurrent = w === currentWeek;
            const isFuture = w > currentWeek;
            return (
              <div key={w} className={`text-center p-3 rounded-xl border ${
                isCurrent ? 'bg-indigo-50 border-indigo-200' : isFuture ? 'bg-slate-50 border-slate-100 opacity-50' : 'border-slate-200'
              }`}>
                <p className="text-xs text-slate-500 mb-1">Wk {w}</p>
                <p className="text-lg font-bold text-slate-700">{isFuture ? '—' : entries}</p>
                <p className="text-xs text-slate-400">{isFuture ? '' : `${comps}/8`}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Score heatmap */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 overflow-x-auto">
        <h3 className="font-semibold text-slate-700 mb-4">Competency Scores by Week</h3>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 pr-4 text-slate-500 font-medium">Competency</th>
              {weeks.map(w => (
                <th key={w} className={`px-2 py-2 text-center font-medium ${w === currentWeek ? 'text-indigo-600' : 'text-slate-500'}`}>
                  W{w}
                </th>
              ))}
              <th className="px-2 py-2 text-center text-slate-500 font-medium">Target</th>
            </tr>
          </thead>
          <tbody>
            {COMPETENCIES.map(c => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="py-2.5 pr-4">
                  <span className="mr-1.5">{c.icon}</span>
                  <span className="text-slate-700">{c.name}</span>
                </td>
                {weeks.map(w => {
                  const score = weekScores(w)[c.id];
                  return (
                    <td key={w} className="px-2 py-2.5 text-center">
                      {score != null ? (
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-semibold text-sm ${
                          score >= 4 ? 'bg-emerald-100 text-emerald-700' :
                          score === 3 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {score}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-2.5 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-semibold text-sm">
                    {MIN_SCORE}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Trend analysis */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-700 mb-4">Score Trends</h3>
        {COMPETENCIES.map(c => {
          const scored = weeks
            .map(w => ({ week: w, score: weekScores(w)[c.id] }))
            .filter(x => x.score != null);
          if (scored.length === 0) return null;

          const latest = scored[scored.length - 1];
          const first = scored[0];
          const trend = scored.length > 1 ? latest.score - first.score : 0;

          return (
            <div key={c.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
              <span className="text-lg">{c.icon}</span>
              <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{c.name}</span>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {scored.map(s => (
                    <div key={s.week} className={`w-6 rounded text-xs text-center py-0.5 ${
                      s.score >= 4 ? 'bg-emerald-200 text-emerald-800' :
                      s.score === 3 ? 'bg-amber-200 text-amber-800' :
                      'bg-red-200 text-red-800'
                    }`}>
                      {s.score}
                    </div>
                  ))}
                </div>
                {trend !== 0 && (
                  <span className={`text-xs font-medium ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {trend > 0 ? `↑${trend}` : `↓${Math.abs(trend)}`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {COMPETENCIES.every(c => weeks.every(w => weekScores(w)[c.id] == null)) && (
          <p className="text-slate-400 text-sm text-center py-6">No scores recorded yet. Complete your first weekly self-assessment to see trends.</p>
        )}
      </div>
    </div>
  );
}
