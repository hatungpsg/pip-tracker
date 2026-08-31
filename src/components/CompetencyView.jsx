import { useState } from 'react';
import { COMPETENCIES, MIN_SCORE } from '../data/pipData';
import { weekOfPIP, today } from '../utils/dates';

export default function CompetencyView({ data }) {
  const [openId, setOpenId] = useState(COMPETENCIES[0].id);
  const currentWeek = weekOfPIP(today());

  function getLatestScore(compId) {
    for (let w = currentWeek; w >= 1; w--) {
      const s = data.weeklyAssessments?.[w]?.scores?.[compId];
      if (s != null) return { score: s, week: w };
    }
    return null;
  }

  function getWeeklyEntryCount(compId) {
    let count = 0;
    Object.entries(data.dailyLogs || {}).forEach(([d, log]) => {
      if (weekOfPIP(d) === currentWeek) {
        (log.entries || []).forEach(e => {
          if ((e.competencies || []).includes(compId)) count++;
        });
      }
    });
    return count;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Competencies Reference</h2>
        <p className="text-slate-500 text-sm">All 8 PIP competency areas with concerns, required behaviours, and practical tips</p>
      </div>

      <div className="space-y-3">
        {COMPETENCIES.map(c => {
          const isOpen = openId === c.id;
          const latest = getLatestScore(c.id);
          const weekEntries = getWeeklyEntryCount(c.id);

          return (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <button
                onClick={() => setOpenId(isOpen ? null : c.id)}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="text-2xl">{c.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800">{c.name}</h3>
                  {c.nameCn && <p className="text-xs text-slate-400">{c.nameCn}</p>}
                  <div className="flex gap-4 mt-0.5">
                    {latest && (
                      <span className={`text-xs font-medium ${latest.score >= MIN_SCORE ? 'text-emerald-600' : latest.score === 3 ? 'text-amber-600' : 'text-red-500'}`}>
                        Score: {latest.score}/5 (Week {latest.week})
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{weekEntries} entries this week</span>
                  </div>
                </div>
                <span className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {isOpen && (
                <div className="px-6 pb-6 border-t">
                  {/* Concerns */}
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-red-600 mb-2">⚠️ Concerns Raised in PIP / PIP中提出的问题</h4>
                    <ul className="space-y-2">
                      {c.concerns.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-600">
                          <span className="text-red-300 mt-0.5">•</span>
                          <div>
                            <p>{typeof item === 'string' ? item : item.en}</p>
                            {typeof item === 'object' && item.cn && <p className="text-xs text-slate-400">{item.cn}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Required behaviours */}
                  <div className="mt-5">
                    <h4 className="text-sm font-semibold text-emerald-600 mb-2">✅ Required Behaviours / 所需行为</h4>
                    <ul className="space-y-2">
                      {c.requiredBehaviors.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-600">
                          <span className="text-emerald-400 mt-0.5">•</span>
                          <div>
                            <p>{typeof item === 'string' ? item : item.en}</p>
                            {typeof item === 'object' && item.cn && <p className="text-xs text-slate-400">{item.cn}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tips */}
                  <div className="mt-5 bg-amber-50 rounded-xl p-4 border border-amber-100">
                    <h4 className="text-sm font-semibold text-amber-700 mb-2">💡 Practical Tips</h4>
                    <ul className="space-y-1.5">
                      {c.tips.map((tip, i) => (
                        <li key={i} className="flex gap-2 text-sm text-amber-800">
                          <span className="text-amber-400 mt-0.5">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
