// 把某問卷的作答攤平成 CSV（Excel 可開）。值轉成中文選項標籤，痛點攤成可讀字串。
import 'server-only';
import type { Question, SurveyDefinition } from '@/lib/survey/types';
import type {
  Answers,
  AnswerValue,
  SingleValue,
  MultiValue,
  PainItemValue,
  AvailabilityValue,
  BehaviorValue,
} from '@/lib/survey/answers';
import { buildProjections } from '@/lib/survey/project';
import { annualHours, roundHours } from '@/lib/survey/scoring';
import { FREQUENCY_LABELS, FORMAT_LABELS } from '@/lib/survey/painLabels';

interface ResponseRow {
  answers: Answers;
  is_proxy: boolean;
  submitted_at: string;
}

function optLabel(q: Question, value: string): string {
  if ('options' in q && Array.isArray(q.options)) {
    const o = q.options.find((x) => x.value === value);
    if (o) return o.label;
  }
  return value;
}

// 一題 → 一個可讀字串
function cellFor(q: Question, v: AnswerValue | undefined): string {
  if (v == null) return '';
  switch (q.type) {
    case 'single': {
      const sv = v as SingleValue;
      const base = optLabel(q, sv.value);
      return sv.text ? `${base}：${sv.text}` : base;
    }
    case 'multi': {
      const mv = v as MultiValue;
      const labels = mv.values.map((val) => optLabel(q, val));
      if (mv.text) labels.push(mv.text);
      return labels.join('｜');
    }
    case 'behavior_check':
      return (v as BehaviorValue).map((val) => optLabel(q, val)).join('｜');
    case 'scale':
    case 'number':
      return String(v);
    case 'short_text':
    case 'long_text':
      return String(v);
    case 'availability': {
      const av = v as AvailabilityValue;
      const opts = 'slots' in q ? q.slots : [];
      const slotLabels = av.slots.map(
        (s) => opts.find((o) => o.value === s)?.label ?? s
      );
      return slotLabels.join('｜') + (av.offsite ? `（離崗 ${av.offsite}）` : '');
    }
    case 'pain_repeater': {
      const items = (v as PainItemValue[]) ?? [];
      return items
        .map((it) => {
          const name = it.is_custom ? it.custom_text || it.label : it.label;
          const freq = it.frequency ? FREQUENCY_LABELS[it.frequency] ?? it.frequency : '';
          const fmt = it.format ? FORMAT_LABELS[it.format] ?? it.format : '';
          const hrs = roundHours(annualHours(it.frequency, it.minutes));
          return `${name}(${freq}/${it.minutes ?? '?'}分/${fmt}/約${hrs}時)`;
        })
        .join('；');
    }
    default:
      return '';
  }
}

function csvEscape(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

export function buildResponseCsv(
  def: SurveyDefinition,
  rows: ResponseRow[]
): string {
  const questions = def.sections.flatMap((s) => s.questions);
  const headers = [
    '序號',
    '送出時間',
    '代填',
    ...questions.map((q) => q.label),
    '單位',
    '職務群',
    '能力總分',
    '能力分級',
    '痛點年工時合計',
  ];

  const lines = rows.map((r, i) => {
    const proj = buildProjections(def, r.answers);
    const painHours = roundHours(
      proj.pain.reduce((sum, p) => sum + annualHours(p.frequency, p.minutes), 0)
    );
    const dept = proj.pain[0]?.dept ?? proj.skill?.dept ?? '';
    const roleGroup = proj.pain[0]?.role_group ?? proj.skill?.role_group ?? '';
    const cells = [
      String(i + 1),
      new Date(r.submitted_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
      r.is_proxy ? '是' : '',
      ...questions.map((q) => cellFor(q, r.answers[q.id])),
      dept,
      roleGroup,
      proj.skill ? String(proj.skill.total) : '',
      proj.skill ? proj.skill.tier : '',
      String(painHours),
    ];
    return cells.map(csvEscape).join(',');
  });

  // 加 BOM 讓 Excel 正確辨識 UTF-8
  return '﻿' + [headers.map(csvEscape).join(','), ...lines].join('\r\n');
}
