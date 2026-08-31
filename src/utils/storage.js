const STORAGE_KEY = 'pip-tracker-data';

const DEFAULT_DATA = {
  dailyLogs: {},
  weeklyAssessments: {},
  actionItems: [],
  nextActionId: 1,
  targetName: 'Irene',
};

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DATA };
    return { ...DEFAULT_DATA, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getDailyLog(data, dateStr) {
  return data.dailyLogs[dateStr] || { entries: [], generalNotes: '', mood: '' };
}

export function saveDailyLog(data, dateStr, log) {
  return {
    ...data,
    dailyLogs: { ...data.dailyLogs, [dateStr]: log },
  };
}

export function getWeeklyAssessment(data, weekNum) {
  return data.weeklyAssessments[weekNum] || {
    scores: {},
    mainImprovement: '',
    mainGap: '',
    coachingFeedback: '',
    employeeComments: '',
  };
}

export function saveWeeklyAssessment(data, weekNum, assessment) {
  return {
    ...data,
    weeklyAssessments: { ...data.weeklyAssessments, [weekNum]: assessment },
  };
}

export function addActionItem(data, item) {
  const id = data.nextActionId || data.actionItems.length + 1;
  return {
    ...data,
    actionItems: [...data.actionItems, { ...item, id, status: 'pending' }],
    nextActionId: id + 1,
  };
}

export function updateActionItem(data, id, updates) {
  return {
    ...data,
    actionItems: data.actionItems.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    ),
  };
}

export function exportData(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pip-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve({ ...DEFAULT_DATA, ...data });
      } catch {
        reject(new Error('Invalid backup file'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });
}
