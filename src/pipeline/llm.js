// 자막 텍스트 → 카드뉴스 콘텐츠 JSON.
// localnotebooklm/studio/cardnews.py:make_cardnews_lite + core/llm_client.py 포팅.
// lightrag 의존을 제거하고 Anthropic / OpenAI SDK 를 직접 호출한다.

import { CARDNEWS_PROMPT } from "../prompt.js";
import { parseSubtitleText } from "./subtitle.js";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";
const DEFAULT_OPENAI_MODEL = "gpt-4o";

/** ```json ... ``` 펜스 제거. (make_cardnews_lite 의 _strip_fence) */
function stripFence(text) {
  const m = text.match(/```(?:json)?\s*([\s\S]+?)```/);
  return (m ? m[1] : text).trim();
}

/** 공급자별 LLM 호출 → 응답 문자열. */
async function callLLM(prompt, model) {
  const provider = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();

  if (provider === "openai") {
    const { default: OpenAI } = await import("openai");
    // OPENAI_BASE_URL 지정 시 OpenAI 호환 게이트웨이(사내 LiteLLM 프록시 등)로 호출.
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "missing",
      ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
    });
    const resp = await client.chat.completions.create({
      model: model || process.env.MODEL || DEFAULT_OPENAI_MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    return resp.choices?.[0]?.message?.content || "";
  }

  // 기본: anthropic
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "missing",
    ...(process.env.ANTHROPIC_BASE_URL ? { baseURL: process.env.ANTHROPIC_BASE_URL } : {}),
  });
  const resp = await client.messages.create({
    model: model || process.env.MODEL || DEFAULT_ANTHROPIC_MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });
  return (resp.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/**
 * 자막/텍스트 → 카드 JSON.
 * @param {string} subtitleText 원문(자막/텍스트)
 * @param {"srt"|"vtt"|"plain"} format
 * @param {object} [metadata]
 * @param {string} [model] 모델 직접 지정(선택)
 * @returns {Promise<object>} card dict
 */
export async function makeCardnews(subtitleText, format = "plain", metadata = null, model = null) {
  const clean =
    format === "srt" || format === "vtt"
      ? parseSubtitleText(subtitleText, format)
      : subtitleText;

  const prompt =
    CARDNEWS_PROMPT +
    "\n\n[메타데이터]\n" +
    JSON.stringify(metadata || {}) +
    "\n\n[자막]\n" +
    clean;

  const raw = await callLLM(prompt, model);
  const payload = stripFence(raw);

  let card;
  try {
    card = JSON.parse(payload);
  } catch {
    card = {
      headline: "파싱 실패",
      subhead: "LLM 응답을 JSON으로 해석하지 못함",
      hero_icon: "⚠️",
      sections: [{ icon: "📄", title: "원본", body: raw.slice(0, 120), tags: [] }],
      summary_bar: null,
      footer: "",
    };
  }

  // 필수 키 기본값 보정 (make_cardnews_lite 의 setdefault)
  card.headline ??= "카드뉴스";
  card.subhead ??= "";
  card.hero_icon ??= "📌";
  card.sections ??= [];
  card.footer ??= "";
  return card;
}
