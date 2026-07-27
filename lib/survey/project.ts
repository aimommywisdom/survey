// 送出投影（§4 衍生表 / §7 計分）：把一份作答攤平成 pain_points / skill_scores 列，
// 供跨份聚合。純函式，在送出 API（service_role）內呼叫。
//
// dept / role_group 目前以慣例題目 id 推導（q_dept / q_role）。
// 之後要更嚴謹可在問卷定義加 meta 指名，但先用慣例足以支撐首案。

import type { SurveyDefinition } from './types';
import type { Answers, PainItemValue, SingleValue, BehaviorValue } from './answers';
import { computeSkill } from './scoring';

// q_role value → role_group（§7：admin_mgmt / professional / frontline）
const ROLE_GROUP: Record<string, string> = {
  manager: 'admin_mgmt',
  admin_staff: 'admin_mgmt',
  social_worker: 'professional',
  educator: 'professional',
  caregiver: 'frontline',
  driver: 'frontline',
  farm: 'frontline',
};

export interface PainRow {
  item_code: string;
  item_label: string;
  is_custom: boolean;
  frequency: string;
  minutes: number;
  format: string | null;
  needs_sign: boolean | null;
  deliver_to: string | null;
  dept: string | null;
  role_group: string | null;
}

export interface SkillRow {
  l1_basic: number;
  l2_cloud: number;
  l3_data: number;
  l4_ai: number;
  total: number;
  tier: string;
  dept: string | null;
  role_group: string | null;
}

export interface Projections {
  pain: PainRow[];
  skill: SkillRow | null;
}

function deriveDeptRole(
  def: SurveyDefinition,
  answers: Answers
): { dept: string | null; role_group: string | null } {
  const dept = (answers['q_dept'] as SingleValue | undefined)?.value ?? null;
  const roleVal = (answers['q_role'] as SingleValue | undefined)?.value;

  // 優先讀選項自帶的 meta.role_group（schema-driven）；找不到才退回舊對照表。
  let role_group: string | null = null;
  if (roleVal) {
    for (const s of def.sections) {
      const rq = s.questions.find((q) => q.id === 'q_role');
      if (rq && 'options' in rq) {
        const opt = rq.options.find((o) => o.value === roleVal);
        if (opt?.meta?.role_group) role_group = opt.meta.role_group;
        break;
      }
    }
    if (!role_group) role_group = ROLE_GROUP[roleVal] ?? null;
  }
  return { dept, role_group };
}

export function buildProjections(
  def: SurveyDefinition,
  answers: Answers
): Projections {
  const { dept, role_group } = deriveDeptRole(def, answers);
  const pain: PainRow[] = [];
  let skill: SkillRow | null = null;

  for (const section of def.sections) {
    for (const q of section.questions) {
      if (q.type === 'pain_repeater') {
        const items = (answers[q.id] as PainItemValue[] | undefined) ?? [];
        for (const it of items) {
          // 只投影填齊「頻率 + 分鐘」的有效列（annual_hours 由 DB 算）
          if (!it.frequency || it.minutes == null || Number.isNaN(it.minutes)) {
            continue;
          }
          pain.push({
            item_code: it.code,
            item_label: it.is_custom ? (it.custom_text || it.label) : it.label,
            is_custom: !!it.is_custom,
            frequency: it.frequency,
            minutes: it.minutes,
            format: it.format ?? null,
            needs_sign:
              it.needs_sign == null ? null : it.needs_sign === 'yes',
            deliver_to: it.deliver_to || null,
            dept,
            role_group,
          });
        }
      } else if (q.type === 'behavior_check') {
        const selected = (answers[q.id] as BehaviorValue | undefined) ?? [];
        const s = computeSkill(selected, q.options);
        // 多個 behavior_check 時累加
        if (!skill) {
          skill = { ...s, dept, role_group };
        } else {
          skill.l1_basic += s.l1_basic;
          skill.l2_cloud += s.l2_cloud;
          skill.l3_data += s.l3_data;
          skill.l4_ai += s.l4_ai;
          skill.total += s.total;
          skill.tier =
            skill.total <= 7 ? 'entry' : skill.total <= 15 ? 'basic' : 'advanced';
        }
      }
    }
  }

  return { pain, skill };
}
