// End-to-end 검증: 인라인 자막 → 카드 JSON + PNG 생성.
//   node test/e2e.mjs
// 필요: .env 에 LLM_PROVIDER/API 키. puppeteer chrome 설치(npx puppeteer browsers install chrome).
//
// 별도 데이터 파일에 의존하지 않도록, 데모용 합성 자막(복리 개념)을 코드 안에 내장한다.

import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";

import { createCardnewsFromText } from "../src/tools/cardnews.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// 데모용 합성 자막 (실제 회사 강의 데이터 아님).
const SAMPLE_VTT = `WEBVTT

1
00:00:00.000 --> 00:00:08.500
안녕하세요. 이번 시간에는 복리의 개념과 그 힘에 대해 함께 알아보겠습니다.

2
00:00:08.500 --> 00:00:18.200
복리란 원금에 이자가 붙고, 그 이자에 다시 이자가 붙는 방식의 이자 계산법을 말합니다.

3
00:00:18.200 --> 00:00:27.900
단리는 원금에 대해서만 이자를 계산하지만, 복리는 누적된 이자에도 이자가 붙습니다.

4
00:00:27.900 --> 00:00:38.400
예를 들어 연 5% 복리로 100만 원을 투자하면 1년 뒤 105만 원, 2년 뒤에는 110만 2500원이 됩니다.

5
00:00:38.400 --> 00:00:48.100
시간이 길어질수록 복리 효과는 기하급수적으로 커집니다. 이를 흔히 눈덩이 효과라고 부릅니다.

6
00:00:48.100 --> 00:00:58.700
72의 법칙을 쓰면 자산이 두 배가 되는 기간을 쉽게 추정할 수 있습니다. 72를 수익률로 나누면 됩니다.

7
00:00:58.700 --> 00:01:08.300
복리의 핵심 변수는 수익률, 기간, 그리고 재투자 여부입니다. 이자를 빼서 쓰면 복리 효과가 사라집니다.

8
00:01:08.300 --> 00:01:18.900
물가 상승률을 고려한 실질 수익률도 함께 봐야 합니다. 명목 수익률만 보면 착시가 생길 수 있습니다.

9
00:01:18.900 --> 00:01:28.500
정리하면, 복리는 시간을 내 편으로 만드는 투자 원리이며 꾸준함과 재투자가 핵심입니다.
`;

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
}

async function main() {
  const outputDir = path.join(root, "output");

  console.log("[e2e] 입력: 내장 합성 자막(복리 개념)");
  const res = await createCardnewsFromText({
    text: SAMPLE_VTT,
    format: "vtt",
    outputDir,
    label: "e2e_sample",
  });

  if (!res.ok) {
    console.error("[e2e] 실패:", res.error);
    process.exit(1);
  }

  const { card, htmlPath, pngPath } = res;
  console.log("[e2e] headline:", card.headline);
  console.log("[e2e] sections:", card.sections?.length);
  console.log("[e2e] summary pills:", card.summary_bar?.pills?.length);
  console.log("[e2e] html:", htmlPath);
  console.log("[e2e] png :", pngPath);

  // 콘텐츠 규칙 점검 (경고만 — 모델에 따라 어긋날 수 있음)
  if (card.sections?.length !== 6) console.warn("[e2e] ⚠ sections 가 6개가 아님:", card.sections?.length);
  if (card.summary_bar?.pills?.length !== 5) console.warn("[e2e] ⚠ pills 가 5개가 아님:", card.summary_bar?.pills?.length);

  // 산출물 존재 확인
  const png = await fs.stat(pngPath);
  assert(png.size > 0, "PNG 가 비어 있음");
  await fs.access(htmlPath);

  console.log(`[e2e] ✅ 성공 — PNG ${(png.size / 1024).toFixed(0)}KB`);
}

main().catch((err) => {
  console.error("[e2e] 예외:", err);
  process.exit(1);
});
