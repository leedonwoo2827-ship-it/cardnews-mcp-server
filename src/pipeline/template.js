// 카드뉴스 HTML 템플릿 — localnotebooklm/studio/cardnews.py 의 HTML_TEMPLATE(Jinja2) 포팅.
// CSS·레이아웃을 1:1 복제해 _assest 출력물과 동일한 품질을 유지한다.

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1620;

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSections(sections = []) {
  return sections
    .map((s, idx) => {
      const num = String(idx + 1).padStart(2, "0");
      const tags = (s.tags || [])
        .map((t) => `<span class="tag">#${escapeHtml(t)}</span>`)
        .join("");
      return `
      <div class="sec">
        <span class="num">${num}</span>
        <div class="icon">${escapeHtml(s.icon)}</div>
        <h2 class="title">${escapeHtml(s.title)}</h2>
        <p class="body">${escapeHtml(s.body)}</p>
        <div class="tags">${tags}</div>
      </div>`;
    })
    .join("");
}

function renderSummary(summaryBar) {
  if (!summaryBar) return "";
  const pills = (summaryBar.pills || [])
    .map(
      (it) => `
        <div class="pill">
          <span class="ic">${escapeHtml(it.icon)}</span>
          <span class="tx">${escapeHtml(it.text)}</span>
        </div>`
    )
    .join("");
  return `
    <div class="summary">
      <p class="label">${escapeHtml(summaryBar.label)}</p>
      <div class="row">${pills}</div>
    </div>`;
}

/** 카드 JSON → HTML 문자열. */
export function renderCardHtml(card, width = CARD_WIDTH) {
  const {
    headline = "카드뉴스",
    subhead = "",
    hero_icon = "📌",
    sections = [],
    summary_bar = null,
  } = card || {};

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(headline)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    width: ${width}px;
    font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
    background: #f6f8fc;
    color: #181b2c;
  }
  .card {
    width: ${width}px;
    padding: 56px 56px 56px;
    background: linear-gradient(180deg, #f6f8fc 0%, #eef2f8 100%);
  }
  .hero {
    display: flex;
    gap: 24px;
    align-items: center;
    padding-bottom: 28px;
    border-bottom: 2px solid #1f2a44;
    margin-bottom: 36px;
  }
  .hero .emoji { font-size: 88px; line-height: 1; }
  .hero .headline {
    font-size: 60px;
    font-weight: 800;
    line-height: 1.15;
    color: #1f2a44;
    margin: 0 0 10px;
    letter-spacing: -1px;
  }
  .hero .subhead {
    font-size: 26px;
    color: #2e5bff;
    font-weight: 600;
    margin: 0;
    line-height: 1.4;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 22px;
    margin-bottom: 36px;
  }
  .sec {
    background: #ffffff;
    border-radius: 18px;
    padding: 24px 26px;
    box-shadow: 0 6px 18px rgba(31, 42, 68, 0.06);
    position: relative;
    min-height: 220px;
  }
  /* 섹션 수가 홀수면 마지막 칸이 한 칸만 차서 어색하므로 전체 폭으로 확장 */
  .grid .sec:last-child:nth-child(odd) { grid-column: 1 / -1; }
  .sec .num {
    position: absolute;
    top: 18px; right: 22px;
    font-size: 14px;
    color: #2e5bff;
    font-weight: 800;
    letter-spacing: 1px;
  }
  .sec .icon { font-size: 38px; line-height: 1; margin-bottom: 10px; }
  .sec .title {
    font-size: 24px;
    font-weight: 800;
    color: #181b2c;
    margin: 0 0 10px;
    letter-spacing: -0.5px;
  }
  .sec .body {
    font-size: 17px;
    color: #41475a;
    line-height: 1.55;
    margin: 0 0 12px;
  }
  .sec .tags { display: flex; gap: 8px; flex-wrap: wrap; }
  .sec .tag {
    font-size: 12px;
    color: #2e5bff;
    background: #e7eeff;
    padding: 4px 10px;
    border-radius: 999px;
    font-weight: 600;
  }
  .summary {
    background: #1f2a44;
    color: #fff;
    border-radius: 18px;
    padding: 24px 28px;
  }
  .summary .label {
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 16px;
    letter-spacing: 0.3px;
  }
  .summary .row { display: flex; justify-content: space-between; gap: 14px; }
  .summary .pill {
    flex: 1;
    background: rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 14px 10px;
    text-align: center;
  }
  .summary .pill .ic { font-size: 28px; display: block; margin-bottom: 6px; }
  .summary .pill .tx { font-size: 13px; color: #d6def4; line-height: 1.3; }
</style>
</head>
<body>
  <div class="card">
    <div class="hero">
      <div class="emoji">${escapeHtml(hero_icon)}</div>
      <div>
        <h1 class="headline">${escapeHtml(headline)}</h1>
        <p class="subhead">${escapeHtml(subhead)}</p>
      </div>
    </div>

    <div class="grid">${renderSections(sections)}
    </div>
${renderSummary(summary_bar)}
  </div>
</body>
</html>
`;
}
