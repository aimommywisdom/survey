// 課程規劃 prompt：把某「一份問卷」的精準數據交給 LLM，要它針對該問卷對象產出規劃。
// 數字來自我們的計算，LLM 不重算、只解讀與規劃。

export interface CoursePromptInput {
  survey: { title: string; audience?: string[]; purpose?: string[] };
  tna: unknown; // /tna 聚合（有痛點題才有內容）
  sampleAnswers?: unknown[]; // 去識別化原始作答（給沒有痛點/能力題的問卷，如主管版）
  responseCount: number;
  supplement?: string; // 顧問補充：預算、背景、限制、偏好等
}

export function buildCoursePrompt(input: CoursePromptInput): {
  system: string;
  user: string;
} {
  const { survey, tna, sampleAnswers, responseCount, supplement } = input;

  const system = [
    '你是一位資深企業教育訓練顧問，專長是把「訓練需求調查數據」轉成可執行的內訓課程規劃。',
    '你一次只分析「一份問卷」，且該問卷有明確的填答對象，你的規劃必須針對這群人量身訂做，不要泛泛而談。',
    '',
    '你會拿到：這份問卷的標題與對象、系統已精準算好的需求數據（TNA JSON），',
    '以及（若有）去識別化的原始作答。',
    '',
    '重要規則：',
    '1. TNA 裡的數字（年工時、人數、分級）是精準計算結果，直接引用，不要自己重算或編造。',
    '2. 用繁體中文，語氣專業但好懂，對象是要看這份規劃來決定開課的主管。',
    '3. 課程規劃要具體到「開幾堂、每堂主題、每堂重點、對應到哪個痛點或能力落差」。',
    '4. 若 TNA 的痛點/能力資料為空（例如主管版問卷本來就沒有這些題），',
    '   就改從原始作答歸納這群對象的處境與需求，據此規劃，不要硬套痛點年工時的框架。',
    '5. 若資料量太少（回收數個位數），要在開頭提醒樣本有限、結論僅供參考。',
  ].join('\n');

  const user = [
    `# 這份問卷`,
    `標題：${survey.title}`,
    survey.audience?.length ? `對象：${survey.audience.join('、')}` : '',
    survey.purpose?.length ? `用途：${survey.purpose.join('、')}` : '',
    `回收數：${responseCount} 筆`,
    '',
    '# 系統精準計算的需求數據（TNA）',
    '```json',
    JSON.stringify(tna, null, 2),
    '```',
    sampleAnswers && sampleAnswers.length
      ? [
          '',
          '# 去識別化原始作答（供沒有痛點/能力題的問卷歸納用）',
          '```json',
          JSON.stringify(sampleAnswers, null, 2),
          '```',
        ].join('\n')
      : '',
    supplement && supplement.trim()
      ? [
          '',
          '# 顧問補充說明（請務必納入考量：預算、時數、對象背景、限制或偏好等）',
          supplement.trim(),
        ].join('\n')
      : '',
    '',
    '請針對「這份問卷的對象」產出一份課程規劃，包含：',
    '## 一、需求總覽（3-5 句，引用關鍵數字或歸納重點）',
    '## 二、痛點或處境解讀（有痛點數據就解讀前幾名；沒有就從原始作答歸納）',
    '## 三、能力落差（有能力分級就說明；沒有則略過或改談其他落差）',
    '## 四、課程規劃（針對這群對象：建議堂數、總時數；每一堂的主題、重點內容、對應解決什麼；訓後應具備的 KSA）',
    '## 五、驗收建議（可衡量指標，對應 Kirkpatrick L2/L3）',
  ]
    .filter(Boolean)
    .join('\n');

  return { system, user };
}
