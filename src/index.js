#!/usr/bin/env node
// 진입점 — 기본 stdio MCP 서버.
//   node src/index.js            → stdio (Claude Desktop 등)
//   node src/index.js --http     → Streamable HTTP (포트 PORT 또는 3500)

import "dotenv/config";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createServer } from "./server.js";

async function runStdio() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio 모드에서는 stdout 을 프로토콜이 점유하므로 로그는 stderr 로.
  console.error("[cardnews-mcp-server] stdio transport ready");
}

async function runHttp(port) {
  const { StreamableHTTPServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/streamableHttp.js"
  );
  const http = await import("node:http");
  const { randomUUID } = await import("node:crypto");

  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  await server.connect(transport);

  const httpServer = http.createServer((req, res) => {
    transport.handleRequest(req, res).catch((err) => {
      console.error("[cardnews-mcp-server] request error:", err);
      if (!res.headersSent) res.writeHead(500).end();
    });
  });
  httpServer.listen(port, () => {
    console.error(`[cardnews-mcp-server] HTTP transport on :${port}`);
  });
}

const useHttp = process.argv.includes("--http");
const port = Number(process.env.PORT || 3500);

(useHttp ? runHttp(port) : runStdio()).catch((err) => {
  console.error("[cardnews-mcp-server] fatal:", err);
  process.exit(1);
});
