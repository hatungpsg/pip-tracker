import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.PIP_DB_PATH || join(__dirname, 'data', 'pip.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS app_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS daily_logs (
    log_date      TEXT PRIMARY KEY,
    mood          TEXT,
    general_notes TEXT,
    ai_summary    TEXT,
    updated_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS log_entries (
    id          INTEGER PRIMARY KEY,
    log_date    TEXT NOT NULL REFERENCES daily_logs(log_date) ON DELETE CASCADE,
    situation   TEXT,
    action      TEXT,
    people      TEXT,
    evidence    TEXT,
    images_json TEXT,
    created_at  TEXT,
    sort_order  INTEGER NOT NULL,
    extras_json TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_log_entries_date ON log_entries(log_date);

  CREATE TABLE IF NOT EXISTS entry_competencies (
    entry_id      INTEGER NOT NULL REFERENCES log_entries(id) ON DELETE CASCADE,
    competency_id TEXT NOT NULL,
    position      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (entry_id, competency_id)
  );

  CREATE TABLE IF NOT EXISTS weekly_assessments (
    week_num           INTEGER PRIMARY KEY,
    main_improvement   TEXT,
    main_gap           TEXT,
    coaching_feedback  TEXT,
    employee_comments  TEXT,
    ai_prep            TEXT,
    weekly_summary     TEXT,
    extras_json        TEXT,
    updated_at         TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS weekly_scores (
    week_num      INTEGER NOT NULL REFERENCES weekly_assessments(week_num) ON DELETE CASCADE,
    competency_id TEXT NOT NULL,
    score         INTEGER NOT NULL,
    PRIMARY KEY (week_num, competency_id)
  );

  CREATE TABLE IF NOT EXISTS action_items (
    id     INTEGER PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'pending',
    body   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reviewer_reports (
    id           TEXT PRIMARY KEY,
    content      TEXT NOT NULL,
    generated_at TEXT NOT NULL
  );
`);

function meta(key, fallback) {
  const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function setMeta(key, value) {
  db.prepare(`
    INSERT INTO app_meta (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

export function loadDocument() {
  const dailyLogs = {};
  const logs = db.prepare('SELECT * FROM daily_logs ORDER BY log_date').all();
  const entries = db.prepare('SELECT * FROM log_entries ORDER BY log_date, sort_order, id').all();
  const comps = db.prepare('SELECT * FROM entry_competencies ORDER BY entry_id, position').all();
  const compsByEntry = new Map();
  for (const row of comps) {
    const list = compsByEntry.get(row.entry_id) || [];
    list.push(row.competency_id);
    compsByEntry.set(row.entry_id, list);
  }
  const entriesByDate = new Map();
  for (const row of entries) {
    const list = entriesByDate.get(row.log_date) || [];
    const extras = row.extras_json ? JSON.parse(row.extras_json) : {};
    list.push({
      ...extras,
      id: row.id,
      situation: row.situation || '',
      action: row.action || '',
      people: row.people || '',
      evidence: row.evidence || '',
      competencies: compsByEntry.get(row.id) || [],
      images: row.images_json ? JSON.parse(row.images_json) : undefined,
      ts: row.created_at || undefined,
    });
    entriesByDate.set(row.log_date, list);
  }
  for (const row of logs) {
    const dayEntries = entriesByDate.get(row.log_date) || [];
    const log = {
      entries: dayEntries.map((entry) => {
        if (!entry.images) {
          const { images, ...rest } = entry;
          return rest;
        }
        return entry;
      }),
      generalNotes: row.general_notes || '',
      mood: row.mood || '',
      aiSummary: row.ai_summary || '',
    };
    dailyLogs[row.log_date] = log;
  }

  const weeklyAssessments = {};
  const weeks = db.prepare('SELECT * FROM weekly_assessments ORDER BY week_num').all();
  const scores = db.prepare('SELECT * FROM weekly_scores').all();
  const scoresByWeek = new Map();
  for (const row of scores) {
    const map = scoresByWeek.get(row.week_num) || {};
    map[row.competency_id] = row.score;
    scoresByWeek.set(row.week_num, map);
  }
  for (const row of weeks) {
    const extras = row.extras_json ? JSON.parse(row.extras_json) : {};
    weeklyAssessments[String(row.week_num)] = {
      ...extras,
      scores: scoresByWeek.get(row.week_num) || {},
      mainImprovement: row.main_improvement || '',
      mainGap: row.main_gap || '',
      coachingFeedback: row.coaching_feedback || '',
      employeeComments: row.employee_comments || '',
      aiPrep: row.ai_prep || '',
      weeklySummary: row.weekly_summary || '',
    };
  }

  const actionItems = db.prepare('SELECT * FROM action_items ORDER BY id').all().map((row) => {
    const body = JSON.parse(row.body);
    return { ...body, id: row.id, status: row.status };
  });

  return {
    dailyLogs,
    weeklyAssessments,
    actionItems,
    nextActionId: Number(meta('nextActionId', '1')) || 1,
    targetName: meta('targetName', 'Irene'),
  };
}

const saveTx = db.transaction((doc) => {
  db.exec(`
    DELETE FROM entry_competencies;
    DELETE FROM log_entries;
    DELETE FROM daily_logs;
    DELETE FROM weekly_scores;
    DELETE FROM weekly_assessments;
    DELETE FROM action_items;
  `);

  setMeta('targetName', doc.targetName || 'Irene');
  setMeta('nextActionId', String(doc.nextActionId || 1));

  const insertLog = db.prepare(`
    INSERT INTO daily_logs (log_date, mood, general_notes, ai_summary, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertEntry = db.prepare(`
    INSERT INTO log_entries
      (id, log_date, situation, action, people, evidence, images_json, created_at, sort_order, extras_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertComp = db.prepare(`
    INSERT OR IGNORE INTO entry_competencies (entry_id, competency_id, position) VALUES (?, ?, ?)
  `);

  const now = new Date().toISOString();
  for (const [date, log] of Object.entries(doc.dailyLogs || {})) {
    if (!date) continue;
    insertLog.run(date, log.mood || '', log.generalNotes || '', log.aiSummary || '', now);
    (log.entries || []).forEach((entry, index) => {
      const {
        id, situation, action, people, evidence, images, competencies, ts,
        ...rest
      } = entry || {};
      const entryId = Number(id) || Date.now() + index;
      insertEntry.run(
        entryId,
        date,
        situation || '',
        action || '',
        people || '',
        evidence || '',
        images && images.length ? JSON.stringify(images) : null,
        ts || null,
        index,
        Object.keys(rest).length ? JSON.stringify(rest) : null,
      );
      (competencies || []).forEach((competencyId, position) => {
        if (competencyId) insertComp.run(entryId, String(competencyId), position);
      });
    });
  }

  const insertWeek = db.prepare(`
    INSERT INTO weekly_assessments (
      week_num, main_improvement, main_gap, coaching_feedback, employee_comments,
      ai_prep, weekly_summary, extras_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertScore = db.prepare(`
    INSERT INTO weekly_scores (week_num, competency_id, score) VALUES (?, ?, ?)
  `);
  for (const [weekKey, assessment] of Object.entries(doc.weeklyAssessments || {})) {
    const weekNum = Number(weekKey);
    if (!Number.isFinite(weekNum)) continue;
    const {
      scores, mainImprovement, mainGap, coachingFeedback, employeeComments,
      aiPrep, weeklySummary, ...rest
    } = assessment || {};
    insertWeek.run(
      weekNum,
      mainImprovement || '',
      mainGap || '',
      coachingFeedback || '',
      employeeComments || '',
      aiPrep || '',
      weeklySummary || '',
      Object.keys(rest).length ? JSON.stringify(rest) : null,
      now,
    );
    for (const [competencyId, score] of Object.entries(scores || {})) {
      const n = Number(score);
      if (!competencyId || !Number.isFinite(n)) continue;
      insertScore.run(weekNum, competencyId, n);
    }
  }

  const insertAction = db.prepare(`
    INSERT INTO action_items (id, status, body) VALUES (?, ?, ?)
  `);
  for (const item of doc.actionItems || []) {
    const { id, status, ...rest } = item || {};
    const actionId = Number(id);
    if (!Number.isFinite(actionId)) continue;
    insertAction.run(actionId, status || 'pending', JSON.stringify(rest));
  }
});

export function saveDocument(doc) {
  saveTx(doc || {});
  return loadDocument();
}

export function getReviewerReport() {
  return db.prepare(`
    SELECT content, generated_at AS generatedAt
    FROM reviewer_reports
    WHERE id = 'current'
  `).get() || null;
}

export function saveReviewerReport(content) {
  const generatedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO reviewer_reports (id, content, generated_at)
    VALUES ('current', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      content = excluded.content,
      generated_at = excluded.generated_at
  `).run(content, generatedAt);
  return { content, generatedAt };
}

export { DB_PATH };
