// pain_repeater 子欄位選項的中文標籤字典。
// block JSON 只存 value（如 "daily"），前台在此對應成人看得懂的字。

export const FREQUENCY_LABELS: Record<string, string> = {
  daily: '每天',
  weekly: '每週',
  biweekly: '每兩週',
  monthly: '每月',
  quarterly: '每季',
  yearly: '每年',
};

export const FORMAT_LABELS: Record<string, string> = {
  paper: '紙本手寫',
  excel: 'Excel',
  word: 'Word',
  system: '現有系統',
  line: 'LINE',
  verbal: '口頭交辦',
};

export const YESNO_LABELS: Record<string, string> = {
  yes: '要',
  no: '不用',
};

export function labelFor(
  fieldId: string,
  value: string
): string {
  if (fieldId === 'frequency') return FREQUENCY_LABELS[value] ?? value;
  if (fieldId === 'format') return FORMAT_LABELS[value] ?? value;
  if (fieldId === 'needs_sign') return YESNO_LABELS[value] ?? value;
  return value;
}
