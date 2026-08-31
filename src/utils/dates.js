import { PIP_START, PIP_END, PIP_MIDPOINT, REVIEW_SCHEDULE } from '../data/pipData';

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(str) {
  const d = parseDate(str);
  return d.toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateShort(str) {
  const d = parseDate(str);
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

export function dayOfPIP(dateStr) {
  const start = parseDate(PIP_START);
  const current = parseDate(dateStr || today());
  const diff = Math.floor((current - start) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

export function weekOfPIP(dateStr) {
  const day = dayOfPIP(dateStr);
  return Math.min(8, Math.max(1, Math.ceil(day / 7)));
}

export function daysRemaining(dateStr) {
  const end = parseDate(PIP_END);
  const current = parseDate(dateStr || today());
  return Math.max(0, Math.floor((end - current) / (1000 * 60 * 60 * 24)));
}

export function progressPercent(dateStr) {
  const day = dayOfPIP(dateStr);
  return Math.min(100, Math.max(0, Math.round((day / 60) * 100)));
}

export function isPastMidpoint(dateStr) {
  return parseDate(dateStr || today()) >= parseDate(PIP_MIDPOINT);
}

export function getNextMilestone(dateStr) {
  const current = parseDate(dateStr || today());
  for (const item of REVIEW_SCHEDULE) {
    if (parseDate(item.date) >= current) {
      const daysUntil = Math.floor((parseDate(item.date) - current) / (1000 * 60 * 60 * 24));
      return { ...item, daysUntil };
    }
  }
  return null;
}

export function getWeekDates(weekNum) {
  const start = parseDate(PIP_START);
  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    if (parseDate(ds) <= parseDate(PIP_END)) {
      dates.push(ds);
    }
  }
  return dates;
}

export function datesBetween(startStr, endStr) {
  const dates = [];
  const current = parseDate(startStr);
  const end = parseDate(endStr);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}
