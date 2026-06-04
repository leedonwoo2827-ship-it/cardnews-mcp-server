# cardnews-mcp-server

자막/텍스트를 **1080×1620 인포그래픽 카드뉴스**(HTML + PNG) 한 장으로 만들어 주는 MCP 서버입니다.
강의 자막(.vtt/.srt) 또는 임의 텍스트를 입력하면, LLM 이 카드 콘텐츠(JSON)를 만들고 HTML 템플릿에
채운 뒤 Puppeteer 로 PNG 를 캡처합니다.

> `localnotebooklm` 의 카드뉴스 파이프라인을 독립 Node.js MCP 서버로 포팅한 것입니다.
> 콘텐츠 규칙: **섹션 정확히 6개 · 요약바 pill 정확히 5개**.

## 산출물 예시

`examples/sample.vtt`(복리 개념 강의 자막 — 데모용 합성 데이터) → 회차 1장 카드뉴스 PNG.
디자인 톤은 표지(헤드라인 + 이모지) · 6개 섹션 2열 그리드 · 하단 요약 띠(5 pill) 구조입니다.

## 요구 사항

- Node.js 18 이상
- LLM API 키 (Anthropic 또는 OpenAI)
- Puppeteer 용 Chrome (설치 명령 아래)
- (선택) Pretendard 폰트 설치 시 한글 렌더 품질 향상. 미설치 시 Windows 기본 `Malgun Gothic` 으로 렌더됩니다.

## 설치

```bash
npm install
npx puppeteer browsers install chrome
cp .env.example .env   # 그리고 API 키 입력
```

`.env` 예시:

```
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
# MODEL=claude-sonnet-4-6   # 비우면 공급자 기본값
OUTPUT_DIR=./output
```

OpenAI 를 쓰려면:

```
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
# MODEL=gpt-4o
```

## 빠른 검증 (E2E)

```bash
node test/e2e.mjs
```

`examples/` 의 자막으로 카드 JSON + PNG 를 `output/` 에 생성하고, 섹션 6개 / pill 5개 / PNG 용량을 점검합니다.

## Claude Desktop 등록

`claude_desktop_config.json` 에 추가:

```json
{
  "mcpServers": {
    "cardnews": {
      "command": "node",
      "args": ["D:/00work/260604-toMCP/cardnews-mcp-server/src/index.js"],
      "env": {
        "LLM_PROVIDER": "anthropic",
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "OUTPUT_DIR": "D:/00work/260604-toMCP/cardnews-mcp-server/output"
      }
    }
  }
}
```

> `args` 의 경로는 이 리포의 실제 위치로 바꾸세요.

## 실행 모드

```bash
node src/index.js          # stdio (Claude Desktop / MCP 클라이언트 기본)
node src/index.js --http   # Streamable HTTP (포트 PORT 또는 3500)
```

## 도구 (MCP tools)

| 도구 | 설명 | 주요 인자 |
|---|---|---|
| `create_cardnews_from_text` | 텍스트/자막 문자열 → 카드 1장 | `text`, `format`(vtt\|srt\|plain), `metadata?`, `outputDir?`, `model?`, `label?` |
| `create_cardnews_from_file` | .vtt/.srt/.txt 파일 → 카드 1장 | `filePath`, `metadata?`, `outputDir?`, `model?` |
| `create_cardnews_batch` | 여러 파일 → 회차별 N장 + 종합 1장 | `filePaths[]` 또는 `folder`, `combine?`(기본 true), `outputDir?`, `model?` |

모든 도구는 `{ ok, card, htmlPath, pngPath }`(배치는 `{ ok, count, cards, files }`) 형태의 JSON 을 반환합니다.
오류 시 throw 하지 않고 `{ ok: false, error }` 를 반환합니다.

## 구조

```
src/
├── index.js              진입점 (stdio / --http)
├── server.js             MCP 서버 + 도구 등록
├── prompt.js             카드뉴스 프롬프트
├── tools/cardnews.js     도구 핸들러 (단일/파일/배치)
└── pipeline/
    ├── subtitle.js       자막 파싱 (타임코드 제거 + 중복 제거)
    ├── llm.js            LLM 호출 → 카드 JSON
    ├── template.js       HTML 템플릿
    └── render.js         Puppeteer HTML→PNG 캡처
```
