import { useEffect, useState } from 'react';

const API = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;

const TEXT = {
  en: {
    eyebrow: 'Reviewer copy',
    title: 'Positive Progress Review',
    back: 'Back to tracker',
    preparing: 'Preparing the reviewer copy… This can take a minute or two.',
    regenerating: 'Regenerating…',
    regenerate: 'Regenerate',
    confirm: 'Regenerate this review from the latest logs? This can take a minute or two.',
    prepared: 'Prepared',
    loadError: 'Could not load the review.',
    regenError: 'Could not regenerate the review.',
  },
  zh: {
    eyebrow: '评审副本',
    title: '积极进展回顾',
    back: '返回记录',
    preparing: '正在准备评审副本……可能需要一两分钟。',
    regenerating: '正在重新生成……',
    regenerate: '重新生成',
    confirm: '根据最新记录重新生成这份回顾？可能需要一两分钟。',
    prepared: '生成于',
    loadError: '无法加载回顾。',
    regenError: '无法重新生成回顾。',
  },
};

function splitLanguages(content) {
  const match = content.match(/<<<EN>>>([\s\S]*?)<<<ZH>>>([\s\S]*)/);
  if (!match) return { en: content.trim(), zh: content.trim() };
  return { en: match[1].trim(), zh: match[2].trim() };
}

async function readReport(res, fallback) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || fallback);
  return body;
}

export default function ReviewerPage() {
  const [lang, setLang] = useState('en');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const t = TEXT[lang];

  useEffect(() => {
    fetch(`${API}/reviewer-report`)
      .then((res) => readReport(res, TEXT.en.loadError))
      .then(setReport)
      .catch((err) => setError(err.message));
  }, []);

  async function regenerate() {
    if (!window.confirm(t.confirm)) return;
    setRegenerating(true);
    setError('');
    try {
      const res = await fetch(`${API}/reviewer-report/regenerate`, { method: 'POST' });
      setReport(await readReport(res, t.regenError));
    } catch (err) {
      setError(err.message);
    } finally {
      setRegenerating(false);
    }
  }

  const content = report ? splitLanguages(report.content)[lang] : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <header className="bg-gradient-to-r from-indigo-700 to-indigo-600 text-white px-6 py-6 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-start justify-between gap-4">
          <div>
            <a href={import.meta.env.BASE_URL} className="text-indigo-200 text-sm hover:text-white">
              ← {t.back}
            </a>
            <p className="text-indigo-200 text-sm uppercase tracking-wide mt-2">{t.eyebrow}</p>
            <h1 className="text-2xl font-bold tracking-tight mt-1">{t.title}</h1>
          </div>
          <div className="flex rounded-lg bg-white/15 p-1 text-sm shrink-0">
            {[['en', 'English'], ['zh', '中文']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setLang(id)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  lang === id ? 'bg-white text-indigo-700' : 'text-white hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 space-y-4">
        {!report && !error && (
          <div className="bg-white border rounded-2xl p-8 text-center text-slate-500 shadow-sm">
            {t.preparing}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
            {error}
          </div>
        )}

        {report && (
          <article className="bg-white border rounded-2xl p-6 sm:p-8 shadow-sm text-slate-700">
            <Markdown text={content} />
            <div className="mt-8 pt-4 border-t flex items-center justify-between gap-4">
              <p className="text-xs text-slate-400">
                {t.prepared} {new Date(report.generatedAt).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-MY')}
              </p>
              <button
                onClick={regenerate}
                disabled={regenerating}
                className="text-sm rounded-lg border border-indigo-200 text-indigo-700 px-4 py-2 font-medium hover:bg-indigo-50 disabled:opacity-50"
              >
                {regenerating ? t.regenerating : t.regenerate}
              </button>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}

function Markdown({ text }) {
  return (
    <div>
      {text.split('\n').map((line, index) => {
        const value = line.trim();
        if (value.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-semibold text-indigo-800 mt-6 mb-2">{bold(value.slice(4))}</h3>;
        }
        if (value.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-bold text-indigo-900 mt-7 mb-3">{bold(value.slice(3))}</h2>;
        }
        if (value.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-bold text-indigo-950 mb-4">{bold(value.slice(2))}</h1>;
        }
        if (value.startsWith('- ') || value.startsWith('* ')) {
          return <li key={index} className="ml-5 mb-2 list-disc">{bold(value.slice(2))}</li>;
        }
        if (/^\d+\.\s/.test(value)) {
          return <li key={index} className="ml-5 mb-2 list-decimal">{bold(value.replace(/^\d+\.\s/, ''))}</li>;
        }
        if (!value) return <div key={index} className="h-2" />;
        return <p key={index} className="mb-3 leading-7">{bold(value)}</p>;
      })}
    </div>
  );
}

function bold(text) {
  return text
    .split(/\*\*(.*?)\*\*/g)
    .map((part, index) => index % 2
      ? <strong key={index}>{part}</strong>
      : part);
}
