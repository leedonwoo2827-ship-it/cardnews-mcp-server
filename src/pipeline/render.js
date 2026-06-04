// HTML 문자열 → PNG 캡처.
// localnotebooklm/studio/cardnews.py:capture_png (Playwright) 를 Puppeteer 로 포팅.
//
// .card 박스를 측정해 콘텐츠 높이에 정확히 맞춘다:
//   1) viewport.height 를 콘텐츠 예상 최대치(3000)보다 크게 두어 layout 이 자연스럽게 끝나게
//   2) .card 의 bounding rect / scrollHeight 를 측정해 그 영역만 clip 캡처

import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

import { CARD_WIDTH } from "./template.js";

/**
 * @param {string} html  렌더할 HTML
 * @param {string} pngPath  저장할 PNG 경로 (같은 경로에 .html 도 함께 저장)
 * @param {number} [width]
 * @returns {Promise<string>} pngPath
 */
export async function capturePng(html, pngPath, width = CARD_WIDTH) {
  const htmlPath = pngPath.replace(/\.png$/i, ".html");
  await fs.mkdir(path.dirname(pngPath), { recursive: true });
  await fs.writeFile(htmlPath, html, "utf-8");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 3000, deviceScaleFactor: 2 });

    // file:// 로 로드 — 로컬 폰트/렌더 일관성.
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle0" });

    // 폰트 로드 완료 대기 — 폰트 전 layout 시점에 측정하면 .card 가 작게 잡혀 콘텐츠가 잘린다.
    await page.evaluate(() =>
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()
    );
    await sleep(300);

    // .card 박스 측정. height 는 scrollHeight 로 안전망.
    const box = await page.evaluate(() => {
      const el = document.querySelector(".card") || document.body;
      const r = el.getBoundingClientRect();
      return {
        x: r.left,
        y: r.top,
        width: r.width,
        height: Math.max(r.height, el.scrollHeight),
      };
    });

    await page.screenshot({ path: pngPath, clip: box });
  } finally {
    await browser.close();
  }
  return pngPath;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
