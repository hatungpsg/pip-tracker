import { useState, useEffect } from 'react';
import { fetchRemoteData, saveData } from './utils/storage';
import Dashboard from './components/Dashboard';
import DailyLog from './components/DailyLog';
import WeeklyReview from './components/WeeklyReview';
import CompetencyView from './components/CompetencyView';
import Progress from './components/Progress';
import PipDocument from './components/PipDocument';
import Settings from './components/Settings';
import ReviewerPage from './components/ReviewerPage';

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
  const reviewerPath = window.location.pathname.replace(/\/+$/, '').endsWith('/review');
  const [tab, setTab] = useState('dashboard');
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (reviewerPath) return;
    fetchRemoteData()
      .then(setData)
      .catch((err) => setLoadError(err.message));
  }, [reviewerPath]);

  useEffect(() => {
    if (reviewerPath) return;
    if (!data) return;
    saveData(data);
  }, [data, reviewerPath]);

  useEffect(() => {
    if (reviewerPath) {
      document.title = 'Positive Progress Review';
      return;
    }
    if (!data) return;
    document.title = `${data.targetName || 'Irene'}'s PIP Tracker`;
  }, [data, reviewerPath]);

  if (reviewerPath) return <ReviewerPage />;

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        {loadError || 'Loading logs…'}
      </div>
    );
  }

  const targetName = data.targetName || 'Irene';

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
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{targetName}'s PIP Tracker</h1>
            <p className="text-indigo-200 text-sm mt-0.5">60-Day Performance Improvement Journey</p>
          </div>
          <a
            href={`${import.meta.env.BASE_URL}review`}
            className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            Reviewer page / 评审页
          </a>
        </div>
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
        Logs are saved in the server database. Use Settings to back up.
      </footer>
    </div>
  );
}
