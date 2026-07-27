// 條件邏輯 show_if（§5）— 決定題目/段落是否顯示。
// show_if = { 另一題id: [符合才顯示的值...] }；所有條件皆須滿足（AND）。

import type { Question, Section, SurveyDefinition } from './types';
import type { Answers, AnswerValue } from './answers';

// 把任一作答值攤成「可比對的字串集合」，供 show_if 比對
function answerValues(v: AnswerValue | undefined): string[] {
  if (v == null) return [];
  if (typeof v === 'string') return [v];
  if (typeof v === 'number') return [String(v)];
  if (Array.isArray(v)) {
    // BehaviorValue(string[]) 或 PainItemValue[]
    return v.map((x) => (typeof x === 'string' ? x : (x?.code ?? ''))).filter(Boolean);
  }
  if (typeof v === 'object') {
    if ('value' in v) return v.value ? [v.value] : [];
    if ('values' in v) return v.values;
    if ('slots' in v) return v.slots;
  }
  return [];
}

export function isVisible(question: Question, answers: Answers): boolean {
  if (!question.show_if) return true;
  const entries = Object.entries(question.show_if);
  // 取出 mode（any=OR / all=AND，預設 all），其餘才是真正的條件。
  const mode = (question.show_if.mode as string) === 'any' ? 'any' : 'all';
  const conditions = entries.filter(
    ([qid, allowed]) => qid !== 'mode' && Array.isArray(allowed)
  );
  if (conditions.length === 0) return true;
  const test = ([qid, allowed]: [string, string[] | string]) => {
    const vals = answerValues(answers[qid]);
    return vals.some((v) => (allowed as string[]).includes(v));
  };
  return mode === 'any' ? conditions.some(test) : conditions.every(test);
}

export function visibleQuestions(section: Section, answers: Answers): Question[] {
  return section.questions.filter((q) => isVisible(q, answers));
}

// 有效段落：至少含一題可見。全部被 show_if 藏起來的段落不出現在導覽。
export function visibleSections(
  def: SurveyDefinition,
  answers: Answers
): Section[] {
  return def.sections.filter((s) => visibleQuestions(s, answers).length > 0);
}
