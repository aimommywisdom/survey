// 紙本 A4 檢視（§10）：同一份問卷 JSON 產出可列印版本。
// 選項→方框 ☐、量表→圈選數字、pain_repeater→固定 3 組表格。
import type {
  Question,
  Section,
  SurveyDefinition,
} from '@/lib/survey/types';
import { FREQUENCY_LABELS, FORMAT_LABELS } from '@/lib/survey/painLabels';

function Box({ label }: { label: string }) {
  return (
    <span className="print-opt">
      <span className="print-box" aria-hidden>
        ☐
      </span>
      {label}
    </span>
  );
}

function PrintQuestion({ q }: { q: Question }) {
  return (
    <div className="print-q">
      <div className="print-q-label">
        {q.label}
        {q.required ? ' *' : ''}
      </div>
      {q.type === 'single' || q.type === 'multi' || q.type === 'behavior_check' ? (
        <div className="print-opts">
          {q.options.map((o) => (
            <Box key={o.value} label={o.label} />
          ))}
        </div>
      ) : null}

      {q.type === 'scale' ? (
        <div className="print-scale">
          {Array.from({ length: q.max - q.min + 1 }, (_, i) => q.min + i).map(
            (n) => (
              <span key={n} className="print-circle">
                {n}
              </span>
            )
          )}
          {(q.min_label || q.max_label) && (
            <div className="print-scale-labels">
              <span>{q.min_label}</span>
              <span>{q.max_label}</span>
            </div>
          )}
        </div>
      ) : null}

      {q.type === 'number' ? (
        <div className="print-blank">
          ＿＿＿＿＿＿ {q.unit ?? ''}
        </div>
      ) : null}

      {q.type === 'short_text' ? <div className="print-line" /> : null}
      {q.type === 'long_text' ? (
        <>
          <div className="print-line" />
          <div className="print-line" />
        </>
      ) : null}

      {q.type === 'pain_repeater' ? (
        <div className="print-pain">
          <div className="print-hint">
            請先從下列勾選（最多 {q.max_items ?? 5} 項），再於下表填寫細節：
          </div>
          <div className="print-opts">
            {q.preset_items.map((it) => (
              <Box key={it.code} label={it.label} />
            ))}
          </div>
          <table className="print-table">
            <thead>
              <tr>
                <th>項目</th>
                <th>多久一次</th>
                <th>每次幾分鐘</th>
                <th>方式</th>
                <th>需簽章</th>
                <th>交給誰</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2].map((i) => (
                <tr key={i}>
                  <td />
                  <td className="print-choices">
                    {Object.values(FREQUENCY_LABELS).join('／')}
                  </td>
                  <td />
                  <td className="print-choices">
                    {Object.values(FORMAT_LABELS).join('／')}
                  </td>
                  <td>☐是 ☐否</td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {q.type === 'availability' ? (
        <div className="print-opts">
          {q.slots.map((s) => (
            <Box key={s.value} label={s.label} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PrintSection({ s }: { s: Section }) {
  return (
    <section className="print-section">
      <h2 className="print-section-title">{s.title}</h2>
      {s.questions.map((q) => (
        <PrintQuestion key={q.id} q={q} />
      ))}
    </section>
  );
}

export function PrintView({
  definition,
  projectName,
}: {
  definition: SurveyDefinition;
  projectName: string;
}) {
  const p = definition.privacy;
  return (
    <div className="print-root">
      {/* 每頁頁首（print 時 fixed 會重複出現）*/}
      <div className="print-running-header">{projectName}｜{definition.title}</div>

      <header className="print-header">
        <h1 className="print-title">{definition.title}</h1>
        {definition.subtitle && <p className="print-subtitle">{definition.subtitle}</p>}
        {definition.intro && <p className="print-intro">{definition.intro}</p>}
      </header>

      {definition.sections.map((s) => (
        <PrintSection key={s.id} s={s} />
      ))}

      <footer className="print-footer">
        {p && (
          <p>
            【個資告知】蒐集目的：{p.purpose}；項目：{p.items}；保存期限：{p.retention}
            ；資料處理者：{p.processor}。{p.rights}。
          </p>
        )}
        <p>填寫完成後，請交回單位窗口。本問卷由智慧媽咪國際有限公司之診斷平台提供。</p>
      </footer>
    </div>
  );
}
