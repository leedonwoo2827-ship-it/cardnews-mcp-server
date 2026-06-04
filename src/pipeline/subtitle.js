// SRT/VTT 자막 → 타임코드 제거된 plain text.
// localnotebooklm/core/ingest/subtitle.py 포팅.
//
// 핵심: 타임코드([00:01:23]) 인라인 제거 + 큐 타이밍 라인 제거 + 인접 중복 제거.
// 카드뉴스/요약 품질의 핵심 전처리.

import { promises as fs } from "node:fs";
import path from "node:path";

// 인라인 타임코드 예: [00:01], [1:23:45], [00:01.500]
const TIMECODE_INLINE = /\[\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\]/g;
// 큐 타이밍 라인 예: 00:00:00.000 --> 00:00:11.900
const CUE_TIMING = /-->/;

/** 확장자/내용으로 포맷 판별. */
export function detectFormat(filePath, head = "") {
  const ext = path.extname(filePath).toLowerCase().replace(".", "");
  if (ext === "srt" || ext === "vtt") return ext;
  if (head.includes("WEBVTT")) return "vtt";
  if (ext === "txt") return "plain";
  return "srt";
}

function dedupAdjacent(lines) {
  const out = [];
  for (const line of lines) {
    if (!line) continue;
    if (out.length && out[out.length - 1] === line) continue;
    out.push(line);
  }
  return out;
}

/**
 * VTT/SRT 공통 라인 파서.
 * 큐 번호(순수 숫자) · 타이밍 라인 · WEBVTT 헤더 · NOTE/STYLE 블록을 버리고
 * 자막 텍스트만 모은다.
 */
function parseCueText(text) {
  const rawLines = text.replace(/\r\n/g, "\n").split("\n");
  const collected = [];
  let inNoteBlock = false;

  for (const raw of rawLines) {
    const line = raw.trim();
    if (!line) {
      inNoteBlock = false;
      continue;
    }
    if (line === "WEBVTT" || line.startsWith("WEBVTT")) continue;
    if (line.startsWith("NOTE") || line.startsWith("STYLE")) {
      inNoteBlock = true;
      continue;
    }
    if (inNoteBlock) continue;
    if (CUE_TIMING.test(line)) continue; // 타이밍 라인
    if (/^\d+$/.test(line)) continue; // 큐 인덱스
    collected.push(line);
  }
  return collected;
}

function clean(lines) {
  const stripped = lines.map((l) => l.replace(TIMECODE_INLINE, "").trim());
  return dedupAdjacent(stripped).join(" ");
}

/** 자막 원문 문자열 → 정제 텍스트. format: "srt" | "vtt" | "plain" */
export function parseSubtitleText(text, format = "plain") {
  if (format === "plain") {
    // plain 은 라인별 인라인 타임코드만 제거.
    const lines = text
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((l) => l.trim());
    return clean(lines);
  }
  return clean(parseCueText(text));
}

/** 자막 파일 경로 → 정제 텍스트. (확장자/내용으로 포맷 자동 판별) */
export async function parseSubtitleFile(filePath) {
  const raw = await fs.readFile(filePath, "utf-8");
  const fmt = detectFormat(filePath, raw.slice(0, 200));
  return parseSubtitleText(raw, fmt);
}
