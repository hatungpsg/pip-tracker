import { useState, useEffect } from 'react';
import { loadData, saveData } from './utils/storage';
import Dashboard from './components/Dashboard';
import DailyLog from './components/DailyLog';
import WeeklyReview from './components/WeeklyReview';
import CompetencyView from './components/CompetencyView';
import Progress from './components/Progress';
import PipDocument from './components/PipDocument';
import Settings from './components/Settings';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'daily', label: 'Daily Log', icon: '📝' },
  { id: 'weekly', label: 'Weekly Review', icon: '📊' },
  { id: 'competencies', label: 'Competencies', icon: '📚' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'pip-doc', label: 'PIP Document', icon: '📄' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [data, setData] = useState(() => loadData());

  useEffect(() => { saveData(data); }, [data]);

  const targetName = data.targetName || 'Irene';

  useEffect(() => {
    document.title = `${targetName}'s PIP Tracker`;
  }, [targetName]);

  const content = {
    dashboard: <Dashboard data={data} setData={setData} onNavigate={setTab} />,
    daily:     <DailyLog data={data} setData={setData} />,
    weekly:    <WeeklyReview data={data} setData={setData} />,
    competencies: <CompetencyView data={data} />,
    progress:  <Progress data={data} />,
    'pip-doc': <PipDocument data={data} />,
    settings:  <Settings data={data} setData={setData} />,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <header className="bg-gradient-to-r from-indigo-700 to-indigo-600 text-white px-6 py-5 shadow-lg">
        <h1 className="text-2xl font-bold tracking-tight">{targetName}'s PIP Tracker</h1>
        <p className="text-indigo-200 text-sm mt-0.5">60-Day Performance Improvement Journey</p>
      </header>

      <nav className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="mr-1.5">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
        {content[tab]}
      </main>

      <footer className="text-center text-xs text-slate-400 py-4">
        Data saved locally in your browser. Use Settings to back up.
      </footer>
    </div>
  );
}
