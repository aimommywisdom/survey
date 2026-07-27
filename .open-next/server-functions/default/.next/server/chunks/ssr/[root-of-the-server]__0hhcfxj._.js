module.exports=[93695,(a,b,c)=>{b.exports=a.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},50640,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"InvariantError",{enumerable:!0,get:function(){return d}});class d extends Error{constructor(a,b){super(`Invariant: ${a.endsWith(".")?a:a+"."} This is a bug in Next.js.`,b),this.name="InvariantError"}}},26758,a=>{a.v("/_next/static/media/favicon.2vob68tjqpejf.ico"+(globalThis.NEXT_CLIENT_ASSET_SUFFIX||""))},38872,a=>{"use strict";let b={src:a.i(26758).default,width:256,height:256};a.s(["default",0,b])},85054,a=>{"use strict";var b=a.i(7997);a.i(70396);var c=a.i(73727),d=a.i(42424);let e={daily:"每天",weekly:"每週",biweekly:"每兩週",monthly:"每月",quarterly:"每季",yearly:"每年"},f={paper:"紙本手寫",excel:"Excel",word:"Word",system:"現有系統",line:"LINE",verbal:"口頭交辦"};function g({label:a}){return(0,b.jsxs)("span",{className:"print-opt",children:[(0,b.jsx)("span",{className:"print-box","aria-hidden":!0,children:"☐"}),a]})}function h({q:a}){return(0,b.jsxs)("div",{className:"print-q",children:[(0,b.jsxs)("div",{className:"print-q-label",children:[a.label,a.required?" *":""]}),"single"===a.type||"multi"===a.type||"behavior_check"===a.type?(0,b.jsx)("div",{className:"print-opts",children:a.options.map(a=>(0,b.jsx)(g,{label:a.label},a.value))}):null,"scale"===a.type?(0,b.jsxs)("div",{className:"print-scale",children:[Array.from({length:a.max-a.min+1},(b,c)=>a.min+c).map(a=>(0,b.jsx)("span",{className:"print-circle",children:a},a)),(a.min_label||a.max_label)&&(0,b.jsxs)("div",{className:"print-scale-labels",children:[(0,b.jsx)("span",{children:a.min_label}),(0,b.jsx)("span",{children:a.max_label})]})]}):null,"number"===a.type?(0,b.jsxs)("div",{className:"print-blank",children:["＿＿＿＿＿＿ ",a.unit??""]}):null,"short_text"===a.type?(0,b.jsx)("div",{className:"print-line"}):null,"long_text"===a.type?(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)("div",{className:"print-line"}),(0,b.jsx)("div",{className:"print-line"})]}):null,"pain_repeater"===a.type?(0,b.jsxs)("div",{className:"print-pain",children:[(0,b.jsxs)("div",{className:"print-hint",children:["請先從下列勾選（最多 ",a.max_items??5," 項），再於下表填寫細節："]}),(0,b.jsx)("div",{className:"print-opts",children:a.preset_items.map(a=>(0,b.jsx)(g,{label:a.label},a.code))}),(0,b.jsxs)("table",{className:"print-table",children:[(0,b.jsx)("thead",{children:(0,b.jsxs)("tr",{children:[(0,b.jsx)("th",{children:"項目"}),(0,b.jsx)("th",{children:"多久一次"}),(0,b.jsx)("th",{children:"每次幾分鐘"}),(0,b.jsx)("th",{children:"方式"}),(0,b.jsx)("th",{children:"需簽章"}),(0,b.jsx)("th",{children:"交給誰"})]})}),(0,b.jsx)("tbody",{children:[0,1,2].map(a=>(0,b.jsxs)("tr",{children:[(0,b.jsx)("td",{}),(0,b.jsx)("td",{className:"print-choices",children:Object.values(e).join("／")}),(0,b.jsx)("td",{}),(0,b.jsx)("td",{className:"print-choices",children:Object.values(f).join("／")}),(0,b.jsx)("td",{children:"☐是 ☐否"}),(0,b.jsx)("td",{})]},a))})]})]}):null,"availability"===a.type?(0,b.jsx)("div",{className:"print-opts",children:a.slots.map(a=>(0,b.jsx)(g,{label:a.label},a.value))}):null]})}function i({s:a}){return(0,b.jsxs)("section",{className:"print-section",children:[(0,b.jsx)("h2",{className:"print-section-title",children:a.title}),a.questions.map(a=>(0,b.jsx)(h,{q:a},a.id))]})}function j({definition:a,projectName:c}){let d=a.privacy;return(0,b.jsxs)("div",{className:"print-root",children:[(0,b.jsxs)("div",{className:"print-running-header",children:[c,"｜",a.title]}),(0,b.jsxs)("header",{className:"print-header",children:[(0,b.jsx)("h1",{className:"print-title",children:a.title}),a.subtitle&&(0,b.jsx)("p",{className:"print-subtitle",children:a.subtitle}),a.intro&&(0,b.jsx)("p",{className:"print-intro",children:a.intro})]}),a.sections.map(a=>(0,b.jsx)(i,{s:a},a.id)),(0,b.jsxs)("footer",{className:"print-footer",children:[d&&(0,b.jsxs)("p",{children:["【個資告知】蒐集目的：",d.purpose,"；項目：",d.items,"；保存期限：",d.retention,"；資料處理者：",d.processor,"。",d.rights,"。"]}),(0,b.jsx)("p",{children:"填寫完成後，請交回單位窗口。本問卷由智慧媽咪國際有限公司之診斷平台提供。"})]})]})}async function k({params:a}){let{projectSlug:e,surveySlug:f}=await a,g=await (0,d.getSurveyForFill)(e,f);return g||(0,c.notFound)(),(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)("style",{children:l}),(0,b.jsx)("div",{className:"print-toolbar",children:(0,b.jsx)("span",{children:"紙本預覽 — 用瀏覽器「列印」即可輸出 A4"})}),(0,b.jsx)(j,{definition:g.definition,projectName:g.projectName})]})}let l=`
.print-toolbar{position:sticky;top:0;background:#16233a;color:#fff;padding:10px 16px;font-size:14px;text-align:center}
.print-root{max-width:760px;margin:0 auto;padding:24px;color:#16233a;background:#fff}
.print-running-header{display:none}
.print-title{font-size:22px;font-weight:700;margin:0 0 4px}
.print-subtitle{color:#444;margin:0 0 10px}
.print-intro{font-size:14px;line-height:1.6;margin:0 0 8px}
.print-header{border-bottom:2px solid #16233a;padding-bottom:12px;margin-bottom:16px}
.print-section{margin:18px 0;break-inside:avoid}
.print-section-title{font-size:16px;font-weight:700;background:#f0eee8;padding:6px 10px;margin:0 0 10px}
.print-q{margin:0 0 14px;break-inside:avoid}
.print-q-label{font-weight:600;margin-bottom:6px}
.print-opts{display:flex;flex-wrap:wrap;gap:6px 18px}
.print-opt{display:inline-flex;align-items:center;gap:6px;font-size:14px}
.print-box{font-size:18px;line-height:1}
.print-scale{display:flex;gap:14px;align-items:center;margin-top:4px}
.print-circle{display:inline-flex;width:30px;height:30px;border:1.5px solid #16233a;border-radius:50%;align-items:center;justify-content:center;font-size:14px}
.print-scale-labels{display:flex;justify-content:space-between;width:220px;font-size:12px;color:#666}
.print-blank{margin-top:4px}
.print-line{border-bottom:1px solid #999;height:22px;margin:6px 0}
.print-hint{font-size:13px;color:#555;margin-bottom:6px}
.print-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
.print-table th,.print-table td{border:1px solid #999;padding:6px 4px;text-align:left;vertical-align:top;height:34px}
.print-choices{color:#666;font-size:11px}
.print-footer{margin-top:20px;border-top:1px solid #999;padding-top:10px;font-size:11px;color:#555;line-height:1.6}

@media print{
  @page{size:A4;margin:16mm 14mm 18mm}
  .print-toolbar{display:none}
  .print-root{max-width:none;padding:0}
  .print-running-header{display:block;position:fixed;top:-10mm;left:0;right:0;font-size:10px;color:#888;text-align:right}
  body{background:#fff}
}
`;a.s(["default",0,k,"dynamic",0,"force-dynamic"],85054)},19850,a=>{a.n(a.i(85054))}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0hhcfxj._.js.map