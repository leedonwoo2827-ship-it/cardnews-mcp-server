// End-to-end 검증: examples 자막 → 카드 JSON + PNG 생성.
//   node test/e2e.mjs
// 필요: .env 에 LLM_PROVIDER/API 키. puppeteer chrome 설치(npx puppeteer browsers install chrome).

import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";

import { createCardnewsFromFile } from "../src/tools/cardnews.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
}

async function main() {
  const filePath = path.join(root, "examples", "sample.vtt");
  const outputDir = path.join(root, "output");

  console.log("[e2e] 입력:", filePath);
  const res = await createCardnewsFromFile({ filePath, outputDir });

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
