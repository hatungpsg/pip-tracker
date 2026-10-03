import { COMPETENCIES } from '../data/pipData';
import { dayOfPIP, weekOfPIP, daysRemaining, getNextMilestone, formatDate } from './dates';

function getConcernText(c) {
  return typeof c === 'string' ? c : c.en;
}

function getConcernCn(c) {
  return typeof c === 'string' ? '' : c.cn;
}

function getBehaviorText(b) {
  return typeof b === 'string' ? b : b.en;
}

export function buildGapAnalysis(entries, dailyLogs, currentDate) {
  const currentWeek = weekOfPIP(currentDate);
  const allWeekEntries = [];

  Object.entries(dailyLogs || {}).forEach(([d, log]) => {
    if (weekOfPIP(d) === currentWeek && d <= currentDate) {
      (log.entries || []).forEach(e => allWeekEntries.push(e));
    }
  });
  entries.forEach(e => allWeekEntries.push(e));

  const weekCompIds = new Set(allWeekEntries.flatMap(e => e.competencies || []));
  const todayCompIds = new Set(entries.flatMap(e => e.competencies || []));

  const gaps = [];
  COMPETENCIES.forEach(comp => {
    const addressedToday = todayCompIds.has(comp.id);
    const addressedThisWeek = weekCompIds.has(comp.id);

    const unaddressedConcerns = comp.concerns.map(c => ({
      en: getConcernText(c),
      cn: getConcernCn(c),
      addressedToday,
      addressedThisWeek,
    }));

    if (!addressedThisWeek) {
      gaps.push({
        compId: comp.id,
        compName: comp.name,
        compNameCn: comp.nameCn,
        icon: comp.icon,
        severity: 'high',
        concerns: unaddressedConcerns,
      });
    } else if (!addressedToday) {
      gaps.push({
        compId: comp.id,
        compName: comp.name,
        compNameCn: comp.nameCn,
        icon: comp.icon,
        severity: 'medium',
        concerns: unaddressedConcerns,
      });
    }
  });

  return gaps;
}

export function buildDailyPrompt({ date, entries, generalNotes, mood, dailyLogs, weeklyAssessments, targetName = 'Irene' }) {
  const day = dayOfPIP(date);
  const week = weekOfPIP(date);
  const remaining = daysRemaining(date);
  const milestone = getNextMilestone(date);

  const addressedIds = new Set(entries.flatMap(e => e.competencies || []));
  const addressed = COMPETENCIES.filter(c => addressedIds.has(c.id));
  const missed = COMPETENCIES.filter(c => !addressedIds.has(c.id));

  const weekCompIds = new Set();
  Object.entries(dailyLogs || {}).forEach(([d, log]) => {
    if (weekOfPIP(d) === week && d <= date) {
      (log.entries || []).forEach(e => (e.competencies || []).forEach(id => weekCompIds.add(id)));
    }
  });
  entries.forEach(e => (e.competencies || []).forEach(id => weekCompIds.add(id)));

  const entriesText = entries.length > 0
    ? entries.map((e, i) => {
        const compNames = (e.competencies || [])
          .map(id => COMPETENCIES.find(c => c.id === id)?.name || id)
          .join(', ');
        return `Entry ${i + 1}:
- Situation: ${e.situation || '(not described)'}
- Action taken: ${e.action || '(not described)'}
- People involved: ${e.people || '(not specified)'}
- Competencies tagged: ${compNames || '(none)'}
- Evidence: ${e.evidence || '(none)'}`;
      }).join('\n\n')
    : '(No entries logged today)';

  const specificGaps = [];
  COMPETENCIES.forEach(comp => {
    if (!weekCompIds.has(comp.id)) {
      const concerns = comp.concerns
        .map(c => `  - ${getConcernText(c)} / ${getConcernCn(c)}`)
        .join('\n');
      specificGaps.push(`${comp.icon} ${comp.name} (${comp.nameCn}) — NOT ADDRESSED THIS WEEK\nSpecific concerns that still need evidence:\n${concerns}`);
    } else if (!addressedIds.has(comp.id)) {
      specificGaps.push(`${comp.icon} ${comp.name} (${comp.nameCn}) — Not addressed TODAY (but covered earlier this week)`);
    }
  });

  const prevWeek = week > 1 ? weeklyAssessments?.[week - 1] : null;
  const prevScores = prevWeek
    ? COMPETENCIES.map(c => `${c.name}: ${prevWeek.scores?.[c.id] ?? 'N/A'}/5`).join(', ')
    : 'No previous assessment yet';

  return `You are a supportive and practical performance improvement coach helping ${targetName}, a Vice Principal at Tadika Bijak Junior kindergarten (KP branch), navigate her 60-day PIP.

YOUR ROLE: Help ${targetName} genuinely improve. Be warm, specific, and actionable. PROACTIVELY flag specific PIP concerns she has not yet demonstrated improvement on.

LANGUAGE: Respond in BOTH English AND Chinese (简体中文). For each section, write the English first, then the Chinese translation below it.

## PIP Status
- Day ${day} of 60 (${remaining} days remaining)
- Week ${week} of 8
- ${milestone ? `Next milestone: ${milestone.review} on ${formatDate(milestone.date)} (${milestone.daysUntil} days away)` : 'Final review approaching'}
- Target: Score 4/5 or above in ALL 8 competencies by Day 60

## The 8 Competencies with ALL Specific Concerns
${COMPETENCIES.map(c => {
    const concerns = c.concerns.map(x => `  - ${getConcernText(x)} / ${getConcernCn(x)}`).join('\n');
    return `${c.icon} ${c.name} (${c.nameCn}):\nConcerns:\n${concerns}\nRequired: ${c.requiredBehaviors.map(b => getBehaviorText(b)).join('; ')}`;
  }).join('\n\n')}

## Today's Log (${formatDate(date)})
${mood ? `Mood: ${mood === 'good' ? 'Good day' : mood === 'neutral' ? 'Okay day' : 'Tough day'}` : ''}

${entriesText}
${generalNotes ? `\nGeneral notes: ${generalNotes}` : ''}

## Addressed Today: ${addressed.length}/8
${addressed.map(c => `✅ ${c.icon} ${c.name}`).join('\n') || 'None yet'}

## GAP ANALYSIS — Concerns NOT Yet Addressed
${specificGaps.length > 0 ? specificGaps.join('\n\n') : 'All competencies have been addressed this week!'}

## Last Week's Scores
${prevScores}

---
IMPORTANT: You MUST proactively identify which specific PIP concerns have NOT been addressed in the logs and tell ${targetName} clearly. Match each of her log entries against the specific concern bullet points listed above. For any concern that has NO matching log entry this week, explicitly flag it.

Respond with these sections. Use markdown formatting. Write BOTH English AND Chinese (简体中文) for each section.

### 📊 Today's Summary / 今日总结
Summarise what ${targetName} did today. Be specific about which competencies and which specific concerns were demonstrated.

### 💪 What You Did Well / 做得好的地方
2-3 specific actions that directly address specific PIP concerns. Name the exact concern being addressed.

### ⚠️ Concerns Still Not Addressed / 仍未解决的问题
THIS IS THE MOST IMPORTANT SECTION. List EVERY specific PIP concern that ${targetName} has NOT demonstrated improvement on this week. For each one:
- State the concern in English and Chinese
- Suggest one concrete action she can take tomorrow to address it
Be thorough — do not skip any unaddressed concern.

### 🎯 Priority Actions for Tomorrow / 明天的优先行动
3-5 concrete, practical actions targeting the most critical unaddressed concerns. Be very specific (e.g. 'Post Teacher Sarah's lesson plan feedback in the official group chat instead of private message' not 'be more transparent').

### 📋 Reminders / 提醒
Next milestone, patterns, preparation tips.

### 💬 Encouragement / 鼓励
Genuine encouragement based on today's entries.

Be thorough on the gap analysis. Every unaddressed concern is a risk for Day 60.`;
}

export function buildWeeklyPrepPrompt({ week, dailyLogs, weeklyAssessment, targetName = 'Irene' }) {
  const weekEntries = Object.entries(dailyLogs || {})
    .filter(([d]) => weekOfPIP(d) === week)
    .sort(([a], [b]) => a.localeCompare(b));

  const allEntries = weekEntries.flatMap(([d, log]) =>
    (log.entries || []).map(e => ({ date: d, ...e }))
  );

  const coverage = {};
  COMPETENCIES.forEach(c => {
    coverage[c.id] = { name: c.name, nameCn: c.nameCn, icon: c.icon, count: 0, examples: [] };
  });
  allEntries.forEach(e => {
    (e.competencies || []).forEach(id => {
      if (coverage[id]) {
        coverage[id].count++;
        if (coverage[id].examples.length < 2) {
          coverage[id].examples.push(
            `${formatDate(e.date)}: ${(e.action || e.situation || '').slice(0, 80)}`
          );
        }
      }
    });
  });

  const uncoveredConcerns = [];
  COMPETENCIES.forEach(comp => {
    if (!coverage[comp.id] || coverage[comp.id].count === 0) {
      const concerns = comp.concerns.map(c => `  - ${getConcernText(c)} / ${getConcernCn(c)}`).join('\n');
      uncoveredConcerns.push(`${comp.icon} ${comp.name} (${comp.nameCn}):\n${concerns}`);
    }
  });

  const scores = weeklyAssessment?.scores || {};

  return `You are helping ${targetName} prepare for her Week ${week} PIP coaching meeting with Coach Lim at Tadika Bijak Junior kindergarten.

LANGUAGE: Respond in BOTH English AND Chinese (简体中文).

## Week ${week} Data
Total entries: ${allEntries.length} across ${weekEntries.length} days

### Competency Coverage
${Object.values(coverage).map(c =>
    `${c.icon} ${c.name} (${c.nameCn}): ${c.count} entries${c.count > 0 ? ` — e.g. ${c.examples.join('; ')}` : ' — NO ENTRIES'}`
  ).join('\n')}

### Concerns NOT Covered This Week
${uncoveredConcerns.length > 0 ? uncoveredConcerns.join('\n\n') : 'All competencies covered!'}

### Self-Assessment Scores
${COMPETENCIES.map(c => `${c.name}: ${scores[c.id] ?? 'Not scored'}/5`).join('\n')}
${weeklyAssessment?.mainImprovement ? `\nMain improvement: ${weeklyAssessment.mainImprovement}` : ''}
${weeklyAssessment?.mainGap ? `\nMain gap: ${weeklyAssessment.mainGap}` : ''}

---
Generate a bilingual (EN/CN) meeting preparation brief:

### 📋 Talking Points / 讨论要点
Key things to highlight that show improvement.

### 💡 Evidence to Present / 要呈现的证据
Specific examples from the daily log for each competency.

### ⚠️ Gaps to Acknowledge / 需要承认的差距
CRITICAL: List every specific concern that was NOT addressed this week. Suggest how ${targetName} should acknowledge each gap honestly while showing a plan.

### 🎯 Actions to Propose for Next Week / 下周行动建议
3-5 concrete actions targeting unaddressed concerns.

### 💬 Handling Feedback / 如何处理反馈
Tips for receiving feedback well.

Be practical, specific, and supportive.`;
}

export function buildWeeklySummaryPrompt({ week, dailyLogs, targetName = 'Irene' }) {
  const weekEntries = Object.entries(dailyLogs || {})
    .filter(([d]) => weekOfPIP(d) === week)
    .sort(([a], [b]) => a.localeCompare(b));

  const dayByDay = weekEntries.map(([d, log]) => {
    const entries = (log.entries || []);
    if (entries.length === 0 && !log.generalNotes && !log.mood) return null;
    const compIds = new Set(entries.flatMap(e => e.competencies || []));
    const compNames = [...compIds].map(id => {
      const c = COMPETENCIES.find(x => x.id === id);
      return c ? `${c.icon} ${c.name}` : id;
    }).join(', ');
    const entriesText = entries.map((e, i) =>
      `  ${i + 1}. ${e.situation || ''} → ${e.action || ''} [${(e.competencies || []).map(id => COMPETENCIES.find(x => x.id === id)?.name || id).join(', ')}]`
    ).join('\n');
    return `### ${formatDate(d)} ${log.mood === 'good' ? '😊' : log.mood === 'tough' ? '😤' : log.mood === 'neutral' ? '😐' : ''}
Entries: ${entries.length} | Competencies: ${compNames || 'None'}
${entriesText}${log.generalNotes ? `\nNotes: ${log.generalNotes}` : ''}`;
  }).filter(Boolean);

  const allEntries = weekEntries.flatMap(([d, log]) =>
    (log.entries || []).map(e => ({ date: d, ...e }))
  );

  const coverage = {};
  COMPETENCIES.forEach(c => { coverage[c.id] = { name: c.name, nameCn: c.nameCn, icon: c.icon, count: 0 }; });
  allEntries.forEach(e => {
    (e.competencies || []).forEach(id => { if (coverage[id]) coverage[id].count++; });
  });

  const uncovered = COMPETENCIES.filter(c => coverage[c.id].count === 0);

  return `You are a supportive performance improvement coach reviewing ${targetName}'s Week ${week} logs for her 60-day PIP at Tadika Bijak Junior kindergarten (KP branch).

LANGUAGE: Respond in BOTH English AND Chinese (简体中文). For each section, write English first, then Chinese below.

## Week ${week} — Full Daily Logs
${dayByDay.length > 0 ? dayByDay.join('\n\n') : '(No entries logged this week)'}

## Competency Coverage
${Object.values(coverage).map(c => `${c.icon} ${c.name} (${c.nameCn}): ${c.count} entries${c.count === 0 ? ' ❌' : ' ✅'}`).join('\n')}

## Uncovered This Week
${uncovered.length > 0 ? uncovered.map(c => `- ${c.icon} ${c.name} (${c.nameCn})`).join('\n') : 'All 8 competencies covered!'}

---
Write a comprehensive weekly summary. Be specific, reference actual log entries, and be encouraging but honest about gaps.

### 📊 Week ${week} Overview / 第${week}周概览
How many days logged, total entries, overall pattern. Was this a strong week or a quiet one?

### ✅ Key Achievements / 主要成就
3-5 specific things ${targetName} did well this week. Reference actual log entries and name the exact PIP concerns being addressed.

### 📈 Progress Trend / 进步趋势
Compare to what a typical Week ${week} should look like. Is she on track for Day 60?

### ⚠️ Gaps & Risks / 差距与风险
Which competencies were NOT covered? Which specific PIP concerns still have no evidence? Be thorough.

### 🎯 Focus for Next Week / 下周重点
3-5 specific, actionable priorities for Week ${week + 1} targeting the biggest gaps.

### 💬 Weekly Encouragement / 每周鼓励
Genuine, specific encouragement based on what she actually did this week.

Be thorough and specific. Every unaddressed concern is a risk for Day 60.`;
}
