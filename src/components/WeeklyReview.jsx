import { useState, useEffect } from 'react';
import { COMPETENCIES, ACHIEVEMENT_LEVELS } from '../data/pipData';
import { weekOfPIP, today, getWeekDates, formatDate, formatDateShort, dayOfPIP } from '../utils/dates';
import { getWeeklyAssessment, saveWeeklyAssessment, saveData as persistData, getDailyLog } from '../utils/storage';
import { buildWeeklyPrepPrompt, buildWeeklySummaryPrompt } from '../utils/promptBuilder';
import { analyzeDaily } from '../utils/api';

const MOODS = { good: '😊', neutral: '😐', tough: '😤' };

export default function WeeklyReview({ data, setData }) {
  const currentWeek = weekOfPIP(today());
  const [week, setWeek] = useState(currentWeek);
  const [assessment, setAssessment] = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [aiPrep, setAiPrep] = useState('');
  const [weeklySummary, setWeeklySummary] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const a = getWeeklyAssessment(data, week);
    setAssessment(a);
    setAiPrep(a.aiPrep || '');
    setWeeklySummary(a.weeklySummary || '');
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
  const dailyData = weekDates.map(d => ({
    date: d,
    log: getDailyLog(data, d),
    day: dayOfPIP(d),
  }));
  const weekEntries = dailyData.reduce((sum, { log }) => sum + (log.entries?.length || 0), 0);
  const daysLogged = dailyData.filter(({ log }) => log.entries?.length > 0).length;
  const coveredComps = new Set();
  dailyData.forEach(({ log }) => {
    (log.entries || []).forEach(e =>
      (e.competencies || []).forEach(id => coveredComps.add(id))
    );
  });

  async function handleGeneratePrep() {
    setAnalyzing(true); setError('');
    try {
      const prompt = buildWeeklyPrepPrompt({
        week, dailyLogs: data.dailyLogs, weeklyAssessment: assessment,
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

  async function handleGenerateSummary() {
    setSummaryLoading(true); setError('');
    try {
      const prompt = buildWeeklySummaryPrompt({
        week, dailyLogs: data.dailyLogs,
        targetName: data.targetName || 'Irene',
      });
      const { analysis } = await analyzeDaily(prompt);
      setWeeklySummary(analysis);
      persist({ ...assessment, weeklySummary: analysis });
    } catch (err) {
      setError(`Failed: ${err.message}`);
    }
    setSummaryLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Weekly Review</h2>
          <p className="text-slate-500 text-sm">Review your week, get AI summary, and prepare for coaching</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeek(Math.max(1, week - 1))} disabled={week <= 1}
            className="px-3 py-2 border rounded-lg text-sm disabled:opacity-30 hover:bg-slate-50">←</button>
          <span className="font-semibold text-indigo-700 px-3">Week {week}</span>
          <button onClick={() => setWeek(Math.min(8, week + 1))} disabled={week >= 8}
            className="px-3 py-2 border rounded-lg text-sm disabled:opacity-30 hover:bg-slate-50">→</button>
        </div>
      </div>

      {/* Week stats bar */}
      <div className="bg-white rounded-2xl shadow-sm border p-5">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-slate-500">Period:</span>{' '}
            <strong>{weekDates.length > 0 ? `${formatDateShort(weekDates[0])} – ${formatDateShort(weekDates[weekDates.length - 1])}` : '—'}</strong>
          </div>
          <div>
            <span className="text-slate-500">Days logged:</span>{' '}
            <strong className={daysLogged >= 5 ? 'text-emerald-600' : daysLogged >= 3 ? 'text-amber-600' : 'text-red-600'}>
              {daysLogged}/{weekDates.length}
            </strong>
          </div>
          <div>
            <span className="text-slate-500">Total entries:</span> <strong>{weekEntries}</strong>
          </div>
          <div>
            <span className="text-slate-500">Competencies:</span>{' '}
            <strong className={coveredComps.size >= 6 ? 'text-emerald-600' : coveredComps.size >= 4 ? 'text-amber-600' : 'text-red-600'}>
              {coveredComps.size}/8
            </strong>
          </div>
        </div>
      </div>

      {/* ===== THIS WEEK'S LOGS ===== */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-slate-700 mb-1">📅 This Week's Logs / 本周日志</h3>
        <p className="text-slate-400 text-xs mb-4">All your daily entries for Week {week}</p>

        {weekEntries === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400">No entries logged for Week {week} yet.</p>
            <p className="text-slate-300 text-sm">本周尚无日志记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dailyData.map(({ date, log, day }) => (
              <DayCard key={date} date={date} log={log} day={day} />
            ))}
          </div>
        )}
      </div>

      {/* ===== AI WEEKLY SUMMARY ===== */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-700">🤖 Weekly Summary / 每周总结</h3>
            <p className="text-slate-400 text-xs">AI-powered review of your entire week</p>
          </div>
          <button onClick={handleGenerateSummary} disabled={summaryLoading || weekEntries === 0}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm">
            {summaryLoading ? '⏳ Summarising...' : '📊 Generate Weekly Summary'}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3 mb-4">{error}</p>}

        {weeklySummary ? (
          <div className="prose prose-sm max-w-none text-slate-700 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 rounded-xl p-5 border border-emerald-100">
            <AIOutput text={weeklySummary} />
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center py-6">
            {weekEntries === 0
              ? 'Log some daily entries first, then generate your weekly summary.'
              : 'Click "Generate Weekly Summary" to get an AI-powered review of your week.'}
          </p>
        )}
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
          <div>
            <h3 className="text-lg font-semibold text-slate-700">🤖 Meeting Preparation / 会议准备</h3>
            <p className="text-slate-400 text-xs">AI-generated talking points for your coaching session</p>
          </div>
          <button onClick={handleGeneratePrep} disabled={analyzing}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm">
            {analyzing ? '⏳ Generating...' : '✨ Prepare for Meeting'}
          </button>
        </div>

        {aiPrep ? (
          <div className="prose prose-sm max-w-none text-slate-700 bg-gradient-to-br from-indigo-50/50 to-violet-50/50 rounded-xl p-5 border border-indigo-100">
            <AIOutput text={aiPrep} />
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

function DayCard({ date, log, day }) {
  const [expanded, setExpanded] = useState(false);
  const entries = log.entries || [];
  const hasContent = entries.length > 0 || log.generalNotes || log.mood;
  const compIds = new Set(entries.flatMap(e => e.competencies || []));

  if (!hasContent) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
        <span className="text-slate-300 text-lg">○</span>
        <div>
          <span className="text-sm text-slate-400">{formatDate(date)}</span>
          <span className="text-xs text-slate-300 ml-2">Day {day}</span>
        </div>
        <span className="ml-auto text-xs text-slate-300 italic">No entries</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border transition-colors ${expanded ? 'bg-white border-indigo-200 shadow-sm' : 'bg-indigo-50/30 border-slate-200 hover:border-indigo-200'}`}>
      <button onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3">
        <span className="text-emerald-500 text-lg">●</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-700">{formatDate(date)}</span>
            <span className="text-xs text-slate-400">Day {day}</span>
            {log.mood && <span className="text-sm">{MOODS[log.mood] || ''}</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-slate-500">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
            {compIds.size > 0 && (
              <span className="text-xs text-slate-400">·</span>
            )}
            {[...compIds].map(id => {
              const c = COMPETENCIES.find(x => x.id === id);
              return c ? <span key={id} className="text-xs">{c.icon}</span> : null;
            })}
          </div>
        </div>
        <span className="text-xs text-slate-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {entries.map((entry, i) => (
            <div key={entry.id || i} className="border-l-3 border-indigo-200 pl-3">
              <div className="flex flex-wrap gap-1 mb-1">
                {(entry.competencies || []).map(id => {
                  const c = COMPETENCIES.find(x => x.id === id);
                  return c ? (
                    <span key={id} className="inline-flex items-center gap-0.5 bg-indigo-50 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full">
                      {c.icon} {c.name.split(' ')[0]}
                    </span>
                  ) : null;
                })}
              </div>
              {entry.situation && (
                <p className="text-sm text-slate-600"><strong className="text-slate-500">Situation:</strong> {entry.situation}</p>
              )}
              {entry.action && (
                <p className="text-sm text-slate-600"><strong className="text-slate-500">Action:</strong> {entry.action}</p>
              )}
              {entry.people && (
                <p className="text-xs text-slate-400">People: {entry.people}</p>
              )}
              {entry.evidence && (
                <p className="text-xs text-slate-400 italic">Evidence: {entry.evidence}</p>
              )}
              {entry.images && entry.images.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {entry.images.map((img, j) => (
                    <img key={j} src={img.data} alt={img.name || 'evidence'}
                      className="w-12 h-12 object-cover rounded border border-slate-200" />
                  ))}
                </div>
              )}
            </div>
          ))}
          {log.generalNotes && (
            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2 mt-2">
              <strong>Notes:</strong> {log.generalNotes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AIOutput({ text }) {
  if (!text) return null;
  return (
    <div>
      {text.split('\n').map((line, i) => {
        const trimmed = line.trimStart();
        if (trimmed.startsWith('### ')) return <h3 key={i} className="text-base font-semibold mt-5 mb-2 text-indigo-800">{trimmed.slice(4)}</h3>;
        if (trimmed.startsWith('## '))  return <h2 key={i} className="text-lg font-bold mt-5 mb-2 text-indigo-900">{trimmed.slice(3)}</h2>;
        if (trimmed.startsWith('- ') || trimmed.startsWith('* '))  return <li key={i} className="ml-5 mb-1 list-disc">{formatBold(trimmed.slice(2))}</li>;
        if (/^\d+\.\s/.test(trimmed)) return <li key={i} className="ml-5 mb-1 list-decimal">{formatBold(trimmed.replace(/^\d+\.\s/, ''))}</li>;
        if (trimmed === '') return <div key={i} className="h-2" />;
        return <p key={i} className="mb-1.5">{formatBold(trimmed)}</p>;
      })}
    </div>
  );
}

function formatBold(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part);
}
