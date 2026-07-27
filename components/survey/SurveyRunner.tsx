'use client';

// 問卷 runner：把題型元件組成一台完整問卷。
// 分段導覽、進度條、show_if 條件邏輯、localStorage 暫存、送出投影。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Question, SurveyDefinition } from '@/lib/survey/types';
import type { Answers, AnswerValue, PainItemValue } from '@/lib/survey/answers';
import { isEmpty } from '@/lib/survey/answers';
import { visibleSections, visibleQuestions } from '@/lib/survey/visibility';
import { QuestionField } from './QuestionField';
import { ProgressBar } from './ProgressBar';

type Step = 'consent' | 'sections' | 'done';

interface SubmitResult {
  total_annual_hours: number;
  pain_count: number;
}

// 單題驗證（回傳錯誤字串或 null）
function questionError(q: Question, v: AnswerValue | undefined): string | null {
  if (q.type === 'pain_repeater') {
    const items = (v as PainItemValue[] | undefined) ?? [];
    if (q.required && items.length < (q.min_items ?? 1)) {
      return `請至少選 ${q.min_items ?? 1} 項`;
    }
    for (const it of items) {
      if (!it.frequency || it.minutes == null) {
        return '每個勾選的項目都要填「多久一次」和「每次幾分鐘」';
      }
    }
    return null;
  }
  if (q.required && isEmpty(v)) return '這題是必填的';
  return null;
}

export function SurveyRunner({
  surveyId,
  projectName,
  definition,
  proxyMode = false,
}: {
  surveyId: string;
  projectName: string;
  definition: SurveyDefinition;
  proxyMode?: boolean; // 代填模式：跳過同意、標記 is_proxy、可連續鍵入、不暫存
}) {
  const storageKey = `mwform:${surveyId}`;
  const consentNeeded = !proxyMode && (definition.privacy?.consent_required ?? false);

  const [step, setStep] = useState<Step>(consentNeeded ? 'consent' : 'sections');
  const [consent, setConsent] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [sectionIdx, setSectionIdx] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [proxyNote, setProxyNote] = useState('');
  const startedAt = useRef<number>(Date.now());
  const restored = useRef(false);

  // 還原暫存（代填模式不暫存，每張紙本都是全新一筆）
  useEffect(() => {
    if (proxyMode) {
      restored.current = true;
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as {
          answers?: Answers;
          idx?: number;
          consented?: boolean;
        };
        if (saved.answers) setAnswers(saved.answers);
        if (typeof saved.idx === 'number') setSectionIdx(saved.idx);
        // 之前已同意過就直接回到填答那一段，不用再看一次同意頁
        if (saved.consented) {
          setConsent(true);
          setStep('sections');
        }
      }
    } catch {
      /* 忽略損壞暫存 */
    }
    restored.current = true;
  }, [storageKey]);

  // 暫存（不含任何身分欄位；本問卷不蒐集姓名）
  useEffect(() => {
    if (!restored.current || proxyMode) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ answers, idx: sectionIdx, consented: step === 'sections' })
      );
    } catch {
      /* localStorage 滿或被停用就算了 */
    }
  }, [answers, sectionIdx, step, storageKey]);

  const sections = useMemo(
    () => visibleSections(definition, answers),
    [definition, answers]
  );
  const total = sections.length;
  const idx = Math.min(sectionIdx, Math.max(0, total - 1));
  const section = sections[idx];

  const setAnswer = useCallback(
    (id: string) => (v: AnswerValue) => {
      setAnswers((a) => ({ ...a, [id]: v }));
      setErrors((e) => (e[id] ? { ...e, [id]: '' } : e));
    },
    []
  );

  const minutesLeft = useMemo(() => {
    const est = definition.estimated_minutes ?? total * 2;
    const remaining = total - idx;
    return Math.ceil((est * remaining) / Math.max(1, total));
  }, [definition.estimated_minutes, total, idx]);

  const validateSection = (): boolean => {
    if (!section) return true;
    const vqs = visibleQuestions(section, answers);
    const next: Record<string, string> = {};
    for (const q of vqs) {
      const err = questionError(q, answers[q.id]);
      if (err) next[q.id] = err;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      // 捲到第一個錯誤
      const firstId = Object.keys(next)[0];
      requestAnimationFrame(() => {
        document.getElementById(firstId)?.scrollIntoView({
          block: 'center',
          behavior: 'smooth',
        });
      });
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateSection()) return;
    if (idx < total - 1) {
      setSectionIdx(idx + 1);
      window.scrollTo({ top: 0 });
    } else {
      void submit();
    }
  };

  const goPrev = () => {
    if (idx > 0) {
      setSectionIdx(idx - 1);
      window.scrollTo({ top: 0 });
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey_id: surveyId,
          answers,
          duration_sec: Math.round((Date.now() - startedAt.current) / 1000),
          is_proxy: proxyMode,
          proxy_note: proxyMode ? proxyNote || null : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '送出失敗');
      setResult(data.summary as SubmitResult);
      setStep('done');
      if (!proxyMode) {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          /* noop */
        }
      }
      window.scrollTo({ top: 0 });
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── 同意步驟 ──────────────────────────────────
  if (step === 'consent') {
    const p = definition.privacy;
    return (
      <Shell title={definition.title} subtitle={definition.subtitle ?? projectName}>
        {definition.intro && (
          <p className="mb-6 leading-relaxed text-ink">{definition.intro}</p>
        )}
        {p?.notice ? (
          // 簡短說明版
          <p className="mb-6 rounded-lg border border-rule bg-white p-5 text-[0.98rem] leading-relaxed text-ink">
            {p.notice}
          </p>
        ) : p ? (
          // 完整個資告知版
          <div className="mb-6 rounded-lg border border-rule bg-white p-5 text-[0.98rem] leading-relaxed">
            <h2 className="mb-3 font-bold text-ink">個人資料蒐集告知</h2>
            <dl className="flex flex-col gap-2 text-ink">
              {p.purpose && <Row k="蒐集目的" v={p.purpose} />}
              {p.items && <Row k="蒐集項目" v={p.items} />}
              {p.retention && <Row k="保存期限" v={p.retention} />}
              {p.processor && <Row k="資料處理者" v={p.processor} />}
              {p.rights && <Row k="您的權利" v={p.rights} />}
            </dl>
          </div>
        ) : null}
        <label className="mb-6 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-6 w-6 shrink-0 accent-[var(--ink)]"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span className="text-ink">我已閱讀並了解上述說明，同意填寫本問卷。</span>
        </label>
        <button
          type="button"
          disabled={!consent}
          onClick={() => {
            startedAt.current = Date.now();
            setStep('sections');
          }}
          className="min-h-[52px] w-full rounded-lg bg-ink px-6 text-lg font-medium text-paper disabled:opacity-40"
        >
          開始填寫
        </button>
      </Shell>
    );
  }

  // ── 完成步驟 ──────────────────────────────────
  if (step === 'done') {
    // 代填模式：完成一筆後可直接鍵入下一筆
    if (proxyMode) {
      return (
        <Shell title="這一筆已鍵入 ✓">
          <p className="mb-6 text-ink">
            已成功記錄{proxyNote ? `（紙本編號：${proxyNote}）` : ''}。可以接著鍵入下一張紙本。
          </p>
          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setSectionIdx(0);
              setErrors({});
              setResult(null);
              setProxyNote('');
              startedAt.current = Date.now();
              setStep('sections');
              window.scrollTo({ top: 0 });
            }}
            className="min-h-[52px] w-full rounded-lg bg-ink px-6 text-lg font-medium text-paper"
          >
            鍵入下一筆
          </button>
        </Shell>
      );
    }
    return (
      <Shell title="謝謝你的填答！">
        <div className="mb-6 rounded-lg border border-amber/40 bg-amber/5 px-5 py-6 text-center">
          {result && result.total_annual_hours > 0 ? (
            <p className="text-ink">
              根據你填的內容，你每年花在這些重複工作上約
              <br />
              <span className="tnum text-4xl font-bold text-amber">
                {result.total_annual_hours.toLocaleString()}
              </span>{' '}
              小時
            </p>
          ) : (
            <p className="text-ink">你的回覆已經送出，謝謝！</p>
          )}
        </div>
        <p className="text-center text-muted">
          你的回覆已匿名記錄，可以關閉這個頁面了。
        </p>
      </Shell>
    );
  }

  // ── 填答步驟 ──────────────────────────────────
  if (!section) {
    return <Shell title={definition.title}><p className="text-muted">此問卷目前沒有可填寫的題目。</p></Shell>;
  }

  const vqs = visibleQuestions(section, answers);
  const isLast = idx === total - 1;

  return (
    <div className="mx-auto w-full max-w-[600px] px-5 pb-16">
      {proxyMode && (
        <div className="mt-4 mb-2 rounded-lg border border-ink/30 bg-ink/5 px-4 py-3 text-[0.95rem] text-ink">
          代填模式（紙本鍵入）
          {idx === 0 && (
            <input
              type="text"
              value={proxyNote}
              onChange={(e) => setProxyNote(e.target.value)}
              placeholder="紙本編號（選填）"
              className="mt-2 min-h-[44px] w-full rounded-lg border border-rule bg-white px-3 py-2"
            />
          )}
        </div>
      )}
      <ProgressBar current={idx + 1} total={total} minutesLeft={minutesLeft} />
      <h2 className="mb-6 mt-4 text-xl font-bold text-ink">{section.title}</h2>

      <div className="flex flex-col gap-6">
        {vqs.map((q) => (
          <QuestionField
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={setAnswer(q.id)}
            error={errors[q.id]}
          />
        ))}
      </div>

      {submitError && (
        <p role="alert" className="mt-6 text-amber">
          {submitError}
        </p>
      )}

      <div className="mt-8 flex gap-3">
        {idx > 0 && (
          <button
            type="button"
            onClick={goPrev}
            className="min-h-[52px] rounded-lg border border-rule bg-white px-6 font-medium text-ink"
          >
            上一步
          </button>
        )}
        <button
          type="button"
          onClick={goNext}
          disabled={submitting}
          className="min-h-[52px] flex-1 rounded-lg bg-ink px-6 text-lg font-medium text-paper disabled:opacity-40"
        >
          {submitting ? '送出中…' : isLast ? '送出' : '下一步'}
        </button>
      </div>
    </div>
  );
}

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[600px] px-5 py-10">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      {subtitle && <p className="mt-1 mb-6 text-muted">{subtitle}</p>}
      {!subtitle && <div className="mb-6" />}
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="shrink-0 font-medium text-muted sm:w-24">{k}</dt>
      <dd className="text-ink">{v}</dd>
    </div>
  );
}
