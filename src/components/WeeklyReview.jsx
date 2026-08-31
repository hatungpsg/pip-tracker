import { useState, useEffect } from 'react';
import { COMPETENCIES, ACHIEVEMENT_LEVELS } from '../data/pipData';
import { weekOfPIP, today, getWeekDates, formatDate, formatDateShort } from '../utils/dates';
import { getWeeklyAssessment, saveWeeklyAssessment, saveData as persistData, getDailyLog } from '../utils/storage';
import { buildWeeklyPrepPrompt } from '../utils/promptBuilder';
import { analyzeDaily } from '../utils/api';

export default function WeeklyReview({ data, setData }) {
  const currentWeek = weekOfPIP(today());
  const [week, setWeek] = useState(currentWeek);
  const [assessment, setAssessment] = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const [aiPrep, setAiPrep] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const a = getWeeklyAssessment(data, week);
    setAssessment(a);
    setAiPrep(a.aiPrep || '');
  }, [week, data]);

  function persist(updated) {
    const d = saveWeeklyAssessment(data, week, updated);
    setData(d);
    persistData(d);
    setAssessment(updated);
  }

  function setScore(compId, score) {
    persist({ ...assessment, scores: { ...assessment.scores, [compId]: score } });
  }

  function setField(field, value) {
    persist({ ...assessment, [field]: value });
  }

  const weekDates = getWeekDates(week);
  const weekEntries = weekDates.reduce((sum, d) => sum + (getDailyLog(data, d).entries?.length || 0), 0);
  const coveredComps = new Set();
  weekDates.forEach(d => {
    (getDailyLog(data, d).entries || []).forEach(e =>
      (e.competencies || []).forEach(id => coveredComps.add(id))
    );
  });

  async function handleGeneratePrep() {
    setAnalyzing(true); setError('');
    try {
      const prompt = buildWeeklyPrepPrompt({
        week,
        dailyLogs: data.dailyLogs,
        weeklyAssessment: assessment,
        targetName: data.targetName || 'Irene',
      });
      const { analysis } = await analyzeDaily(prompt);
      setAiPrep(analysis);
      persist({ ...assessment, aiPrep: analysis });
    } catch (err) {
      setError(`Failed: ${err.message}`);
    }
    setAnalyzing(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Weekly Review</h2>
          <p className="text-slate-500 text-sm">Self-assessment and meeting preparation</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeek(Math.max(1, week - 1))} disabled={week <= 1}
            className="px-3 py-2 border rounded-lg text-sm disabled:opacity-30">←</button>
          <span className="font-semibold text-indigo-700 px-3">Week {week}</span>
          <button onClick={() => setWeek(Math.min(8, week + 1))} disabled={week >= 8}
            className="px-3 py-2 border rounded-lg text-sm disabled:opacity-30">→</button>
        </div>
      </div>

      {/* Week summary */}
      <div className="bg-white rounded-2xl shadow-sm border p-5">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-slate-500">Period:</span>{' '}
            <strong>{weekDates.length > 0 ? `${formatDateShort(weekDates[0])} – ${formatDateShort(weekDates[weekDates.length - 1])}` : '—'}</strong>
          </div>
          <div>
            <span className="text-slate-500">Entries logged:</span> <strong>{weekEntries}</strong>
          </div>
          <div>
            <span className="text-slate-500">Competencies covered:</span>{' '}
            <strong className={coveredComps.size >= 6 ? 'text-emerald-600' : coveredComps.size >= 4 ? 'text-amber-600' : 'text-red-600'}>
              {coveredComps.size}/8
            </strong>
          </div>
        </div>
      </div>

      {/* Achievement level reference */}
      <details className="bg-slate-50 rounded-xl border p-4">
        <summary className="text-sm font-medium text-slate-600 cursor-pointer">📖 Achievement Level Guide (click to expand)</summary>
        <div className="mt-3 space-y-2">
          {ACHIEVEMENT_LEVELS.map(l => (
            <div key={l.score} className="flex gap-3 text-sm">
              <span className={`font-bold w-6 text-center ${l.score >= 4 ? 'text-emerald-600' : l.score === 3 ? 'text-amber-600' : 'text-red-600'}`}>{l.score}</span>
              <span className="text-slate-600">{l.description}</span>
            </div>
          ))}
        </div>
      </details>

      {/* Self-assessment scores */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-slate-700 mb-1">Self-Assessment Scores</h3>
        <p className="text-slate-500 text-xs mb-4">Rate yourself honestly. Target: 4/5 in all areas by Day 60.</p>

        <div className="space-y-3">
          {COMPETENCIES.map(c => {
            const score = assessment.scores?.[c.id];
            const covered = coveredComps.has(c.id);
            return (
              <div key={c.id} className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 w-64 min-w-0">
                  <span>{c.icon}</span>
                  <span className="text-sm font-medium text-slate-700 truncate">{c.name}</span>
                  {!covered && <span className="text-xs text-red-400" title="No daily log entries for this competency this week">⚠</span>}
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onClick={() => setScore(c.id, s)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        score === s
                          ? s >= 4 ? 'bg-emerald-500 text-white' : s === 3 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
                {score && <span className="text-xs text-slate-400 ml-1">{score >= 4 ? '✓ On track' : score === 3 ? 'Getting there' : 'Needs work'}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reflection fields */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-700">Reflection</h3>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Most important improvement this week</label>
          <textarea value={assessment.mainImprovement || ''} onChange={e => setField('mainImprovement', e.target.value)}
            rows={2} placeholder="What's the biggest positive change you noticed in yourself?"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none resize-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Main remaining gap</label>
          <textarea value={assessment.mainGap || ''} onChange={e => setField('mainGap', e.target.value)}
            rows={2} placeholder="What area still needs the most improvement?"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none resize-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Coaching feedback received (fill after meeting)</label>
          <textarea value={assessment.coachingFeedback || ''} onChange={e => setField('coachingFeedback', e.target.value)}
            rows={2} placeholder="What feedback did Coach Lim give? What standard was clarified?"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none resize-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Your comments / response</label>
          <textarea value={assessment.employeeComments || ''} onChange={e => setField('employeeComments', e.target.value)}
            rows={2} placeholder="Your thoughts, questions, or anything you want to note"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none resize-none" />
        </div>
      </div>

      {/* AI Meeting Prep */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-700">🤖 Meeting Preparation</h3>
          <button onClick={handleGeneratePrep} disabled={analyzing}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm">
            {analyzing ? '⏳ Generating...' : '✨ Prepare for Meeting'}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3 mb-4">{error}</p>}

        {aiPrep ? (
          <div className="prose prose-sm max-w-none text-slate-700 bg-gradient-to-br from-indigo-50/50 to-violet-50/50 rounded-xl p-5 border border-indigo-100 whitespace-pre-wrap">
            {aiPrep}
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center py-6">
            Score yourself above and fill in reflections, then click &quot;Prepare for Meeting&quot; for AI-generated talking points.
          </p>
        )}
      </div>
    </div>
  );
}
