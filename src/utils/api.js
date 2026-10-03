const API = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;

export async function analyzeDaily(prompt) {
  const res = await fetch(`${API}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Analysis failed');
  }
  return res.json();
}

export async function getSettings() {
  const res = await fetch(`${API}/settings`);
  return res.json();
}

export async function updateSettings(settings) {
  const res = await fetch(`${API}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return res.json();
}

export async function testCLI() {
  const res = await fetch(`${API}/test-cli`, { method: 'POST' });
  return res.json();
}
