import {
  PIP_START, PIP_END, PIP_MIDPOINT, PIP_DAYS,
  MIN_SCORE, REVIEW_SCHEDULE, ACHIEVEMENT_LEVELS, COMPETENCIES,
} from '../data/pipData';
import { formatDate } from '../utils/dates';

export default function PipDocument({ data }) {
  const targetName = data?.targetName || 'Irene';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800">PIP Document / PIP 文件</h2>
      <p className="text-slate-500 text-sm">
        Full Performance Improvement Plan — extracted from the original agreement.
        <br />
        <span className="text-slate-400">完整的绩效改善计划——从原始协议中提取。</span>
      </p>

      {/* Overview */}
      <Section title="Overview / 概述" icon="📄">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Employee / 员工" value={targetName} />
          <InfoRow label="Role / 职位" value="Vice Principal (KP Branch)" sub="副校长（KP分校）" />
          <InfoRow label="Organization / 机构" value="Tadika Bijak Junior" />
          <InfoRow label="Coach / 教练" value="Coach Lim" sub="林教练" />
          <InfoRow label="PIP Duration / PIP 时长" value={`${PIP_DAYS} days`} sub={`${PIP_DAYS}天`} />
          <InfoRow label="Start Date / 开始日期" value={formatDate(PIP_START)} />
          <InfoRow label="Midpoint Review / 中期评审" value={formatDate(PIP_MIDPOINT)} />
          <InfoRow label="End Date / 结束日期" value={formatDate(PIP_END)} />
          <InfoRow label="Target Score / 目标分数" value={`${MIN_SCORE}/5 or above in ALL 8 competencies`} sub={`全部8项能力达到${MIN_SCORE}/5或以上`} />
        </div>
      </Section>

      {/* Purpose */}
      <Section title="Purpose of the PIP / PIP 的目的" icon="🎯">
        <p className="text-slate-700 text-sm leading-relaxed mb-2">
          This Performance Improvement Plan is designed to provide {targetName} with a clear, structured
          and supportive framework to address specific performance concerns identified in her role as
          Vice Principal at the KP branch of Tadika Bijak Junior.
        </p>
        <p className="text-slate-500 text-sm leading-relaxed">
          此绩效改善计划旨在为{targetName}提供一个清晰、结构化且支持性的框架，以解决在Tadika Bijak Junior KP分校担任副校长期间发现的具体绩效问题。
        </p>
        <p className="text-slate-700 text-sm leading-relaxed mt-3 mb-2">
          The PIP outlines the areas requiring improvement, the specific behaviours expected, the support
          available, and the timeline for achieving measurable progress. The objective is for {targetName} to
          consistently demonstrate the required standards independently, without repeated reminders or
          management intervention.
        </p>
        <p className="text-slate-500 text-sm leading-relaxed">
          PIP概述了需要改进的领域、预期的具体行为、可获得的支持以及实现可衡量进步的时间表。目标是让{targetName}能够持续独立地展示所要求的标准，无需反复提醒或管理层干预。
        </p>
      </Section>

      {/* Achievement Levels */}
      <Section title="Achievement Levels / 成就等级" icon="📊">
        <p className="text-slate-500 text-sm mb-4">
          Scoring criteria used for weekly and milestone assessments.
          <br />
          <span className="text-slate-400">用于每周和里程碑评估的评分标准。</span>
        </p>
        <div className="space-y-2">
          {ACHIEVEMENT_LEVELS.map(level => (
            <div key={level.score}
              className={`flex gap-4 items-start p-3 rounded-lg border ${
                level.score >= MIN_SCORE
                  ? 'bg-emerald-50 border-emerald-200'
                  : level.score === 3
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-red-50 border-red-200'
              }`}>
              <span className={`text-2xl font-bold w-8 text-center flex-shrink-0 ${
                level.score >= MIN_SCORE ? 'text-emerald-600' : level.score === 3 ? 'text-amber-600' : 'text-red-600'
              }`}>{level.score}</span>
              <p className={`text-sm ${
                level.score >= MIN_SCORE ? 'text-emerald-700' : level.score === 3 ? 'text-amber-700' : 'text-red-700'
              }`}>{level.description}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
          Target: Score {MIN_SCORE} or above = consistently meets the required standard / 目标：得分{MIN_SCORE}或以上 = 持续达到要求的标准
        </p>
      </Section>

      {/* Review Schedule */}
      <Section title="Review Schedule / 评审时间表" icon="📅">
        <div className="space-y-1.5">
          {REVIEW_SCHEDULE.map((r, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm ${
              r.timing === 'Day 30' || r.timing === 'Day 60'
                ? 'bg-indigo-50 border border-indigo-200 font-medium'
                : 'bg-white border border-slate-100'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                r.timing === 'Day 30' || r.timing === 'Day 60' ? 'bg-indigo-500' : 'bg-slate-300'
              }`} />
              <span className="w-20 flex-shrink-0 font-medium text-slate-600">{r.timing}</span>
              <span className="flex-1 text-slate-700">{r.review}</span>
              <span className="text-xs text-slate-400">{formatDate(r.date)}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* The 8 Competencies — Full Detail */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-1">
          The 8 Competency Areas / 8项能力领域
        </h3>
        <p className="text-slate-500 text-sm mb-6">
          Each competency lists the specific concerns raised, the required behaviours, and practical tips.
          <br />
          <span className="text-slate-400">每项能力列出了提出的具体关切、所要求的行为以及实用建议。</span>
        </p>

        <div className="space-y-8">
          {COMPETENCIES.map((comp, idx) => (
            <CompetencyBlock key={comp.id} comp={comp} index={idx + 1} />
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-200 p-6">
        <h3 className="text-xl font-bold text-indigo-800 mb-3">
          Summary / 总结
        </h3>
        <div className="space-y-4 text-sm">
          <SummaryItem icon="📋" title="Total Competencies / 总能力数" value={`${COMPETENCIES.length} areas`} valueCn={`${COMPETENCIES.length}个领域`} />
          <SummaryItem icon="⚠️" title="Total Concerns Raised / 提出的总关切数" value={`${COMPETENCIES.reduce((s, c) => s + c.concerns.length, 0)} specific concerns across all areas`} valueCn={`所有领域共${COMPETENCIES.reduce((s, c) => s + c.concerns.length, 0)}项具体关切`} />
          <SummaryItem icon="✅" title="Total Required Behaviours / 所需行为总数" value={`${COMPETENCIES.reduce((s, c) => s + c.requiredBehaviors.length, 0)} behaviours to demonstrate`} valueCn={`需要展示${COMPETENCIES.reduce((s, c) => s + c.requiredBehaviors.length, 0)}项行为`} />
          <SummaryItem icon="🎯" title="Target / 目标" value={`Score ${MIN_SCORE}/5 or above in ALL ${COMPETENCIES.length} competencies by Day ${PIP_DAYS}`} valueCn={`在第${PIP_DAYS}天前，全部${COMPETENCIES.length}项能力达到${MIN_SCORE}/5或以上`} />
          <SummaryItem icon="📅" title="Timeline / 时间线" value={`${formatDate(PIP_START)} → ${formatDate(PIP_END)} (${PIP_DAYS} days)`} valueCn={`${formatDate(PIP_START)} → ${formatDate(PIP_END)}（${PIP_DAYS}天）`} />
          <SummaryItem icon="🔑" title="Key Milestones / 关键里程碑" value={`Day 30 Midpoint Review (${formatDate(PIP_MIDPOINT)}) and Day ${PIP_DAYS} Final Assessment (${formatDate(PIP_END)})`} valueCn={`第30天中期评审（${formatDate(PIP_MIDPOINT)}）和第${PIP_DAYS}天最终评估（${formatDate(PIP_END)}）`} />
        </div>

        <div className="mt-6 p-4 bg-white/60 rounded-xl border border-indigo-100">
          <h4 className="font-semibold text-indigo-800 mb-2">Competency Breakdown / 能力分布</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {COMPETENCIES.map(comp => (
              <div key={comp.id} className="flex items-center gap-2 text-sm">
                <span className="text-lg">{comp.icon}</span>
                <div>
                  <span className="text-slate-700 font-medium">{comp.name}</span>
                  <span className="text-slate-400 mx-1">·</span>
                  <span className="text-slate-500">{comp.nameCn}</span>
                  <span className="text-xs text-slate-400 ml-1">
                    ({comp.concerns.length} concerns, {comp.requiredBehaviors.length} required)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-indigo-500 mt-4 text-center">
          Use the Daily Log tab to track evidence against each concern, and the Weekly Review tab to prepare for coaching meetings.
          <br />
          使用"每日日志"选项卡跟踪每项关切的证据，使用"每周评审"选项卡为辅导会议做准备。
        </p>
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-slate-700 mb-4">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value, sub }) {
  return (
    <div className="bg-slate-50 rounded-lg px-4 py-3">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-700">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function CompetencyBlock({ comp, index }) {
  return (
    <div className="border-l-4 border-indigo-300 pl-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{comp.icon}</span>
        <div>
          <h4 className="text-base font-bold text-slate-800">
            {index}. {comp.name}
          </h4>
          <p className="text-sm text-slate-500">{comp.nameCn}</p>
        </div>
      </div>

      {/* Concerns */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-red-600 uppercase mb-2">Concerns Raised / 提出的关切</p>
        <ul className="space-y-1.5">
          {comp.concerns.map((c, i) => (
            <li key={i} className="flex gap-2 text-sm bg-red-50/60 rounded-lg px-3 py-2 border border-red-100">
              <span className="text-red-400 mt-0.5 flex-shrink-0">!</span>
              <div>
                <span className="text-red-800">{c.en}</span>
                <br />
                <span className="text-red-500 text-xs">{c.cn}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Required Behaviours */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-emerald-600 uppercase mb-2">Required Behaviours / 要求的行为</p>
        <ul className="space-y-1.5">
          {comp.requiredBehaviors.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm bg-emerald-50/60 rounded-lg px-3 py-2 border border-emerald-100">
              <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
              <div>
                <span className="text-emerald-800">{b.en}</span>
                <br />
                <span className="text-emerald-500 text-xs">{b.cn}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Tips */}
      {comp.tips && comp.tips.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-indigo-600 uppercase mb-2">Practical Tips / 实用建议</p>
          <ul className="space-y-1.5">
            {comp.tips.map((tip, i) => {
              const parts = tip.split('\n');
              return (
                <li key={i} className="flex gap-2 text-sm bg-indigo-50/60 rounded-lg px-3 py-2 border border-indigo-100">
                  <span className="text-indigo-400 mt-0.5 flex-shrink-0">💡</span>
                  <div>
                    <span className="text-indigo-800">{parts[0]}</span>
                    {parts[1] && <><br /><span className="text-indigo-500 text-xs">{parts[1]}</span></>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function SummaryItem({ icon, title, value, valueCn }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="text-lg">{icon}</span>
      <div>
        <p className="font-medium text-indigo-700">{title}</p>
        <p className="text-slate-700">{value}</p>
        <p className="text-slate-500 text-xs">{valueCn}</p>
      </div>
    </div>
  );
}
