import { useState, useEffect, useRef } from 'react';
import { COMPETENCIES } from '../data/pipData';
import { PIP_START, PIP_END } from '../data/pipData';
import { today, formatDate, dayOfPIP, weekOfPIP, parseDate } from '../utils/dates';
import { getDailyLog, saveDailyLog, saveData as persistData } from '../utils/storage';
import { buildDailyPrompt, buildGapAnalysis } from '../utils/promptBuilder';
import { analyzeDaily } from '../utils/api';

const MOODS = [
  { id: 'good', icon: '😊', label: 'Good day' },
  { id: 'neutral', icon: '😐', label: 'Okay day' },
  { id: 'tough', icon: '😤', label: 'Tough day' },
];

export default function DailyLog({ data, setData }) {
  const [date, setDate] = useState(today());
  const [log, setLog] = useState({ entries: [], generalNotes: '', mood: '', aiSummary: '' });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const [situation, setSituation] = useState('');
  const [action, setAction] = useState('');
  const [people, setPeople] = useState('');
  const [comps, setComps] = useState([]);
  const [evidence, setEvidence] = useState('');
  const [images, setImages] = useState([]);

  useEffect(() => {
    setLog(getDailyLog(data, date));
  }, [date, data]);

  function persist(newLog) {
    const d = saveDailyLog(data, date, newLog);
    setData(d);
    persistData(d);
    setLog(newLog);
  }

  function resetForm() {
    setSituation(''); setAction(''); setPeople(''); setComps([]); setEvidence('');
    setImages([]); setEditId(null); setShowForm(false);
  }

  function saveEntry() {
    if (!situation.trim() && !action.trim()) return;
    const entry = { id: editId || Date.now(), situation, action, people, competencies: comps, evidence, images: images.length > 0 ? images : undefined, ts: new Date().toISOString() };
    const entries = editId ? log.entries.map(e => e.id === editId ? entry : e) : [...log.entries, entry];
    persist({ ...log, entries });
    resetForm();
  }

  function deleteEntry(id) {
    persist({ ...log, entries: log.entries.filter(e => e.id !== id) });
  }

  function startEdit(e) {
    setSituation(e.situation || ''); setAction(e.action || ''); setPeople(e.people || '');
    setComps(e.competencies || []); setEvidence(e.evidence || '');
    setImages(e.images || []); setEditId(e.id); setShowForm(true);
  }

  function toggleComp(id) {
    setComps(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  async function handleAnalyze() {
    if (log.entries.length === 0) { setError('Add at least one entry first.'); return; }
    setAnalyzing(true); setError('');
    try {
      const prompt = buildDailyPrompt({
        date, entries: log.entries, generalNotes: log.generalNotes,
        mood: log.mood, dailyLogs: data.dailyLogs, weeklyAssessments: data.weeklyAssessments,
        targetName: data.targetName || 'Irene',
      });
      const { analysis } = await analyzeDaily(prompt);
      persist({ ...log, aiSummary: analysis });
    } catch (err) {
      setError(`Analysis failed: ${err.message}. Check Settings → AI CLI.`);
    }
    setAnalyzing(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Daily Log</h2>
          <p className="text-slate-500 text-sm">Day {dayOfPIP(date)} · Week {weekOfPIP(date)}</p>
        </div>
        <MiniCalendar selected={date} onSelect={setDate} dailyLogs={data.dailyLogs} />
      </div>

      {/* Entries */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-700">
            Entries <span className="text-sm font-normal text-slate-400">({log.entries.length})</span>
          </h3>
          {!showForm && (
            <button onClick={() => { resetForm(); setShowForm(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              + Add Entry
            </button>
          )}
        </div>

        {log.entries.length === 0 && !showForm && (
          <p className="text-slate-400 text-center py-10">
            No entries yet for {formatDate(date)}.<br />
            <span className="text-sm">Click &quot;Add Entry&quot; to log what happened today.</span>
          </p>
        )}

        {log.entries.map(entry => (
          <div key={entry.id} className="border-l-4 border-indigo-200 pl-4 py-3 mb-4 group">
            <div className="flex justify-between items-start">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(entry.competencies || []).map(id => {
                  const c = COMPETENCIES.find(x => x.id === id);
                  return c ? (
                    <span key={id} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                      {c.icon} {c.name.split(' ')[0]}
                    </span>
                  ) : null;
                })}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(entry)} className="text-xs text-slate-400 hover:text-indigo-600 px-2 py-1">Edit</button>
                <button onClick={() => deleteEntry(entry.id)} className="text-xs text-slate-400 hover:text-red-600 px-2 py-1">Delete</button>
              </div>
            </div>
            {entry.situation && <p className="text-sm text-slate-600 mb-1"><strong className="text-slate-500">Situation:</strong> {entry.situation}</p>}
            {entry.action && <p className="text-sm text-slate-600 mb-1"><strong className="text-slate-500">What I did:</strong> {entry.action}</p>}
            {entry.people && <p className="text-sm text-slate-600 mb-1"><strong className="text-slate-500">People:</strong> {entry.people}</p>}
            {entry.evidence && <p className="text-sm text-slate-500 italic">Evidence: {entry.evidence}</p>}
            {entry.images && entry.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {entry.images.map((img, i) => (
                  <ImageThumb key={i} img={img} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Entry form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">{editId ? 'Edit Entry' : 'New Entry'}</h3>

          <label className="block text-sm font-medium text-slate-600 mb-1">What happened? (the situation)</label>
          <textarea value={situation} onChange={e => setSituation(e.target.value)} rows={3}
            placeholder="e.g. Teacher Sarah submitted incomplete lesson plans for the second time..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none resize-none" />

          <label className="block text-sm font-medium text-slate-600 mb-1">What did you do? (your action)</label>
          <textarea value={action} onChange={e => setAction(e.target.value)} rows={3}
            placeholder="e.g. I spoke with Sarah directly, showed her the standard format, and set a deadline for resubmission by Friday..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none resize-none" />

          <label className="block text-sm font-medium text-slate-600 mb-1">People involved (optional)</label>
          <input value={people} onChange={e => setPeople(e.target.value)}
            placeholder="e.g. Teacher Sarah, C Iza, Coach Lim"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none" />

          <label className="block text-sm font-medium text-slate-600 mb-2">Which competency areas does this relate to?</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {COMPETENCIES.map(c => (
              <label key={c.id}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                  comps.includes(c.id)
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>
                <input type="checkbox" checked={comps.includes(c.id)} onChange={() => toggleComp(c.id)} className="sr-only" />
                <span>{c.icon}</span>
                <span className="flex-1">{c.name}</span>
                {comps.includes(c.id) && <span className="text-indigo-500">✓</span>}
              </label>
            ))}
          </div>

          <label className="block text-sm font-medium text-slate-600 mb-1">Evidence / notes (optional)</label>
          <textarea value={evidence} onChange={e => setEvidence(e.target.value)} rows={2}
            placeholder="e.g. Screenshot of official group chat message, follow-up date set in calendar..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none resize-none" />

          <label className="block text-sm font-medium text-slate-600 mb-1">📷 Attach images (optional)</label>
          <p className="text-xs text-slate-400 mb-2">Upload screenshots, photos, or documents as evidence. Images are resized and stored locally.</p>
          <div className="mb-2">
            <label className="inline-flex items-center gap-2 border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-lg px-4 py-2.5 cursor-pointer transition-colors text-sm text-slate-600">
              <span>📎 Choose images...</span>
              <input type="file" accept="image/*" multiple className="sr-only"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;
                  const newImages = [];
                  for (const file of files) {
                    const dataUrl = await resizeImage(file, 1200, 0.8);
                    newImages.push({ name: file.name, data: dataUrl, ts: Date.now() });
                  }
                  setImages(prev => [...prev, ...newImages]);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          {images.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-5">
              {images.map((img, i) => (
                <div key={img.ts || i} className="relative group">
                  <img src={img.data} alt={img.name || 'evidence'}
                    className="w-24 h-24 object-cover rounded-lg border border-slate-200 shadow-sm" />
                  <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow opacity-0 group-hover:opacity-100 transition-opacity">
                    ×
                  </button>
                  <p className="text-[10px] text-slate-400 mt-0.5 w-24 truncate text-center">{img.name}</p>
                </div>
              ))}
            </div>
          )}
          {images.length === 0 && <div className="mb-5" />}

          <div className="flex gap-3">
            <button onClick={saveEntry}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
              {editId ? 'Update Entry' : 'Save Entry'}
            </button>
            <button onClick={resetForm}
              className="text-slate-500 hover:text-slate-700 px-4 py-2.5 rounded-lg text-sm transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Gap Tracker */}
      <GapTracker entries={log.entries} dailyLogs={data.dailyLogs} currentDate={date} />

      {/* Mood & general notes */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">End of Day</h3>

        <label className="block text-sm font-medium text-slate-600 mb-2">How was today?</label>
        <div className="flex gap-3 mb-4">
          {MOODS.map(m => (
            <button key={m.id} onClick={() => persist({ ...log, mood: m.id })}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                log.mood === m.id
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              <span className="text-lg">{m.icon}</span> {m.label}
            </button>
          ))}
        </div>

        <label className="block text-sm font-medium text-slate-600 mb-1">General notes for today</label>
        <textarea value={log.generalNotes || ''} onChange={e => persist({ ...log, generalNotes: e.target.value })} rows={3}
          placeholder="Any general reflections, things to remember, or notes for yourself..."
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none resize-none" />
      </div>

      {/* AI Analysis */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-700">🤖 AI Summary &amp; Next Steps</h3>
          <button onClick={handleAnalyze} disabled={analyzing}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm">
            {analyzing ? '⏳ Analysing...' : '✨ Generate Summary'}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3 mb-4">{error}</p>}

        {log.aiSummary ? (
          <div className="prose prose-sm max-w-none text-slate-700 bg-gradient-to-br from-indigo-50/50 to-violet-50/50 rounded-xl p-5 border border-indigo-100">
            <AIOutput text={log.aiSummary} />
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center py-6">
            Fill in your day&apos;s entries above, then click &quot;Generate Summary&quot; to get AI-powered analysis and next steps.
          </p>
        )}
      </div>
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

function MiniCalendar({ selected, onSelect, dailyLogs }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selDate = parseDate(selected);
  const [viewYear, setViewYear] = useState(selDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selDate.getMonth());

  useEffect(() => {
    const d = parseDate(selected);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [selected]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loggedDates = new Set(
    Object.entries(dailyLogs || {})
      .filter(([, log]) => (log.entries && log.entries.length > 0) || log.generalNotes || log.mood || log.aiSummary)
      .map(([d]) => d)
  );

  const pipStart = parseDate(PIP_START);
  const pipEnd = parseDate(PIP_END);

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const todayStr = today();

  const entryCount = loggedDates.has(selected) ? (dailyLogs[selected]?.entries?.length || 0) : 0;
  const displayDate = parseDate(selected);
  const btnLabel = `${displayDate.getDate()} ${monthNames[displayDate.getMonth()]} ${displayDate.getFullYear()}`;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-indigo-300 outline-none">
        <span>📅</span>
        <span className="font-medium text-slate-700">{btnLabel}</span>
        {entryCount > 0 && <span className="bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">{entryCount}</span>}
        <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 bg-white rounded-xl shadow-lg border border-slate-200 p-3 w-72">
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="text-slate-400 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100">◀</button>
            <span className="text-sm font-semibold text-slate-700">{monthNames[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} className="text-slate-400 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100">▶</button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {dayNames.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = dateStr === selected;
              const isToday = dateStr === todayStr;
              const hasLog = loggedDates.has(dateStr);
              const dt = new Date(viewYear, viewMonth, day);
              const inPip = dt >= pipStart && dt <= pipEnd;

              return (
                <button key={dateStr}
                  onClick={() => { onSelect(dateStr); setOpen(false); }}
                  className={`relative w-full aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors
                    ${isSelected
                      ? 'bg-indigo-600 text-white font-bold'
                      : isToday
                        ? 'bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-300'
                        : inPip
                          ? 'text-slate-700 hover:bg-slate-100'
                          : 'text-slate-300'
                    }`}>
                  <span>{day}</span>
                  {hasLog && (
                    <span className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <button onClick={() => { onSelect(todayStr); setOpen(false); }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Today</button>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> has log</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-50 ring-1 ring-indigo-300 inline-block" /> today</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function resizeImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function ImageThumb({ img }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <img src={img.data} alt={img.name || 'evidence'}
        onClick={() => setExpanded(true)}
        className="w-20 h-20 object-cover rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all" />
      {expanded && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setExpanded(false)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={img.data} alt={img.name || 'evidence'} className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
            <p className="text-white/70 text-xs text-center mt-2">{img.name} — click anywhere to close</p>
          </div>
        </div>
      )}
    </>
  );
}

function GapTracker({ entries, dailyLogs, currentDate }) {
  const gaps = buildGapAnalysis(entries, dailyLogs, currentDate);
  const highGaps = gaps.filter(g => g.severity === 'high');
  const mediumGaps = gaps.filter(g => g.severity === 'medium');
  const allCovered = gaps.length === 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-slate-700 mb-1">
        ⚠️ Gap Tracker / 差距追踪器
      </h3>
      <p className="text-slate-500 text-xs mb-4">
        PIP concerns not yet addressed in your logs this week
        <br />
        <span className="text-slate-400">本周日志中尚未解决的PIP问题</span>
      </p>

      {allCovered ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-emerald-700 font-medium">✅ All 8 competencies addressed this week!</p>
          <p className="text-emerald-600 text-sm">本周所有8项能力都已涉及！</p>
        </div>
      ) : (
        <div className="space-y-4">
          {highGaps.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 uppercase mb-2">
                🔴 Not addressed this week / 本周未涉及
              </p>
              {highGaps.map(gap => (
                <GapCard key={gap.compId} gap={gap} severe />
              ))}
            </div>
          )}
          {mediumGaps.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase mb-2">
                🟡 Not addressed today (covered earlier) / 今天未涉及（之前有涉及）
              </p>
              {mediumGaps.map(gap => (
                <GapCard key={gap.compId} gap={gap} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GapCard({ gap, severe }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`rounded-xl border p-4 mb-2 ${severe ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left flex items-center gap-2">
        <span className="text-xl">{gap.icon}</span>
        <div className="flex-1">
          <span className={`text-sm font-medium ${severe ? 'text-red-800' : 'text-amber-800'}`}>
            {gap.compName}
          </span>
          <br />
          <span className={`text-xs ${severe ? 'text-red-600' : 'text-amber-600'}`}>
            {gap.compNameCn}
          </span>
        </div>
        <span className={`text-xs ${severe ? 'text-red-400' : 'text-amber-400'}`}>
          {gap.concerns.length} concerns · {expanded ? '▲' : '▼'}
        </span>
      </button>
      {expanded && (
        <div className="mt-3 space-y-2 pl-8">
          {gap.concerns.map((c, i) => (
            <div key={i} className={`text-sm border-l-2 pl-3 py-1 ${severe ? 'border-red-300' : 'border-amber-300'}`}>
              <p className={severe ? 'text-red-700' : 'text-amber-700'}>{c.en}</p>
              <p className={`text-xs ${severe ? 'text-red-500' : 'text-amber-500'}`}>{c.cn}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
