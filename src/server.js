// MCP 서버 정의 — 카드뉴스 3개 도구 등록.
// MCP 경계에서는 throw 하지 않고 항상 텍스트 콘텐츠(JSON)로 응답한다.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  createCardnewsFromText,
  createCardnewsFromFile,
  createCardnewsBatch,
} from "./tools/cardnews.js";

/** 핸들러 결과(dict) → MCP tool 응답으로 직렬화. 예외도 {ok:false}로 감싼다. */
function asToolResult(promise) {
  return promise
    .then((data) => ({
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      isError: data && data.ok === false,
    }))
    .catch((err) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({ ok: false, error: `${err?.name || "Error"}: ${err?.message || err}` }, null, 2),
        },
      ],
      isError: true,
    }));
}

export function createServer() {
  const server = new McpServer({
    name: "cardnews-mcp-server",
    version: "0.1.0",
  });

  server.tool(
    "create_cardnews_from_text",
    "자막/텍스트 문자열로부터 1080x1620 인포그래픽 카드뉴스(HTML + PNG) 1장을 생성한다. 섹션 6개·요약바 pill 5개.",
    {
      text: z.string().describe("원문 자막 또는 텍스트"),
      format: z.enum(["vtt", "srt", "plain"]).optional().describe("입력 포맷 (기본 plain)"),
      metadata: z.record(z.any()).optional().describe("출처/시리즈 등 메타데이터"),
      outputDir: z.string().optional().describe("출력 디렉터리 (기본 OUTPUT_DIR 또는 ./output)"),
      model: z.string().optional().describe("LLM 모델 직접 지정 (선택)"),
      label: z.string().optional().describe("출력 파일명 라벨 (기본 card)"),
    },
    async (args) => asToolResult(createCardnewsFromText({ ...args, format: args.format || "plain" }))
  );

  server.tool(
    "create_cardnews_from_file",
    ".vtt/.srt/.txt 자막 파일을 읽어 단일 카드뉴스(HTML + PNG)를 생성한다.",
    {
      filePath: z.string().describe("자막 파일 경로 (.vtt/.srt/.txt)"),
      metadata: z.record(z.any()).optional(),
      outputDir: z.string().optional(),
      model: z.string().optional(),
    },
    async (args) => asToolResult(createCardnewsFromFile(args))
  );

  server.tool(
    "create_cardnews_batch",
    "여러 자막 파일을 회차별 카드 1장씩 + (combine 시) 전체 병합 '종합' 1장으로 생성한다.",
    {
      filePaths: z.array(z.string()).optional().describe("자막 파일 경로 배열"),
      folder: z.string().optional().describe("자막 파일이 있는 폴더 (.vtt/.srt 자동 수집)"),
      combine: z.boolean().optional().describe("전체 병합 종합 카드 생성 여부 (기본 true)"),
      outputDir: z.string().optional(),
      model: z.string().optional(),
    },
    async (args) => asToolResult(createCardnewsBatch({ combine: true, ...args }))
  );

  return server;
}
