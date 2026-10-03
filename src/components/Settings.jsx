import { useState, useEffect } from 'react';
import { getSettings, updateSettings, testCLI } from '../utils/api';
import { exportData, importData, saveData } from '../utils/storage';

const PRESETS = [
  { id: 'agy', label: 'Antigravity (agy)', command: 'agy', args: ['-p'] },
  { id: 'claude', label: 'Claude CLI', command: 'claude', args: ['-p'] },
  { id: 'codex', label: 'Codex CLI', command: 'codex', args: ['exec'] },
  { id: 'custom', label: 'Custom', command: '', args: [] },
];

export default function Settings({ data, setData }) {
  const [settings, setSettings] = useState({ cliCommand: 'claude', cliArgs: ['-p'], provider: 'claude' });
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [targetName, setTargetName] = useState(data?.targetName || 'Irene');

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
  }, []);

  async function handleSave() {
    await updateSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTest() {
    setTesting(true); setTestResult(null);
    try {
      const result = await testCLI();
      setTestResult(result);
    } catch (err) {
      setTestResult({ ok: false, error: err.message });
    }
    setTesting(false);
  }

  function applyPreset(id) {
    const preset = PRESETS.find(p => p.id === id);
    if (preset) {
      setSettings({ ...settings, provider: id, cliCommand: preset.command, cliArgs: preset.args });
    }
  }

  function handleExport() {
    exportData(data);
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const d = await importData(file);
      setData(d);
      saveData(d);
      alert('Data imported into the database.');
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Settings</h2>

      {/* Target Person */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">👤 Target Person / 目标人物</h3>
        <p className="text-slate-500 text-sm mb-4">
          The person going through the PIP. This name will appear throughout the app and in AI prompts.
        </p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-1">Name</label>
            <input value={targetName} onChange={e => setTargetName(e.target.value)}
              placeholder="e.g. Irene"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <button onClick={() => {
            const updated = { ...data, targetName: targetName.trim() || 'Irene' };
            setData(updated);
            saveData(updated);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            Save Name
          </button>
        </div>
      </div>

      {/* AI CLI */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">🤖 AI CLI Configuration</h3>
        <p className="text-slate-500 text-sm mb-4">
          Connect an AI CLI tool so the system can generate daily summaries and next steps.
          The app pipes your log data as a prompt to the CLI and returns the response.
        </p>

        <label className="block text-sm font-medium text-slate-600 mb-2">Provider Preset</label>
        <div className="flex gap-3 mb-4 flex-wrap">
          {PRESETS.map(p => (
            <button key={p.id} onClick={() => applyPreset(p.id)}
              className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                settings.provider === p.id
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">CLI Command</label>
            <input value={settings.cliCommand || ''} onChange={e => setSettings({ ...settings, cliCommand: e.target.value })}
              placeholder="e.g. claude, codex, antigravity"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">CLI Arguments (comma-separated)</label>
            <input value={(settings.cliArgs || []).join(', ')} onChange={e => setSettings({ ...settings, cliArgs: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              placeholder="e.g. -p, --print"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <button onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            Save Settings
          </button>
          <button onClick={handleTest} disabled={testing}
            className="border border-slate-300 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          {saved && <span className="text-emerald-600 text-sm">✓ Saved</span>}
        </div>

        {testResult && (
          <div className={`mt-4 p-4 rounded-lg text-sm ${testResult.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {testResult.ok ? (
              <>✅ Connected! Response: &quot;{testResult.response}&quot;</>
            ) : (
              <>❌ Failed: {testResult.error}</>
            )}
          </div>
        )}
      </div>

      {/* Data management */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">💾 Data Management</h3>
        <p className="text-slate-500 text-sm mb-4">
          Your data is stored locally in this browser. Back it up regularly so you don&apos;t lose anything.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button onClick={handleExport}
            className="border border-slate-300 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            📥 Export Backup
          </button>
          <label className="border border-slate-300 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer">
            📤 Import Backup
            <input type="file" accept=".json" onChange={handleImport} className="sr-only" />
          </label>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-700 mb-3">How the AI Integration Works</h3>
        <ol className="text-sm text-slate-600 space-y-2 list-decimal ml-4">
          <li>You log your daily entries in the <strong>Daily Log</strong> tab</li>
          <li>Click <strong>&quot;Generate Summary&quot;</strong> at the bottom</li>
          <li>The app sends your entries + PIP context as a prompt to your configured AI CLI</li>
          <li>The AI returns a personalised summary with strengths, focus areas, and next steps</li>
          <li>The summary is saved with your daily log for future reference</li>
        </ol>
        <p className="text-sm text-slate-500 mt-3">
          Make sure your AI CLI is installed and working in your terminal before using this feature.
          The backend server must be running (<code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs">node server.js</code>).
        </p>
      </div>
    </div>
  );
}
