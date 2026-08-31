import express from 'express';
import { spawn } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '10mb' }));

const SETTINGS_FILE = join(__dirname, 'ai-settings.json');

function loadSettings() {
  try {
    return JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'));
  } catch {
    return { cliCommand: 'C:\\Users\\hatung.wong\\AppData\\Local\\agy\\bin\\agy.exe', cliArgs: ['-p'], provider: 'agy' };
  }
}

function saveSettingsFile(settings) {
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function callCLI(prompt) {
  return new Promise((resolve, reject) => {
    const settings = loadSettings();
    const ts = Date.now();
    const promptFile = join(tmpdir(), `pip-prompt-${ts}.txt`);
    const wrapperFile = join(tmpdir(), `pip-wrap-${ts}.ps1`);

    const sanitized = prompt.replace(/\r\n/g, '\n');
    writeFileSync(promptFile, sanitized, 'utf-8');

    const cliPath = settings.cliCommand;
    writeFileSync(wrapperFile,
      `$text = [System.IO.File]::ReadAllText('${promptFile.replace(/'/g, "''")}')\n` +
      `& '${cliPath.replace(/'/g, "''")}' --print=$text\n`,
      'utf-8'
    );

    const child = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', wrapperFile], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 180000,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('error', err => {
      cleanup();
      reject(new Error(`CLI spawn error: ${err.message}`));
    });
    child.on('close', code => {
      cleanup();
      if (code !== 0 && !stdout) {
        reject(new Error(`CLI exited ${code}: ${stderr.slice(0, 500)}`));
      } else {
        resolve(stdout || stderr || '');
      }
    });

    function cleanup() {
      try { unlinkSync(promptFile); } catch {}
      try { unlinkSync(wrapperFile); } catch {}
    }
  });
}

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
  app.use(express.static(join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`PIP Tracker API running on http://localhost:${PORT}`);
});
