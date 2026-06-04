// 카드뉴스 도구 핸들러.
// localnotebooklm/studio/cardnews.py 의 _build_one / generate 흐름을 MCP 도구로 옮긴 것.

import { promises as fs } from "node:fs";
import path from "node:path";

import { makeCardnews } from "../pipeline/llm.js";
import { renderCardHtml } from "../pipeline/template.js";
import { capturePng } from "../pipeline/render.js";
import { parseSubtitleFile } from "../pipeline/subtitle.js";

const SUBTITLE_EXTS = new Set([".vtt", ".srt"]);

function defaultOutputDir() {
  return path.resolve(process.env.OUTPUT_DIR || "./output");
}

/** YYYYMMDD_HHMMSS (로컬). */
function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

/** 파일명 안전화 — _build_one 의 safe_label 규칙(한글 허용). */
function safeLabel(label) {
  const s = String(label).replace(/[^\w\-가-힣]+/gu, "_").slice(0, 60);
  return s || "card";
}

/** 단일 카드: 텍스트 → JSON → HTML → PNG. (html/png 경로 + card 반환) */
async function buildOne({ label, text, format, outDir, ts, metadata, model }) {
  const card = await makeCardnews(text, format, metadata, model);
  await fs.mkdir(outDir, { recursive: true });
  const base = path.join(outDir, `${ts}_${safeLabel(label)}`);
  const pngPath = `${base}.png`;
  const html = renderCardHtml(card);
  await capturePng(html, pngPath);
  return { label, card, htmlPath: `${base}.html`, pngPath };
}

// ── 도구 1: 텍스트 → 카드 ────────────────────────────────────────────
export async function createCardnewsFromText({
  text,
  format = "plain",
  metadata = null,
  outputDir,
  model,
  label = "card",
}) {
  if (!text || !String(text).trim()) {
    return { ok: false, error: "text 가 비어 있습니다." };
  }
  const outDir = outputDir ? path.resolve(outputDir) : defaultOutputDir();
  const result = await buildOne({
    label,
    text,
    format,
    outDir,
    ts: stamp(),
    metadata,
    model,
  });
  return { ok: true, card: result.card, htmlPath: result.htmlPath, pngPath: result.pngPath };
}

// ── 도구 2: 파일 → 카드 ──────────────────────────────────────────────
export async function createCardnewsFromFile({ filePath, metadata = null, outputDir, model }) {
  if (!filePath) return { ok: false, error: "filePath 가 필요합니다." };
  const resolved = path.resolve(filePath);
  let text;
  try {
    text = await parseSubtitleFile(resolved);
  } catch (e) {
    return { ok: false, error: `파일을 읽을 수 없습니다: ${resolved} (${e.message})` };
  }
  const outDir = outputDir ? path.resolve(outputDir) : defaultOutputDir();
  const result = await buildOne({
    label: path.parse(resolved).name,
    text,
    format: "plain", // parseSubtitleFile 이 이미 정제함
    outDir,
    ts: stamp(),
    metadata: metadata || { source: path.basename(resolved) },
    model,
  });
  return { ok: true, card: result.card, htmlPath: result.htmlPath, pngPath: result.pngPath };
}

// ── 도구 3: 배치 (회차별 + 종합) ─────────────────────────────────────
export async function createCardnewsBatch({
  filePaths,
  folder,
  combine = true,
  outputDir,
  model,
}) {
  // 입력 파일 목록 결정
  let files = [];
  if (Array.isArray(filePaths) && filePaths.length) {
    files = filePaths.map((f) => path.resolve(f));
  } else if (folder) {
    const dir = path.resolve(folder);
    let entries;
    try {
      entries = await fs.readdir(dir);
    } catch (e) {
      return { ok: false, error: `폴더를 읽을 수 없습니다: ${dir} (${e.message})` };
    }
    files = entries
      .filter((n) => SUBTITLE_EXTS.has(path.extname(n).toLowerCase()))
      .sort()
      .map((n) => path.join(dir, n));
  }
  if (!files.length) {
    return { ok: false, error: "처리할 자막 파일이 없습니다 (filePaths 또는 folder 확인)." };
  }

  const outDir = outputDir ? path.resolve(outputDir) : defaultOutputDir();
  const ts = stamp();
  const built = [];
  const combinedChunks = [];

  // 회차별
  for (const file of files) {
    let text;
    try {
      text = await parseSubtitleFile(file);
    } catch (e) {
      built.push({ label: path.parse(file).name, ok: false, error: e.message });
      continue;
    }
    const label = path.parse(file).name;
    combinedChunks.push(`[${label}]\n${text}`);
    const r = await buildOne({
      label,
      text,
      format: "plain",
      outDir,
      ts,
      metadata: { source: path.basename(file) },
      model,
    });
    built.push({ label, ok: true, card: r.card, htmlPath: r.htmlPath, pngPath: r.pngPath });
  }

  // 종합 — 전체 자막 합쳐 한 장
  if (combine && files.length > 1 && combinedChunks.length) {
    const merged = combinedChunks.join("\n\n");
    const r = await buildOne({
      label: "종합",
      text: merged,
      format: "plain",
      outDir,
      ts,
      metadata: { source: "all_episodes_merged" },
      model,
    });
    built.push({ label: "종합", ok: true, card: r.card, htmlPath: r.htmlPath, pngPath: r.pngPath });
  }

  return {
    ok: true,
    count: built.filter((b) => b.ok).length,
    cards: built.filter((b) => b.ok).map((b) => b.card),
    files: built.map((b) =>
      b.ok
        ? { label: b.label, htmlPath: b.htmlPath, pngPath: b.pngPath }
        : { label: b.label, error: b.error }
    ),
  };
}
