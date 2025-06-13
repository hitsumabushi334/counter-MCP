#!/usr/bin/env node
import { FastMCP } from "fastmcp";
import { z } from "zod";
import { fetchUrlsInParallel } from "./utils/parallelFetch.js";

// FastMCPを使用して文字数カウンターのMCPを作成します
const server = new FastMCP({
  name: "strCounterMCP",
  version: "1.0.0",
});

server.addTool({
  name: "str-counter",
  description: "与えられた文章の文字数をカウントします",
  parameters: z.object({
    text: z.string().describe("カウントする文字列"),
    numberLimit: z.number().describe("文字数の上限"),
  }),
  execute: async (params) => {
    const { text, numberLimit } = params;
    try {
      // 文字列中の空白を除去して文字数をカウント
      const count = text.replace(/\s/g, "").length;
      const isExceeded = count > numberLimit;
      const isFallBelow = count < numberLimit * 0.8;
      let message = isExceeded
        ? `文字数が上限(${numberLimit})を超えています。現在の文字数: ${count}`
        : `文字数は上限内です。現在の文字数: ${count}`;
      message += isFallBelow
        ? `\n文字数が指定の8割(${numberLimit * 0.8})を下回っています。`
        : `\n文字数は指定の8割(${numberLimit * 0.8})を超えています。`;

      const result = {
        success: true,
        message: message,
        count: count,
        isExceeded: isExceeded,
        isFallBelow: isFallBelow,
      };
      return JSON.stringify(result);
    } catch (error: any) {
      console.error("Error occurred while counting characters:", error);
      return JSON.stringify({
        success: false,
        message: `文字数のカウント中にエラーが発生しました: ${error.message}`,
        count: 0,
        isExceeded: false,
        isFallBelow: false,
      });
    }
  },
});

// 並列検索機能をサーバーに追加
server.addTool({
  name: "parallel-search",
  description:
    "Brave SearchとFetchを使用してURLを並列で検索し、HTMLコンテンツを取得します",
  parameters: z.object({
    query: z.string().describe("検索クエリ"),
    searchLang: z.enum(["en", "jp"]).default("en").describe("検索言語"),
    country: z
      .enum(["US", "JP"])
      .default("US")
      .optional()
      .describe("検索対象の国"),
  }),
  execute: async (params) => {
    try {
      const res = await fetchUrlsInParallel(params);
    } catch (error: any) {
      console.error("Error occurred while fetching URLs in parallel:", error);
      return JSON.stringify({
        success: false,
        message: `並列検索中にエラーが発生しました: ${error.message}`,
        htmlData: [],
      });
    }
  },
});
server.start({
  transportType: "stdio",
});
