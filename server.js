import express from 'express';
import { spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  getReviewerReport,
  loadDocument,
  saveDocument,
  saveReviewerReport,
} from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '50mb' }));

const SETTINGS_FILE = join(__dirname, 'ai-settings.json');

function defaultSettings() {
  const cliCommand = process.platform === 'win32'
    ? join(process.env.LOCALAPPDATA || '', 'agy', 'bin', 'agy.exe')
    : '/root/.local/bin/agy';
  return { cliCommand, cliArgs: ['-p'], provider: 'agy' };
}

function loadSettings() {
  try {
    return { ...defaultSettings(), ...JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8')) };
  } catch {
    return defaultSettings();
  }
}

function saveSettingsFile(settings) {
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function callCLI(prompt) {
  return new Promise((resolve, reject) => {
    const settings = loadSettings();
    const args = Array.isArray(settings.cliArgs) && settings.cliArgs.length
      ? settings.cliArgs
      : ['-p'];
    const child = spawn(settings.cliCommand, [...args, prompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
      signal: AbortSignal.timeout(300000),
      windowsHide: true,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('error', err => {
      reject(new Error(`CLI spawn error: ${err.message}`));
    });
    child.on('close', code => {
      if (code !== 0 && !stdout) {
        reject(new Error(`CLI exited ${code}: ${stderr.slice(0, 500)}`));
      } else {
        resolve(stdout || stderr || '');
      }
    });
  });
}

function buildReviewerPrompt(data) {
  const logs = Object.entries(data.dailyLogs || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([, log]) => (log.entries || []).length > 0)
    .map(([date, log]) => {
      const entries = (log.entries || []).map((entry, index) => [
        `Entry ${index + 1}:`,
        `Situation: ${entry.situation || 'Not stated'}`,
        `Positive action: ${entry.action || 'Not stated'}`,
        `People: ${entry.people || 'Not stated'}`,
        `Competencies: ${(entry.competencies || []).join(', ') || 'Not stated'}`,
        `Evidence: ${entry.evidence || 'Not stated'}`,
      ].join('\n')).join('\n\n');
      return `Date: ${date}\n${entries}`;
    }).join('\n\n---\n\n');

  return `Create a reviewer-facing progress report for ${data.targetName || 'the employee'}.

Use ONLY the factual daily log material below.

Strict requirements:
- Rewrite the raw logs into clear, polished, professional language. Correct grammar and improve readability, but preserve the factual meaning.
- Cover every logged entry that contains a positive action, achievement, constructive behaviour, or useful evidence.
- For each dated highlight, explicitly include the supporting evidence from the log under an "Evidence" label.
- Preserve concrete facts, actions, people involved, competency names, and evidence where appropriate.
- Mention only demonstrated strengths, positive actions, progress, achievements, and constructive evidence.
- Do not mention gaps, weaknesses, concerns, failures, risks, missing competencies, recommendations, next steps, coaching suggestions, or areas to improve.
- Do not expose private manager notes, AI instructions, prompts, or hidden analysis.
- Do not reproduce the raw wording verbatim; present it as a professionally written reviewer record.
- Do not invent facts or overstate the evidence.
- Use a warm, professional tone.
- Include a short overall summary followed by dated highlights with their evidence.
- Write the full report twice: once in English and once in Simplified Chinese. Both versions must cover the same content.
- In the English version, start with the heading "Positive Progress Review" and label evidence "Evidence".
- In the Chinese version, start with the heading "积极进展回顾" and label evidence "证据".
- Return Markdown only, in exactly this layout with these marker lines on their own:
<<<EN>>>
(English report)
<<<ZH>>>
(Chinese report)

Daily log material:
${logs || 'No logged evidence is available yet.'}`;
}

app.get('/api/data', (_req, res) => {
  res.json(loadDocument());
});

app.put('/api/data', (req, res) => {
  try {
    res.json(saveDocument(req.body));
  } catch (err) {
    console.error('Save error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

let reviewerGeneration = null;
function generateReviewerReport() {
  if (!reviewerGeneration) {
    reviewerGeneration = callCLI(buildReviewerPrompt(loadDocument()))
      .then((content) => saveReviewerReport(content.trim()))
      .finally(() => {
        reviewerGeneration = null;
      });
  }
  return reviewerGeneration;
}

app.get('/api/reviewer-report', async (_req, res) => {
  try {
    const existing = getReviewerReport();
    if (existing) return res.json(existing);
    res.json(await generateReviewerReport());
  } catch (err) {
    console.error('Reviewer report error:', err.message);
    res.status(500).json({ error: 'Could not generate the reviewer report.' });
  }
});

app.post('/api/reviewer-report/regenerate', async (_req, res) => {
  try {
    res.json(await generateReviewerReport());
  } catch (err) {
    console.error('Reviewer report error:', err.message);
    res.status(500).json({ error: 'Could not regenerate the reviewer report.' });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'No prompt provided' });
    const result = await callCLI(prompt);
    res.json({ analysis: result });
  } catch (err) {
    console.error('Analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings', (_req, res) => {
  res.json(loadSettings());
});

app.post('/api/settings', (req, res) => {
  saveSettingsFile(req.body);
  res.json({ ok: true });
});

app.post('/api/test-cli', async (_req, res) => {
  try {
    const result = await callCLI('Say exactly: Connected and ready. Nothing else.');
    res.json({ ok: true, response: result.trim() });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

if (process.env.NODE_ENV === 'production') {
  const dist = join(__dirname, 'dist');
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(dist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`PIP Tracker API running on http://localhost:${PORT}`);
});
