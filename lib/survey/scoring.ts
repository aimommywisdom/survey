// 計分邏輯（§7）— 純函式，前後端共用。
// 前台即時顯示、後端送出投影寫衍生表都用同一套，避免兩邊算不一樣。

import { FREQUENCY_MULTIPLIER, type Frequency, type Option } from './types';

// 個人年工時 = 分鐘 × 該頻率年次數 ÷ 60
export function annualHours(
  frequency: Frequency | string | undefined,
  minutes: number | null | undefined
): number {
  if (!frequency || minutes == null || Number.isNaN(minutes)) return 0;
  const mult = FREQUENCY_MULTIPLIER[frequency as Frequency];
  if (!mult) return 0;
  return (minutes * mult) / 60;
}

// 數位能力分級（§7）
export type SkillTier = 'entry' | 'basic' | 'advanced';

export interface SkillResult {
  l1_basic: number;
  l2_cloud: number;
  l3_data: number;
  l4_ai: number;
  total: number;
  tier: SkillTier;
}

// selected：behavior_check 勾選到的選項 value 陣列
// options：該題所有選項（帶 level / weight）
export function computeSkill(
  selected: string[],
  options: Option[]
): SkillResult {
  const byLevel = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<number, number>;
  let total = 0;
  for (const opt of options) {
    if (!selected.includes(opt.value)) continue;
    const w = opt.weight ?? 0;
    total += w;
    if (opt.level) byLevel[opt.level] += w;
  }
  // 門檻依 taxonomy.json scoring.digital_skill_tier（滿分 30；取代 §7 暫定值）
  const tier: SkillTier = total <= 7 ? 'entry' : total <= 15 ? 'basic' : 'advanced';
  return {
    l1_basic: byLevel[1],
    l2_cloud: byLevel[2],
    l3_data: byLevel[3],
    l4_ai: byLevel[4],
    total,
    tier,
  };
}

// 顯示用四捨五入（給年長族群看，取整數比較好讀）
export function roundHours(h: number): number {
  return Math.round(h);
}
